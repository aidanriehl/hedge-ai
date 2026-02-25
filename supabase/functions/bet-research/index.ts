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

      // If we have a ticker and there's already a cache row, update steps
      if (eventTicker) {
        const sb = getSupabaseAdmin();
        const { data: existing } = await sb.from("research_cache").select("id").eq("event_ticker", eventTicker).maybeSingle();
        if (existing) {
          await sb.from("research_cache").update({ steps }).eq("event_ticker", eventTicker);
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
- Each finding is ONE sentence with a **specific** number, date, or name bolded.
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

    // Check cache first
    if (eventTicker) {
      const cached = await getCachedResearch(eventTicker);
      if (cached) {
        console.log(`Cache HIT (research) for ${eventTicker}, expires ${cached.expires_at}`);
        const result = cached.research as any;
        result.imageUrl = cached.image_url;
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = `You are a prediction market analyst. Write for normal people — no jargon, no filler, no fancy words. 8th-grade reading level. Short sentences.

RULES:
- Give 4-8 findings grouped into 2-4 categories.
- Each finding is ONE short sentence. Include a **specific** number, date, or name — bold the key part.
- BAD: "Pope Francis has appointed 99 of the 137 current cardinal electors, significantly shaping the pool of potential successors."
- GOOD: "**Pietro Parolin** has been Vatican's #2 for over 10 years — the longest-serving Secretary of State in decades."
- Every bullet should clearly connect to WHO WINS or WHAT HAPPENS. If a fact doesn't obviously affect the outcome, don't include it.
- Skip obvious stuff. Lead with what changes the odds.
- NEVER state something the reader already knows (e.g. "Elon Musk is rich", "Mars is far away"). Every bullet must add NEW information that shifts the probability.
- Cut every word that doesn't add value. If you can remove a phrase without losing meaning, remove it. Example: "No human has traveled beyond 250,000 miles from Earth; Mars is 140 million miles away at closest approach" → "Mars is **140 million miles** away — no human has gone past **250,000**."
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

    // Generate image if we got an imagePrompt
    let imageUrl = null;
    if (research.imagePrompt) {
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
              { role: "user", content: `Generate a photorealistic image: ${research.imagePrompt}. High quality, editorial style.` },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (imgResponse.ok) {
          const imgData = await imgResponse.json();
          imageUrl = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
        }
      } catch (imgErr) {
        console.error("Image generation failed (non-fatal):", imgErr);
      }
    }

    // Extract TTL and clean up response
    const cacheTTLHours = research.cacheTTLHours || 24;
    delete research.cacheTTLHours;
    delete research.imagePrompt;
    research.imageUrl = imageUrl;

    // Cache the result
    if (eventTicker) {
      const researchToCache = { ...research };
      delete researchToCache.imageUrl; // stored separately
      upsertCache(eventTicker, researchToCache, null, imageUrl, cacheTTLHours)
        .catch(err => console.error("Cache upsert failed (non-fatal):", err));
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
