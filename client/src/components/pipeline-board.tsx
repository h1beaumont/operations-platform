import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CandidateCard } from "./candidate-card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, Calendar, Briefcase, Award, Clock, Loader2 } from "lucide-react";
import type { Candidate } from "@shared/schema";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PipelineBoardProps {
  candidates: Candidate[];
  onSchedule?: (candidateId: string) => void;
  onView?: (candidateId: string) => void;
}

const stages = [
  { id: "uploaded", label: "Uploaded", icon: Users, color: "text-muted-foreground" },
  { id: "screened", label: "Screened", icon: UserCheck, color: "text-chart-1" },
  { id: "scheduled", label: "Scheduled", icon: Calendar, color: "text-chart-3" },
  { id: "attended", label: "Attended", icon: Briefcase, color: "text-chart-2" },
  { id: "hired", label: "Hired", icon: Award, color: "text-chart-2" },
  { id: "trial", label: "On Trial", icon: Clock, color: "text-chart-3" },
];

// Draggable wrapper for candidate cards
function DraggableCandidate({ candidate, children }: { candidate: Candidate; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: candidate.id,
    data: { candidate },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// Droppable wrapper for stage columns
function DroppableStage({ stageId, children }: { stageId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stageId,
  });

  const style = {
    backgroundColor: isOver ? 'hsl(var(--accent))' : undefined,
    transition: 'background-color 200ms ease',
  };

  return (
    <div ref={setNodeRef} style={style} className="min-h-[300px] w-full">
      {children}
    </div>
  );
}

export function PipelineBoard({ candidates, onSchedule, onView }: PipelineBoardProps) {
  const [roleFilter, setRoleFilter] = useState<"all" | "driver" | "non-driver">("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const { toast } = useToast();

  // Set up DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Mutation for updating candidate status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ candidateId, status }: { candidateId: string; status: string }) => {
      return await apiRequest('PATCH', `/api/candidates/${candidateId}/status`, { status });
    },
    onMutate: async ({ candidateId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/candidates'] });

      // Snapshot the previous value
      const previousCandidates = queryClient.getQueryData<Candidate[]>(['/api/candidates']);

      // Optimistically update to the new value
      queryClient.setQueryData<Candidate[]>(['/api/candidates'], (old) => {
        if (!old) return old;
        return old.map((c) => (c.id === candidateId ? { ...c, status } : c));
      });

      // Return context with previous value
      return { previousCandidates };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousCandidates) {
        queryClient.setQueryData(['/api/candidates'], context.previousCandidates);
      }
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: "Could not move candidate. Please try again.",
      });
    },
    onSuccess: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Status updated",
        description: "Candidate moved successfully.",
      });
    },
  });

  // Handle drag end
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const candidateId = active.id as string;
    const newStatus = over.id as string;

    updateStatusMutation.mutate({ candidateId, status: newStatus });
  }

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

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
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
                    <Badge variant="secondary" className="font-mono text-xs">
                      {stageCandidates.length}
                    </Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <DroppableStage stageId={stage.id}>
                    {stageCandidates.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No candidates
                      </div>
                    ) : (
                      stageCandidates.map((candidate) => (
                        <DraggableCandidate key={candidate.id} candidate={candidate}>
                          <CandidateCard
                            candidate={candidate}
                            onSchedule={onSchedule}
                            onView={onView}
                            screeningLink={screeningLinkMap.get(candidate.id)}
                            meetingInfo={meetingAssignmentMap.get(candidate.id)}
                            attendanceInfo={attendanceMap.get(candidate.id)}
                            trialShifts={trialShiftsByCandidateMap.get(candidate.id) || []}
                          />
                        </DraggableCandidate>
                      ))
                    )}
                  </DroppableStage>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}
