import { History, TrendingUp, BarChart3, Heart, Clock, MapPin, Trophy, Cloud, Brain, Users, Newspaper, AlertTriangle } from "lucide-react";
import type { ResearchResult as ResearchResultType } from "@/types/kalshi";

const ICON_MAP: Record<string, React.ElementType> = {
  history: History,
  trending: TrendingUp,
  stats: BarChart3,
  health: Heart,
  clock: Clock,
  map: MapPin,
  trophy: Trophy,
  cloud: Cloud,
  brain: Brain,
  users: Users,
  news: Newspaper,
  alert: AlertTriangle,
};

interface MarketCandidate {
  name: string;
  price: number;
}

interface Props {
  research: ResearchResultType;
  marketPrice?: number;
  marketCandidates?: MarketCandidate[];
}

function renderBoldText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function ResearchResult({ research, marketPrice, marketCandidates }: Props) {
  const marketPct = marketPrice != null ? Math.round(marketPrice * 100) : null;
  const hasCandidates = research.candidates && research.candidates.length > 0;
  const hasMarketCandidates = marketCandidates && marketCandidates.length > 1;

  // For candidates, use market data if available, otherwise fall back to AI
  const topMarketCandidate = hasMarketCandidates ? marketCandidates![0] : null;
  const topCandidate = hasCandidates ? research.candidates![0] : null;
  const displayName = topMarketCandidate?.name || topCandidate?.name;
  const displayPct = topMarketCandidate ? Math.round(topMarketCandidate.price * 100) : (topCandidate ? Math.round(topCandidate.probability * 100) : null);

  // For binary bets, use Kalshi market price
  const displayYesPct = marketPct ?? Math.round(research.probability.estimate * 100);

  return (
    <div className="space-y-3">
      {/* Event image */}
      {research.imageUrl && (
        <div className="rounded-2xl overflow-hidden border border-border">
          <img
            src={research.imageUrl}
            alt="Event illustration"
            className="w-full h-48 object-cover object-top"
          />
        </div>
      )}

      {/* Probability card */}
      <div className="bg-card rounded-2xl border border-border p-5">
        {hasCandidates && displayName ? (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold text-foreground">{displayPct}%</span>
            <span className="text-sm font-medium text-primary">{displayName}</span>
          </div>
        ) : (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold text-primary">Yes</span>
            <span className="text-4xl font-bold text-foreground">— {displayYesPct}%</span>
          </div>
        )}

        <p className="text-[14px] text-muted-foreground leading-relaxed">{research.probability.reasoning}</p>
      </div>

      {/* Candidates (for "who will" questions) */}

      {/* Candidate market prices */}
      {hasMarketCandidates && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Market Prices</p>
          <div className="space-y-3">
            {marketCandidates!.sort((a, b) => b.price - a.price).map((mc, i) => {
              const cpct = Math.round(mc.price * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] text-foreground font-semibold">{mc.name}</span>
                    <span className="text-[14px] font-bold text-primary">{cpct}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${cpct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {research.thresholds && research.thresholds.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Key Levels</p>
          <div className="space-y-3">
            {research.thresholds.map((t, i) => {
              const tpct = Math.round(t.probability * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] text-foreground font-medium">{t.level}</span>
                    <span className="text-[14px] font-bold text-primary">{tpct}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${tpct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categorized findings */}
      {research.categories.map((cat, i) => {
        const Icon = ICON_MAP[cat.icon] || Brain;
        return (
          <div key={i} className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{cat.title}</p>
            </div>
            <ul className="space-y-2">
              {cat.bullets.map((bullet, j) => (
                <li key={j} className="flex gap-2.5">
                  <span className="text-primary mt-0.5 text-sm flex-shrink-0">•</span>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">{renderBoldText(bullet)}</p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
