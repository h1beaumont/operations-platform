import { useState } from "react";
import { User, Mail, Phone, Calendar, CheckCircle, XCircle, Clock, Send, FileCheck, UserCheck, Briefcase, MessageSquare, History, ListChecks, SendHorizonal, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { Candidate } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { OnboardingChecklist } from "./onboarding-checklist";

interface CandidateCardProps {
  candidate: Candidate;
  onSchedule?: (candidateId: string) => void;
  onView?: (candidateId: string) => void;
  screeningLink?: {
    sentAt: Date | null;
    passed: boolean | null;
    completedAt: Date | null;
  } | null;
  meetingInfo?: {
    scheduledAt: string;
  } | null;
  attendanceInfo?: {
    attended: boolean;
    wantsToProceed: boolean | null;
    onboardingLinkSent: boolean;
  } | null;
  trialShifts?: Array<{
    date: string;
    timeSlot: string;
    supervisorName: string;
  }>;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ReactNode }> = {
  uploaded: { label: "Uploaded", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  screened: { label: "Screened", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  scheduled: { label: "Meeting Scheduled", variant: "default", icon: <Calendar className="h-3 w-3" /> },
  attended: { label: "Attended", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  hired: { label: "Hired", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
  trial: { label: "On Trial", variant: "default", icon: <Clock className="h-3 w-3" /> },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
};

const roleTypeColors: Record<string, string> = {
  driver: "bg-chart-1 text-primary-foreground",
  "non-driver": "bg-chart-4 text-primary-foreground",
};

// Helper function to format meeting date/time
const formatMeetingDateTime = (dateStr: string | Date, timeStr?: string) => {
  const date = new Date(dateStr);
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric' 
  });
  
  if (timeStr) {
    // Convert 24hr time to 12hr format
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    return `${formattedDate} at ${displayTime}`;
  }
  
  return formattedDate;
};

export function CandidateCard({ 
  candidate, 
  onSchedule, 
  onView,
  screeningLink,
  meetingInfo,
  attendanceInfo,
  trialShifts = []
}: CandidateCardProps) {
  const status = statusConfig[candidate.status] || statusConfig.uploaded;
  const initials = `${candidate.firstName[0]}${candidate.lastName[0]}`.toUpperCase();
  const { toast } = useToast();

  const [notesOpen, setNotesOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [onboardingDialogOpen, setOnboardingDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  
  // Onboarding request field state
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "phoneNumber",
    "email",
    "address"
  ]); // Default preselected fields

  // Fetch candidate history
  const { data: history = [], isLoading: historyLoading } = useQuery<any[]>({
    queryKey: [`/api/candidates/${candidate.id}/history`],
    enabled: historyOpen,
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      return await apiRequest('POST', `/api/candidates/${candidate.id}/notes`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      setNewNote("");
      toast({
        title: "Note added",
        description: "Note has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to add note",
        description: "Could not save note. Please try again.",
      });
    },
  });

  const handleAddNote = () => {
    if (!newNote.trim()) {
      toast({
        variant: "destructive",
        title: "Note required",
        description: "Please enter a note before saving.",
      });
      return;
    }
    addNoteMutation.mutate(newNote.trim());
  };

  // Send onboarding request mutation
  const sendOnboardingMutation = useMutation({
    mutationFn: async (requestedFields: string[]) => {
      // Use candidate.id as staffId - the backend will handle if not found
      return await apiRequest('POST', `/api/staff/${candidate.id}/onboarding-request`, { requestedFields });
    },
    onSuccess: () => {
      toast({
        title: "Onboarding request sent",
        description: `SMS sent to ${candidate.firstName} ${candidate.lastName}`,
      });
      setOnboardingDialogOpen(false);
      setSelectedFields(["phoneNumber", "email", "address"]); // Reset to defaults
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to send request",
        description: error.message || "Could not send onboarding request. The candidate may not have a staff record yet.",
      });
    },
  });

  // Delete candidate mutation
  const deleteCandidateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/candidates/${candidate.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to delete candidate",
        description: error.message || "Could not delete candidate. Please try again.",
      });
    },
  });

  const handleSendOnboarding = () => {
    if (selectedFields.length === 0) {
      toast({
        variant: "destructive",
        title: "No fields selected",
        description: "Please select at least one field to request.",
      });
      return;
    }
    sendOnboardingMutation.mutate(selectedFields);
  };

  const toggleField = (field: string) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const onboardingFields = [
    { id: "phoneNumber", label: "Phone Number" },
    { id: "email", label: "Email Address" },
    { id: "address", label: "Home Address" },
    { id: "emergencyContactName", label: "Emergency Contact Name" },
    { id: "emergencyContactPhone", label: "Emergency Contact Phone" },
    { id: "dateOfBirth", label: "Date of Birth" },
    { id: "nationalInsurance", label: "National Insurance Number" },
    { id: "bankAccount", label: "Bank Account Number" },
    { id: "sortCode", label: "Bank Sort Code" },
  ];

  const isUrgent = candidate.status === 'screened' && !meetingInfo;
  const isStale = candidate.createdAt && 
    (new Date().getTime() - new Date(candidate.createdAt).getTime()) > 7 * 24 * 60 * 60 * 1000;
  
  return (
    <Card className={`hover-elevate transition-all ${isUrgent ? 'border-l-4 border-l-orange-500' : ''} ${isStale ? 'opacity-75' : ''}`} data-testid={`card-candidate-${candidate.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <h3 className="font-semibold text-sm leading-tight flex-1 min-w-0 truncate" data-testid={`text-candidate-name-${candidate.id}`}>
                  {candidate.firstName} {candidate.lastName}
                </h3>
                <Badge 
                  className={`${roleTypeColors[candidate.roleType]} text-xs shrink-0`}
                  data-testid={`badge-role-${candidate.id}`}
                >
                  {candidate.roleType === "driver" ? "Driver" : "Non-Driver"}
                </Badge>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate" data-testid={`text-email-${candidate.id}`}>{candidate.email}</span>
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span className="font-mono">{candidate.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <Badge variant={status.variant} className="gap-1.5 w-fit" data-testid={`badge-status-${candidate.id}`}>
                {status.icon}
                {status.label}
              </Badge>

              <div className="flex flex-wrap gap-1.5">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      data-testid={`button-delete-candidate-${candidate.id}`} 
                      title="Delete Candidate"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Candidate</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {candidate.firstName} {candidate.lastName}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid={`button-cancel-delete-candidate-${candidate.id}`}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteCandidateMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover-elevate"
                        data-testid={`button-confirm-delete-candidate-${candidate.id}`}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Drawer open={notesOpen} onOpenChange={setNotesOpen}>
                  <DrawerTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-notes-${candidate.id}`} title="View/Add Notes">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerHeader>
                      <DrawerTitle>Notes for {candidate.firstName} {candidate.lastName}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 space-y-4">
                      {/* Existing notes */}
                      {candidate.notes && (
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Previous Notes</label>
                          <ScrollArea className="h-[150px] w-full rounded-md border p-4 bg-muted/30">
                            <div className="whitespace-pre-wrap text-sm">{candidate.notes}</div>
                          </ScrollArea>
                        </div>
                      )}
                      
                      {/* Add note */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">{candidate.notes ? 'Add Another Note' : 'Add Note'}</label>
                        <Textarea 
                          placeholder="Enter your note..." 
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          rows={4}
                          data-testid={`textarea-note-${candidate.id}`}
                        />
                      </div>
                    </div>
                    <DrawerFooter>
                      <Button 
                        onClick={handleAddNote} 
                        disabled={addNoteMutation.isPending}
                        data-testid={`button-save-note-${candidate.id}`}
                      >
                        {addNoteMutation.isPending ? "Saving..." : "Add Note"}
                      </Button>
                      <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>

                <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-history-${candidate.id}`} title="View Stage History">
                      <History className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Stage History for {candidate.firstName} {candidate.lastName}</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[400px] w-full pr-4">
                      {historyLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading history...</div>
                      ) : history.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No history yet</div>
                      ) : (
                        <div className="space-y-3">
                          {history.map((h: any) => (
                            <div 
                              key={h.id} 
                              className="flex flex-col gap-1 p-3 rounded-md border bg-muted/20"
                              data-testid={`history-entry-${h.id}`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">
                                  {h.fromStatus ? `${h.fromStatus} → ${h.toStatus}` : `Initial: ${h.toStatus}`}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(h.changedAt), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                              {h.note && (
                                <p className="text-sm text-muted-foreground mt-1">{h.note}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                {onView && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(candidate.id)}
                    data-testid={`button-view-${candidate.id}`}
                    className="hover-elevate active-elevate-2"
                  >
                    View Details
                  </Button>
                )}
                {onSchedule && candidate.status === "screened" && (
                  <Button
                    size="sm"
                    onClick={() => onSchedule(candidate.id)}
                    data-testid={`button-schedule-${candidate.id}`}
                    className="hover-elevate active-elevate-2"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Schedule
                  </Button>
                )}
                {(candidate.status === "hired" || candidate.status === "trial") && (
                  <>
                    <Dialog open={checklistOpen} onOpenChange={setChecklistOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" data-testid={`button-checklist-${candidate.id}`}>
                          <ListChecks className="h-4 w-4 mr-1" />
                          Checklist
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <OnboardingChecklist candidateId={candidate.id} />
                      </DialogContent>
                    </Dialog>

                    <Dialog open={onboardingDialogOpen} onOpenChange={setOnboardingDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid={`button-send-onboarding-${candidate.id}`}
                        >
                          <SendHorizonal className="h-4 w-4 mr-1" />
                          Send Request
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md" data-testid="dialog-onboarding-request">
                        <DialogHeader>
                          <DialogTitle>Send Onboarding Request</DialogTitle>
                          <DialogDescription>
                            Request additional information from {candidate.firstName} {candidate.lastName} via SMS
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <p className="text-sm text-muted-foreground">
                            Select the information you need to collect:
                          </p>

                          <div className="space-y-3">
                            {onboardingFields.map((field) => (
                              <div key={field.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`field-${field.id}`}
                                  checked={selectedFields.includes(field.id)}
                                  onCheckedChange={() => toggleField(field.id)}
                                  data-testid={`checkbox-field-${field.id}`}
                                />
                                <Label
                                  htmlFor={`field-${field.id}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {field.label}
                                </Label>
                              </div>
                            ))}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            An SMS will be sent to the staff member's phone number with a link to submit this information.
                          </p>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button
                            variant="outline"
                            onClick={() => setOnboardingDialogOpen(false)}
                            data-testid="button-cancel-onboarding"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSendOnboarding}
                            disabled={sendOnboardingMutation.isPending || selectedFields.length === 0}
                            data-testid="button-submit-onboarding"
                          >
                            {sendOnboardingMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Send SMS Request
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>

              {/* Additional Status Indicators */}
              {(screeningLink?.sentAt || meetingInfo || attendanceInfo || trialShifts.length > 0) && (
                <div className="flex flex-wrap gap-2 mt-1">
              {/* Screening Link Sent */}
              {screeningLink?.sentAt && (
                <Badge 
                  variant="outline" 
                  className="gap-1 text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 shrink-0"
                  data-testid={`badge-screening-sent-${candidate.id}`}
                >
                  <Send className="h-3 w-3" />
                  Screening Link Sent
                </Badge>
              )}

              {/* Screening Result */}
              {screeningLink?.completedAt && screeningLink.passed === true && (
                <Badge 
                  variant="outline" 
                  className="gap-1 text-xs bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20 shrink-0"
                  data-testid={`badge-screening-passed-${candidate.id}`}
                >
                  <CheckCircle className="h-3 w-3" />
                  Passed Screening
                </Badge>
              )}

              {screeningLink?.completedAt && screeningLink.passed === false && (
                <Badge 
                  variant="outline" 
                  className="gap-1 text-xs bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 shrink-0"
                  data-testid={`badge-screening-failed-${candidate.id}`}
                >
                  <XCircle className="h-3 w-3" />
                  Failed Screening
                </Badge>
              )}

              {/* Meeting Scheduled */}
              {meetingInfo && meetingInfo.scheduledAt && (
                <Badge 
                  variant="outline" 
                  className="gap-1 text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 shrink-0"
                  data-testid={`badge-meeting-scheduled-${candidate.id}`}
                >
                  <Calendar className="h-3 w-3" />
                  {format(new Date(meetingInfo.scheduledAt), "MMM d 'at' h:mm a")}
                </Badge>
              )}

              {/* Attended Meeting */}
              {attendanceInfo?.attended && (
                <Badge 
                  variant="outline" 
                  className="gap-1 text-xs bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20 shrink-0"
                  data-testid={`badge-attended-${candidate.id}`}
                >
                  <UserCheck className="h-3 w-3" />
                  Attended Meeting
                </Badge>
              )}

              {/* Onboarding Link Sent */}
              {attendanceInfo?.onboardingLinkSent && (
                <Badge 
                  variant="outline" 
                  className="gap-1 text-xs bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 shrink-0"
                  data-testid={`badge-onboarding-sent-${candidate.id}`}
                >
                  <FileCheck className="h-3 w-3" />
                  Onboarding Sent
                </Badge>
              )}

              {/* Trial Shifts */}
              {trialShifts.length > 0 && (
                <Badge 
                  variant="outline" 
                  className="gap-1 text-xs bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 shrink-0"
                  data-testid={`badge-trial-shifts-${candidate.id}`}
                >
                  <Briefcase className="h-3 w-3" />
                  {trialShifts.length} Trial Shift{trialShifts.length > 1 ? 's' : ''}
                </Badge>
              )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
