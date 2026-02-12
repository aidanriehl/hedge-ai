import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = [
  "Analyzing historical data...",
  "Reviewing recent developments...",
  "Checking statistical patterns...",
  "Evaluating expert predictions...",
  "Assessing market conditions...",
  "Cross-referencing sources...",
  "Calculating probability model...",
  "Compiling research findings...",
];

export function ResearchProgress() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-md mx-auto py-16 text-center">
      <div className="relative mb-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center glow-green">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">Running Deep Research</h3>
      <p className="text-sm text-muted-foreground mb-8">
        Our AI analysts are investigating every angle...
      </p>

      <div className="space-y-2 text-left">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-500 ${
              i < currentStep
                ? "bg-primary/5 text-primary"
                : i === currentStep
                ? "bg-secondary text-foreground"
                : "text-muted-foreground/40"
            }`}
          >
            <span className="font-mono text-xs w-4">
              {i < currentStep ? "✓" : i === currentStep ? "▸" : "○"}
            </span>
            <span className="text-sm font-mono">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
