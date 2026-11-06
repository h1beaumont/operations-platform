import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidateCard } from "./candidate-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, UserCheck, Calendar, Briefcase, Award, Clock, 
  CheckCircle2, XCircle, ArrowRight, Info 
} from "lucide-react";
import type { Candidate } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScheduleMeetingDialog, type ScheduleMeetingData } from "./schedule-meeting-dialog";

interface PipelineBoardProps {
  candidates: Candidate[];
  onSchedule?: (candidateId: string) => void;
  onView?: (candidateId: string) => void;
}

const stages = [
  { 
    id: "uploaded", 
    label: "Uploaded", 
    icon: Users, 
    color: "text-muted-foreground",
    description: "New candidates awaiting screening"
  },
  { 
    id: "screened", 
    label: "Screened", 
    icon: UserCheck, 
    color: "text-chart-1",
    description: "Passed screening, ready for interview"
  },
  { 
    id: "scheduled", 
    label: "Scheduled", 
    icon: Calendar, 
    color: "text-chart-3",
    description: "Interview scheduled and confirmed"
  },
  { 
    id: "attended", 
    label: "Attended", 
    icon: Briefcase, 
    color: "text-chart-2",
    description: "Attended interview, awaiting decision"
  },
  { 
    id: "hired", 
    label: "Hired", 
    icon: Award, 
    color: "text-chart-2",
    description: "Completed onboarding, ready to start"
  },
  { 
    id: "trial", 
    label: "On Trial", 
    icon: Clock, 
    color: "text-chart-3",
    description: "Currently in trial period"
  },
];

// Automatic progression rules
const progressionRules = [
  {
    from: "uploaded",
    to: "screened",
    trigger: "Passes screening questions",
    automatic: true,
  },
  {
    from: "screened",
    to: "scheduled",
    trigger: "Assigned to interview & confirms attendance",
    automatic: true,
  },
  {
    from: "scheduled",
    to: "attended",
    trigger: "Marked as attended by admin",
    automatic: false,
  },
  {
    from: "attended",
    to: "hired",
    trigger: "Completes onboarding form",
    automatic: true,
  },
  {
    from: "hired",
    to: "trial",
    trigger: "Starts trial shift",
    automatic: false,
  },
];

export function PipelineBoard({ candidates, onSchedule, onView }: PipelineBoardProps) {
  const [roleFilter, setRoleFilter] = useState<"all" | "driver" | "non-driver">("all");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const { toast } = useToast();

  // Fetch screening links for all candidates
  const { data: screeningLinks = [] } = useQuery<any[]>({
    queryKey: ["/api/screening/links"],
    enabled: candidates.length > 0,
  });

  // Fetch all meetings
  const { data: meetings = [] } = useQuery<any[]>({
    queryKey: ["/api/group-meetings"],
    enabled: candidates.length > 0,
  });

  // Fetch meeting attendance records
  const { data: attendanceRecords = [] } = useQuery<any[]>({
    queryKey: ["/api/meeting-attendance"],
    enabled: candidates.length > 0,
  });

  // Fetch trial shifts
  const { data: trialShifts = [] } = useQuery<any[]>({
    queryKey: ["/api/trial-shifts"],
    enabled: candidates.length > 0,
  });

  // Mutation for scheduling individual meeting
  const scheduleMeetingMutation = useMutation({
    mutationFn: async (data: ScheduleMeetingData) => {
      const response = await apiRequest(`/api/candidates/${data.candidateId}/schedule-meeting`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/group-meetings'] });
      toast({
        title: "Meeting scheduled",
        description: "Interview scheduled successfully and candidate moved to scheduled stage.",
      });
      setScheduleDialogOpen(false);
      setSelectedCandidate(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to schedule meeting",
        description: error.response?.data?.error || "Please try again.",
      });
    },
  });

  // Mutation for manually marking attendance
  const markAttendanceMutation = useMutation({
    mutationFn: async ({ candidateId, attended }: { candidateId: string; attended: boolean }) => {
      return await apiRequest('POST', '/api/meeting-attendance', {
        candidateId,
        attended,
        wantsToProceed: attended,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/meeting-attendance'] });
      toast({
        title: "Attendance recorded",
        description: "Candidate status automatically updated.",
      });
    },
    onError: (error: any) => {
      console.error("Attendance error:", error);
      toast({
        variant: "destructive",
        title: "Failed to record attendance",
        description: error?.message || "Please try again.",
      });
    },
  });

  // Create lookup maps for efficient access
  const screeningLinkMap = useMemo(() => {
    const map = new Map();
    screeningLinks.forEach((link: any) => {
      map.set(link.candidateId, link);
    });
    return map;
  }, [screeningLinks]);

  const meetingAssignmentMap = useMemo(() => {
    const map = new Map();
    meetings.forEach((meeting: any) => {
      if (meeting.candidateIds && Array.isArray(meeting.candidateIds)) {
        meeting.candidateIds.forEach((candidateId: string) => {
          map.set(candidateId, {
            scheduledAt: meeting.scheduledAt,
            meetingId: meeting.id,
          });
        });
      }
    });
    return map;
  }, [meetings]);

  const attendanceMap = useMemo(() => {
    const map = new Map();
    attendanceRecords.forEach((record: any) => {
      map.set(record.candidateId, {
        attended: record.attended,
        wantsToProceed: record.wantsToProceed,
        onboardingLinkSent: record.onboardingLinkSent,
      });
    });
    return map;
  }, [attendanceRecords]);

  const trialShiftsByCandidateMap = useMemo(() => {
    const map = new Map<string, any[]>();
    trialShifts.forEach((shift: any) => {
      const existing = map.get(shift.candidateId) || [];
      existing.push({
        date: shift.shiftDate,
        timeSlot: shift.timeSlot,
        supervisorName: shift.supervisorName || 'TBD',
      });
      map.set(shift.candidateId, existing);
    });
    return map;
  }, [trialShifts]);

  const filteredCandidates = candidates.filter((c) => 
    roleFilter === "all" || c.roleType === roleFilter
  );

  const getCandidatesByStage = (stageId: string) => {
    return filteredCandidates.filter((c) => c.status === stageId);
  };

  // Get the progression info for a candidate
  const getProgressionInfo = (candidate: Candidate) => {
    const currentStageIndex = stages.findIndex(s => s.id === candidate.status);
    const nextStage = stages[currentStageIndex + 1];
    const rule = progressionRules.find(r => r.from === candidate.status);
    
    const screeningLink = screeningLinkMap.get(candidate.id);
    const meetingInfo = meetingAssignmentMap.get(candidate.id);
    const attendanceInfo = attendanceMap.get(candidate.id);
    
    let progressStatus = null;
    let actionNeeded = null;
    
    if (candidate.status === "uploaded") {
      if (screeningLink?.completedAt && screeningLink?.passed) {
        progressStatus = "ready";
        actionNeeded = "Will auto-progress to Screened";
      } else if (screeningLink?.completedAt && !screeningLink?.passed) {
        progressStatus = "blocked";
        actionNeeded = "Failed screening";
      } else if (screeningLink) {
        progressStatus = "waiting";
        actionNeeded = "Awaiting screening completion";
      }
    } else if (candidate.status === "screened") {
      if (meetingInfo) {
        progressStatus = "ready";
        actionNeeded = "Interview scheduled - awaiting confirmation";
      } else {
        progressStatus = "waiting";
        actionNeeded = "Needs interview scheduling";
      }
    } else if (candidate.status === "scheduled") {
      progressStatus = "waiting";
      actionNeeded = "Awaiting interview attendance";
    } else if (candidate.status === "attended") {
      if (attendanceInfo?.onboardingLinkSent) {
        progressStatus = "waiting";
        actionNeeded = "Onboarding link sent - awaiting completion";
      } else {
        progressStatus = "waiting";
        actionNeeded = "Needs onboarding link";
      }
    }
    
    return {
      nextStage,
      rule,
      progressStatus,
      actionNeeded,
      screeningLink,
      meetingInfo,
      attendanceInfo,
    };
  };

  return (
    <div className="space-y-6">
      {/* Automatic Progression Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Automatic Progression Enabled</strong>
          <div className="mt-2 text-xs space-y-1">
            {progressionRules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Badge variant={rule.automatic ? "default" : "secondary"} className="text-xs">
                  {rule.automatic ? "Auto" : "Manual"}
                </Badge>
                <span>
                  {stages.find(s => s.id === rule.from)?.label} → {stages.find(s => s.id === rule.to)?.label}: {rule.trigger}
                </span>
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>

      {/* Role Filter */}
      <div className="flex items-center justify-end">
        <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}>
          <TabsList data-testid="tabs-role-filter">
            <TabsTrigger value="all" data-testid="tab-all-roles">
              All Roles
              <Badge variant="secondary" className="ml-2 font-mono">
                {candidates.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="driver" data-testid="tab-driver">
              Drivers
              <Badge variant="secondary" className="ml-2 font-mono bg-chart-1/10 text-chart-1">
                {candidates.filter(c => c.roleType === "driver").length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="non-driver" data-testid="tab-non-driver">
              Non-Drivers
              <Badge variant="secondary" className="ml-2 font-mono bg-chart-4/10 text-chart-4">
                {candidates.filter(c => c.roleType === "non-driver").length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Pipeline Stages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        {stages.map((stage) => {
          const stageCandidates = getCandidatesByStage(stage.id);
          const StageIcon = stage.icon;

          return (
            <Card key={stage.id} data-testid={`pipeline-stage-${stage.id}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <StageIcon className={`h-4 w-4 ${stage.color}`} />
                  {stage.label}
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {stageCandidates.length}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{stage.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {stageCandidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No candidates
                  </p>
                ) : (
                  stageCandidates.map((candidate) => {
                    const progressInfo = getProgressionInfo(candidate);
                    
                    return (
                      <div key={candidate.id} className="space-y-2">
                        <CandidateCard
                          candidate={candidate}
                          onView={onView}
                          screeningLink={progressInfo.screeningLink}
                          meetingInfo={progressInfo.meetingInfo}
                          attendanceInfo={progressInfo.attendanceInfo}
                          trialShifts={trialShiftsByCandidateMap.get(candidate.id)}
                        />
                        
                        {/* Progression Status */}
                        {progressInfo.actionNeeded && (
                          <div className="px-3 py-2 bg-muted rounded-lg text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              {progressInfo.progressStatus === "ready" && (
                                <CheckCircle2 className="h-3 w-3 text-green-500" />
                              )}
                              {progressInfo.progressStatus === "waiting" && (
                                <Clock className="h-3 w-3 text-yellow-500" />
                              )}
                              {progressInfo.progressStatus === "blocked" && (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className="font-medium">{progressInfo.actionNeeded}</span>
                            </div>
                            
                            {/* Manual Actions */}
                            {candidate.status === "screened" && !progressInfo.meetingInfo && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs"
                                onClick={() => {
                                  setSelectedCandidate(candidate);
                                  setScheduleDialogOpen(true);
                                }}
                                data-testid={`button-schedule-${candidate.id}`}
                              >
                                Schedule Interview
                              </Button>
                            )}
                            
                            {candidate.status === "scheduled" && !progressInfo.attendanceInfo?.attended && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => markAttendanceMutation.mutate({ 
                                    candidateId: candidate.id, 
                                    attended: true 
                                  })}
                                >
                                  Mark Attended
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 h-7 text-xs"
                                  onClick={() => markAttendanceMutation.mutate({ 
                                    candidateId: candidate.id, 
                                    attended: false 
                                  })}
                                >
                                  No Show
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Meeting Scheduling Dialog */}
      <ScheduleMeetingDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        candidate={selectedCandidate}
        onSchedule={scheduleMeetingMutation.mutateAsync}
        isSaving={scheduleMeetingMutation.isPending}
      />
    </div>
  );
}