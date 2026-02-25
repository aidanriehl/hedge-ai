import { supabase } from "@/integrations/supabase/client";
import type { KalshiEvent, ResearchResult } from "@/types/kalshi";

export async function fetchKalshiEvents(cursor?: string, limit = "200", withNestedMarkets = false): Promise<{ events: KalshiEvent[]; cursor: string }> {
  const { data, error } = await supabase.functions.invoke("kalshi-proxy", {
    body: { path: "/events", limit, status: "open", cursor: cursor || "", with_nested_markets: withNestedMarkets },
  });

  if (error) throw new Error(error.message || "Failed to fetch events");
  return { events: data?.events || [], cursor: data?.cursor || "" };
}

export async function fetchAllKalshiEvents(): Promise<KalshiEvent[]> {
  const allEvents: KalshiEvent[] = [];
  let cursor = "";
  do {
    const result = await fetchKalshiEvents(cursor, "200", false);
    allEvents.push(...result.events);
    cursor = result.cursor;
  } while (cursor);
  return allEvents;
}

export async function fetchAllKalshiEventsWithMarkets(): Promise<KalshiEvent[]> {
  const allEvents: KalshiEvent[] = [];
  let cursor = "";
  do {
    const result = await fetchKalshiEvents(cursor, "200", true);
    allEvents.push(...result.events);
    cursor = result.cursor;
  } while (cursor);
  return allEvents;
}

export async function fetchEventMarkets(eventTicker: string): Promise<KalshiEvent> {
  const { data, error } = await supabase.functions.invoke("kalshi-proxy", {
    body: { path: `/events/${eventTicker}` },
  });
  if (error) throw new Error(error.message || "Failed to fetch event details");
  return data?.event as KalshiEvent;
}

export async function fetchHotEvents(): Promise<KalshiEvent[]> {
  const { data, error } = await supabase.functions.invoke("hot-events");
  if (error) throw new Error(error.message || "Failed to fetch hot events");
  return data?.events || [];
}

export async function runBetResearch(
  eventTitle: string,
  eventCategory: string,
  eventDetails: string,
  marketPrice?: number,
  marketCandidates?: Array<{name: string; price: number}>,
  eventTicker?: string
): Promise<ResearchResult> {
  const { data, error } = await supabase.functions.invoke("bet-research", {
    body: { eventTitle, eventCategory, eventDetails, marketPrice, marketCandidates, eventTicker },
  });

  if (error) throw new Error(error.message || "Research failed");
  return data as ResearchResult;
}
