import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle } from "lucide-react";
import type { Candidate, GroupMeeting, MeetingAttendance } from "@shared/schema";
import { format } from "date-fns";

interface AttendanceData {
  candidateId: string;
  attended: boolean;
  wantsToProceed: 'yes' | 'no' | 'not-asked';
  onboardingLinkSent: boolean;
}

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: GroupMeeting | null;
  candidates: Candidate[];
  existingAttendance?: MeetingAttendance[];
  onSave: (attendanceData: AttendanceData[]) => void;
  onSendOnboarding: (candidateId: string) => Promise<void>;
  isSaving?: boolean;
}

export function AttendanceDialog({
  open,
  onOpenChange,
  meeting,
  candidates,
  existingAttendance = [],
  onSave,
  onSendOnboarding,
  isSaving = false,
}: AttendanceDialogProps) {
  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceData>>(new Map());
  const [sendingOnboarding, setSendingOnboarding] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newMap = new Map<string, AttendanceData>();
    candidates.forEach((candidate) => {
      const existing = existingAttendance.find(a => a.candidateId === candidate.id);
      newMap.set(candidate.id, {
        candidateId: candidate.id,
        attended: existing?.attended || false,
        wantsToProceed: existing?.wantsToProceed === null ? 'not-asked' : 
                       existing?.wantsToProceed === true ? 'yes' : 'no',
        onboardingLinkSent: existing?.onboardingLinkSent || false,
      });
    });
    setAttendanceMap(newMap);
  }, [meeting?.id, candidates, existingAttendance, open]);

  const updateAttendance = (candidateId: string, updates: Partial<AttendanceData>) => {
    const newMap = new Map(attendanceMap);
    const current = newMap.get(candidateId);
    if (current) {
      newMap.set(candidateId, { ...current, ...updates });
      setAttendanceMap(newMap);
    }
  };

  const handleSelectAll = () => {
    const allAttended = Array.from(attendanceMap.values()).every(a => a.attended);
    const newMap = new Map(attendanceMap);
    attendanceMap.forEach((data, candidateId) => {
      newMap.set(candidateId, { ...data, attended: !allAttended });
    });
    setAttendanceMap(newMap);
  };

  const handleSave = () => {
    onSave(Array.from(attendanceMap.values()));
  };

  const handleSendOnboarding = async (candidateId: string) => {
    setSendingOnboarding(new Set(sendingOnboarding).add(candidateId));
    try {
      await onSendOnboarding(candidateId);
      updateAttendance(candidateId, { onboardingLinkSent: true });
    } catch (error) {
      console.error('Failed to send onboarding link:', error);
    } finally {
      const newSet = new Set(sendingOnboarding);
      newSet.delete(candidateId);
      setSendingOnboarding(newSet);
    }
  };

  if (!meeting) return null;

  const attendedCount = Array.from(attendanceMap.values()).filter(a => a.attended).length;
  const allAttended = attendedCount === candidates.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="dialog-attendance">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">Mark Attendance</DialogTitle>
          <DialogDescription data-testid="text-dialog-description">
            {meeting.roleType === "driver" ? "Driver" : "Non-Driver"} Interview -{" "}
            {format(new Date(meeting.scheduledAt), "PPP 'at' p")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between pb-2 border-b">
            <p className="text-sm font-medium">
              {attendedCount} of {candidates.length} attended
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              data-testid="button-select-all"
            >
              {allAttended ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {candidates.map((candidate) => {
              const attendance = attendanceMap.get(candidate.id);
              if (!attendance) return null;

              const canSendOnboarding = attendance.attended && 
                                       attendance.wantsToProceed === 'yes' && 
                                       !attendance.onboardingLinkSent;

              return (
                <div
                  key={candidate.id}
                  className="p-4 rounded-md border bg-card space-y-3"
                  data-testid={`attendance-item-${candidate.id}`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={`attended-${candidate.id}`}
                      checked={attendance.attended}
                      onCheckedChange={(checked) => 
                        updateAttendance(candidate.id, { attended: checked as boolean })
                      }
                      data-testid={`checkbox-attendance-${candidate.id}`}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={`attended-${candidate.id}`}
                        className="cursor-pointer font-medium"
                        data-testid={`label-candidate-${candidate.id}`}
                      >
                        {candidate.firstName} {candidate.lastName}
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{candidate.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {candidate.roleType === "driver" ? "Driver" : "Non-Driver"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {attendance.attended && (
                    <div className="ml-6 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Wants to Proceed?</Label>
                        <RadioGroup
                          value={attendance.wantsToProceed}
                          onValueChange={(value: 'yes' | 'no' | 'not-asked') =>
                            updateAttendance(candidate.id, { wantsToProceed: value })
                          }
                          className="flex gap-4"
                          data-testid={`radio-proceed-${candidate.id}`}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value="yes" 
                              id={`yes-${candidate.id}`}
                              data-testid={`radio-proceed-yes-${candidate.id}`}
                            />
                            <Label htmlFor={`yes-${candidate.id}`} className="cursor-pointer">
                              Yes
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value="no" 
                              id={`no-${candidate.id}`}
                              data-testid={`radio-proceed-no-${candidate.id}`}
                            />
                            <Label htmlFor={`no-${candidate.id}`} className="cursor-pointer">
                              No
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem 
                              value="not-asked" 
                              id={`not-asked-${candidate.id}`}
                              data-testid={`radio-proceed-not-asked-${candidate.id}`}
                            />
                            <Label htmlFor={`not-asked-${candidate.id}`} className="cursor-pointer">
                              Not Asked
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {attendance.onboardingLinkSent ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Onboarding link sent</span>
                        </div>
                      ) : canSendOnboarding ? (
                        <Button
                          size="sm"
                          onClick={() => handleSendOnboarding(candidate.id)}
                          disabled={sendingOnboarding.has(candidate.id)}
                          data-testid={`button-send-onboarding-${candidate.id}`}
                          className="w-full sm:w-auto"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          {sendingOnboarding.has(candidate.id) 
                            ? "Sending..." 
                            : "Send Onboarding Link"}
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            data-testid="button-cancel-attendance"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            data-testid="button-save-attendance"
          >
            {isSaving ? "Saving..." : "Save Attendance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
