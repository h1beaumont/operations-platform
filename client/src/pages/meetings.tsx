import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Calendar, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingCard } from "@/components/meeting-card";
import { AttendanceDialog } from "@/components/attendance-dialog";
import { InstructionPanel } from "@/components/instruction-panel";
import { meetingsInstructions } from "@/lib/page-instructions";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import type { Candidate, GroupMeeting, MeetingAttendance } from "@shared/schema";

interface AttendanceData {
  candidateId: string;
  attended: boolean;
  wantsToProceed: 'yes' | 'no' | 'not-asked';
  onboardingLinkSent: boolean;
}

export default function Meetings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedMeeting, setSelectedMeeting] = useState<GroupMeeting | null>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedMeetingForAction, setSelectedMeetingForAction] = useState<GroupMeeting | null>(null);
  const [newScheduledAt, setNewScheduledAt] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const { data: meetings = [], isLoading: loadingMeetings } = useQuery<GroupMeeting[]>({
    queryKey: ["/api/group-meetings"],
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: allAttendance = [] } = useQuery<MeetingAttendance[]>({
    queryKey: ["/api/meeting-attendance"],
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async ({ meetingId, attendanceData }: { meetingId: string; attendanceData: AttendanceData[] }) => {
      const response = await apiRequest(`/api/meetings/${meetingId}/attendance`, {
        method: 'POST',
        body: JSON.stringify({ attendanceData })
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-attendance"] });
      toast({
        title: "Attendance Saved",
        description: `Attendance records updated for ${data.updatedCount} candidate${data.updatedCount !== 1 ? "s" : ""}`,
      });
      setAttendanceDialogOpen(false);
      setSelectedMeeting(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance",
        variant: "destructive",
      });
    },
  });

  const sendOnboardingMutation = useMutation({
    mutationFn: async (candidateId: string) => {
      const response = await apiRequest("/api/onboarding/send-link", {
        method: 'POST',
        body: JSON.stringify({ candidateId })
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meeting-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      toast({
        title: "Onboarding Link Sent",
        description: `Onboarding link sent to ${data.candidateName} via ${data.sentVia}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send onboarding link",
        variant: "destructive",
      });
    },
  });

  const cancelMeetingMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await apiRequest(`/api/group-meetings/${meetingId}/cancel`, {
        method: 'PATCH'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-meetings"] });
      toast({
        title: "Meeting Cancelled",
        description: "The meeting has been cancelled successfully.",
      });
      setCancelDialogOpen(false);
      setSelectedMeetingForAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel meeting",
        variant: "destructive",
      });
    },
  });

  const rescheduleMeetingMutation = useMutation({
    mutationFn: async ({ meetingId, scheduledAt }: { meetingId: string; scheduledAt: string }) => {
      const response = await apiRequest(`/api/group-meetings/${meetingId}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduledAt })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-meetings"] });
      toast({
        title: "Meeting Rescheduled",
        description: "The meeting has been rescheduled successfully.",
      });
      setRescheduleDialogOpen(false);
      setSelectedMeetingForAction(null);
      setNewScheduledAt("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule meeting",
        variant: "destructive",
      });
    },
  });

  const archiveMeetingMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await apiRequest(`/api/group-meetings/${meetingId}/archive`, {
        method: 'PATCH'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-meetings"] });
      toast({
        title: "Meeting Archived",
        description: "The meeting has been archived successfully.",
      });
      setArchiveDialogOpen(false);
      setSelectedMeetingForAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive meeting",
        variant: "destructive",
      });
    },
  });

  const deleteMeetingMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await apiRequest(`/api/group-meetings/${meetingId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/group-meetings"] });
      toast({
        title: "Meeting Deleted",
        description: "The meeting has been permanently deleted.",
      });
      setDeleteDialogOpen(false);
      setSelectedMeetingForAction(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete meeting",
        variant: "destructive",
      });
    },
  });

  const handleMarkAttendance = (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setSelectedMeeting(meeting);
      setAttendanceDialogOpen(true);
    }
  };

  const handleSaveAttendance = (attendanceData: AttendanceData[]) => {
    if (selectedMeeting) {
      markAttendanceMutation.mutate({
        meetingId: selectedMeeting.id,
        attendanceData,
      });
    }
  };

  const handleSendOnboarding = async (candidateId: string) => {
    await sendOnboardingMutation.mutateAsync(candidateId);
  };

  const handleCancel = (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setSelectedMeetingForAction(meeting);
      setCancelDialogOpen(true);
    }
  };

  const handleReschedule = (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setSelectedMeetingForAction(meeting);
      setNewScheduledAt(format(new Date(meeting.scheduledAt), "yyyy-MM-dd'T'HH:mm"));
      setRescheduleDialogOpen(true);
    }
  };

  const handleArchive = (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setSelectedMeetingForAction(meeting);
      setArchiveDialogOpen(true);
    }
  };

  const handleDelete = (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      setSelectedMeetingForAction(meeting);
      setDeleteDialogOpen(true);
    }
  };

  const confirmCancel = () => {
    if (selectedMeetingForAction) {
      cancelMeetingMutation.mutate(selectedMeetingForAction.id);
    }
  };

  const confirmReschedule = () => {
    if (selectedMeetingForAction && newScheduledAt) {
      rescheduleMeetingMutation.mutate({
        meetingId: selectedMeetingForAction.id,
        scheduledAt: newScheduledAt,
      });
    }
  };

  const confirmArchive = () => {
    if (selectedMeetingForAction) {
      archiveMeetingMutation.mutate(selectedMeetingForAction.id);
    }
  };

  const confirmDelete = () => {
    if (selectedMeetingForAction) {
      deleteMeetingMutation.mutate(selectedMeetingForAction.id);
    }
  };

  const selectedMeetingAttendance = selectedMeeting 
    ? allAttendance.filter(a => a.meetingId === selectedMeeting.id)
    : [];

  // Filter meetings based on archived status
  const filteredMeetings = showArchived 
    ? meetings.filter(m => m.status === "archived")
    : meetings.filter(m => m.status !== "archived");

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-meetings-title">Group Meetings</h1>
          <p className="text-muted-foreground mt-1">
            Manage scheduled group interviews and mark attendance
          </p>
        </div>
        <InstructionPanel {...meetingsInstructions} />
      </div>

      {/* Toggle for showing archived meetings */}
      <div className="mb-4 flex justify-end">
        <Button
          variant={showArchived ? "default" : "outline"}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
          data-testid="button-toggle-archived"
        >
          {showArchived ? "Show Active" : "Show Archived"}
        </Button>
      </div>

      {loadingMeetings ? (
        <div className="text-center py-12" data-testid="loading-meetings">
          <div className="inline-flex items-center gap-3 text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading meetings...</span>
          </div>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <Card data-testid="empty-meetings">
          <CardContent className="text-center py-16">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {showArchived ? "No Archived Meetings" : "No Active Meetings"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {showArchived 
                ? "Archived meetings will appear here once you archive them"
                : "Group meetings will appear here once you schedule candidates for interviews"}
            </p>
            {!showArchived && (
              <Button onClick={() => setLocation("/")} data-testid="button-view-pipeline">
                <UserCheck className="h-4 w-4 mr-2" />
                View Pipeline
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="meetings-list">
          <CardHeader>
            <CardTitle>{showArchived ? "Archived" : "Scheduled"} Meetings</CardTitle>
            <CardDescription>
              {filteredMeetings.length} meeting{filteredMeetings.length !== 1 ? "s" : ""} {showArchived ? "archived" : "scheduled"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="meetings-grid">
              {filteredMeetings.map((meeting) => {
                const meetingCandidates = candidates.filter(
                  c => meeting.candidateIds?.includes(c.id)
                );
                return (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    candidates={meetingCandidates}
                    onMarkAttendance={handleMarkAttendance}
                    onCancel={handleCancel}
                    onReschedule={handleReschedule}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <AttendanceDialog
        open={attendanceDialogOpen}
        onOpenChange={setAttendanceDialogOpen}
        meeting={selectedMeeting}
        candidates={selectedMeeting ? candidates.filter(c => selectedMeeting.candidateIds?.includes(c.id)) : []}
        existingAttendance={selectedMeetingAttendance}
        onSave={handleSaveAttendance}
        onSendOnboarding={handleSendOnboarding}
        isSaving={markAttendanceMutation.isPending}
      />

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent data-testid="dialog-cancel-meeting">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this meeting? This action cannot be undone.
              {selectedMeetingForAction && (
                <div className="mt-2 text-sm">
                  <strong>{selectedMeetingForAction.roleType === "driver" ? "Driver" : "Non-Driver"} Interview</strong>
                  <br />
                  {format(new Date(selectedMeetingForAction.scheduledAt), "PPP 'at' p")}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-close">No, Keep It</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-cancel-dialog-confirm"
            >
              Yes, Cancel Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent data-testid="dialog-reschedule-meeting">
          <DialogHeader>
            <DialogTitle>Reschedule Meeting</DialogTitle>
            <DialogDescription>
              Select a new date and time for this meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="scheduledAt">New Date & Time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={newScheduledAt}
                onChange={(e) => setNewScheduledAt(e.target.value)}
                data-testid="input-reschedule-datetime"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRescheduleDialogOpen(false)}
              data-testid="button-reschedule-dialog-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmReschedule}
              disabled={!newScheduledAt || rescheduleMeetingMutation.isPending}
              data-testid="button-reschedule-dialog-confirm"
            >
              Reschedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent data-testid="dialog-archive-meeting">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive this meeting? You can view archived meetings by clicking "Show Archived".
              {selectedMeetingForAction && (
                <div className="mt-2 text-sm">
                  <strong>{selectedMeetingForAction.roleType === "driver" ? "Driver" : "Non-Driver"} Interview</strong>
                  <br />
                  {format(new Date(selectedMeetingForAction.scheduledAt), "PPP 'at' p")}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-archive-dialog-close">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmArchive}
              data-testid="button-archive-dialog-confirm"
            >
              Yes, Archive Meeting
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-meeting">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the meeting and all associated data.
              {selectedMeetingForAction && (
                <div className="mt-2 text-sm">
                  <strong>{selectedMeetingForAction.roleType === "driver" ? "Driver" : "Non-Driver"} Interview</strong>
                  <br />
                  {format(new Date(selectedMeetingForAction.scheduledAt), "PPP 'at' p")}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-dialog-close">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-dialog-confirm"
            >
              Yes, Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
