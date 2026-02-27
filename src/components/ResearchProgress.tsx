import { Loader2, Check } from "lucide-react";
import { useEffect, useState, useRef } from "react";

const OVERFLOW_STEPS = [
  "Double-checking sources...",
  "Verifying data...",
  "Final review...",
  "Cross-referencing findings...",
  "Almost there...",
];

interface Props {
  steps: string[];
  isComplete?: boolean;
}

export function ResearchProgress({ steps, isComplete = false }: Props) {
  const [completedCount, setCompletedCount] = useState(0);
  const [overflowSteps, setOverflowSteps] = useState<string[]>([]);
  const overflowIndex = useRef(0);

  // All visible steps = provided steps + any dynamically added overflow
  const allSteps = [...steps, ...overflowSteps];

  useEffect(() => {
    if (steps.length === 0) return;
    setCompletedCount(0);
    setOverflowSteps([]);
    overflowIndex.current = 0;

    const interval = setInterval(() => {
      setCompletedCount((prev) => {
        const next = prev + 1;
        return next;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [steps]);

  // When completedCount reaches the end and research isn't done, add overflow steps
  useEffect(() => {
    if (isComplete) return;
    if (completedCount >= allSteps.length && allSteps.length > 0) {
      if (overflowIndex.current < OVERFLOW_STEPS.length) {
        setOverflowSteps((prev) => [...prev, OVERFLOW_STEPS[overflowIndex.current]]);
        overflowIndex.current += 1;
      }
    }
  }, [completedCount, allSteps.length, isComplete]);

  // When research completes, mark all steps done
  const effectiveCompleted = isComplete ? allSteps.length : completedCount;

  return (
    <div className="py-6 space-y-3">
      {allSteps.map((step, i) => {
        if (i > effectiveCompleted) return null;
        const isDone = i < effectiveCompleted;
        return (
          <div
            key={`${i}-${step}`}
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
