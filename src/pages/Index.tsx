import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bookmark, TrendingUp, Globe } from "lucide-react";
import { SearchScreen } from "@/components/SearchScreen";
import { ResearchResult as ResearchResultView } from "@/components/ResearchResult";
import { ResearchProgress } from "@/components/ResearchProgress";
import { ResearchChat } from "@/components/ResearchChat";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { fetchAllKalshiEvents, fetchAllKalshiEventsWithMarkets, fetchEventMarkets, runBetResearch, fetchHotEvents } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { KalshiEvent, ResearchResult } from "@/types/kalshi";
import { Loader2 } from "lucide-react";

interface MarketCandidate {
  name: string;
  price: number;
}

interface CachedResearch {
  research: ResearchResult;
  marketPrice?: number;
  marketCandidates?: MarketCandidate[];
  steps: string[];
}

const Index = () => {
  const [events, setEvents] = useState<KalshiEvent[]>([]);
  const [hotEvents, setHotEvents] = useState<KalshiEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingHot, setLoadingHot] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<KalshiEvent | null>(null);
  const [researching, setResearching] = useState(false);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [marketPrice, setMarketPrice] = useState<number | undefined>(undefined);
  const [marketCandidates, setMarketCandidates] = useState<MarketCandidate[]>([]);
  const [tab, setTab] = useState<"saved" | "search">("search");
  const [researchSteps, setResearchSteps] = useState<string[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savedTickers, setSavedTickers] = useState<Set<string>>(() => {
    const stored = localStorage.getItem("betscope_saved");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const researchCache = useRef<Map<string, CachedResearch>>(new Map());
  const { toast } = useToast();

  useEffect(() => { loadEvents(); }, []);

  // Auto-refresh market prices every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllKalshiEventsWithMarkets()
        .then((enriched) => {
          console.log(`Auto-refresh: updated ${enriched.length} events`);
          setEvents((prev) => {
            const enrichedMap = new Map(enriched.map((e) => [e.event_ticker, e]));
            return prev.map((e) => enrichedMap.get(e.event_ticker) || e);
          });
        })
        .catch((err) => console.error("Auto-refresh failed:", err));
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => { localStorage.setItem("betscope_saved", JSON.stringify([...savedTickers])); }, [savedTickers]);

  async function loadEvents() {
    // Fetch hot events independently so they appear instantly
    setLoadingHot(true);
    fetchHotEvents()
      .then((hot) => { setHotEvents(hot); })
      .catch(() => { setHotEvents([]); })
      .finally(() => { setLoadingHot(false); });

    try {
      setLoadingEvents(true);
      const allEvents = await fetchAllKalshiEvents();
      console.log(`Loaded ${allEvents.length} events`);
      setEvents(allEvents);

      // Phase 2: Background enrichment with market data
      fetchAllKalshiEventsWithMarkets()
        .then((enriched) => {
          console.log(`Background enriched ${enriched.length} events with markets`);
          setEvents((prev) => {
            const enrichedMap = new Map(enriched.map((e) => [e.event_ticker, e]));
            return prev.map((e) => enrichedMap.get(e.event_ticker) || e);
          });
        })
        .catch((err) => console.error("Background market enrichment failed:", err));
    } catch (err) {
      console.error("Failed to load events:", err);
      toast({ title: "Failed to load markets", description: "Could not connect. Please try again.", variant: "destructive" });
    } finally {
      setLoadingEvents(false);
    }
  }

  function loadFromLocalStorage(ticker: string): CachedResearch | null {
    try {
      const raw = localStorage.getItem(`hedge_research_${ticker}`);
      if (!raw) return null;
      return JSON.parse(raw) as CachedResearch;
    } catch { return null; }
  }

  function saveToLocalStorage(ticker: string, data: CachedResearch) {
    try {
      localStorage.setItem(`hedge_research_${ticker}`, JSON.stringify(data));
    } catch { /* quota exceeded — ignore */ }
  }

  async function handleSelectEvent(event: KalshiEvent) {
    setSelectedEvent(event);

    // 1) In-memory cache (fastest)
    const cached = researchCache.current.get(event.event_ticker);
    if (cached) {
      setMarketPrice(cached.marketPrice);
      setMarketCandidates(cached.marketCandidates || []);
      setResearchSteps(cached.steps);
      setResearch(cached.research);
      setResearching(false);
      return;
    }

    // 2) localStorage cache (survives refresh)
    const lsCached = loadFromLocalStorage(event.event_ticker);
    if (lsCached) {
      researchCache.current.set(event.event_ticker, lsCached);
      setMarketPrice(lsCached.marketPrice);
      setMarketCandidates(lsCached.marketCandidates || []);
      setResearchSteps(lsCached.steps);
      setResearch(lsCached.research);
      setResearching(false);
      return;
    }

    setResearch(null);
    setResearching(true);
    setMarketPrice(undefined);
    setMarketCandidates([]);
    // Show placeholder steps INSTANTLY — replaced when real ones arrive
    setResearchSteps([
      "Gathering relevant data",
      "Analyzing key factors",
      "Checking recent news",
      "Evaluating historical patterns",
      "Assessing current conditions",
      "Forming probability estimate",
    ]);

    // Fire market fetch in background — never blocks research display
    const marketPromise = fetchEventMarkets(event.event_ticker).then((details) => {
      const markets = details.markets || [];
      let price: number | undefined;
      let candidates: MarketCandidate[] = [];
      if (markets.length > 1) {
        candidates = markets
          .filter(m => m.yes_bid != null && m.yes_bid > 0)
          .map(m => ({
            name: m.yes_sub_title || m.title.replace(event.title, "").trim() || m.title,
            price: m.yes_bid!,
          }))
          .sort((a, b) => b.price - a.price);
        setMarketCandidates(candidates);
        if (candidates.length > 0) {
          price = candidates[0].price;
          setMarketPrice(price);
        }
      } else {
        const market = markets[0];
        if (market?.yes_bid != null) { price = market.yes_bid; setMarketPrice(price); }
      }
      return { price, candidates };
    }).catch((e) => { console.error("Could not fetch market price:", e); return { price: undefined, candidates: [] as MarketCandidate[] }; });

    // Fire research request
    const researchPromise = runBetResearch(event.title, event.category || "General", event.sub_title || "", undefined, undefined, event.event_ticker);

    // Fire steps request in parallel (for progress animation while research loads)
    supabase.functions.invoke("bet-research", {
      body: { generateSteps: true, eventTitle: event.title, eventCategory: event.category || "General", eventTicker: event.event_ticker },
    }).then(({ data }) => {
      if (data?.steps) setResearchSteps(data.steps.slice(0, 6));
    }).catch(() => {});

    try {
      // Await research first — don't wait for market
      const result = await researchPromise;

      setResearch(result);
      setResearching(false);

      // Update in-memory cache immediately with research
      const cacheEntry: CachedResearch = { research: result, marketPrice: undefined, marketCandidates: [], steps: [] };
      researchCache.current.set(event.event_ticker, cacheEntry);
      saveToLocalStorage(event.event_ticker, cacheEntry);

      // When market data arrives, patch cache
      marketPromise.then((marketData) => {
        const existing = researchCache.current.get(event.event_ticker);
        if (existing) {
          existing.marketPrice = marketData.price;
          existing.marketCandidates = marketData.candidates;
          saveToLocalStorage(event.event_ticker, existing);
        }
      });
    } catch (err: any) {
      console.error("Research failed:", err);
      toast({ title: "Research failed", description: err.message || "Please try again.", variant: "destructive" });
      setResearching(false);
    }
  }

  async function handleMoreResearch() {
    if (!selectedEvent || !research || loadingMore) return;
    setLoadingMore(true);
    try {
      const { data, error } = await supabase.functions.invoke("bet-research", {
        body: {
          moreResearch: true,
          eventTitle: selectedEvent.title,
          eventCategory: selectedEvent.category || "General",
          eventDetails: selectedEvent.sub_title || "",
          existingCategories: research.categories.map(c => c.title),
        },
      });
      if (error) throw error;
      if (data?.categories) {
        const updated = { ...research, categories: [...research.categories, ...data.categories] };
        setResearch(updated);
        const existing = researchCache.current.get(selectedEvent.event_ticker);
        researchCache.current.set(selectedEvent.event_ticker, { research: updated, marketPrice, steps: existing?.steps || [] });
      }
    } catch (err) {
      console.error("More research failed:", err);
      toast({ title: "Could not load more", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoadingMore(false);
    }
  }

  function handleBack() {
    setSelectedEvent(null);
    setResearch(null);
    setResearching(false);
    setMarketPrice(undefined);
    setMarketCandidates([]);
    setResearchSteps([]);
  }

  function toggleSave(ticker: string) {
    setSavedTickers((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker); else next.add(ticker);
      return next;
    });
  }

  function getSavedBetSummary(event: KalshiEvent) {
    const cached = researchCache.current.get(event.event_ticker);
    if (!cached) return null;
    const { research, marketPrice } = cached;
    const topCandidate = research.candidates?.[0];
    const probability = research.probability?.estimate;
    const imageUrl = research.imageUrl;
    const hasCandidates = (research.candidates?.length ?? 0) > 0;
    return { topCandidate, probability, imageUrl, marketPrice, hasCandidates };
  }

  const savedEvents = events.filter((e) => savedTickers.has(e.event_ticker));

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {selectedEvent ? (
        <>
          <header className="sticky top-0 z-50 bg-chrome border-b border-chrome/80">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
              <button onClick={handleBack} className="flex items-center gap-2 text-chrome-foreground font-medium">
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm">Back</span>
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => toggleSave(selectedEvent.event_ticker)}>
                  <Bookmark className={`h-5 w-5 ${savedTickers.has(selectedEvent.event_ticker) ? "fill-primary text-primary" : "text-chrome-foreground/60"}`} />
                </button>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-40">
            <div className="pb-2">
              <p className="text-xs text-primary font-semibold uppercase tracking-wide">{selectedEvent.category}</p>
              <h2 className="text-xl font-bold text-foreground mt-1 leading-tight">{selectedEvent.title}</h2>
              {marketPrice != null && (
                <p className="text-sm text-muted-foreground mt-1">Market: <span className="font-semibold text-foreground">{Math.round(marketPrice * 100)}¢ Yes</span></p>
              )}
            </div>
            {researching && researchSteps.length > 0 && <ResearchProgress steps={researchSteps} isComplete={!!research} />}
            {research && (
              <>
                <ResearchResultView research={research} marketPrice={marketPrice} marketCandidates={marketCandidates} />
                {/* More research */}
                <div className="text-center pt-2 pb-4">
                  <button
                    onClick={handleMoreResearch}
                    disabled={loadingMore}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-1.5 justify-center">
                        <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                      </span>
                    ) : "More research"}
                  </button>
                </div>
                {/* Chat */}
                <ResearchChat eventTitle={selectedEvent.title} research={research} />
              </>
            )}
          </main>
        </>
      ) : (
        <>
          <header className="sticky top-0 z-50 bg-chrome border-b border-chrome/80">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
              <h1 className="text-lg font-bold text-chrome-foreground">Hedge AI</h1>
              <ThemeToggle />
            </div>
          </header>

          <main className="max-w-lg mx-auto px-4 py-4">
            {tab === "saved" && (
              <div className="space-y-2">
                {savedEvents.length === 0 ? (
                  <div className="py-52 text-center">
                    <Bookmark className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No saved bets yet</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Tap the bookmark icon to save bets</p>
                  </div>
                ) : (
                  savedEvents.map((event) => {
                    const summary = getSavedBetSummary(event);
                    const hasCandidates = summary?.hasCandidates;

                    return (
                      <button
                        key={event.event_ticker}
                        onClick={() => handleSelectEvent(event)}
                        className="w-full text-left p-4 bg-card rounded-xl border border-border hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            {summary?.imageUrl ? (
                              <AvatarImage src={summary.imageUrl} alt={event.title} className="object-cover" />
                            ) : null}
                            <AvatarFallback className="bg-muted">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-[14px] leading-snug">{event.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{event.category}</p>
                          </div>
                        </div>

                        {/* Candidate or probability text */}
                         {summary?.topCandidate && hasCandidates ? (
                          <p className="text-[11px] font-semibold text-primary mt-1 pl-[52px]">
                            {Math.round(summary.topCandidate.probability * 100)}% chance - {summary.topCandidate.name}
                          </p>
                         ) : summary?.probability != null ? (
                          <p className="text-[11px] font-semibold text-primary mt-1 pl-[52px]">
                            {Math.round(summary.probability * 100)}% chance
                          </p>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {tab === "search" && (
              <SearchScreen events={events} hotEvents={hotEvents} isLoading={loadingEvents} isLoadingHot={loadingHot} onSelectEvent={handleSelectEvent} />
            )}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-chrome border-t border-chrome/80 safe-bottom">
            <div className="max-w-lg mx-auto flex">
              <button
                onClick={() => setTab("search")}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${tab === "search" ? "text-primary" : "text-chrome-foreground/50"}`}
              >
                <TrendingUp className="h-5 w-5" />
                Explore
              </button>
              <button
                onClick={() => setTab("saved")}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${tab === "saved" ? "text-primary" : "text-chrome-foreground/50"}`}
              >
                <Bookmark className={`h-5 w-5 ${tab === "saved" ? "fill-primary" : ""}`} />
                Saved
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
};

export default Index;
