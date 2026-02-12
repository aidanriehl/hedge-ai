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
}

export function ResearchResult({ research }: Props) {
  const pct = Math.round(research.probability.estimate * 100);

  return (
    <div className="space-y-3">
      {/* Probability card */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold text-foreground">{pct}%</span>
          <span className="text-sm text-muted-foreground">estimated probability</span>
        </div>
        <p className="text-[14px] text-muted-foreground leading-relaxed">{research.probability.reasoning}</p>
      </div>

      {/* Candidates (for "who will" questions) */}
      {research.candidates && research.candidates.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Top Candidates</p>
          <div className="space-y-2.5">
            {research.candidates.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[14px] text-foreground font-medium">{c.name}</span>
                <span className="text-[14px] font-semibold text-primary">{Math.round(c.probability * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thresholds (for "how high/much" questions) */}
      {research.thresholds && research.thresholds.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Key Thresholds</p>
          <div className="space-y-2.5">
            {research.thresholds.map((t, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[14px] text-foreground font-medium">{t.level}</span>
                <span className="text-[14px] font-semibold text-primary">{Math.round(t.probability * 100)}%</span>
              </div>
            ))}
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
                  <p className="text-[14px] text-foreground leading-relaxed">{bullet}</p>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
