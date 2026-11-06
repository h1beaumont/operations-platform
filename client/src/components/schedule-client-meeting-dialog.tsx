import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Clock, Users, MapPin, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertClientMeetingSchema, type PotentialClient } from "@shared/schema";
import { format, addDays } from "date-fns";
import { toDate } from "date-fns-tz";

// Default timezone (UK)
const UK_TIMEZONE = "Europe/London";

// Schema for the form (without potentialClientId which will be added when submitting)
const scheduleMeetingFormSchema = insertClientMeetingSchema.omit({
  potentialClientId: true,
}).extend({
  // Make scheduledAt a string for the form (will be converted to Date)
  scheduledAt: z.string().min(1, "Meeting date and time are required"),
});

type ScheduleMeetingFormData = z.infer<typeof scheduleMeetingFormSchema>;

interface ScheduleClientMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: PotentialClient | null;
  onSchedule: (data: ScheduleMeetingFormData) => Promise<void>;
  isSaving?: boolean;
}

export function ScheduleClientMeetingDialog({
  open,
  onOpenChange,
  client,
  onSchedule,
  isSaving = false,
}: ScheduleClientMeetingDialogProps) {
  const form = useForm<ScheduleMeetingFormData>({
    resolver: zodResolver(scheduleMeetingFormSchema),
    defaultValues: {
      scheduledAt: "",
      duration: 60,
      meetingType: "initial",
      location: "",
      attendees: [],
      outcome: undefined,
      sentiment: undefined,
      nextSteps: undefined,
      otterTranscriptId: undefined,
      otterTranscriptUrl: undefined,
    },
  });

  // Reset form when dialog opens with new client
  useEffect(() => {
    if (open && client) {
      const tomorrow = addDays(new Date(), 1);
      tomorrow.setHours(10, 0, 0, 0);
      const defaultDateTime = format(tomorrow, "yyyy-MM-dd'T'HH:mm");
      
      form.reset({
        scheduledAt: defaultDateTime,
        duration: 60,
        meetingType: "initial",
        location: "Google Meet (link will be sent)",
        attendees: [client.primaryContactName],
        outcome: undefined,
        sentiment: undefined,
        nextSteps: undefined,
        otterTranscriptId: undefined,
        otterTranscriptUrl: undefined,
      });
    }
  }, [open, client, form]);

  const handleSchedule = async (data: ScheduleMeetingFormData) => {
    // Convert the local datetime string to UTC
    // The datetime-local input treats the input as UK timezone
    // We need to convert this to UTC for storage
    const dateTimeStr = data.scheduledAt; // e.g., "2025-10-28T15:00"
    
    // Parse components to create date in UK timezone
    const [datePart, timePart] = dateTimeStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    
    // Create a date string that represents UK time
    // We'll use toDate from date-fns-tz to handle this properly
    const ukDateTime = toDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`, {
      timeZone: UK_TIMEZONE
    });
    
    // Send the UTC datetime as ISO string
    const dataToSend = {
      ...data,
      scheduledAt: ukDateTime.toISOString(),
    };
    
    await onSchedule(dataToSend);
    onOpenChange(false);
  };

  if (!client) return null;

  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Meeting
          </DialogTitle>
          <DialogDescription>
            Schedule a meeting with {client.organizationName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSchedule)} className="space-y-4">
            {/* Client Info */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" data-testid="text-client-name">
                  {client.organizationName}
                </span>
                {client.priority && (
                  <Badge variant="secondary" data-testid="badge-client-priority">
                    {client.priority.charAt(0).toUpperCase() + client.priority.slice(1)}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{client.primaryContactName}</div>
              <div className="text-sm text-muted-foreground">{client.primaryContactEmail}</div>
            </div>

            {/* Meeting Type */}
            <FormField
              control={form.control}
              name="meetingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-meeting-type">
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="initial">Initial Meeting</SelectItem>
                      <SelectItem value="property-viewing">Property Viewing</SelectItem>
                      <SelectItem value="contract-discussion">Contract Discussion</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date and Time */}
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date and Time (UK Time)</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      data-testid="input-meeting-datetime"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Your timezone: {userTimezone}
                  </p>
                </FormItem>
              )}
            />

            {/* Duration */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger data-testid="select-duration">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="Enter meeting location or video call link"
                      data-testid="input-location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attendees */}
            <FormField
              control={form.control}
              name="attendees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Attendees</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value?.join(", ") || ""}
                      onChange={(e) => {
                        const attendeeList = e.target.value
                          .split(",")
                          .map((a) => a.trim())
                          .filter(Boolean);
                        field.onChange(attendeeList);
                      }}
                      placeholder="Enter attendee names separated by commas"
                      rows={2}
                      data-testid="textarea-attendees"
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple attendees with commas
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
                data-testid="button-schedule-meeting"
              >
                {isSaving ? "Scheduling..." : "Schedule Meeting"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
