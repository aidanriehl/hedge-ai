import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Bookmark, TrendingUp, Globe } from "lucide-react";
import { SearchScreen } from "@/components/SearchScreen";
import { ResearchResult as ResearchResultView } from "@/components/ResearchResult";
import { ResearchProgress } from "@/components/ResearchProgress";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { fetchKalshiEvents, fetchEventMarkets, runBetResearch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { KalshiEvent, ResearchResult } from "@/types/kalshi";

interface CachedResearch {
  research: ResearchResult;
  marketPrice?: number;
}

const Index = () => {
  const [events, setEvents] = useState<KalshiEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<KalshiEvent | null>(null);
  const [researching, setResearching] = useState(false);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [marketPrice, setMarketPrice] = useState<number | undefined>(undefined);
  const [tab, setTab] = useState<"saved" | "search">("search");
  const [savedTickers, setSavedTickers] = useState<Set<string>>(() => {
    const stored = localStorage.getItem("betscope_saved");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  const researchCache = useRef<Map<string, CachedResearch>>(new Map());
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    localStorage.setItem("betscope_saved", JSON.stringify([...savedTickers]));
  }, [savedTickers]);

  async function loadEvents() {
    try {
      setLoadingEvents(true);
      const result = await fetchKalshiEvents();
      setEvents(result.events);
    } catch (err) {
      console.error("Failed to load events:", err);
      toast({
        title: "Failed to load markets",
        description: "Could not connect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingEvents(false);
    }
  }

  async function handleSelectEvent(event: KalshiEvent) {
    setSelectedEvent(event);

    // Check cache first
    const cached = researchCache.current.get(event.event_ticker);
    if (cached) {
      setResearch(cached.research);
      setMarketPrice(cached.marketPrice);
      setResearching(false);
      return;
    }

    setResearch(null);
    setResearching(true);
    setMarketPrice(undefined);

    let price: number | undefined;
    try {
      const details = await fetchEventMarkets(event.event_ticker);
      const market = details.markets?.[0];
      if (market?.yes_bid != null) {
        price = market.yes_bid;
        setMarketPrice(price);
      }
    } catch (e) {
      console.error("Could not fetch market price:", e);
    }

    try {
      const result = await runBetResearch(
        event.title,
        event.category || "General",
        event.sub_title || "",
        price
      );
      setResearch(result);
      // Store in cache
      researchCache.current.set(event.event_ticker, { research: result, marketPrice: price });
    } catch (err: any) {
      console.error("Research failed:", err);
      toast({
        title: "Research failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setResearching(false);
    }
  }

  function handleBack() {
    setSelectedEvent(null);
    setResearch(null);
    setResearching(false);
    setMarketPrice(undefined);
  }

  function toggleSave(ticker: string) {
    setSavedTickers((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
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
    return { topCandidate, probability, imageUrl, marketPrice };
  }

  const savedEvents = events.filter((e) => savedTickers.has(e.event_ticker));

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {selectedEvent ? (
        <>
          <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
              <button onClick={handleBack} className="flex items-center gap-2 text-primary font-medium">
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm">Back</span>
              </button>
              <button
                onClick={() => toggleSave(selectedEvent.event_ticker)}
                className="ml-auto"
              >
                <Bookmark
                  className={`h-5 w-5 ${savedTickers.has(selectedEvent.event_ticker) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              </button>
            </div>
          </header>
          <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
            <div className="pb-2">
              <p className="text-xs text-primary font-semibold uppercase tracking-wide">{selectedEvent.category}</p>
              <h2 className="text-xl font-bold text-foreground mt-1 leading-tight">{selectedEvent.title}</h2>
              {marketPrice != null && (
                <p className="text-sm text-muted-foreground mt-1">Market: <span className="font-semibold text-foreground">{Math.round(marketPrice * 100)}¢ Yes</span></p>
              )}
            </div>
            {researching && <ResearchProgress />}
            {research && <ResearchResultView research={research} marketPrice={marketPrice} />}
          </main>
        </>
      ) : (
        <>
          <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
            <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
              <h1 className="text-lg font-bold text-foreground">BetScope</h1>
            </div>
          </header>

          <main className="max-w-lg mx-auto px-4 py-4">
            {tab === "saved" && (
              <div className="space-y-2">
                {savedEvents.length === 0 ? (
                  <div className="py-16 text-center">
                    <Bookmark className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No saved bets yet</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Tap the bookmark icon to save bets</p>
                  </div>
                ) : (
                  savedEvents.map((event) => {
                    const summary = getSavedBetSummary(event);
                    const probability = summary?.probability;
                    const progressValue = probability != null ? Math.round(probability * 100) : null;
                    
                    return (
                      <button
                        key={event.event_ticker}
                        onClick={() => handleSelectEvent(event)}
                        className="w-full text-left p-4 bg-card rounded-xl border border-border hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar */}
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            {summary?.imageUrl ? (
                              <AvatarImage src={summary.imageUrl} alt={event.title} />
                            ) : null}
                            <AvatarFallback className="bg-muted">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>

                          {/* Title & category */}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-[14px] leading-snug truncate">{event.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{event.category}</p>
                          </div>

                          {/* Probability badge */}
                          {summary?.topCandidate ? (
                            <span className="text-xs font-semibold text-primary flex-shrink-0">
                              {summary.topCandidate.name} – {Math.round(summary.topCandidate.probability * 100)}%
                            </span>
                          ) : progressValue != null ? (
                            <span className="text-xs font-semibold text-primary flex-shrink-0">
                              {progressValue}% Yes
                            </span>
                          ) : null}
                        </div>

                        {/* Progress bar */}
                        {progressValue != null && (
                          <Progress value={progressValue} className="h-1 mt-3" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {tab === "search" && (
              <SearchScreen
                events={events}
                isLoading={loadingEvents}
                onSelectEvent={handleSelectEvent}
              />
            )}
          </main>

          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border safe-bottom">
            <div className="max-w-lg mx-auto flex">
              <button
                onClick={() => setTab("search")}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  tab === "search" ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <TrendingUp className="h-5 w-5" />
                Explore
              </button>
              <button
                onClick={() => setTab("saved")}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  tab === "saved" ? "text-primary" : "text-muted-foreground"
                }`}
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
