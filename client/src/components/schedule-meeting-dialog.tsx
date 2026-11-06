import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Candidate } from "@shared/schema";
import { format } from "date-fns";

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  onSchedule: (data: ScheduleMeetingData) => Promise<void>;
  isSaving?: boolean;
}

export interface ScheduleMeetingData {
  candidateId: string;
  meetingType: "individual" | "group";
  date: string;
  time: string;
  duration: number;
  location: string;
  notes?: string;
  sendCalendarInvite: boolean;
}

export function ScheduleMeetingDialog({
  open,
  onOpenChange,
  candidate,
  onSchedule,
  isSaving = false,
}: ScheduleMeetingDialogProps) {
  const [meetingType, setMeetingType] = useState<"individual" | "group">("individual");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("video");
  const [customLocation, setCustomLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [sendCalendarInvite, setSendCalendarInvite] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens with new candidate
  useEffect(() => {
    if (open && candidate) {
      setMeetingType("individual");
      setDate("");
      setTime("");
      setDuration(60);
      setLocation("video");
      setCustomLocation("");
      setNotes("");
      setSendCalendarInvite(true);
      setErrors({});
    }
  }, [open, candidate]);

  // Get minimum date (today) and format for input
  const minDate = new Date().toISOString().split('T')[0];
  
  // Get the next weekday at 10 AM as default suggestion
  const getDefaultDateTime = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    
    // Skip weekends
    while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    
    return {
      date: tomorrow.toISOString().split('T')[0],
      time: "10:00"
    };
  };

  const defaultDateTime = getDefaultDateTime();

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!date) {
      newErrors.date = "Please select a date";
    }
    
    if (!time) {
      newErrors.time = "Please select a time";
    }
    
    if (location === "custom" && !customLocation.trim()) {
      newErrors.location = "Please enter a location";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSchedule = async () => {
    if (!candidate || !validate()) return;

    const finalLocation = location === "custom" ? customLocation : 
                         location === "video" ? "Google Meet (link will be sent)" :
                         location === "office" ? "Northstay Office" :
                         location;

    await onSchedule({
      candidateId: candidate.id,
      meetingType,
      date,
      time,
      duration,
      location: finalLocation,
      notes: notes.trim() || undefined,
      sendCalendarInvite,
    });
  };

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Interview
          </DialogTitle>
          <DialogDescription>
            Schedule an interview for {candidate.firstName} {candidate.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Candidate Info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {candidate.firstName} {candidate.lastName}
              </span>
              <Badge variant={candidate.roleType === "driver" ? "default" : "secondary"}>
                {candidate.roleType === "driver" ? "Driver" : "Non-Driver"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">{candidate.email}</div>
            <div className="text-sm text-muted-foreground">{candidate.phoneNumber}</div>
          </div>

          {/* Meeting Type */}
          <div className="space-y-2">
            <Label htmlFor="meeting-type">Interview Type</Label>
            <Select value={meetingType} onValueChange={(v) => setMeetingType(v as "individual" | "group")}>
              <SelectTrigger id="meeting-type" data-testid="select-meeting-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual Interview</SelectItem>
                <SelectItem value="group">Group Interview</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={minDate}
                placeholder={defaultDateTime.date}
                data-testid="input-meeting-date"
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder={defaultDateTime.time}
                data-testid="input-meeting-time"
              />
              {errors.time && (
                <p className="text-sm text-destructive">{errors.time}</p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
              <SelectTrigger id="duration" data-testid="select-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger id="location" data-testid="select-location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video Call (Google Meet)</SelectItem>
                <SelectItem value="office">Office (In-Person)</SelectItem>
                <SelectItem value="custom">Custom Location</SelectItem>
              </SelectContent>
            </Select>
            {location === "custom" && (
              <div className="mt-2">
                <Input
                  placeholder="Enter location details"
                  value={customLocation}
                  onChange={(e) => setCustomLocation(e.target.value)}
                  data-testid="input-custom-location"
                />
                {errors.location && (
                  <p className="text-sm text-destructive mt-1">{errors.location}</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes or instructions for the interview"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          {/* Calendar Invite Option */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="send-invite"
              checked={sendCalendarInvite}
              onChange={(e) => setSendCalendarInvite(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="send-invite" className="text-sm font-normal cursor-pointer">
              Send calendar invite to candidate
            </Label>
          </div>

          {/* Quick Actions */}
          <Alert>
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Quick Schedule Options:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDate(defaultDateTime.date);
                      setTime(defaultDateTime.time);
                    }}
                    data-testid="button-quick-tomorrow"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Tomorrow 10 AM
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextWeek = new Date();
                      nextWeek.setDate(nextWeek.getDate() + 7);
                      setDate(nextWeek.toISOString().split('T')[0]);
                      setTime("14:00");
                    }}
                    data-testid="button-quick-next-week"
                  >
                    Next Week 2 PM
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={isSaving || !date || !time}
            data-testid="button-schedule-meeting"
          >
            {isSaving ? "Scheduling..." : "Schedule Interview"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}