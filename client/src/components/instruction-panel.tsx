import { useState } from "react";
import { HelpCircle, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";

type InstructionStep = {
  step: number;
  title: string;
  description: string;
  tips?: string[];
};

type InstructionPanelProps = {
  title: string;
  description: string;
  steps: InstructionStep[];
};

export function InstructionPanel({ title, description, steps }: InstructionPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-help">
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto" data-testid="sheet-instructions">
        <SheetHeader>
          <SheetTitle className="text-2xl">{title}</SheetTitle>
          <SheetDescription className="text-base">{description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {steps?.map((step) => (
            <div key={step.step} className="relative">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                    {step.step}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground mb-3">{step.description}</p>
                  {step.tips && step.tips.length > 0 && (
                    <div className="space-y-2">
                      <Badge variant="secondary" className="mb-2">
                        💡 Tips
                      </Badge>
                      <ul className="space-y-1">
                        {step.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              {step.step < (steps?.length ?? 0) && (
                <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
