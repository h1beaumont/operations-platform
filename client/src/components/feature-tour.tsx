
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface FeatureTourProps {
  steps: TourStep[];
  tourKey: string;
  autoStart?: boolean;
}

export function FeatureTour({ steps, tourKey, autoStart = false }: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem(`tour-${tourKey}-completed`);
    if (autoStart && !hasSeenTour) {
      setIsOpen(true);
    }
  }, [tourKey, autoStart]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`tour-${tourKey}-completed`, 'true');
    setIsOpen(false);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    localStorage.setItem(`tour-${tourKey}-completed`, 'true');
    setIsOpen(false);
  };

  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{step.title}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleSkip}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-left">
            {step.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} />
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleSkip}>
              Skip Tour
            </Button>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
