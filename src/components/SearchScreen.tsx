import { useState, useMemo } from "react";
import { Search, Globe, Cloud, FlaskConical, Landmark, Trophy, Tv, Bitcoin, BarChart3, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { KalshiEvent } from "@/types/kalshi";

interface Props {
  events: KalshiEvent[];
  hotEvents: KalshiEvent[];
  isLoading: boolean;
  onSelectEvent: (event: KalshiEvent) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  Politics: { icon: Landmark, color: "text-blue-600", bg: "bg-blue-100" },
  Economics: { icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-100" },
  Climate: { icon: Cloud, color: "text-sky-600", bg: "bg-sky-100" },
  Science: { icon: FlaskConical, color: "text-purple-600", bg: "bg-purple-100" },
  Sports: { icon: Trophy, color: "text-orange-600", bg: "bg-orange-100" },
  Entertainment: { icon: Tv, color: "text-pink-600", bg: "bg-pink-100" },
  Crypto: { icon: Bitcoin, color: "text-amber-600", bg: "bg-amber-100" },
  World: { icon: Globe, color: "text-indigo-600", bg: "bg-indigo-100" },
};

function getCategoryStyle(category: string) {
  const key = Object.keys(CATEGORY_CONFIG).find(
    (k) => category?.toLowerCase().includes(k.toLowerCase())
  );
  return key ? CATEGORY_CONFIG[key] : { icon: Globe, color: "text-muted-foreground", bg: "bg-muted" };
}

export function SearchScreen({ events, hotEvents, isLoading, onSelectEvent }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
    );
  }, [events, query]);

  return (
    <div className="space-y-6 pb-20">
      {/* Hero section */}
      <div className="pt-8 pb-2 text-center">
        <h2 className="text-3xl font-bold text-foreground">Research Your Bet</h2>
        <p className="text-sm text-muted-foreground mt-2">Make more informed trades</p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isLoading ? "Loading..." : "Search markets"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 text-[15px] bg-card border border-border rounded-xl placeholder:text-muted-foreground"
          disabled={isLoading}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Search results when typing */}
      {!isLoading && query && (
        <>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">No results for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.slice(0, 15).map((event) => {
                const style = getCategoryStyle(event.category);
                const Icon = style.icon;
                const market = event.markets?.[0];
                const yesPrice = market?.yes_bid != null ? Math.round(market.yes_bid * 100) : null;
                return (
                  <button
                    key={event.event_ticker}
                    onClick={() => onSelectEvent(event)}
                    className="w-full text-left px-4 py-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors flex items-center gap-3"
                  >
                    <div className={`p-1.5 rounded-lg ${style.bg} flex-shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                    </div>
                    <p className="font-medium text-foreground text-[14px] leading-snug flex-1">{event.title}</p>
                    {yesPrice != null && (
                      <span className="text-xs font-semibold text-primary flex-shrink-0">{yesPrice}¢</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Hottest Bets (default view, no query) */}
      {!isLoading && !query && hotEvents.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Hottest Bets Right Now</h3>
          </div>
          <div className="space-y-1.5">
            {hotEvents.map((event) => {
              const style = getCategoryStyle(event.category);
              const Icon = style.icon;
              const market = event.markets?.[0];
              const yesPrice = market?.yes_bid != null ? Math.round(market.yes_bid * 100) : null;
              return (
                <button
                  key={event.event_ticker}
                  onClick={() => onSelectEvent(event)}
                  className="w-full text-left px-4 py-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors flex items-center gap-3"
                >
                  <div className={`p-1.5 rounded-lg ${style.bg} flex-shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                  </div>
                  <p className="font-medium text-foreground text-[14px] leading-snug flex-1">{event.title}</p>
                  {yesPrice != null && (
                    <span className="text-xs font-semibold text-primary flex-shrink-0">{yesPrice}¢</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
