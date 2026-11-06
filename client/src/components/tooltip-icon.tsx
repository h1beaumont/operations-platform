import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReactElement } from "react";

interface TooltipIconProps {
  icon: ReactElement;
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children?: React.ReactNode;
}

export function TooltipIcon({ icon, label, side = "top", children }: TooltipIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || icon}
      </TooltipTrigger>
      <TooltipContent side={side}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
