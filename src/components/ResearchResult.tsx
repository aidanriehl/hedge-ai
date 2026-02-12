import type { ResearchResult as ResearchResultType } from "@/types/kalshi";

interface Props {
  research: ResearchResultType;
}

export function ResearchResult({ research }: Props) {
  const pct = Math.round(research.probability.estimate * 100);

  return (
    <div className="space-y-5">
      {/* Probability card */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">AI Estimate</p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold text-primary">{pct}%</span>
          <span className="text-sm text-muted-foreground">chance of Yes</span>
        </div>
        <p className="text-[15px] text-foreground leading-relaxed mt-3">{research.probability.reasoning}</p>
      </div>

      {/* Research bullets */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-4">Key Findings</p>
        <ul className="space-y-3">
          {research.categories.map((cat, i) => (
            <li key={i} className="flex gap-3">
              <span className="text-primary mt-0.5 text-sm flex-shrink-0">•</span>
              <p className="text-[15px] text-foreground leading-relaxed">{cat.bullets[0]}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
