import type { ResearchResult as ResearchResultType } from "@/types/kalshi";

interface Props {
  research: ResearchResultType;
}

export function ResearchResult({ research }: Props) {
  const pct = Math.round(research.probability.estimate * 100);

  return (
    <div className="space-y-4">
      {/* Probability card */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold text-primary">{pct}%</span>
          <span className="text-sm text-muted-foreground">chance of Yes</span>
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

      {/* Key findings */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Key Findings</p>
        <ul className="space-y-2.5">
          {research.categories.map((cat, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="text-primary mt-0.5 text-sm flex-shrink-0">•</span>
              <p className="text-[14px] text-foreground leading-relaxed">{cat.bullets[0]}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
