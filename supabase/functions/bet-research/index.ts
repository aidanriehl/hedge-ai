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
    const { eventTitle, eventCategory, eventDetails } = await req.json();

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

    const systemPrompt = `You are an elite betting research analyst. You provide exhaustive, deep research on prediction market bets. Your research should feel like hiring a team of analysts who spent hours investigating.

CRITICAL RULES:
- Every claim must explain WHY it matters, not just state facts
- Include specific numbers, percentages, and historical data where possible
- Cite sources when possible (e.g., "according to ESPN", "per historical data")
- If data is limited or inconclusive, say so honestly
- Adapt your research categories to the specific bet type

BAD example: "Sinner is ranked #1"
GOOD example: "Sinner is currently ranked #1 in the world. Historically, when a #1 ranked player faces someone ranked #25-35, they win approximately 89% of the time on hard court surfaces. However, this drops to 78% in Grand Slam finals due to pressure factors."

You must respond in valid JSON with this exact structure:
{
  "categories": [
    {
      "title": "Category Name",
      "icon": "one of: history, trending, stats, health, clock, map, trophy, cloud, brain, users, news, alert",
      "confidence": "high" | "medium" | "low",
      "bullets": [
        "Detailed research bullet with WHY it matters..."
      ]
    }
  ],
  "probability": {
    "estimate": 0.75,
    "factors": [
      {
        "name": "Factor Name",
        "suggestedProbability": 0.85,
        "weight": 0.25
      }
    ],
    "reasoning": "One paragraph explaining the final probability calculation",
    "confidence": "high" | "medium" | "low"
  }
}

For the research categories, dynamically choose the most relevant ones based on the bet type. For sports: historical matchups, recent form, rankings, injuries, fatigue, surface/venue, tournament history, weather, psychology, expert predictions, upset probability, news. For politics: polling, historical voting, fundamentals, money/campaign, news. For entertainment: industry patterns, insider intel, timing, business logic. For any other type: adapt intelligently.

Provide 6-12 categories with 3-6 detailed bullets each. Each bullet should be a substantial paragraph, not a short sentence.`;

    const userPrompt = `Research this prediction market bet thoroughly:

Title: ${eventTitle}
Category: ${eventCategory || "Unknown"}
Details: ${eventDetails || "No additional details available"}

Provide exhaustive research with specific data, statistics, historical context, and expert analysis. Every bullet point should explain WHY the finding matters for predicting the outcome. Respond ONLY with valid JSON.`;

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

    // Parse JSON from the response - handle markdown code blocks
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
