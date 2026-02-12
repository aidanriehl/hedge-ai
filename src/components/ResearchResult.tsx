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

interface Props {
  research: ResearchResultType;
  marketPrice?: number;
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

export function ResearchResult({ research, marketPrice }: Props) {
  const pct = Math.round(research.probability.estimate * 100);
  const marketPct = marketPrice != null ? Math.round(marketPrice * 100) : null;
  const gap = marketPct != null ? pct - marketPct : null;

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
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-4xl font-bold text-foreground">{pct}%</span>
          <span className="text-sm font-medium text-primary">Yes</span>
        </div>

        {/* Market comparison */}
        {marketPct != null && gap != null && (
          <div className="flex items-center gap-3 mb-2 text-sm">
            <span className="text-muted-foreground">Market: <span className="font-semibold text-foreground">{marketPct}%</span></span>
            <span className="text-muted-foreground">•</span>
            <span className={`font-semibold ${Math.abs(gap) >= 10 ? "text-primary" : "text-muted-foreground"}`}>
              {gap > 0 ? "+" : ""}{gap}% vs AI
            </span>
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

      {/* Thresholds (for "how high/much" questions) */}
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
