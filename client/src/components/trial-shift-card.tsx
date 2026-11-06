import { Calendar, MapPin, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TrialShift } from "@shared/schema";
import { format } from "date-fns";

interface TrialShiftCardProps {
  shift: TrialShift;
  candidateName?: string;
  onMarkComplete?: (shiftId: string, passed: boolean) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
  scheduled: { label: "Scheduled", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  completed: { label: "Completed", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  "no-show": { label: "No Show", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  passed: { label: "Passed", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: "Failed", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

export function TrialShiftCard({ shift, candidateName, onMarkComplete }: TrialShiftCardProps) {
  const status = statusConfig[shift.status] || statusConfig.scheduled;

  return (
    <Card className="hover-elevate transition-all" data-testid={`card-trial-shift-${shift.id}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm" data-testid={`text-shift-candidate-${shift.id}`}>
                {candidateName || "Unknown Candidate"}
              </h4>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Badge variant="outline" className="font-mono">
                  Shift {shift.shiftNumber}
                </Badge>
              </div>
            </div>
            <Badge variant={status.variant} className="gap-1.5 shrink-0" data-testid={`badge-shift-status-${shift.id}`}>
              {status.icon}
              {status.label}
            </Badge>
          </div>

          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span data-testid={`text-shift-date-${shift.id}`}>
                {format(new Date(shift.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5" />
              <span data-testid={`text-shift-location-${shift.id}`}>{shift.location}</span>
            </div>
          </div>

          {shift.feedback && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
              {shift.feedback}
            </p>
          )}

          {onMarkComplete && shift.status === "scheduled" && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="default"
                onClick={() => onMarkComplete(shift.id, true)}
                data-testid={`button-pass-${shift.id}`}
                className="flex-1 hover-elevate active-elevate-2"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Pass
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => onMarkComplete(shift.id, false)}
                data-testid={`button-fail-${shift.id}`}
                className="flex-1 hover-elevate active-elevate-2"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Fail
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
