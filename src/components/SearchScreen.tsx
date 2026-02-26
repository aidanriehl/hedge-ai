import { useState, useMemo } from "react";
import {
  Search, Globe, Cloud, FlaskConical, Landmark, Trophy, Tv, Bitcoin, BarChart3, Flame,
  Rocket, Mountain, Swords, Zap, DollarSign, Cpu, HeartPulse, Plane, Ship, Scale,
  GraduationCap, Atom, Microscope, Dna, TreePine, Droplets, Sun, Wind, Car, Building2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { KalshiEvent } from "@/types/kalshi";

interface Props {
  events: KalshiEvent[];
  hotEvents: KalshiEvent[];
  isLoading: boolean;
  isLoadingHot?: boolean;
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

// Keyword → icon overrides based on bet title content
const KEYWORD_ICONS: { keywords: string[]; icon: React.ElementType; color: string; bg: string }[] = [
  { keywords: ["mars", "space", "rocket", "spacex", "nasa", "moon", "orbit", "asteroid"], icon: Rocket, color: "text-violet-600", bg: "bg-violet-100" },
  { keywords: ["volcano", "supervolcano", "eruption", "erupt", "lava", "yellowstone"], icon: Mountain, color: "text-red-600", bg: "bg-red-100" },
  { keywords: ["war", "military", "invasion", "conflict", "army", "nato"], icon: Swords, color: "text-red-600", bg: "bg-red-100" },
  { keywords: ["earthquake", "tsunami", "hurricane", "tornado", "storm"], icon: Zap, color: "text-yellow-600", bg: "bg-yellow-100" },
  { keywords: ["fed", "interest rate", "inflation", "recession", "gdp", "stock market", "s&p"], icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-100" },
  { keywords: ["ai ", "artificial intelligence", "chatgpt", "openai", "machine learning", "agi"], icon: Cpu, color: "text-cyan-600", bg: "bg-cyan-100" },
  { keywords: ["covid", "pandemic", "vaccine", "virus", "disease", "health", "cancer"], icon: HeartPulse, color: "text-rose-600", bg: "bg-rose-100" },
  { keywords: ["flight", "airline", "aviation", "airport"], icon: Plane, color: "text-sky-600", bg: "bg-sky-100" },
  { keywords: ["ocean", "sea level", "marine", "submarine"], icon: Ship, color: "text-blue-600", bg: "bg-blue-100" },
  { keywords: ["court", "supreme court", "legal", "lawsuit", "trial", "justice"], icon: Scale, color: "text-slate-600", bg: "bg-slate-100" },
  { keywords: ["university", "college", "education", "school", "student"], icon: GraduationCap, color: "text-indigo-600", bg: "bg-indigo-100" },
  { keywords: ["nuclear", "fusion", "fission", "atomic"], icon: Atom, color: "text-orange-600", bg: "bg-orange-100" },
  { keywords: ["research", "study", "lab", "experiment"], icon: Microscope, color: "text-purple-600", bg: "bg-purple-100" },
  { keywords: ["gene", "genetic", "dna", "crispr", "clone"], icon: Dna, color: "text-teal-600", bg: "bg-teal-100" },
  { keywords: ["forest", "deforestation", "amazon", "wildfire"], icon: TreePine, color: "text-green-600", bg: "bg-green-100" },
  { keywords: ["flood", "rain", "drought", "water"], icon: Droplets, color: "text-blue-600", bg: "bg-blue-100" },
  { keywords: ["solar", "heat wave", "temperature record"], icon: Sun, color: "text-amber-600", bg: "bg-amber-100" },
  { keywords: ["wind energy", "renewable", "clean energy"], icon: Wind, color: "text-teal-600", bg: "bg-teal-100" },
  { keywords: ["tesla", "ev ", "electric vehicle", "self-driving", "autonomous"], icon: Car, color: "text-slate-600", bg: "bg-slate-100" },
  { keywords: ["real estate", "housing", "mortgage", "rent"], icon: Building2, color: "text-stone-600", bg: "bg-stone-100" },
];

const SEARCH_SYNONYMS: Record<string, string[]> = {
  tennis: ["atp", "wta", "wimbledon", "roland garros", "us open tennis", "australian open", "french open"],
  basketball: ["nba", "ncaa basketball", "march madness", "wnba"],
  soccer: ["premier league", "la liga", "champions league", "mls", "fifa", "world cup soccer"],
  football: ["nfl", "super bowl", "touchdown"],
  baseball: ["mlb", "world series"],
  hockey: ["nhl", "stanley cup"],
  golf: ["pga", "masters", "ryder cup"],
  boxing: ["ufc", "mma", "fight"],
  racing: ["f1", "formula 1", "nascar", "grand prix"],
  crypto: ["bitcoin", "ethereum", "btc", "eth", "solana", "dogecoin"],
  ai: ["artificial intelligence", "openai", "chatgpt", "gpt", "machine learning", "agi"],
  elections: ["democrat", "republican", "gop", "presidential", "senate", "congress", "governor"],
  weather: ["hurricane", "tornado", "temperature", "heat wave", "drought", "flood"],
};

function getIconForEvent(title: string, category: string) {
  const titleLower = title.toLowerCase();
  // Check keyword overrides first
  for (const entry of KEYWORD_ICONS) {
    if (entry.keywords.some((kw) => titleLower.includes(kw))) {
      return { icon: entry.icon, color: entry.color, bg: entry.bg };
    }
  }
  // Fall back to category
  const key = Object.keys(CATEGORY_CONFIG).find(
    (k) => category?.toLowerCase().includes(k.toLowerCase())
  );
  return key ? CATEGORY_CONFIG[key] : { icon: Globe, color: "text-muted-foreground", bg: "bg-muted" };
}

export function SearchScreen({ events, hotEvents, isLoading, isLoadingHot, onSelectEvent }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    const searchTerms = [q];
    for (const [key, synonyms] of Object.entries(SEARCH_SYNONYMS)) {
      if (q.includes(key)) searchTerms.push(...synonyms);
      if (synonyms.some(s => q.includes(s))) searchTerms.push(key);
    }
    return events.filter((e) =>
      searchTerms.some(term =>
        e.title.toLowerCase().includes(term) ||
        e.category?.toLowerCase().includes(term) ||
        e.sub_title?.toLowerCase().includes(term) ||
        e.markets?.some((m) => m.title?.toLowerCase().includes(term))
      )
    );
  }, [events, query]);

  const displayedHotEvents = useMemo(() => {
    if (hotEvents.length > 0) return hotEvents;
    const result: KalshiEvent[] = [];
    const usedCategories = new Set<string>();
    for (const event of events) {
      const cat = (event.category || "").toLowerCase();
      if (usedCategories.has(cat)) continue;
      result.push(event);
      usedCategories.add(cat);
      if (result.length >= 3) break;
    }
    return result;
  }, [hotEvents, events]);

  return (
    <div className="space-y-6 pb-20">
      <div className="pt-8 pb-2 text-center">
        <h2 className="text-3xl font-bold text-foreground">Research Your Bet</h2>
        <p className="text-sm text-muted-foreground mt-2">Make more informed trades</p>
      </div>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={isLoading ? "Loading bets..." : "Search bet or topic"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 text-[15px] bg-card border border-border rounded-2xl placeholder:text-muted-foreground"
          disabled={isLoading}
        />
      </div>

      {!isLoading && query && (
        <>
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground text-sm">No results for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.slice(0, 15).map((event) => {
                const style = getIconForEvent(event.title, event.category);
                const Icon = style.icon;
                const markets = event.markets || [];
                const isMultiCandidate = markets.length > 1;
                const topMarket = isMultiCandidate
                  ? markets.reduce((best, m) => (m.yes_bid ?? 0) > (best.yes_bid ?? 0) ? m : best, markets[0])
                  : markets[0];
                const rawPrice = topMarket?.yes_bid;
                const yesPrice = rawPrice != null ? (rawPrice > 1 ? Math.round(rawPrice) : Math.round(rawPrice * 100)) : null;
                const candidateName = isMultiCandidate && topMarket ? (topMarket.yes_sub_title || topMarket.title || null) : null;
                return (
                  <button
                    key={event.event_ticker}
                    onClick={() => onSelectEvent(event)}
                    className="w-full text-left px-4 py-3 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors flex items-center gap-3"
                  >
                    <div className={`p-1.5 rounded-lg ${style.bg} flex-shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-[14px] leading-snug">{event.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{event.category}</span>
                        {yesPrice != null && (
                          <span className="text-[11px] font-semibold text-primary">
                            {candidateName ? `${candidateName} · ${yesPrice}%` : `Yes · ${yesPrice}%`}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {!query && (isLoadingHot ? (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Hottest Bets Right Now</h3>
          </div>
          <div className="space-y-1.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : displayedHotEvents.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Hottest Bets Right Now</h3>
          </div>
          <div className="space-y-1.5">
            {displayedHotEvents.map((event) => {
              const style = getIconForEvent(event.title, event.category);
              const Icon = style.icon;
              const markets = event.markets || [];
              const isMultiCandidate = markets.length > 1;
              const topMarket = isMultiCandidate
                ? markets.reduce((best, m) => (m.yes_bid ?? 0) > (best.yes_bid ?? 0) ? m : best, markets[0])
                : markets[0];
              const yesPrice = topMarket?.yes_bid != null ? Math.round(topMarket.yes_bid * 100) : null;
              const candidateName = isMultiCandidate && topMarket ? (topMarket.yes_sub_title || topMarket.title || null) : null;
              return (
                <button
                  key={event.event_ticker}
                  onClick={() => onSelectEvent(event)}
                  className="w-full text-left px-4 py-3 bg-card rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all flex items-center gap-3"
                >
                    <div className={`p-1.5 rounded-lg ${style.bg} flex-shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-[14px] leading-snug">{event.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{event.category}</span>
                        {yesPrice != null && (
                          <span className="text-[11px] font-semibold text-primary">
                            {candidateName ? `${candidateName} · ${yesPrice}%` : `Yes · ${yesPrice}%`}
                          </span>
                        )}
                    </div>
                    </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
