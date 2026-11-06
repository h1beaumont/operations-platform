import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Smile, Meh, Frown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updateClientMeetingOutcomeSchema, type ClientMeeting } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type LogMeetingOutcomeFormData = {
  outcome: string;
  sentiment: "positive" | "neutral" | "negative";
  nextSteps?: string;
};

interface LogMeetingOutcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: ClientMeeting | null;
  onLogOutcome: (data: LogMeetingOutcomeFormData) => Promise<void>;
  isSaving?: boolean;
}

export function LogMeetingOutcomeDialog({
  open,
  onOpenChange,
  meeting,
  onLogOutcome,
  isSaving = false,
}: LogMeetingOutcomeDialogProps) {
  const form = useForm<LogMeetingOutcomeFormData>({
    resolver: zodResolver(updateClientMeetingOutcomeSchema),
    defaultValues: {
      outcome: "",
      sentiment: "neutral",
      nextSteps: "",
    },
  });

  // Reset form when dialog opens with new meeting
  useEffect(() => {
    if (open && meeting) {
      form.reset({
        outcome: meeting.outcome || "",
        sentiment: (meeting.sentiment as "positive" | "neutral" | "negative") || "neutral",
        nextSteps: meeting.nextSteps || "",
      });
    }
  }, [open, meeting, form]);

  const handleLogOutcome = async (data: LogMeetingOutcomeFormData) => {
    await onLogOutcome(data);
    onOpenChange(false);
  };

  if (!meeting) return null;

  const sentimentIcons = {
    positive: <Smile className="h-4 w-4 text-green-600" />,
    neutral: <Meh className="h-4 w-4 text-gray-600" />,
    negative: <Frown className="h-4 w-4 text-red-600" />,
  };

  const sentimentColors = {
    positive: "bg-green-500 text-white",
    neutral: "bg-gray-500 text-white",
    negative: "bg-red-500 text-white",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log Meeting Outcome
          </DialogTitle>
          <DialogDescription>
            Record the outcome and next steps from this meeting
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleLogOutcome)} className="space-y-4">
            {/* Meeting Info */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" data-testid="text-meeting-type">
                  {meeting.meetingType
                    ? meeting.meetingType.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                    : "Meeting"}
                </span>
                {meeting.completedAt && (
                  <Badge variant="secondary" data-testid="badge-completed">
                    Completed
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground" data-testid="text-meeting-date">
                {format(new Date(meeting.scheduledAt), "PPp")}
              </div>
              {meeting.location && (
                <div className="text-sm text-muted-foreground">{meeting.location}</div>
              )}
              {meeting.attendees && meeting.attendees.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Attendees: {meeting.attendees.join(", ")}
                </div>
              )}
            </div>

            {/* Sentiment */}
            <FormField
              control={form.control}
              name="sentiment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Sentiment *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-sentiment">
                        <SelectValue placeholder="How did the meeting go?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="positive">
                        <div className="flex items-center gap-2">
                          {sentimentIcons.positive}
                          <span>Positive - Meeting went well</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="neutral">
                        <div className="flex items-center gap-2">
                          {sentimentIcons.neutral}
                          <span>Neutral - Mixed or unclear</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="negative">
                        <div className="flex items-center gap-2">
                          {sentimentIcons.negative}
                          <span>Negative - Concerns or issues</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Outcome */}
            <FormField
              control={form.control}
              name="outcome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Outcome *</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Summarize what was discussed and any decisions made..."
                      rows={4}
                      data-testid="textarea-outcome"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Include key points, decisions, and any concerns raised
                  </p>
                </FormItem>
              )}
            />

            {/* Next Steps */}
            <FormField
              control={form.control}
              name="nextSteps"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Steps (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="What are the follow-up actions and next steps?..."
                      rows={3}
                      data-testid="textarea-next-steps"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    List action items, deadlines, and who is responsible
                  </p>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                data-testid="button-log-outcome"
              >
                {isSaving ? "Saving..." : "Log Outcome"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
