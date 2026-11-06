import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, XCircle, Calendar, Clock, User, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function TaskConfirmation() {
  const [, params] = useRoute("/confirm/:token");
  const token = params?.token;
  const { toast } = useToast();
  const [completed, setCompleted] = useState<boolean | null>(null);
  const [notCompletedReason, setNotCompletedReason] = useState("");
  const [notCompletedDetails, setNotCompletedDetails] = useState("");

  // Fetch task details
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/tasks/confirm/${token}`],
    enabled: !!token,
  });

  // Submit confirmation mutation
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (completed === null) {
        throw new Error("Please select whether you completed the task");
      }

      return await apiRequest(`/api/tasks/confirm/${token}`, {
        method: "POST",
        body: JSON.stringify({
          completed,
          notCompletedReason: completed ? undefined : notCompletedReason,
          notCompletedDetails: completed ? undefined : notCompletedDetails,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Task Updated",
        description: completed
          ? "Thank you for confirming task completion!"
          : "Thank you for providing feedback. We'll review your response.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/tasks/confirm/${token}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update task. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Invalid Link
            </CardTitle>
            <CardDescription>
              This confirmation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">Loading task details...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Task Not Found
            </CardTitle>
            <CardDescription>
              This task could not be found. The link may have expired or been used already.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { task, staff } = data;

  // Check if task is already confirmed
  const isAlreadyConfirmed = task.status === "completed" || task.status === "not_completed";

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Task Confirmation</h1>
          <p className="text-muted-foreground">
            Northstay - Weekly Task Completion
          </p>
        </div>

        {/* Task Details Card */}
        <Card data-testid="card-task-details">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isAlreadyConfirmed ? (
                task.status === "completed" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )
              ) : (
                <Calendar className="h-5 w-5" />
              )}
              {task.name}
            </CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Scheduled Date</span>
                </div>
                <div className="font-medium" data-testid="text-scheduled-date">
                  {format(new Date(task.scheduledDate), "EEEE, MMMM d, yyyy")}
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Time</span>
                </div>
                <div className="font-medium" data-testid="text-time-of-day">{task.timeOfDay}</div>
              </div>
            </div>

            {staff && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Assigned To</span>
                </div>
                <div className="font-medium" data-testid="text-assigned-staff">{staff.name}</div>
              </div>
            )}

            {isAlreadyConfirmed && (
              <div className="pt-4 border-t">
                <div className="rounded-lg bg-muted p-4">
                  <div className="font-medium mb-2">
                    {task.status === "completed" ? (
                      <span className="text-green-700 dark:text-green-400">
                        ✓ Task marked as completed
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400">
                        Task marked as not completed
                      </span>
                    )}
                  </div>
                  {task.completedAt && (
                    <div className="text-sm text-muted-foreground">
                      Confirmed on {format(new Date(task.completedAt), "PPpp")}
                    </div>
                  )}
                  {task.notCompletedReason && (
                    <div className="mt-2 space-y-1">
                      <div className="text-sm font-medium">Reason:</div>
                      <div className="text-sm">{task.notCompletedReason}</div>
                      {task.notCompletedDetails && (
                        <>
                          <div className="text-sm font-medium mt-2">Details:</div>
                          <div className="text-sm text-muted-foreground">
                            {task.notCompletedDetails}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Form - Only show if not already confirmed */}
        {!isAlreadyConfirmed && (
          <Card data-testid="card-confirmation-form">
            <CardHeader>
              <CardTitle>Confirm Task Status</CardTitle>
              <CardDescription>
                Please let us know if you completed this task or provide a reason if you couldn't.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Completion Status */}
              <div className="space-y-3">
                <Label htmlFor="completion-status">Did you complete this task?</Label>
                <RadioGroup
                  id="completion-status"
                  value={completed === null ? "" : completed ? "yes" : "no"}
                  onValueChange={(value) => setCompleted(value === "yes")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="yes" data-testid="radio-completed-yes" />
                    <Label htmlFor="yes" className="font-normal cursor-pointer">
                      Yes, I completed this task
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="no" data-testid="radio-completed-no" />
                    <Label htmlFor="no" className="font-normal cursor-pointer">
                      No, I was unable to complete this task
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Reason for non-completion (only show if completed = false) */}
              {completed === false && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="space-y-3">
                    <Label htmlFor="reason">Reason *</Label>
                    <RadioGroup
                      id="reason"
                      value={notCompletedReason}
                      onValueChange={setNotCompletedReason}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="forgot" id="forgot" data-testid="radio-reason-forgot" />
                        <Label htmlFor="forgot" className="font-normal cursor-pointer">
                          I forgot
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no_time" id="no_time" data-testid="radio-reason-no-time" />
                        <Label htmlFor="no_time" className="font-normal cursor-pointer">
                          I didn't have enough time
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="equipment_issue" id="equipment_issue" data-testid="radio-reason-equipment" />
                        <Label htmlFor="equipment_issue" className="font-normal cursor-pointer">
                          Equipment or resource issue
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" data-testid="radio-reason-other" />
                        <Label htmlFor="other" className="font-normal cursor-pointer">
                          Other reason
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="details">Additional Details (Optional)</Label>
                    <Textarea
                      id="details"
                      data-testid="textarea-not-completed-details"
                      placeholder="Please provide any additional information about why you couldn't complete this task..."
                      value={notCompletedDetails}
                      onChange={(e) => setNotCompletedDetails(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={() => confirmMutation.mutate()}
                disabled={
                  completed === null ||
                  (completed === false && !notCompletedReason) ||
                  confirmMutation.isPending
                }
                className="w-full"
                size="lg"
                data-testid="button-submit-confirmation"
              >
                {confirmMutation.isPending ? "Submitting..." : "Submit Confirmation"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>Northstay Operations Portal</p>
          <p className="mt-1">
            Questions? Contact operations at{" "}
            <a href="mailto:operations@example.com" className="underline">
              operations@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
