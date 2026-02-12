import { useState } from "react";
import { History, TrendingUp, BarChart3, HeartPulse, Clock, MapPin, Trophy, Cloud, Brain, Users, Newspaper, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import type { ResearchCategory } from "@/types/kalshi";

const iconMap: Record<string, React.ElementType> = {
  history: History,
  trending: TrendingUp,
  stats: BarChart3,
  health: HeartPulse,
  clock: Clock,
  map: MapPin,
  trophy: Trophy,
  cloud: Cloud,
  brain: Brain,
  users: Users,
  news: Newspaper,
  alert: AlertTriangle,
};

const confidenceColors = {
  high: "text-primary",
  medium: "text-warning",
  low: "text-destructive",
};

const confidenceBg = {
  high: "bg-primary/10 border-primary/20",
  medium: "bg-warning/10 border-warning/20",
  low: "bg-destructive/10 border-destructive/20",
};

interface ResearchCategoryCardProps {
  category: ResearchCategory;
  index: number;
}

export function ResearchCategoryCard({ category, index }: ResearchCategoryCardProps) {
  const [isOpen, setIsOpen] = useState(index < 3);
  const Icon = iconMap[category.icon] || BarChart3;

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden transition-all duration-200 hover:border-primary/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${confidenceBg[category.confidence]}`}>
            <Icon className={`h-4 w-4 ${confidenceColors[category.confidence]}`} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{category.title}</h3>
            <span className={`text-xs font-mono uppercase tracking-wider ${confidenceColors[category.confidence]}`}>
              {category.confidence} confidence
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono">{category.bullets.length} findings</span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-4">
          {category.bullets.map((bullet, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="text-primary font-mono text-xs mt-1 flex-shrink-0">▸</span>
              <p className="text-secondary-foreground leading-relaxed">{bullet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
