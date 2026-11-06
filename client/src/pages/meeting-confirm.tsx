import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

type MeetingConfirmationDetails = {
  meeting: {
    id: string;
    roleType: string;
    scheduledAt: string;
    googleCalendarMeetingLink?: string;
    status: string;
  };
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  confirmation: {
    id: string;
    confirmed: boolean;
    confirmedAt?: string;
  };
};

export default function MeetingConfirm() {
  const { token } = useParams<{ token: string }>();
  const [confirmationMessage, setConfirmationMessage] = useState<string>("");

  const { data, isLoading, error } = useQuery<MeetingConfirmationDetails>({
    queryKey: [`/api/public/meeting-confirm/${token}`],
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const result = await apiRequest(`/api/public/meeting-confirm/${token}/confirm`, {
        method: 'POST',
      });
      return result;
    },
    onSuccess: () => {
      setConfirmationMessage("Thank you! Your attendance has been confirmed. We look forward to seeing you!");
    },
    onError: (error: any) => {
      setConfirmationMessage(error.message || "Failed to confirm attendance. Please try again.");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Loading meeting details...</div>
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
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Invalid Link
            </CardTitle>
            <CardDescription>
              This confirmation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, please contact us directly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { meeting, candidate, confirmation } = data;
  const meetingDate = new Date(meeting.scheduledAt);
  const isAlreadyConfirmed = confirmation.confirmed;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">
            Interview Confirmation
          </CardTitle>
          <CardDescription>
            Hello {candidate.firstName} {candidate.lastName}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meeting Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <div className="font-medium">Date & Time</div>
                <div className="text-sm text-muted-foreground">
                  {format(meetingDate, "EEEE, MMMM d, yyyy")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(meetingDate, "h:mm a")}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <div className="font-medium">Role</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {meeting.roleType}
                </div>
              </div>
            </div>

            {meeting.googleCalendarMeetingLink && (
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 mt-0.5 text-primary" />
                <div className="flex-1">
                  <div className="font-medium">Meeting Link</div>
                  <a
                    href={meeting.googleCalendarMeetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline break-all"
                    data-testid="link-meeting"
                  >
                    {meeting.googleCalendarMeetingLink}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Confirmation Status */}
          {isAlreadyConfirmed ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <div className="font-medium">Already Confirmed</div>
              </div>
              <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                You confirmed your attendance on{" "}
                {confirmation.confirmedAt && format(new Date(confirmation.confirmedAt), "MMMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          ) : confirmationMessage ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <div className="font-medium">{confirmationMessage}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please confirm your attendance by clicking the button below.
              </p>
              <Button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                className="w-full"
                size="lg"
                data-testid="button-confirm-attendance"
              >
                {confirmMutation.isPending ? "Confirming..." : "Confirm Attendance"}
              </Button>
            </div>
          )}

          {/* Additional Information */}
          <div className="text-sm text-muted-foreground space-y-1 pt-4 border-t">
            <p>
              If you need to reschedule or have any questions, please contact us at {candidate.email}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
