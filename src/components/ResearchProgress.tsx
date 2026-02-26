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
        if (prev >= steps.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1400);
    return () => clearInterval(interval);
  }, [steps]);

  const allDone = completedCount >= steps.length;

  return (
    <div className="py-6 space-y-3">
      {steps.map((step, i) => {
        if (i > completedCount) return null;
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
