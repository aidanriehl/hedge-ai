import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // === GENERATE RESEARCH STEPS ===
    if (body.generateSteps) {
      const { eventTitle, eventCategory } = body;
      const stepsPrompt = `Given this prediction market bet: "${eventTitle}" (category: ${eventCategory || "General"}), generate 5-7 hyper-specific research steps that an analyst would check. Each step should be a short phrase (5-10 words) specific to THIS bet. Not generic — make the user think "wow it's checking all of this."

Examples for a tennis bet "Sinner vs Alcaraz Australian Open":
- "Sinner vs Alcaraz head-to-head record"
- "Sinner's hard court win rate 2025"
- "Alcaraz recent injury reports"
- "Australian Open upset history"
- "Current ATP rankings comparison"

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

      return new Response(JSON.stringify({ steps }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === CHAT MODE ===
    if (body.chatMode) {
      const { eventTitle, researchContext, chatHistory, question } = body;

      const chatSystemPrompt = `You are a knowledgeable prediction market analyst assistant. The user is viewing research about: "${eventTitle}".

Here is the research data they're looking at:
${researchContext}

Answer their question using your full knowledge — you are NOT limited to the research above. Use the research data when relevant, but also draw on general knowledge, history, statistics, and context to give the best answer. Be concise (2-4 sentences), direct, and use simple language. If you cite a number or fact, be specific.`;

      const messages = [
        { role: "system", content: chatSystemPrompt },
        ...(chatHistory || []).map((m: any) => ({ role: m.role, content: m.content })),
      ];

      const chatResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "openai/gpt-5-mini", messages }),
      });

      if (!chatResponse.ok) {
        return new Response(JSON.stringify({ answer: "Sorry, I couldn't process that. Try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const chatData = await chatResponse.json();
      const answer = chatData.choices?.[0]?.message?.content || "I'm not sure about that.";

      return new Response(JSON.stringify({ answer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    const systemPrompt = `You are a prediction market analyst writing for a general audience. Use simple, clear language — no jargon, no filler. Write like you're explaining to a smart 8th grader.

RULES:
- Give 4-8 findings grouped into 2-4 categories.
- Each finding is ONE sentence with a **specific** number, date, or name. No vague statements.
- Wrap the single most important phrase in each bullet with **bold** markdown. Don't overdo it — max one bold per bullet.
- BAD: "Aggressive rate hikes could quickly accelerate unemployment."
- GOOD: "The Fed raised rates **11 times since 2022**, the fastest pace since the 1980s — historically, that leads to a recession within 18 months."
- Lead with what actually matters. Skip obvious stuff.
- If someone claims they want to do something, question whether they actually can.
- Be honest when the evidence is weak.

QUESTION TYPE HANDLING:
1. "Who/what will" questions (e.g. "who will be the next pope?"):
   - Include a "candidates" array with top 5-8 most likely outcomes.
   - Each has "name" and "probability" (decimal 0-1).
   - Probabilities MUST add up to exactly 1.0 (100%).
   - CRITICAL: Every candidate MUST be a specific, named person or entity. NEVER include vague options like "No clear successor", "Status quo", "None", "No one", "Other", or "Unknown". This is a prediction market — every option must be a concrete, bettable outcome.
   - If the market data below includes candidate names and prices, use those candidates as your starting point. You may adjust probabilities based on your analysis, but include ALL candidates the market lists.

2. "How high/how much/how many" questions (e.g. "how high will unemployment get?"):
   - Include a "thresholds" array with 3-5 key levels.
   - Each has "level" (like "Above 5%") and "probability" (decimal 0-1).

3. Simple yes/no questions: just give probability normally.

For probability:
- estimate: a decimal (0.0 to 1.0) for the YES outcome. For candidate questions, set estimate to the top candidate's probability.
- reasoning: 1 sentence, MAX 2. For candidate questions, explain WHY the top candidate is most likely (e.g. "Parolin has the strongest Vatican connections and moderate reputation"). Never say "this is a who-will-be question" or describe the question type — just give the actual reason.
- confidence: how much real data backs this up.

Respond with ONLY valid JSON:
{
  "categories": [
    {
      "title": "Short Label",
      "icon": "one of: history, trending, stats, health, clock, map, trophy, cloud, brain, users, news, alert",
      "confidence": "high" | "medium" | "low",
      "bullets": ["One sentence with **key phrase bolded** and specific data."]
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
  "imagePrompt": "A short description of a relevant photo for this bet, like 'portrait of Johnny Depp as Captain Jack Sparrow' or 'US unemployment office line'. Make it specific and visual."
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "AI research failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

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

    research.imageUrl = imageUrl;
    delete research.imagePrompt;

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
