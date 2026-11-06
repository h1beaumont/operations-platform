import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle, ArrowRight, AlertCircle, MessageSquare, Loader2, Copy, Edit, Check, Link as LinkIcon, Phone, History, ChevronDown, ChevronUp } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PageTransition, AnimatedCard } from "@/lib/animations";
import { motion, AnimatePresence } from "framer-motion";
import { DualClocks } from "@/components/dual-clocks";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { systemSettings, ActivityLog } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Overview() {
  const { toast } = useToast();
  const [testResult, setTestResult] = useState<any>(null);
  const [testPhone, setTestPhone] = useState("");
  const [copiedBooking, setCopiedBooking] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editBookingLink, setEditBookingLink] = useState("");
  const [editOfficePhone, setEditOfficePhone] = useState("");
  const [showActivityLog, setShowActivityLog] = useState(false);
  const activityLogRef = useRef<HTMLDivElement>(null);

  // Fetch system settings
  const { data: systemSettingsData, isLoading: settingsLoading } = useQuery<typeof systemSettings.$inferSelect>({
    queryKey: ["/api/system-settings"],
  });

  // Fetch activity logs (only when expanded)
  const { data: activityLogsData, isLoading: logsLoading } = useQuery<{
    logs: ActivityLog[];
    total: number;
  }>({
    queryKey: ["/api/activity-logs", { limit: 50 }],
    enabled: showActivityLog, // Only fetch when user expands the section
  });

  // Update system settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: { directBookingLink?: string; officePhone?: string }) => {
      const response = await apiRequest("/api/system-settings", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      setEditDialogOpen(false);
      toast({
        title: "Settings Updated",
        description: "System settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update system settings.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string, type: "booking" | "phone") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "booking") {
        setCopiedBooking(true);
        setTimeout(() => setCopiedBooking(false), 2000);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
      toast({
        title: "Copied!",
        description: `${type === "booking" ? "Booking link" : "Office phone"} copied to clipboard.`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = () => {
    setEditBookingLink(systemSettingsData?.directBookingLink || "");
    setEditOfficePhone(systemSettingsData?.officePhone || "");
    setEditDialogOpen(true);
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      directBookingLink: editBookingLink,
      officePhone: editOfficePhone,
    });
  };

  const testSmsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/test-sms", {
        method: "POST",
        body: JSON.stringify({ phone: testPhone }),
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      setTestResult(data);
      toast({
        title: "Test SMS Sent! 📱",
        description: `Message sent to ${data.phone} successfully! Check your phone.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "SMS Test Failed",
        description: error.message || "Make sure Twilio is configured in the Integrations panel.",
        variant: "destructive",
      });
    },
  });

  return (
    <PageTransition>
      <div className="container mx-auto p-6 max-w-6xl">
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-4xl font-bold mb-3" data-testid="text-overview-title">
            Complete System Guide
          </h1>
          <p className="text-lg text-muted-foreground">
            Follow these precise step-by-step instructions for every task
          </p>

          {/* System Settings - Direct Booking Link and Office Phone */}
          <Card className="mt-6 mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">System Information</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditClick}
                  data-testid="button-edit-settings"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {settingsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Direct Booking Link */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Direct Booking Link
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={systemSettingsData?.directBookingLink || ""}
                        readOnly
                        className="flex-1"
                        data-testid="input-booking-link"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(systemSettingsData?.directBookingLink || "", "booking")}
                        data-testid="button-copy-booking"
                      >
                        {copiedBooking ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Office Phone */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Office Phone Number
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={systemSettingsData?.officePhone || ""}
                        readOnly
                        className="flex-1"
                        data-testid="input-office-phone"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(systemSettingsData?.officePhone || "", "phone")}
                        data-testid="button-copy-phone"
                      >
                        {copiedPhone ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        
        {/* Availability Test SMS Button */}
        <Card className="mt-6 border-2 border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-lg">Test Staff Availability SMS</CardTitle>
            </div>
            <CardDescription className="text-sm">
              Enter a phone number to receive a real availability submission link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="+447796872416"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1"
                data-testid="input-test-phone"
              />
              <Button
                onClick={() => testSmsMutation.mutate()}
                disabled={testSmsMutation.isPending || !testPhone.trim()}
                data-testid="button-test-sms"
                className="shrink-0"
              >
                {testSmsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Test SMS
                  </>
                )}
              </Button>
            </div>
            {testResult && (
              <Alert className="bg-green-50 dark:bg-green-950/20 border-green-500/50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <strong>Success!</strong> Availability link sent to {testResult.phone}
                  {testResult.link && (
                    <span className="block text-xs text-muted-foreground mt-1 break-all">
                      Link: {testResult.link}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        </motion.div>

      {/* PART 1: HIRING NEW STAFF */}
      <div className="mb-12">
        <div className="bg-primary/10 p-6 rounded-lg mb-6">
          <h2 className="text-3xl font-bold mb-2">Part 1: Hiring New Staff</h2>
          <p className="text-muted-foreground">
            From finding candidates on Indeed to fully onboarded cleaning staff
          </p>
        </div>

        {/* STEP 1 */}
        <Card className="mb-6" data-testid="card-hire-step-1">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                1
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Export Candidates from Indeed</CardTitle>
                <CardDescription className="text-base mt-1">Get your applicants list ready</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Go to Indeed.com employer portal</p>
                  <p className="text-sm text-muted-foreground">Log in with your Indeed employer account</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click on your job posting for cleaning staff</p>
                  <p className="text-sm text-muted-foreground">Select the specific job you want to download applicants for</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Find the "Download" or "Export" button</p>
                  <p className="text-sm text-muted-foreground">Usually in top right area - look for download icon or "Export applicants"</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Select CSV format and download</p>
                  <p className="text-sm text-muted-foreground">Make sure CSV includes: Name, Email, Phone, and screening question answers</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Save the file to your computer</p>
                  <p className="text-sm text-muted-foreground">Remember where you saved it - you'll upload it in the next step</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What you'll have:</strong> A CSV file with all applicant details ready to upload
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* STEP 2 */}
        <Card className="mb-6" data-testid="card-hire-step-2">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                2
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Upload CSV to Pipeline</CardTitle>
                <CardDescription className="text-base mt-1">Import candidates into the system</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Pipeline" in the left sidebar</p>
                  <p className="text-sm text-muted-foreground">This opens the main operations dashboard</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Look for the upload area at the top</p>
                  <p className="text-sm text-muted-foreground">You'll see "Upload Indeed CSV" with a drag-and-drop zone</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Either drag your CSV file onto the zone OR click "Browse files"</p>
                  <p className="text-sm text-muted-foreground">Find the Indeed CSV you downloaded in Step 1</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Wait for the upload to complete</p>
                  <p className="text-sm text-muted-foreground">You'll see a success message when done</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">Candidates appear in "Uploaded" column on the board</p>
                  <p className="text-sm text-muted-foreground">Each candidate shows as a card with their name and email</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What you'll see:</strong> All candidates displayed as cards in the "Uploaded" stage, ready for screening
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* STEP 3 */}
        <Card className="mb-6" data-testid="card-hire-step-3">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                3
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Configure Screening Questions (One-Time Setup)</CardTitle>
                <CardDescription className="text-base mt-1">Set up automated filtering rules</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Settings" in the left sidebar</p>
                  <p className="text-sm text-muted-foreground">Find it in the navigation sidebar</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Review the pre-configured screening questions</p>
                  <p className="text-sm text-muted-foreground">Different questions for Driver vs Non-Driver roles</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Edit" button on any question to modify</p>
                  <p className="text-sm text-muted-foreground">Change the question text or required answer</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Add Question" to create new screening criteria</p>
                  <p className="text-sm text-muted-foreground">Set the required answer that qualifies candidates</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">Your screening rules are now saved</p>
                  <p className="text-sm text-muted-foreground">You only need to do this once unless you want to change criteria</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What this does:</strong> System will automatically check candidate answers against these rules when you screen them
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* STEP 4 */}
        <Card className="mb-6" data-testid="card-hire-step-4">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                4
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">View Screened Candidates</CardTitle>
                <CardDescription className="text-base mt-1">Candidates are automatically screened during upload</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">Screening happens automatically during upload</p>
                  <p className="text-sm text-muted-foreground">No manual action needed - the system does it for you</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Go to "Pipeline" page in the sidebar</p>
                  <p className="text-sm text-muted-foreground">Click on "Pipeline" tab to view all candidates</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Check the "Screened" column</p>
                  <p className="text-sm text-muted-foreground">Qualified candidates who passed your screening criteria will appear here</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Review rejected candidates if needed</p>
                  <p className="text-sm text-muted-foreground">Unqualified candidates remain in "Uploaded" column with rejection reasons</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What you'll see:</strong> Only candidates who meet your criteria appear in "Screened" - ready to invite to interviews
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* STEP 5 */}
        <Card className="mb-6" data-testid="card-hire-step-5">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                5
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Schedule Group Interview</CardTitle>
                <CardDescription className="text-base mt-1">Create a meeting and invite candidates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Meetings" in the left sidebar</p>
                  <p className="text-sm text-muted-foreground">This opens the group interview management page</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Create Meeting" button (top right)</p>
                  <p className="text-sm text-muted-foreground">A dialog box will pop up</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Fill in meeting details:</p>
                  <ul className="text-sm text-muted-foreground ml-5 mt-1 space-y-1">
                    <li>• Date and time (e.g., "Next Tuesday 2pm")</li>
                    <li>• Location (e.g., "Northstay Office")</li>
                    <li>• Select screened candidates from the list</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Create Meeting" button</p>
                  <p className="text-sm text-muted-foreground">System creates the meeting and adds to Google Calendar</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">Meeting appears in meetings list</p>
                  <p className="text-sm text-muted-foreground">Selected candidates automatically move to "Scheduled" in Pipeline</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Next step:</strong> You need to manually contact candidates to inform them of interview time/location (use their contact details from Pipeline)
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* STEP 6 */}
        <Card className="mb-6" data-testid="card-hire-step-6">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                6
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Mark Attendance After Interview</CardTitle>
                <CardDescription className="text-base mt-1">Track who actually showed up</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">After your interview is complete, go to "Meetings" page</p>
                  <p className="text-sm text-muted-foreground">Find the meeting you just held</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Mark Attendance" button on that meeting</p>
                  <p className="text-sm text-muted-foreground">A checklist dialog will pop up</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Check the box next to each candidate who attended</p>
                  <p className="text-sm text-muted-foreground">Leave unchecked anyone who didn't show up</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Save Attendance"</p>
                  <p className="text-sm text-muted-foreground">System updates candidate status</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">Attended candidates move to "Attended" column in Pipeline</p>
                  <p className="text-sm text-muted-foreground">No-shows remain in "Scheduled" so you can reschedule or reject</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What you'll see:</strong> Pipeline board updates automatically - candidates who attended are ready to hire
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* STEP 7 */}
        <Card className="mb-6" data-testid="card-hire-step-7">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                7
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Hire Candidates</CardTitle>
                <CardDescription className="text-base mt-1">Move selected candidates to hired status</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Go to "Pipeline" page</p>
                  <p className="text-sm text-muted-foreground">Look at the "Attended" column</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">For each candidate you want to hire: Click and drag their card</p>
                  <p className="text-sm text-muted-foreground">Drag from "Attended" column to "Hired" column</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Drop the card in "Hired" column</p>
                  <p className="text-sm text-muted-foreground">Card will snap into place</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">Candidate is now marked as "Hired"</p>
                  <p className="text-sm text-muted-foreground">Ready to be added to your active staff roster</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Pro tip:</strong> You can also drag candidates to "On Trial" if you want to track their trial period first
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* STEP 8 */}
        <Card className="mb-6" data-testid="card-hire-step-8">
          <CardHeader className="bg-success/20">
            <div className="flex items-start gap-4">
              <div className="bg-success text-success-foreground rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                8
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Add to Current Staff</CardTitle>
                <CardDescription className="text-base mt-1">Create their staff profile for scheduling and tracking</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Leaderboard" in the left sidebar</p>
                  <p className="text-sm text-muted-foreground">Under "Staff Management" section</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Add Staff" button (top right)</p>
                  <p className="text-sm text-muted-foreground">A form dialog will appear</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Fill in all staff details:</p>
                  <ul className="text-sm text-muted-foreground ml-5 mt-1 space-y-1">
                    <li>• Full name (exactly as on their ID)</li>
                    <li>• Email address</li>
                    <li>• Phone number (for SMS notifications)</li>
                    <li>• Role type: Select "Driver" or "Non-Driver"</li>
                    <li>• Hire date (today's date or their start date)</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Add Staff" button to save</p>
                  <p className="text-sm text-muted-foreground">Form will close automatically</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">New staff member appears in leaderboard table</p>
                  <p className="text-sm text-muted-foreground">They are now in the system for scheduling, compliance tracking, and availability</p>
                </div>
              </div>
            </div>
            <Alert className="bg-success/10 border-success">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription>
                <strong>Hiring Complete!</strong> This person is now fully onboarded and ready to receive schedules and track compliance
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-12" />

      {/* PART 2: MANAGING CURRENT STAFF */}
      <div>
        <div className="bg-purple-500/10 p-6 rounded-lg mb-6">
          <h2 className="text-3xl font-bold mb-2">Part 2: Managing Current Staff & Motivation</h2>
          <p className="text-muted-foreground">
            Weekly and monthly tasks to keep your cleaning team organized and motivated
          </p>
        </div>

        {/* TASK A: Weekly Availability */}
        <Card className="mb-6" data-testid="card-manage-availability">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                A
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Collect Weekly Availability</CardTitle>
                <CardDescription className="text-base mt-1">Happens automatically every Wed & Sun at 4:30pm</CardDescription>
                <Badge className="mt-2" variant="outline">Twice Weekly</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-blue-500/10 p-4 rounded-lg mb-4">
              <p className="font-semibold text-blue-700 dark:text-blue-300 mb-2">🔄 Automatic Process - No Action Required</p>
              <p className="text-sm text-muted-foreground">Every Wednesday and Sunday at 4:30pm, system sends SMS to all active staff automatically</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">System sends SMS at 4:30pm (Wed & Sun)</p>
                  <p className="text-sm text-muted-foreground">Each staff member gets a text with a unique link</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Staff clicks link and fills availability form</p>
                  <p className="text-sm text-muted-foreground">They select which time slots they're available (10am-3pm hourly slots) for next 7 days</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">You monitor responses on "Availability" page</p>
                  <p className="text-sm text-muted-foreground">Click "Availability" in sidebar to see the weekly matrix</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">Color-coded calendar shows who's available when:</p>
                  <ul className="text-sm text-muted-foreground ml-5 mt-1 space-y-1">
                    <li>• Green = All time slots available</li>
                    <li>• Yellow = Partially available</li>
                    <li>• Red = Unavailable</li>
                    <li>• Gray = No response yet</li>
                  </ul>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What you need to do:</strong> Just check the Availability page to see responses. That's it! SMS sends automatically.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* TASK B: Weekly Schedules */}
        <Card className="mb-6" data-testid="card-manage-schedules">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                B
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Create & Send Weekly Cleaning Schedules</CardTitle>
                <CardDescription className="text-base mt-1">Import jobs from Uplisting and auto-assign cleaners</CardDescription>
                <Badge className="mt-2" variant="outline">Weekly Task</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Export cleaning schedule from Uplisting</p>
                  <ul className="text-sm text-muted-foreground ml-5 mt-1 space-y-1">
                    <li>• Log into Uplisting.io</li>
                    <li>• Go to cleaning schedule or calendar</li>
                    <li>• Export as CSV for the upcoming week</li>
                    <li>• Save the CSV file</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Schedules" in left sidebar</p>
                  <p className="text-sm text-muted-foreground">Under "Staff Management" section</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Upload Uplisting CSV" button</p>
                  <p className="text-sm text-muted-foreground">Drag and drop your Uplisting export or browse for it</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">System automatically matches properties</p>
                  <p className="text-sm text-muted-foreground">Uses exact names, fuzzy matching, and aliases to find your 204 properties</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Auto-Schedule" button</p>
                  <p className="text-sm text-muted-foreground">AI assigns cleaners based on:</p>
                  <ul className="text-sm text-muted-foreground ml-5 mt-1 space-y-1">
                    <li>• Location groups (Building B Mews, Building A, etc.)</li>
                    <li>• Staff availability from Availability Matrix</li>
                    <li>• Property preferences</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Review the assignments</p>
                  <p className="text-sm text-muted-foreground">You can manually change any assignments if needed</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Send Schedules" button</p>
                  <p className="text-sm text-muted-foreground">Choose Email, SMS, or Both</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">All cleaners receive their weekly schedule</p>
                  <p className="text-sm text-muted-foreground">Shows which properties, dates, and times they're assigned to</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Time saver:</strong> Auto-schedule handles all the complex matching and assignment logic for you
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* TASK C: Daily Compliance */}
        <Card className="mb-6" data-testid="card-manage-compliance">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                C
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Track Daily Compliance & View Leaderboard</CardTitle>
                <CardDescription className="text-base mt-1">Monitor staff performance in real-time</CardDescription>
                <Badge className="mt-2" variant="outline">Daily Monitoring</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-orange-500/10 p-4 rounded-lg mb-4">
              <p className="font-semibold text-orange-700 dark:text-orange-300 mb-2">📊 Staff Submit Their Own Compliance</p>
              <p className="text-sm text-muted-foreground">Each cleaner uses "Submit Compliance" page to log their daily checklist</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Staff fills "Submit Compliance" form daily</p>
                  <p className="text-sm text-muted-foreground">11 criteria weighted up to 15.0 points total</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">System calculates weighted score automatically</p>
                  <p className="text-sm text-muted-foreground">Different weights for each compliance item</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">You monitor on "Leaderboard" page</p>
                  <p className="text-sm text-muted-foreground">Click "Leaderboard" in sidebar to see live rankings</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Display on TV in linen room (optional)</p>
                  <ul className="text-sm text-muted-foreground ml-5 mt-1 space-y-1">
                    <li>• On your Amazon Fire Stick, open Silk Browser</li>
                    <li>• Go to: [your-app-url]/tv</li>
                    <li>• Full-screen leaderboard auto-refreshes every 30 seconds</li>
                    <li>• Staff see rankings as they work</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">Live performance tracking</p>
                  <p className="text-sm text-muted-foreground">Rankings update in real-time as staff submit compliance</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>What you see:</strong> Leaderboard shows average score, total events, and current ranking for each staff member
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* TASK D: Monthly Prizes */}
        <Card className="mb-6" data-testid="card-manage-prizes">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                D
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Send Monthly Prize Notifications</CardTitle>
                <CardDescription className="text-base mt-1">Reward top performers with prizes</CardDescription>
                <Badge className="mt-2" variant="outline">Monthly Task</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">At end of month, go to "Leaderboard" page</p>
                  <p className="text-sm text-muted-foreground">Review the final rankings</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Prize Settings" button (top right)</p>
                  <p className="text-sm text-muted-foreground">Set or confirm prize amounts for 1st, 2nd, and 3rd place</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Enter prize values:</p>
                  <ul className="text-sm text-muted-foreground ml-5 mt-1 space-y-1">
                    <li>• 1st place prize (e.g., £100)</li>
                    <li>• 2nd place prize (e.g., £75)</li>
                    <li>• 3rd place prize (e.g., £50)</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Save Settings"</p>
                  <p className="text-sm text-muted-foreground">Prize values are now stored</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Send Monthly SMS" button</p>
                  <p className="text-sm text-muted-foreground">System sends congratulations text to top 3 performers</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">Top 3 staff receive SMS notification</p>
                  <p className="text-sm text-muted-foreground">Message includes their rank and prize amount</p>
                </div>
              </div>
            </div>
            <Alert className="bg-green-500/10 border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Motivation boost:</strong> Staff are rewarded for excellent compliance throughout the month
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* TASK E: Property Management */}
        <Card className="mb-6" data-testid="card-manage-properties">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-teal-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                E
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Manage Properties (As Needed)</CardTitle>
                <CardDescription className="text-base mt-1">Add, edit, or organize your 204 properties</CardDescription>
                <Badge className="mt-2" variant="outline">As Needed</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Properties" in left sidebar</p>
                  <p className="text-sm text-muted-foreground">Under "Staff Management" section</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">View all 204 properties organized by location groups</p>
                  <p className="text-sm text-muted-foreground">13 groups: Building B Mews, Building A, St Mary's, Pilcher Gate, etc.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">To add new property: Click "Add Property" button</p>
                  <ul className="text-sm text-muted-foreground ml-5 mt-1 space-y-1">
                    <li>• Enter property name</li>
                    <li>• Select location group</li>
                    <li>• Add any aliases (alternative names)</li>
                    <li>• Click "Add Property"</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">To edit property: Click "Edit" button on property row</p>
                  <p className="text-sm text-muted-foreground">Update name, location group, or aliases</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Use search box or location group filter to find properties</p>
                  <p className="text-sm text-muted-foreground">Type property name or select location group dropdown</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">Properties stay organized for efficient scheduling</p>
                  <p className="text-sm text-muted-foreground">Location groups help auto-scheduler assign nearby properties to same cleaners</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Why this matters:</strong> Organized properties = better route planning and faster cleaning assignments
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* TASK 6: ADMIN STAFF AVAILABILITY */}
        <Card className="mb-6" data-testid="card-staff-task-6">
          <CardHeader className="bg-muted/30">
            <div className="flex items-start gap-4">
              <div className="bg-purple-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-xl shrink-0">
                6
              </div>
              <div className="flex-1">
                <CardTitle className="text-2xl">Admin Staff Availability (Office Team)</CardTitle>
                <CardDescription className="text-base mt-1">Track when StaffL, RSARAS, May, and StaffA are working</CardDescription>
                <Badge className="mt-2" variant="outline">Bi-Weekly</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Admin Availability" in left sidebar</p>
                  <p className="text-sm text-muted-foreground">Under "Staff Management" section - shows 2-week calendar view</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Review current availability calendar</p>
                  <p className="text-sm text-muted-foreground">Color-coded grid shows who's working when: StaffL (blue), RSARAS (purple), May (green), StaffA (orange)</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Click "Send Reminders" button</p>
                  <ul className="text-sm text-muted-foreground ml-5 mt-1 space-y-1">
                    <li>• Creates new 2-week availability period (next 14 days)</li>
                    <li>• Sends email reminders to May and StaffA only</li>
                    <li>• Managers (StaffL, RSARAS) don't receive reminders</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <Circle className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">May and StaffA update their availability</p>
                  <ul className="text-sm text-muted-foreground ml-5 mt-1 space-y-1">
                    <li>• They receive email with unique submission link</li>
                    <li>• Can select hourly slots (9am-6pm) for each day</li>
                    <li>• More flexible than cleaning staff (no full-shift requirement)</li>
                    <li>• Submit anytime via mobile or desktop</li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-success" />
                <div>
                  <p className="font-semibold text-success">View updated availability calendar</p>
                  <p className="text-sm text-muted-foreground">Calendar auto-updates when staff submit their availability - see who's covering office hours</p>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Bi-weekly routine:</strong> Send reminders every 2 weeks so May and StaffA can update their schedules. Calendar helps coordinate office coverage.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Quick Summary */}
      <Card className="mt-12 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="text-2xl">Quick Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
              Hiring (One-Time Per Candidate)
            </h3>
            <p className="text-sm text-muted-foreground ml-10">
              Export from Indeed → Upload CSV → Screen → Schedule Interview → Mark Attendance → Hire → Add to Staff
            </p>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
              Weekly Management
            </h3>
            <ul className="text-sm text-muted-foreground ml-10 space-y-2">
              <li>• <strong>Wed & Sun 4:30pm:</strong> Availability SMS sent automatically (just monitor responses)</li>
              <li>• <strong>Weekly:</strong> Upload Uplisting CSV → Auto-schedule → Send to cleaners</li>
            </ul>
          </div>
          
          <Separator />
          
          <div>
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">3</span>
              Daily & Monthly
            </h3>
            <ul className="text-sm text-muted-foreground ml-10 space-y-2">
              <li>• <strong>Daily:</strong> Staff submit compliance (you just monitor leaderboard)</li>
              <li>• <strong>Monthly:</strong> Set prizes → Send SMS to top 3</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log - Hidden until clicked */}
      <div ref={activityLogRef} className="mt-12">
        <Card>
          <CardHeader>
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between p-4 hover-elevate"
              onClick={() => setShowActivityLog(!showActivityLog)}
              data-testid="button-toggle-activity-log"
            >
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <CardTitle className="text-xl">System Activity Log</CardTitle>
                <Badge variant="outline" className="ml-2">
                  {activityLogsData?.total || 0} events
                </Badge>
              </div>
              {showActivityLog ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </CardHeader>
          <AnimatePresence>
            {showActivityLog && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete audit trail of all system actions with user attribution
                  </p>
                  {logsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : !activityLogsData?.logs || activityLogsData.logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No activity logs found</p>
                      <p className="text-sm mt-1">System actions will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto">
                      {activityLogsData.logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex gap-3 p-3 rounded-lg border bg-card hover-elevate"
                          data-testid={`activity-log-${log.id}`}
                        >
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={
                                log.action === 'created' ? 'default' :
                                log.action === 'updated' ? 'secondary' :
                                log.action === 'deleted' ? 'destructive' : 'outline'
                              }>
                                {log.action}
                              </Badge>
                              <span className="font-medium">{log.resourceType.replace(/_/g, ' ')}</span>
                              {log.resourceName && (
                                <span className="text-sm text-muted-foreground">"{log.resourceName}"</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <span>{log.userName || log.userEmail || 'System'}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>

    {/* Edit Settings Dialog */}
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent data-testid="dialog-edit-settings">
        <DialogHeader>
          <DialogTitle>Edit System Settings</DialogTitle>
          <DialogDescription>
            Update the direct booking link and office phone number displayed on the overview page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-booking-link">Direct Booking Link</Label>
            <Input
              id="edit-booking-link"
              value={editBookingLink}
              onChange={(e) => {
                console.log("[INPUT CHANGE] Booking link:", e.target.value);
                setEditBookingLink(e.target.value);
              }}
              placeholder="https://example.com/book"
              data-testid="input-edit-booking-link"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-office-phone">Office Phone Number</Label>
            <Input
              id="edit-office-phone"
              value={editOfficePhone}
              onChange={(e) => {
                console.log("[INPUT CHANGE] Office phone:", e.target.value);
                setEditOfficePhone(e.target.value);
              }}
              placeholder="+44 1234 567890"
              data-testid="input-edit-office-phone"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateSettingsMutation.isPending}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateSettingsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </PageTransition>
  );
}
