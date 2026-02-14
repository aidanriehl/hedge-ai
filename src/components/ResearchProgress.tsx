import { Loader2, Check } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  steps: string[];
}

export function ResearchProgress({ steps }: Props) {
  const [completedCount, setCompletedCount] = useState(0);

  useEffect(() => {
    if (steps.length === 0) return;
    setCompletedCount(0);
    
    const interval = setInterval(() => {
      setCompletedCount((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [steps]);

  if (steps.length === 0) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">Preparing research...</p>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-3">
      {steps.slice(0, completedCount + 1).map((step, i) => {
        const isDone = i < completedCount;
        return (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 bg-card rounded-xl border border-border animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {isDone ? (
              <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Check className="h-3 w-3 text-primary" />
              </div>
            ) : (
              <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
            )}
            <span className={`text-sm ${isDone ? "text-muted-foreground" : "text-foreground font-medium"}`}>
              {step}
            </span>
          </div>
        );
      })}
    </div>
  );
}
