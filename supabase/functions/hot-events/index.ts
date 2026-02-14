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
    // 1. Fetch 100 open events
    const eventsUrl = `${KALSHI_BASE}/events?limit=100&status=open`;
    const eventsRes = await fetch(eventsUrl, { headers: { Accept: "application/json" } });
    if (!eventsRes.ok) throw new Error(`Events fetch failed: ${eventsRes.status}`);
    const eventsData = await eventsRes.json();
    const events = eventsData.events || [];

    // 2. Take first 20 events and fetch their market details in parallel
    const top20 = events.slice(0, 20);
    const detailResults = await Promise.allSettled(
      top20.map(async (event: any) => {
        const url = `${KALSHI_BASE}/events/${event.event_ticker}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) return null;
        const data = await res.json();
        // Kalshi returns event and markets as separate top-level keys
        return { event: data.event, markets: data.markets || [] };
      })
    );

    // 3. Compute total volume per event
    const enriched: any[] = [];
    for (const result of detailResults) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const { event, markets } = result.value;
      const totalVolume = markets.reduce((sum: number, m: any) => sum + (m.volume || 0), 0);
      const firstMarket = markets[0];
      enriched.push({
        event_ticker: event.event_ticker,
        title: event.title,
        category: event.category || "",
        sub_title: event.sub_title || "",
        mutually_exclusive: event.mutually_exclusive || false,
        total_volume: totalVolume,
        markets: firstMarket ? [{
          ticker: firstMarket.ticker,
          event_ticker: firstMarket.event_ticker,
          title: firstMarket.title,
          yes_bid: firstMarket.yes_bid != null ? firstMarket.yes_bid / 100 : undefined,
          yes_ask: firstMarket.yes_ask != null ? firstMarket.yes_ask / 100 : undefined,
          volume: firstMarket.volume,
          status: firstMarket.status,
        }] : [],
      });
    }

    // 4. Sort by volume descending
    enriched.sort((a, b) => b.total_volume - a.total_volume);

    // 5. Pick top 3 from unique categories
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
