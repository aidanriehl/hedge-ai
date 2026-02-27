import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getCachedResearch(eventTicker: string) {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("research_cache")
    .select("*")
    .eq("event_ticker", eventTicker)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data;
}

async function upsertCache(eventTicker: string, research: any, steps: any, imageUrl: string | null, ttlHours: number) {
  const sb = getSupabaseAdmin();
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
  await sb.from("research_cache").upsert({
    event_ticker: eventTicker,
    research,
    steps,
    image_url: imageUrl,
    cache_ttl_hours: ttlHours,
    created_at: new Date().toISOString(),
    expires_at: expiresAt,
  }, { onConflict: "event_ticker" });
}

async function callAnthropic(system: string, messages: Array<{role: string; content: string}>, maxTokens = 4096) {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Anthropic error:", response.status, errText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const eventTicker = body.eventTicker as string | undefined;

    // === GENERATE RESEARCH STEPS ===
    if (body.generateSteps) {
      // Check cache for steps
      if (eventTicker) {
        const cached = await getCachedResearch(eventTicker);
        if (cached?.steps) {
          console.log(`Cache HIT (steps) for ${eventTicker}`);
          return new Response(JSON.stringify({ steps: cached.steps }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { eventTitle, eventCategory } = body;
      const stepsPrompt = `Given this prediction market bet: "${eventTitle}" (category: ${eventCategory || "General"}), generate 5-7 short research steps (3-6 words each) that sound specific to THIS bet. Write them as plain actions a normal person would understand — no jargon, no technical language.

Examples for "Sinner vs Alcaraz Australian Open":
- "Head-to-head record"
- "Recent form on hard courts"
- "Injury updates"
- "Past Australian Open results"
- "Current rankings"

Examples for "Who will be the next Pope?":
- "Top names being mentioned"
- "Vatican insiders' picks"
- "Age and health of frontrunners"
- "Regional voting patterns"

Return ONLY a JSON array of strings. No other text.`;

      const stepsResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [{ role: "user", content: stepsPrompt }],
        }),
      });

      if (!stepsResponse.ok) {
        return new Response(JSON.stringify({ steps: ["Gathering data...", "Analyzing context...", "Evaluating factors...", "Forming estimate..."] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const stepsData = await stepsResponse.json();
      const stepsContent = stepsData.choices?.[0]?.message?.content || "[]";
      let steps;
      try {
        const jsonMatch = stepsContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        steps = JSON.parse(jsonMatch ? jsonMatch[1].trim() : stepsContent.trim());
      } catch {
        steps = ["Gathering data...", "Analyzing context...", "Evaluating factors...", "Forming estimate..."];
      }

      // Persist steps — upsert so they're never lost
      if (eventTicker) {
        const sb = getSupabaseAdmin();
        const { data: existing } = await sb.from("research_cache").select("id").eq("event_ticker", eventTicker).maybeSingle();
        if (existing) {
          await sb.from("research_cache").update({ steps }).eq("event_ticker", eventTicker);
        } else {
          // Create a placeholder row so steps aren't lost if research finishes later
          await sb.from("research_cache").insert({
            event_ticker: eventTicker,
            steps,
            research: {},
            cache_ttl_hours: 1,
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          });
        }
      }

      return new Response(JSON.stringify({ steps }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === CHAT MODE ===
    if (body.chatMode) {
      const { eventTitle, researchContext, chatHistory, question } = body;

      const chatSystemPrompt = `You are a prediction market analyst. The user is viewing research about: "${eventTitle}".

Research context:
${researchContext}

Rules:
- Answer any question the user asks — you are a general-purpose assistant, not limited to the research topic.
- Just answer directly. No disclaimers, no "that's not related to X", no offers to help with other things.
- Be concise (1-3 sentences). Use simple language. Cite specific numbers when relevant.
- Use your full knowledge — the research context is supplementary, not a constraint.`;

      const anthropicMessages = (chatHistory || [])
        .filter((m: any) => m.role !== "system")
        .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

      try {
        const answer = await callAnthropic(chatSystemPrompt, anthropicMessages, 1024);
        return new Response(JSON.stringify({ answer: answer || "I'm not sure about that." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        console.error("Chat Anthropic error:", err);
        return new Response(JSON.stringify({ answer: "Sorry, I couldn't process that. Try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // === MORE RESEARCH ===
    if (body.moreResearch) {
      const { eventTitle, eventCategory, eventDetails, existingCategories } = body;

      const morePrompt = `You previously researched this prediction market bet: "${eventTitle}" (${eventCategory}).
Details: ${eventDetails || "None"}

You already covered these categories: ${existingCategories?.join(", ") || "unknown"}.

Now provide 2-3 NEW research categories with findings that would MOST impact the odds. Focus on angles not yet covered. Same format rules:
- Each finding is ONE sentence. Bold the FULL meaningful phrase, not just one word — someone skimming only bold text should get the story.
- Every bullet must tie back to WHO WINS or WHAT HAPPENS. No orphaned facts.
- Category titles must be plain English anyone would understand — no jargon or technical labels.
- If you mention anything niche, explain it inline in plain English.
- Be hyper-specific and data-driven.

Return ONLY valid JSON:
{
  "categories": [
    {
      "title": "Short Label",
      "icon": "one of: history, trending, stats, health, clock, map, trophy, cloud, brain, users, news, alert",
      "confidence": "high" | "medium" | "low",
      "bullets": ["One sentence with **key phrase bolded**."]
    }
  ]
}`;

      const moreResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: morePrompt }],
        }),
      });

      if (!moreResponse.ok) {
        return new Response(JSON.stringify({ error: "Failed to load more research" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const moreData = await moreResponse.json();
      const moreContent = moreData.choices?.[0]?.message?.content || "";
      let moreResearch;
      try {
        const jsonMatch = moreContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        moreResearch = JSON.parse(jsonMatch ? jsonMatch[1].trim() : moreContent.trim());
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse additional research" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify(moreResearch), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === MAIN RESEARCH ===
    const { eventTitle, eventCategory, eventDetails, marketPrice } = body;

    if (!eventTitle) {
      return new Response(
        JSON.stringify({ error: "Event title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }



    const systemPrompt = `You are a prediction market analyst. Write like you're texting a smart friend — casual, clear, zero fancy words. 5th-grade vocabulary. Short punchy sentences. If a 12-year-old wouldn't say it, rewrite it.

RULES:
- Give 4-8 findings grouped into 2-4 categories.
- Each finding is ONE short sentence.

BOLDING — This is critical:
- Bold the FULL meaningful phrase, not just a single word or number.
- BAD: "China announced a **2030 target** for crewed lunar landing."
- GOOD: "**China announced a 2030 target for crewed lunar landing** and is building a rocket specifically for it."
- The test: if someone skims ONLY the bolded text, they should get the full story. Bold generously.

NO VAGUE LANGUAGE:
- NEVER use "closer than expected", "significant", "notable", "increasingly likely", "remains uncertain".
- Always say specifically HOW close, HOW significant, by HOW much. Use numbers.
- BAD: "This makes it closer than expected." GOOD: "China is only 4 years behind the US timeline."

NO UNEXPLAINED JARGON:
- If you mention something niche (a program name, technical term, acronym), explain it inline in plain English.
- BAD: "Artemis III has slipped to 2026." GOOD: "NASA's Artemis program (their plan to land humans on the Moon) has slipped to 2026."
- Category titles MUST be plain English anyone would understand. NO technical labels.
- BAD: "Hardware Status", "Geopolitical Factors". GOOD: "Who Has the Better Rocket", "Why Politics Matters Here".

THESIS CONNECTION — Most important rule:
- Your probability reasoning states a thesis (e.g. "US lands first because X").
- EVERY bullet must explicitly tie back to supporting or challenging that thesis. No orphaned facts.
- If a bullet doesn't obviously help the reader understand WHY the probability is what it is, cut it.
- The flow should feel like building an argument, not listing random facts.
- BAD flow: "US will probably win" → "China landed 3 robots on the Moon" (reader: wait, so China wins?)
- GOOD flow: "US will probably win" → "**China landed 3 robots on the Moon since 2013**, but none carried humans — they're still years behind on crewed flights."

WORD CHOICE — Non-negotiable:
- BANNED words: "essentially", "unprecedented", "insurmountable", "constitutional", "significant", "notable", "increasingly", "remains", "utilizing", "framework", "landscape", "trajectory", "momentum", "leverage".
- If you catch yourself writing a word with 4+ syllables, replace it with a simpler one.
- BAD: "Constitutional ineligibility creates an essentially insurmountable barrier." GOOD: "He's not allowed to run — the rules say so, and changing them is almost impossible."
- Write like a sports commentator, not a professor.

OTHER:
- Skip obvious stuff. Lead with what changes the odds.
- NEVER state something the reader already knows (e.g. "Elon Musk is rich", "Mars is far away"). Every bullet must add NEW information that shifts the probability.
- Cut every word that doesn't add value.
- Be honest when evidence is weak.

QUESTION TYPE HANDLING:
1. "Who/what will" questions (e.g. "who will be the next pope?"):
   - Include a "candidates" array with the top 5-8 most likely people/outcomes.
   - Each has "name" and "probability" (decimal 0-1).
   - Probabilities do NOT need to add up to 100%. Just give each candidate their honest odds. Do NOT include an "Other" option.
   - CRITICAL: Every candidate MUST be a specific named person or thing. NEVER include "No clear successor", "Other", "Unknown", "Status quo", "None", etc.
   - If market data is provided below, use those candidates as your starting point.

2. "How high/how much/how many" questions:
   - Include a "thresholds" array with 3-5 key levels.

3. Simple yes/no questions: just give probability normally.

For probability:
- estimate: decimal 0-1 for YES outcome. For candidate questions, use the top candidate's probability.
- reasoning: 1 sentence max. For candidates, explain WHY the top one leads. Never describe the question type.
- confidence: how much real data backs this up.

Respond with ONLY valid JSON:
{
  "categories": [
    {
      "title": "Short Label",
      "icon": "one of: history, trending, stats, health, clock, map, trophy, cloud, brain, users, news, alert",
      "confidence": "high" | "medium" | "low",
      "bullets": ["One short sentence with **key data bolded**."]
    }
  ],
  "candidates": [
    { "name": "Name", "probability": 0.30 }
  ],
  "thresholds": [
    { "level": "Above 5%", "probability": 0.60 }
  ],
  "probability": {
    "estimate": 0.35,
    "factors": [],
    "reasoning": "1 sentence max. Plain English.",
    "confidence": "high" | "medium" | "low"
  },
  "cacheTTLHours": <integer 1-168> — how many hours this research stays relevant.
    Pick based on how fast the situation changes, NOT when the market closes.
    Fast-moving news/sports → 1-4h. Slow political/science → 48-168h. Default 24h.
    Examples: Super Bowl tomorrow → 1. "First trillionaire" → 168. Bitcoin price → 4. Election next month → 12.,
  "imagePrompt": "A short description of a relevant photo."
}

Only include "candidates" for "who/what will" questions.
Only include "thresholds" for "how high/much/many" questions.
Otherwise omit both.`;

    // Build market candidates info from Kalshi markets data
    const marketCandidates = body.marketCandidates as Array<{name: string; price: number}> | undefined;
    let marketCandidatesStr = "";
    if (marketCandidates && marketCandidates.length > 0) {
      marketCandidatesStr = "\n\nKALSHI MARKET CANDIDATES AND CURRENT PRICES:\n" +
        marketCandidates.map(c => `- ${c.name}: ${Math.round(c.price * 100)}%`).join("\n") +
        "\n\nUse these candidates as your starting point. Include ALL of them. You may adjust probabilities based on your research.";
    }

    const userPrompt = `Analyze this prediction market bet:

Title: ${eventTitle}
Category: ${eventCategory || "Unknown"}
Details: ${eventDetails || "No additional details"}
${marketPrice != null ? `Current market price (YES): ${Math.round(marketPrice * 100)}%` : ""}${marketCandidatesStr}

Give me the key factors (one short bullet each with specific data) and your honest probability estimate. Write simply. Respond ONLY with valid JSON.`;

    let content: string;
    try {
      content = await callAnthropic(systemPrompt, [{ role: "user", content: userPrompt }], 4096);
    } catch (err) {
      console.error("Main research Anthropic error:", err);
      return new Response(
        JSON.stringify({ error: "AI research failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let research;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      research = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse research results" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract TTL and clean up response
    const cacheTTLHours = research.cacheTTLHours || 24;
    const imagePrompt = research.imagePrompt;
    delete research.cacheTTLHours;
    delete research.imagePrompt;
    research.imageUrl = null; // Will be filled async

    // Cache research immediately (without image), preserve existing steps
    if (eventTicker) {
      const researchToCache = { ...research };
      delete researchToCache.imageUrl;
      const sb = getSupabaseAdmin();
      const { data: existingRow } = await sb.from("research_cache").select("steps").eq("event_ticker", eventTicker).maybeSingle();
      const existingSteps = existingRow?.steps ?? null;
      upsertCache(eventTicker, researchToCache, existingSteps, null, cacheTTLHours)
        .catch(err => console.error("Cache upsert failed (non-fatal):", err));

      // Fire-and-forget image generation — don't block the response
      if (imagePrompt && LOVABLE_API_KEY) {
        (async () => {
          try {
            const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-image",
                messages: [
                  { role: "user", content: `Generate a photorealistic image in wide landscape 16:9 aspect ratio: ${imagePrompt}. High quality, editorial style, wide horizontal composition. Make sure faces and key subjects are fully visible and centered.` },
                ],
                modalities: ["image", "text"],
              }),
            });
            if (imgResponse.ok) {
              const imgData = await imgResponse.json();
              const imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
              if (imageUrl) {
                await sb.from("research_cache").update({ image_url: imageUrl }).eq("event_ticker", eventTicker);
              }
            }
          } catch (imgErr) {
            console.error("Background image generation failed:", imgErr);
          }
        })();
      }
    }

    return new Response(JSON.stringify(research), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Research error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
