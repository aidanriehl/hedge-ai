import { useState, useMemo } from "react";
import { Search, Globe, Cloud, FlaskConical, Landmark, Trophy, Tv, Bitcoin, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { KalshiEvent } from "@/types/kalshi";

interface Props {
  events: KalshiEvent[];
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

function getEventIcon(category: string) {
  const style = getCategoryStyle(category);
  return style;
}

export function SearchScreen({ events, isLoading, onSelectEvent }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return events;
    const q = query.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q)
    );
  }, [events, query]);

  // Group by category
  const grouped = useMemo(() => {
    const target = query ? filtered : events;
    const map = new Map<string, KalshiEvent[]>();
    for (const e of target) {
      const cat = e.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(e);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered, events, query]);

  return (
    <div className="space-y-5 pb-20">
      {/* Headline */}
      <div className="pt-1 pb-2">
        <h2 className="text-2xl font-bold text-foreground">Explore Markets</h2>
        <p className="text-sm text-muted-foreground mt-1">AI-powered research on prediction markets</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isLoading ? "Loading..." : "Search markets"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11 text-[15px] bg-card border border-border rounded-xl placeholder:text-muted-foreground"
          disabled={isLoading}
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Categorized list */}
      {!isLoading && grouped.map(([category, catEvents]) => {
        const { icon: Icon, color, bg } = getCategoryStyle(category);
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${bg}`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</h3>
              <span className="text-xs text-muted-foreground/50">{catEvents.length}</span>
            </div>
            <div className="space-y-1.5">
              {catEvents.slice(0, query ? 10 : 2).map((event) => {
                const evStyle = getEventIcon(event.category);
                const EvIcon = evStyle.icon;
                // Get market price if available
                const market = event.markets?.[0];
                const yesPrice = market?.yes_bid != null ? Math.round(market.yes_bid * 100) : null;

                return (
                  <button
                    key={event.event_ticker}
                    onClick={() => onSelectEvent(event)}
                    className="w-full text-left px-4 py-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors flex items-center gap-3"
                  >
                    <div className={`p-1.5 rounded-lg ${evStyle.bg} flex-shrink-0`}>
                      <EvIcon className={`h-3.5 w-3.5 ${evStyle.color}`} />
                    </div>
                    <p className="font-medium text-foreground text-[14px] leading-snug flex-1">{event.title}</p>
                    {yesPrice != null && (
                      <span className="text-xs font-semibold text-primary flex-shrink-0">{yesPrice}¢</span>
                    )}
                  </button>
                );
              })}
              {!query && catEvents.length > 2 && (
                <p className="text-xs text-muted-foreground pl-4 py-1">+{catEvents.length - 2} more</p>
              )}
            </div>
          </div>
        );
      })}

      {!isLoading && query && filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-sm">No results for "{query}"</p>
        </div>
      )}
    </div>
  );
}
