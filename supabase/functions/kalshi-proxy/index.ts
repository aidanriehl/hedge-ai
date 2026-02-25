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
    let path = "/events";
    let limit = "200";
    let status = "open";
    let cursor = "";
    let withNestedMarkets = false;

    if (req.method === "GET") {
      const url = new URL(req.url);
      path = url.searchParams.get("path") || "/events";
      limit = url.searchParams.get("limit") || "100";
      status = url.searchParams.get("status") || "open";
      cursor = url.searchParams.get("cursor") || "";
      withNestedMarkets = url.searchParams.get("with_nested_markets") === "true";
    } else {
      const body = await req.json();
      path = body.path || "/events";
      limit = body.limit || "100";
      status = body.status || "open";
      cursor = body.cursor || "";
      withNestedMarkets = !!body.with_nested_markets;
    }

    const params = new URLSearchParams({ limit, status });
    if (cursor) params.set("cursor", cursor);
    if (withNestedMarkets) params.set("with_nested_markets", "true");

    const isListEndpoint = path === "/events" || path === "/markets";
    const queryString = isListEndpoint ? `?${params.toString()}` : "";
    const kalshiUrl = `${KALSHI_BASE}${path}${queryString}`;
    console.log("Fetching from Kalshi:", kalshiUrl);

    const response = await fetch(kalshiUrl, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Kalshi API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Kalshi API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
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
