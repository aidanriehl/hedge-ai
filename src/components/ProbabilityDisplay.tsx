import type { ProbabilityEstimate } from "@/types/kalshi";

interface ProbabilityDisplayProps {
  probability: ProbabilityEstimate;
  marketPrice?: number;
}

export function ProbabilityDisplay({ probability, marketPrice }: ProbabilityDisplayProps) {
  const pct = Math.round(probability.estimate * 100);
  const discrepancy = marketPrice != null ? Math.round(Math.abs(pct - marketPrice * 100)) : null;
  const isOvervalued = marketPrice != null && pct < marketPrice * 100;

  const confidenceLabel = {
    high: "High Confidence",
    medium: "Medium Confidence",
    low: "Low Confidence",
  };

  const confidenceClass = {
    high: "text-primary",
    medium: "text-warning",
    low: "text-destructive",
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">AI Probability Estimate</h3>
        <span className={`text-xs font-mono uppercase tracking-wider ${confidenceClass[probability.confidence]}`}>
          {confidenceLabel[probability.confidence]}
        </span>
      </div>

      {/* Big number */}
      <div className="px-6 py-8 text-center">
        <div className="text-6xl font-mono font-bold text-gradient-primary">{pct}%</div>
        <p className="text-muted-foreground text-sm mt-2">Estimated probability of YES outcome</p>
      </div>

      {/* Factors */}
      <div className="px-6 pb-4">
        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">Factor Weights</h4>
        <div className="space-y-2">
          {probability.factors.map((factor, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-secondary-foreground">{factor.name}</span>
                  <span className="font-mono text-muted-foreground">
                    {Math.round(factor.suggestedProbability * 100)}% × {Math.round(factor.weight * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all duration-500"
                    style={{ width: `${factor.suggestedProbability * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market comparison */}
      {marketPrice != null && discrepancy != null && (
        <div className={`mx-6 mb-4 p-4 rounded-lg border ${discrepancy >= 10 ? "bg-warning/10 border-warning/30" : "bg-secondary border-border"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Market vs AI</span>
            {discrepancy >= 10 && (
              <span className="text-xs font-mono uppercase tracking-wider text-warning">⚠ Discrepancy Alert</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Market: </span>
              <span className="font-mono font-semibold text-foreground">{Math.round(marketPrice * 100)}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">AI: </span>
              <span className="font-mono font-semibold text-primary">{pct}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Gap: </span>
              <span className={`font-mono font-semibold ${discrepancy >= 10 ? "text-warning" : "text-muted-foreground"}`}>
                {discrepancy}%
              </span>
            </div>
          </div>
          {discrepancy >= 5 && (
            <p className="text-xs text-muted-foreground mt-2">
              {isOvervalued
                ? "Market may be overvaluing this outcome. AI analysis suggests lower probability."
                : "Market may be undervaluing this outcome. AI analysis suggests higher probability."}
            </p>
          )}
        </div>
      )}

      {/* Reasoning */}
      <div className="px-6 pb-6">
        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Analysis Summary</h4>
        <p className="text-sm text-secondary-foreground leading-relaxed">{probability.reasoning}</p>
      </div>
    </div>
  );
}
