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
  const pct = Math.round(research.probability.estimate * 100);
  const marketPct = marketPrice != null ? Math.round(marketPrice * 100) : null;
  const gap = marketPct != null ? pct - marketPct : null;
  const hasCandidates = research.candidates && research.candidates.length > 0;
  const hasMarketCandidates = marketCandidates && marketCandidates.length > 1;
  const topCandidate = hasCandidates ? research.candidates![0] : null;
  const topCandidatePct = topCandidate ? Math.round(topCandidate.probability * 100) : null;

  return (
    <div className="space-y-3">
      {/* Event image */}
      {research.imageUrl && (
        <div className="rounded-2xl overflow-hidden border border-border">
          <img
            src={research.imageUrl}
            alt="Event illustration"
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Probability card */}
      <div className="bg-card rounded-2xl border border-border p-5">
        {hasCandidates ? (
          <>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold text-foreground">{topCandidatePct}%</span>
              <span className="text-sm font-medium text-primary">{topCandidate!.name}</span>
            </div>
          </>
        ) : (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold text-foreground">{pct}%</span>
            <span className="text-sm font-medium text-primary">Yes</span>
          </div>
        )}

        <p className="text-[14px] text-muted-foreground leading-relaxed">{research.probability.reasoning}</p>
      </div>

      {/* Candidates (for "who will" questions) */}
      {research.candidates && research.candidates.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Top Candidates</p>
          <div className="space-y-3">
            {research.candidates.map((c, i) => {
              const cpct = Math.round(c.probability * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] text-foreground font-semibold">{c.name}</span>
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

      {/* Kalshi vs AI comparison for candidate questions */}
      {hasCandidates && hasMarketCandidates && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Kalshi vs BetScope</p>
          <div className="space-y-2.5">
            {/* Header row */}
            <div className="flex items-center text-[11px] text-muted-foreground font-medium uppercase tracking-wide mb-1">
              <span className="flex-1">Candidate</span>
              <span className="w-16 text-right">Kalshi</span>
              <span className="w-16 text-right">AI</span>
              <span className="w-14 text-right">Diff</span>
            </div>
            {/* Merge candidates: use AI list as base, match with market */}
            {research.candidates!.map((aiC, i) => {
              const aiPct = Math.round(aiC.probability * 100);
              // Find matching market candidate (fuzzy match on name)
              const marketMatch = marketCandidates!.find(mc =>
                mc.name.toLowerCase().includes(aiC.name.toLowerCase().split(" ")[0]) ||
                aiC.name.toLowerCase().includes(mc.name.toLowerCase().split(" ")[0])
              );
              const kalshiPct = marketMatch ? Math.round(marketMatch.price * 100) : null;
              const diff = kalshiPct != null ? aiPct - kalshiPct : null;

              return (
                <div key={i} className="flex items-center py-1.5 border-t border-border/50 first:border-t-0">
                  <span className="flex-1 text-[13px] text-foreground font-medium truncate pr-2">{aiC.name}</span>
                  <span className="w-16 text-right text-[13px] text-muted-foreground font-semibold">
                    {kalshiPct != null ? `${kalshiPct}%` : "—"}
                  </span>
                  <span className="w-16 text-right text-[13px] text-primary font-semibold">{aiPct}%</span>
                  <span className={`w-14 text-right text-[12px] font-bold ${
                    diff != null && Math.abs(diff) >= 5
                      ? diff > 0 ? "text-green-600" : "text-red-500"
                      : "text-muted-foreground"
                  }`}>
                    {diff != null ? `${diff > 0 ? "+" : ""}${diff}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kalshi vs AI comparison for binary bets */}
      {!hasCandidates && marketPct != null && gap != null && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Kalshi vs BetScope</p>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-muted-foreground">{marketPct}%</p>
              <p className="text-[11px] text-muted-foreground mt-1">Kalshi</p>
            </div>
            <div className={`text-center px-4 py-1 rounded-full text-sm font-bold ${
              Math.abs(gap) >= 10 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {gap > 0 ? "+" : ""}{gap}
            </div>
            <div className="text-center flex-1">
              <p className="text-2xl font-bold text-primary">{pct}%</p>
              <p className="text-[11px] text-primary mt-1">BetScope AI</p>
            </div>
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
