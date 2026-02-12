import { useState, useEffect } from "react";
import { Zap, TrendingUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BetSearch } from "@/components/BetSearch";
import { ResearchCategoryCard } from "@/components/ResearchCategoryCard";
import { ProbabilityDisplay } from "@/components/ProbabilityDisplay";
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
        title: "Failed to load bets",
        description: "Could not connect to Kalshi. Please try again.",
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
        description: err.message || "Could not complete research. Please try again.",
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleBack}>
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 glow-green">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">BetScope</h1>
              <p className="text-xs text-muted-foreground font-mono">AI Research Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-mono text-muted-foreground">
              {events.length} active bets
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* No event selected - show search */}
        {!selectedEvent && (
          <div className="space-y-8">
            <div className="text-center pt-12 pb-8">
              <h2 className="text-3xl font-bold text-foreground mb-3">
                Deep Research on <span className="text-gradient-primary">Any Bet</span>
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Select a Kalshi bet and get exhaustive AI-powered research with probability estimates,
                historical analysis, and expert insights.
              </p>
            </div>

            <BetSearch
              events={events}
              isLoading={loadingEvents}
              onSelectEvent={handleSelectEvent}
            />

            {/* Category chips */}
            {!loadingEvents && events.length > 0 && (
              <div className="pt-4">
                <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3 text-center">
                  Popular Categories
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {Array.from(new Set(events.map((e) => e.category).filter(Boolean)))
                    .slice(0, 8)
                    .map((cat) => (
                      <span
                        key={cat}
                        className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-mono border border-border hover:border-primary/30 transition-colors cursor-default"
                      >
                        {cat}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {loadingEvents && (
              <div className="text-center py-8">
                <div className="shimmer h-14 max-w-2xl mx-auto rounded-xl" />
              </div>
            )}
          </div>
        )}

        {/* Event selected - show research */}
        {selectedEvent && (
          <div className="space-y-6">
            {/* Back + event info */}
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="mt-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <span className="text-xs font-mono uppercase tracking-wider text-primary mb-1 block">
                  {selectedEvent.category}
                </span>
                <h2 className="text-2xl font-bold text-foreground">{selectedEvent.title}</h2>
                {selectedEvent.sub_title && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedEvent.sub_title}</p>
                )}
              </div>
            </div>

            {/* Loading */}
            {researching && <ResearchProgress />}

            {/* Results */}
            {research && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Research Findings
                  </span>
                  <span className="text-xs font-mono text-primary">
                    {research.categories.length} categories analyzed
                  </span>
                </div>

                {/* Research categories */}
                <div className="space-y-3">
                  {research.categories.map((cat, i) => (
                    <ResearchCategoryCard key={i} category={cat} index={i} />
                  ))}
                </div>

                {/* Probability */}
                <div className="pt-4">
                  <ProbabilityDisplay probability={research.probability} />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
