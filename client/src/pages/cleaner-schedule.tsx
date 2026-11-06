import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

interface Assignment {
  assignmentId: string;
  propertyName: string;
  propertyAddress: string;
  startTime: string;
  endTime: string;
  duration: number;
  isAvailable: boolean;
}

interface DailySchedule {
  date: string;
  assignments: Assignment[];
}

interface ScheduleData {
  cleanerName: string;
  weekStart: string;
  weekEnd: string;
  dailySchedules: DailySchedule[];
  acceptedAt?: string;
  notes?: string;
}

export default function CleanerSchedulePage() {
  const [, params] = useRoute("/cleaner-schedule/:token");
  const token = params?.token;
  const { toast } = useToast();
  const [acceptanceNotes, setAcceptanceNotes] = useState("");

  // Fetch schedule data
  const { data: scheduleData, isLoading, error } = useQuery<ScheduleData>({
    queryKey: ["/api/public/cleaner-schedule", token],
    queryFn: async () => {
      const response = await fetch(`/api/public/cleaner-schedule/${token}`);
      if (!response.ok) {
        throw new Error("Invalid or expired link");
      }
      return response.json();
    },
    enabled: !!token,
  });

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: async (notes?: string) => {
      const response = await fetch(`/api/public/cleaner-schedule/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) {
        throw new Error("Failed to accept schedule");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/cleaner-schedule", token] });
      toast({
        title: "Success!",
        description: "You have accepted your cleaning schedule",
      });
      setAcceptanceNotes("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept schedule. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    acceptMutation.mutate(acceptanceNotes.trim() || undefined);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !scheduleData) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Invalid or Expired Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This schedule link is invalid or has expired. Please contact your manager for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAccepted = !!scheduleData.acceptedAt;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6 sm:p-8">
        <div className="max-w-2xl mx-auto space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-title">
            Northstay
          </h1>
          <h2 className="text-lg sm:text-xl" data-testid="text-cleaner-name">
            {scheduleData.cleanerName}
          </h2>
          <p className="text-sm sm:text-base opacity-90" data-testid="text-week-range">
            Week of {format(parseISO(scheduleData.weekStart), "EEE dd MMM")} -{" "}
            {format(parseISO(scheduleData.weekEnd), "EEE dd MMM")}
          </p>
        </div>
      </div>

      {/* Schedule Cards */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {scheduleData.dailySchedules.map((day, index) => {
          const dayDate = parseISO(day.date);
          const hasAssignments = day.assignments && day.assignments.length > 0;

          return (
            <Card key={day.date} data-testid={`card-day-${index}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg" data-testid={`text-day-date-${index}`}>
                  {format(dayDate, "EEEE, dd MMM")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!hasAssignments ? (
                  <p className="text-muted-foreground italic" data-testid={`text-rest-day-${index}`}>
                    Rest day
                  </p>
                ) : (
                  day.assignments.map((assignment, assignmentIndex) => (
                    <div
                      key={assignment.assignmentId}
                      className="border rounded-md p-3 space-y-2"
                      data-testid={`assignment-${index}-${assignmentIndex}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm sm:text-base" data-testid={`text-address-${index}-${assignmentIndex}`}>
                          {assignment.propertyAddress}
                        </p>
                        <Badge
                          variant={assignment.isAvailable ? "default" : "destructive"}
                          className="flex-shrink-0"
                          data-testid={`badge-availability-${index}-${assignmentIndex}`}
                        >
                          {assignment.isAvailable ? "Available" : "⚠️ Conflict"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p data-testid={`text-time-${index}-${assignmentIndex}`}>
                          Time: {assignment.startTime} - {assignment.endTime}
                        </p>
                        <p data-testid={`text-duration-${index}-${assignmentIndex}`}>
                          Duration: {Math.round(assignment.duration / 60)} hours
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Acceptance Section */}
        <Card>
          <CardContent className="pt-6">
            {isAccepted ? (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription>
                  <p className="font-medium text-green-900 dark:text-green-100" data-testid="text-accepted">
                    You accepted this schedule on{" "}
                    {format(parseISO(scheduleData.acceptedAt!), "PPpp")}
                  </p>
                  {scheduleData.notes && (
                    <p className="mt-2 text-sm text-green-800 dark:text-green-200" data-testid="text-acceptance-notes">
                      Your notes: {scheduleData.notes}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="notes" className="text-sm font-medium">
                    Any questions or concerns? (Optional)
                  </label>
                  <Textarea
                    id="notes"
                    placeholder="Enter any notes or questions about your schedule..."
                    value={acceptanceNotes}
                    onChange={(e) => setAcceptanceNotes(e.target.value)}
                    rows={3}
                    data-testid="textarea-notes"
                  />
                </div>
                <Button
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="w-full"
                  size="lg"
                  data-testid="button-accept-schedule"
                >
                  {acceptMutation.isPending ? "Accepting..." : "I Accept This Schedule"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
