import { useState, useEffect } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { BetSearch } from "@/components/BetSearch";
import { ResearchResult as ResearchResultView } from "@/components/ResearchResult";
import { ResearchProgress } from "@/components/ResearchProgress";
import { fetchKalshiEvents, runBetResearch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { KalshiEvent, ResearchResult } from "@/types/kalshi";

const Index = () => {
  const [events, setEvents] = useState<KalshiEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<KalshiEvent | null>(null);
  const [researching, setResearching] = useState(false);
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

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
    setResearch(null);
    setResearching(true);

    try {
      const result = await runBetResearch(
        event.title,
        event.category || "General",
        event.sub_title || ""
      );
      setResearch(result);
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
  }

  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          {selectedEvent ? (
            <button onClick={handleBack} className="flex items-center gap-2 text-primary font-medium">
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">Back</span>
            </button>
          ) : (
            <h1 className="text-lg font-bold text-foreground">BetScope</h1>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Browse mode */}
        {!selectedEvent && (
          <div className="space-y-5">
            <BetSearch
              events={events}
              isLoading={loadingEvents}
              onSelectEvent={handleSelectEvent}
            />

            {/* Category pills */}
            {!loadingEvents && events.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                {Array.from(new Set(events.map((e) => e.category).filter(Boolean)))
                  .slice(0, 8)
                  .map((cat) => (
                    <span
                      key={cat}
                      className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium whitespace-nowrap"
                    >
                      {cat}
                    </span>
                  ))}
              </div>
            )}

            {/* Event list */}
            {!loadingEvents && events.length > 0 && (
              <div className="space-y-2">
                {events.slice(0, 30).map((event) => (
                  <button
                    key={event.event_ticker}
                    onClick={() => handleSelectEvent(event)}
                    className="w-full text-left p-4 bg-card rounded-xl border border-border hover:border-primary/40 transition-colors"
                  >
                    <p className="font-medium text-foreground text-[15px] leading-snug">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{event.category}</p>
                  </button>
                ))}
              </div>
            )}

            {loadingEvents && (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-secondary rounded-xl animate-pulse" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Research mode */}
        {selectedEvent && (
          <div className="space-y-4">
            <div className="pb-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{selectedEvent.category}</p>
              <h2 className="text-xl font-bold text-foreground mt-1 leading-tight">{selectedEvent.title}</h2>
            </div>

            {researching && <ResearchProgress />}
            {research && <ResearchResultView research={research} />}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
