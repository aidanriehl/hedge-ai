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
    const { eventTitle, eventCategory, eventDetails, marketPrice } = await req.json();

    if (!eventTitle) {
      return new Response(
        JSON.stringify({ error: "Event title is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
   - Include a "candidates" array with top 3-6 most likely outcomes.
   - Each has "name" and "probability" (decimal 0-1).
   - Probabilities MUST add up to exactly 1.0 (100%). Include an "Other" catch-all if needed.

2. "How high/how much/how many" questions (e.g. "how high will unemployment get?"):
   - Include a "thresholds" array with 3-5 key levels.
   - Each has "level" (like "Above 5%") and "probability" (decimal 0-1).

3. Simple yes/no questions: just give probability normally.

For probability:
- estimate is a decimal (0.0 to 1.0) for the YES outcome.
- reasoning: 1 sentence, MAX 2. Plain English. Question yourself. No jargon.
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

    const userPrompt = `Analyze this prediction market bet:

Title: ${eventTitle}
Category: ${eventCategory || "Unknown"}
Details: ${eventDetails || "No additional details"}
${marketPrice != null ? `Current market price (YES): ${Math.round(marketPrice * 100)}%` : ""}

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
