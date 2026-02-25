import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch events sorted by volume (most active first)
    const eventsUrl = `${KALSHI_BASE}/events?limit=50&status=open&with_nested_markets=true`;
    const eventsRes = await fetch(eventsUrl, { headers: { Accept: "application/json" } });
    if (!eventsRes.ok) throw new Error(`Events fetch failed: ${eventsRes.status}`);
    const eventsData = await eventsRes.json();
    const events = eventsData.events || [];

    // Compute total volume per event from nested markets
    const enriched: any[] = [];
    for (const event of events) {
      const markets = event.markets || [];
      const totalVolume = markets.reduce((sum: number, m: any) => sum + (m.volume || 0), 0);

      // Return ALL markets so frontend can detect multi-candidate events
      const mappedMarkets = markets.map((m: any) => ({
        ticker: m.ticker,
        event_ticker: m.event_ticker,
        title: m.title || "",
        yes_bid: m.yes_bid != null ? m.yes_bid / 100 : undefined,
        yes_ask: m.yes_ask != null ? m.yes_ask / 100 : undefined,
        yes_sub_title: m.yes_sub_title || "",
        volume: m.volume,
        status: m.status,
      }));

      enriched.push({
        event_ticker: event.event_ticker,
        title: event.title,
        category: event.category || "",
        sub_title: event.sub_title || "",
        mutually_exclusive: event.mutually_exclusive || false,
        total_volume: totalVolume,
        markets: mappedMarkets,
      });
    }

    // Sort by volume descending
    enriched.sort((a, b) => b.total_volume - a.total_volume);

    // Pick top 3 from unique categories
    const result: any[] = [];
    const usedCategories = new Set<string>();
    for (const event of enriched) {
      const cat = (event.category || "").toLowerCase();
      if (usedCategories.has(cat)) continue;
      result.push(event);
      usedCategories.add(cat);
      if (result.length >= 3) break;
    }

    return new Response(JSON.stringify({ events: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
