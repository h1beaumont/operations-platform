import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Briefcase, UserCheck, Upload, Calendar, CalendarDays, ListChecks, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CSVUpload } from "@/components/csv-upload";
import { PipelineBoard } from "@/components/pipeline-board-auto";
import { MetricsCard } from "@/components/metrics-card";
import { TrialShiftCard } from "@/components/trial-shift-card";
import { InstructionPanel } from "@/components/instruction-panel";
import AddCandidateDialog from "@/components/add-candidate-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Candidate, CSVCandidate, TrialShift } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition, AnimatedCard, AnimatedList, AnimatedListItem, AnimatedNumber, LoadingSpinner } from "@/lib/animations";
import { motion } from "framer-motion";

const pipelineInstructions = {
  title: "How to Use the Recruitment System",
  description: "Step-by-step guide to managing candidates from upload to hire",
  steps: [
    {
      step: 1,
      title: "Export Candidates from Indeed",
      description: "Download your candidate applications from Indeed as a CSV file.",
      tips: [
        "Go to Indeed employer dashboard → Applications",
        "Select the candidates you want to export",
        "Click 'Export' and choose CSV format",
      ],
    },
    {
      step: 2,
      title: "Upload CSV to Pipeline",
      description: "Click 'Upload Candidates' tab and drag & drop your Indeed CSV file.",
      tips: [
        "The system automatically screens candidates based on your settings",
        "Candidates who pass screening automatically move to 'Screened' status",
        "Failed candidates remain in 'Uploaded' with failure reasons shown",
      ],
    },
    {
      step: 3,
      title: "Review Screened Candidates",
      description: "Go to the 'Pipeline' tab to see all candidates organized by status.",
      tips: [
        "Candidates progress automatically based on actions (screening, attendance, etc.)",
        "Click on a card to view full details",
        "Use filters to view Driver vs Non-Driver roles",
      ],
    },
    {
      step: 4,
      title: "Schedule Group Meetings",
      description: "Select screened candidates and schedule them for group interviews.",
      tips: [
        "Go to 'Meetings' page in the sidebar",
        "Create a new meeting with date, time, and location",
        "Selected candidates are automatically moved to 'Scheduled' status",
      ],
    },
    {
      step: 5,
      title: "Track After Interview",
      description: "After the meeting, candidates automatically progress based on actions.",
      tips: [
        "Mark attendance to automatically move candidates to 'Attended' status",
        "Candidates who complete onboarding automatically move to 'Hired'",
        "View all trial shifts in the 'Trial Shifts' tab",
      ],
    },
  ],
};

export default function Dashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddCandidateDialog, setShowAddCandidateDialog] = useState(false);

  // Fetch candidates
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  // Fetch trial shifts
  const { data: trialShifts = [] } = useQuery<TrialShift[]>({
    queryKey: ["/api/trial-shifts"],
  });

  // Fetch screening links for metrics
  const { data: screeningLinks = [] } = useQuery<any[]>({
    queryKey: ["/api/screening/links"],
  });

  // Fetch meetings for metrics
  const { data: meetings = [] } = useQuery<any[]>({
    queryKey: ["/api/group-meetings"],
  });

  // Fetch pending onboarding items
  const { data: pendingOnboarding = [] } = useQuery<any[]>({
    queryKey: ["/api/onboarding/pending-summary"],
  });

  // Upload candidates from CSV
  const uploadCandidatesMutation = useMutation({
    mutationFn: async (csvCandidates: CSVCandidate[]) => {
      return apiRequest("POST", "/api/candidates/upload", { candidates: csvCandidates });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      
      const errorCount = data.errors?.length || 0;
      const duplicateCount = data.duplicates?.length || 0;
      
      if (data.imported > 0) {
        toast({
          title: "Upload Complete",
          description: `${data.imported} candidate(s) imported${duplicateCount > 0 ? `, ${duplicateCount} duplicate(s) skipped` : ''}${errorCount > 0 ? `, ${errorCount} error(s)` : ''}`,
        });
      } else if (errorCount > 0) {
        toast({
          title: "Upload Failed",
          description: `${errorCount} validation error(s) found. Please fix and try again.`,
          variant: "destructive",
        });
      }
      
      if (data.imported > 0) {
        setActiveTab("pipeline");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload candidates",
        variant: "destructive",
      });
    },
  });

  // Calculate metrics
  const completedScreenings = screeningLinks.filter((link: any) => link.completedAt);
  const passedScreenings = completedScreenings.filter((link: any) => link.passed === true);
  const screeningPassRate = completedScreenings.length > 0 
    ? Math.round((passedScreenings.length / completedScreenings.length) * 100) 
    : 0;

  const upcomingMeetings = meetings.filter((m: any) => {
    const meetingDate = new Date(m.scheduledAt);
    return meetingDate >= new Date();
  });

  const metrics = {
    totalCandidates: candidates.length,
    screeningLinksSent: screeningLinks.filter((link: any) => link.sentAt).length,
    screeningPassRate,
    scheduledMeetings: upcomingMeetings.length,
    attendedCandidates: candidates.filter(c => c.status === "attended" || c.status === "hired").length,
    onTrial: candidates.filter(c => c.status === "trial").length,
  };

  const upcomingShifts = trialShifts
    .filter(s => s.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);

  return (
    <PageTransition>
      <div className="container mx-auto p-6">
        <motion.div 
          className="mb-6 flex items-start justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Operations Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage candidate applications and hiring workflow
            </p>
          </div>
          <InstructionPanel {...pipelineInstructions} />
        </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList data-testid="tabs-main-navigation">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Users className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="upload" data-testid="tab-upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Candidates
          </TabsTrigger>
          <TabsTrigger value="pipeline" data-testid="tab-pipeline">
            <UserCheck className="h-4 w-4 mr-2" />
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="shifts" data-testid="tab-shifts">
            <Briefcase className="h-4 w-4 mr-2" />
            Trial Shifts
          </TabsTrigger>
        </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Metrics */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
              initial="initial"
              animate="animate"
              variants={{
                initial: {},
                animate: {
                  transition: {
                    staggerChildren: 0.05,
                  },
                },
              }}
            >
              <motion.div
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
              >
                <MetricsCard
                  title="Total Candidates"
                  value={metrics.totalCandidates}
                  icon={Users}
                  description="All uploaded candidates"
                  trend={{
                    value: 12,
                    isPositive: true
                  }}
                  data-testid="card-total-candidates"
                />
              </motion.div>
              <motion.div
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
              >
                <MetricsCard
                  title="Screening Links Sent"
                  value={metrics.screeningLinksSent}
                  icon={UserCheck}
                  description={`${metrics.screeningPassRate}% pass rate`}
                  data-testid="card-screening-links"
                />
              </motion.div>
              <motion.div
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
              >
                <MetricsCard
                  title="Upcoming Meetings"
                  value={metrics.scheduledMeetings}
                  icon={Calendar}
                  description="Group interviews scheduled"
                  data-testid="card-upcoming-meetings"
                />
              </motion.div>
              <motion.div
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
              >
                <MetricsCard
                  title="Attended & Hired"
                  value={metrics.attendedCandidates}
                  icon={Briefcase}
                  description="Candidates who attended meetings"
                  data-testid="card-attended-hired"
                />
              </motion.div>
              <motion.div
                variants={{
                  initial: { opacity: 0, y: 20 },
                  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                }}
              >
                <MetricsCard
                  title="Pending Onboarding Tasks"
                  value={pendingOnboarding.length}
                  icon={ListChecks}
                  description="Items need attention"
                  data-testid="card-pending-onboarding"
                />
              </motion.div>
            </motion.div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Jump to key workflows in your operations platform
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setActiveTab("upload")}
                  data-testid="button-quick-upload"
                  className="hover-elevate active-elevate-2"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New Candidates
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("pipeline")}
                  data-testid="button-quick-pipeline"
                  className="hover-elevate active-elevate-2"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  View Pipeline
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("shifts")}
                  data-testid="button-quick-shifts"
                  className="hover-elevate active-elevate-2"
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Manage Trial Shifts
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Shifts */}
            {upcomingShifts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Trial Shifts</CardTitle>
                  <CardDescription>
                    Next {upcomingShifts.length} scheduled trial shifts
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcomingShifts.map((shift) => {
                    const candidate = candidates.find(c => c.id === shift.candidateId);
                    return (
                      <TrialShiftCard
                        key={shift.id}
                        shift={shift}
                        candidateName={candidate ? `${candidate.firstName} ${candidate.lastName}` : undefined}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">Add Candidates</h3>
                <p className="text-sm text-muted-foreground">Upload a CSV file or add candidates manually</p>
              </div>
              <Button
                onClick={() => setShowAddCandidateDialog(true)}
                variant="outline"
                data-testid="button-add-manual"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Manually
              </Button>
            </div>
            
            <CSVUpload
              onUpload={(csvCandidates) => uploadCandidatesMutation.mutate(csvCandidates)}
              uploadResponse={uploadCandidatesMutation.data}
            />

            {uploadCandidatesMutation.isPending && (
              <div className="text-center py-8" data-testid="loading-upload">
                <div className="inline-flex items-center gap-3 text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Processing candidates...</span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-6">
            {loadingCandidates ? (
              <div className="space-y-4" data-testid="loading-pipeline">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded animate-pulse" />
                          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : candidates.length === 0 ? (
              <Card data-testid="empty-pipeline">
                <CardContent className="text-center py-16">
                  <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Candidates Yet</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Upload your first batch of candidates from Indeed to get started
                  </p>
                  <Button onClick={() => setActiveTab("upload")} data-testid="button-empty-upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Candidates
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <PipelineBoard candidates={candidates} />
            )}
          </TabsContent>

          <TabsContent value="shifts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trial Shifts Management</CardTitle>
                <CardDescription>
                  Track and manage all trial shifts for hired candidates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {trialShifts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground" data-testid="empty-trial-shifts">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No trial shifts scheduled yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trialShifts.map((shift) => {
                      const candidate = candidates.find(c => c.id === shift.candidateId);
                      return (
                        <TrialShiftCard
                          key={shift.id}
                          shift={shift}
                          candidateName={candidate ? `${candidate.firstName} ${candidate.lastName}` : undefined}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AddCandidateDialog 
          open={showAddCandidateDialog}
          onOpenChange={setShowAddCandidateDialog}
        />
      </div>
    </PageTransition>
  );
}
