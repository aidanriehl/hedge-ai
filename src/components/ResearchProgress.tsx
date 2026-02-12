import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

const STEPS = [
  "Gathering data...",
  "Analyzing context...",
  "Evaluating factors...",
  "Forming estimate...",
];

export function ResearchProgress() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="py-16 text-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
      <p className="text-sm text-muted-foreground">{STEPS[currentStep]}</p>
    </div>
  );
}
