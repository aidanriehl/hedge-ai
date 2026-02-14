import { supabase } from "@/integrations/supabase/client";
import type { KalshiEvent, ResearchResult } from "@/types/kalshi";

export async function fetchKalshiEvents(cursor?: string): Promise<{ events: KalshiEvent[]; cursor: string }> {
  const { data, error } = await supabase.functions.invoke("kalshi-proxy", {
    body: { path: "/events", limit: "100", status: "open", cursor: cursor || "" },
  });

  if (error) throw new Error(error.message || "Failed to fetch events");
  return { events: data?.events || [], cursor: data?.cursor || "" };
}

export async function fetchEventMarkets(eventTicker: string): Promise<KalshiEvent> {
  const { data, error } = await supabase.functions.invoke("kalshi-proxy", {
    body: { path: `/events/${eventTicker}` },
  });
  if (error) throw new Error(error.message || "Failed to fetch event details");
  return data?.event as KalshiEvent;
}

export async function runBetResearch(
  eventTitle: string,
  eventCategory: string,
  eventDetails: string,
  marketPrice?: number,
  marketCandidates?: Array<{name: string; price: number}>
): Promise<ResearchResult> {
  const { data, error } = await supabase.functions.invoke("bet-research", {
    body: { eventTitle, eventCategory, eventDetails, marketPrice, marketCandidates },
  });

  if (error) throw new Error(error.message || "Research failed");
  return data as ResearchResult;
}
