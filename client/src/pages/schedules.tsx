import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek } from "date-fns";
import Papa from "papaparse";
import { 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar, 
  MapPin, 
  Building, 
  Send, 
  CheckCircle,
  AlertCircle,
  Bot,
  MessageSquare,
  FileText,
  Eye,
  Download,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { InstructionPanel } from "@/components/instruction-panel";
import { schedulesInstructions } from "@/lib/page-instructions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BackToTop } from "@/components/back-to-top";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { 
  LocationGroup, 
  Property, 
  ImportBatch, 
  CleaningJob, 
  CleaningAssignment, 
  Staff,
  ScheduleConversation,
  ScheduleDraft,
  ScheduleTimetable
} from "@shared/schema";

// Form schemas
const locationGroupSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  displayName: z.string().min(1, "Display name is required"),
  maxJobsPerDay: z.number().min(1).default(10),
  travelTimeMinutes: z.number().min(0).default(15),
  notes: z.string().optional(),
});

const propertySchema = z.object({
  name: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  uplistingId: z.string().optional(),
  locationGroupId: z.string().optional(),
  active: z.boolean().default(true),
  defaultCleanDuration: z.number().min(30).default(120),
  notes: z.string().optional(),
});

export default function SchedulesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("import");
  
  // Dialog states
  const [locationGroupDialog, setLocationGroupDialog] = useState<{ open: boolean; locationGroup?: LocationGroup }>({ open: false });
  const [propertyDialog, setPropertyDialog] = useState<{ open: boolean; property?: Property }>({ open: false });
  
  // Confirmation dialog states
  const [deletePropertyConfirm, setDeletePropertyConfirm] = useState<Property | null>(null);
  const [deleteLocationGroupConfirm, setDeleteLocationGroupConfirm] = useState<LocationGroup | null>(null);
  const [sendSchedulesConfirm, setSendSchedulesConfirm] = useState<{ assignmentIds: string[]; count: number } | null>(null);
  
  // CSV Import state
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Schedule generation state (shared with AI Assistant tab)
  const [scheduleStartDate, setScheduleStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  const [scheduleEndDate, setScheduleEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
  
  // AI Assistant state
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [finalizeDraftConfirm, setFinalizeDraftConfirm] = useState<ScheduleDraft | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Timetables state
  const [timetableDetailsDialog, setTimetableDetailsDialog] = useState<{ open: boolean; timetableId?: string }>({ open: false });
  const [generateTimetableDialog, setGenerateTimetableDialog] = useState(false);
  const [deleteTimetableConfirm, setDeleteTimetableConfirm] = useState<ScheduleTimetable | null>(null);
  
  // Fetch data
  const { data: locationGroups = [] } = useQuery<LocationGroup[]>({ queryKey: ["/api/location-groups"] });
  const { data: properties = [] } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const { data: importBatches = [] } = useQuery<ImportBatch[]>({ queryKey: ["/api/import/batches"] });
  const { data: staff = [] } = useQuery<Staff[]>({ queryKey: ["/api/staff"] });
  const { data: assignments = [] } = useQuery<CleaningAssignment[]>({ 
    queryKey: ["/api/cleaning-assignments", scheduleStartDate, scheduleEndDate],
    queryFn: async () => {
      const response = await fetch(`/api/cleaning-assignments?startDate=${scheduleStartDate}&endDate=${scheduleEndDate}`);
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    }
  });
  
  // AI Assistant queries
  const { data: drafts = [] } = useQuery<ScheduleDraft[]>({ 
    queryKey: ["/api/schedule-drafts", scheduleStartDate],
    queryFn: async () => {
      const response = await fetch(`/api/schedule-drafts?weekStart=${scheduleStartDate}`);
      if (!response.ok) throw new Error("Failed to fetch drafts");
      return response.json();
    }
  });
  
  const { data: activeConversation } = useQuery<ScheduleConversation & { drafts: ScheduleDraft[] }>({ 
    queryKey: ["/api/schedule-conversations", activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return null;
      const response = await fetch(`/api/schedule-conversations/${activeConversationId}`);
      if (!response.ok) throw new Error("Failed to fetch conversation");
      return response.json();
    },
    enabled: !!activeConversationId
  });
  
  // Timetables queries
  const { data: timetables = [] } = useQuery<ScheduleTimetable[]>({
    queryKey: ["/api/schedule-timetables"],
  });
  
  const { data: selectedTimetable } = useQuery<ScheduleTimetable & { 
    cleanerAcceptances: Array<{ cleanerId: string; acceptedAt: string | null }> 
  }>({ 
    queryKey: ["/api/schedule-timetables", timetableDetailsDialog.timetableId],
    queryFn: async () => {
      if (!timetableDetailsDialog.timetableId) return null;
      const response = await fetch(`/api/schedule-timetables/${timetableDetailsDialog.timetableId}`);
      if (!response.ok) throw new Error("Failed to fetch timetable");
      return response.json();
    },
    enabled: !!timetableDetailsDialog.timetableId
  });

  // Location Group Mutations
  const createLocationGroupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof locationGroupSchema>) => {
      return apiRequest("POST", "/api/location-groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/location-groups"] });
      setLocationGroupDialog({ open: false });
      toast({ title: "Success", description: "Location group created" });
    },
  });

  const updateLocationGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<LocationGroup> }) => {
      return apiRequest("PUT", `/api/location-groups/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/location-groups"] });
      setLocationGroupDialog({ open: false });
      toast({ title: "Success", description: "Location group updated" });
    },
  });

  const deleteLocationGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/location-groups/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/location-groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setDeleteLocationGroupConfirm(null);
      toast({ 
        title: "Success!", 
        description: "Location group deleted. All properties in this group have been unassigned." 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete location group. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  // Property Mutations
  const createPropertyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof propertySchema>) => {
      return apiRequest("POST", "/api/properties", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setPropertyDialog({ open: false });
      toast({ title: "Success", description: "Property created" });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Property> }) => {
      return apiRequest("PUT", `/api/properties/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setPropertyDialog({ open: false });
      toast({ title: "Success", description: "Property updated" });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/properties/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setDeletePropertyConfirm(null);
      toast({ 
        title: "Success!", 
        description: "Property has been deleted successfully." 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete property. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  // CSV Import Mutation
  const importCsvMutation = useMutation({
    mutationFn: async (data: { jobs: any[]; fileName: string; weekStart: string }) => {
      return apiRequest("POST", "/api/import/uplisting", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/import/batches"] });
      // Handle the response data structure correctly
      const imported = data?.imported || 0;
      const matched = data?.matched || 0;
      const unmatched = data?.unmatched || 0;
      
      toast({ 
        title: "Import Complete", 
        description: `Imported ${imported} jobs. Matched: ${matched}, Unmatched: ${unmatched}` 
      });
      
      // Clear all CSV state and reset file input
      setCsvFile(null);
      setCsvData([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Import Failed", 
        description: error.message || "Failed to import CSV data", 
        variant: "destructive" 
      });
    },
  });

  // Generate Schedule Mutation
  const generateScheduleMutation = useMutation({
    mutationFn: async (data: { startDate: string; endDate: string }) => {
      return apiRequest("POST", "/api/cleaning-jobs/generate-schedule", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-assignments"] });
      toast({ title: "Success", description: data.message });
    },
  });

  // Send Schedules Mutation
  const sendSchedulesMutation = useMutation({
    mutationFn: async (data: { assignmentIds: string[]; channel: string }) => {
      return apiRequest("POST", "/api/cleaning-assignments/send", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-assignments"] });
      setSendSchedulesConfirm(null);
      toast({ 
        title: "Success!", 
        description: `Sent ${data.sent} schedules to cleaners via ${data.channel || 'email/SMS'}.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send schedules. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  // Update Assignment Mutation
  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CleaningAssignment> }) => {
      return apiRequest("PUT", `/api/cleaning-assignments/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-assignments"] });
      toast({ title: "Success", description: "Assignment updated" });
    },
  });
  
  // AI Assistant Mutations
  const createConversationMutation = useMutation({
    mutationFn: async (weekStart: string) => {
      return apiRequest("POST", "/api/schedule-conversations", { weekStart });
    },
    onSuccess: (data: ScheduleConversation) => {
      console.log("Conversation created:", data);
      // Set the conversation data directly in cache with empty messages array
      queryClient.setQueryData(["/api/schedule-conversations", data.id], { 
        ...data, 
        drafts: [], 
        messages: [] 
      });
      // Set active conversation ID to trigger UI render
      setActiveConversationId(data.id);
      console.log("Active conversation ID set to:", data.id);
      toast({ title: "Success", description: "Conversation started" });
    },
    onError: (error: any) => {
      console.error("Failed to create conversation:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to start conversation", 
        variant: "destructive" 
      });
    },
  });
  
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string; message: string }) => {
      return apiRequest("POST", `/api/schedule-conversations/${conversationId}/messages`, { message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-conversations", activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-drafts"] });
      setMessageInput("");
    },
  });
  
  const finalizeDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return apiRequest("POST", `/api/schedule-drafts/${draftId}/finalize`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-assignments"] });
      setFinalizeDraftConfirm(null);
      setSelectedDraftId(null);
      toast({ 
        title: "Success!", 
        description: `Draft finalized! Created ${data.assignmentsCreated} assignments.` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to finalize draft", 
        variant: "destructive" 
      });
    },
  });
  
  // Timetable Mutations
  const generateTimetableMutation = useMutation({
    mutationFn: async (data: { weekStart: string; weekEnd: string }) => {
      // Get assignments for the week
      const assignmentsResponse = await fetch(`/api/cleaning-assignments?startDate=${data.weekStart}&endDate=${data.weekEnd}`);
      const assignments = await assignmentsResponse.json();
      const assignmentIds = assignments.map((a: any) => a.id);
      
      return apiRequest("POST", "/api/schedule-timetables/generate", {
        ...data,
        assignmentIds
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-timetables"] });
      setGenerateTimetableDialog(false);
      const cleanerCount = data.timetableData?.cleaners?.length || 0;
      toast({ 
        title: "Success", 
        description: `Timetable generated! ${cleanerCount} cleaners ready for notification.` 
      });
      setActiveTab("timetables");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate timetable", 
        variant: "destructive" 
      });
    },
  });
  
  const sendSMSMutation = useMutation({
    mutationFn: async ({ timetableId, cleanerId }: { timetableId: string; cleanerId: string }) => {
      return apiRequest("POST", `/api/schedule-timetables/${timetableId}/send-sms/${cleanerId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-timetables", timetableDetailsDialog.timetableId] });
      toast({ title: "SMS Sent", description: "Cleaner has been notified via SMS" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to send SMS", 
        variant: "destructive" 
      });
    },
  });
  
  const deleteTimetableMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/schedule-timetables/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-timetables"] });
      setDeleteTimetableConfirm(null);
      toast({ title: "Success!", description: "Timetable deleted" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete timetable", 
        variant: "destructive" 
      });
    },
  });
  
  // Helper functions for timetables
  const downloadPDF = (timetableId: string) => {
    window.open(`/api/schedule-timetables/${timetableId}/pdf`, '_blank');
  };
  
  const copyWhatsAppMessage = async (timetableId: string) => {
    try {
      const response = await fetch(`/api/schedule-timetables/${timetableId}/whatsapp-copy`);
      const data = await response.json();
      await navigator.clipboard.writeText(data.whatsappCopy);
      toast({ title: "Copied!", description: "WhatsApp message copied to clipboard" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to copy message", variant: "destructive" });
    }
  };
  
  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // CSV file upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Filter out rows that are completely empty or have all empty values
        const validData = results.data.filter((row: any) => {
          // Check if row has at least one non-empty value
          return Object.values(row).some(value => 
            value !== null && value !== undefined && String(value).trim() !== ""
          );
        });
        setCsvData(validData);
      },
      error: (error) => {
        toast({ title: "Error", description: "Failed to parse CSV", variant: "destructive" });
        console.error(error);
      },
    });
  };

  // Process and import CSV data
  const handleImport = () => {
    const jobs = csvData.map((row: any) => ({
      // Support both old and new Uplisting formats
      propertyName: row["Property nickname"] || row["Property Name"] || row.propertyName || "",
      address: row["Address"] || row.address || "",
      scheduledDate: row["Check-out date"] || row["Scheduled Date"] || row.scheduledDate || "",
      checkOutTime: row["Departure time"] || row["Check Out Time"] || row.checkOutTime || "",
      checkInTime: row["Check In Time"] || row.checkInTime || "",
      guestName: row["Guest name"] || row["Guest Name"] || row.guestName || "",
      bookingReference: row["Booking Reference"] || row.bookingReference || "",
      uplistingId: row["Uplisting ID"] || row.uplistingId || "",
      // New fields from updated format
      numberOfGuests: row["Number of guests"] || "",
      numberOfNights: row["Number of nights"] || "",
      bookingSite: row["Booking site"] || "",
      bookingStatus: row["Booking status"] || "",
    })).filter(job => job.propertyName && job.scheduledDate);

    importCsvMutation.mutate({ 
      jobs, 
      fileName: csvFile?.name || "upload.csv",
      weekStart 
    });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-schedules-title">Cleaning Schedules</h1>
          <p className="text-muted-foreground mt-1">
            Import Uplisting data, manage properties, and generate cleaning schedules
          </p>
        </div>
        <InstructionPanel {...schedulesInstructions} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6" data-testid="tabs-schedules-navigation">
          <TabsTrigger value="import" data-testid="tab-import">
            <Upload className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Import</span>
            <span className="sm:hidden">Import</span>
          </TabsTrigger>
          <TabsTrigger value="properties" data-testid="tab-properties">
            <Building className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Properties</span>
            <span className="sm:hidden">Props</span>
          </TabsTrigger>
          <TabsTrigger value="location-groups" data-testid="tab-location-groups">
            <MapPin className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Location Groups</span>
            <span className="sm:hidden">Groups</span>
          </TabsTrigger>
          <TabsTrigger value="generate" data-testid="tab-generate">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Generate</span>
            <span className="sm:hidden">Generate</span>
          </TabsTrigger>
          <TabsTrigger value="ai-assistant" data-testid="tab-ai-assistant">
            <Bot className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">AI Assistant</span>
            <span className="sm:hidden">AI</span>
          </TabsTrigger>
          <TabsTrigger value="timetables" data-testid="tab-timetables">
            <FileText className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Timetables</span>
            <span className="sm:hidden">Tables</span>
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Uplisting CSV</CardTitle>
              <CardDescription>
                Import cleaning jobs from Uplisting export. Supported columns:<br/>
                <span className="text-xs">Guest name, Property nickname, Check-out date, Departure time, Number of guests, Number of nights, Booking site, Booking status</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <Label>CSV Template</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const template = "Guest name,Property nickname,Check-out date,Departure time,Number of guests,Number of nights,Booking site,Booking status";
                      const blob = new Blob([template], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'uplisting-template.csv';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                      toast({ title: "Template Downloaded", description: "Use this template to format your Uplisting data for import." });
                    }}
                    data-testid="button-download-uplisting-template"
                  >
                    Download Template
                  </Button>
                </div>
                
                <div>
                  <Label htmlFor="week-start">Week Start Date</Label>
                  <Input
                    id="week-start"
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    data-testid="input-week-start"
                  />
                </div>
                
                <div>
                  <Label htmlFor="csv-file">CSV File</Label>
                  <Input
                    ref={fileInputRef}
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    data-testid="input-csv-file"
                  />
                </div>

                {csvData.length > 0 && (
                  <div className="border rounded p-4 space-y-2">
                    <p className="font-medium">Preview: {csvData.length} rows</p>
                    <div className="text-sm space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Columns found: {Object.keys(csvData[0] || {}).slice(0, 5).join(", ")}...
                      </p>
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        First job: {csvData[0]?.["Property nickname"] || csvData[0]?.["Property Name"] || "Unknown"} - 
                        {" "}{csvData[0]?.["Check-out date"] || csvData[0]?.["Scheduled Date"] || "No date"}
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleImport} 
                  disabled={csvData.length === 0 || importCsvMutation.isPending}
                  data-testid="button-import-csv"
                  className="hover-elevate active-elevate-2"
                >
                  {importCsvMutation.isPending ? "Importing..." : "Import CSV"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
              <CardDescription>Past import batches</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background border-b">
                  <TableRow>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">File Name</TableHead>
                    <TableHead scope="col">Total Rows</TableHead>
                    <TableHead scope="col">Matched</TableHead>
                    <TableHead scope="col">Unmatched</TableHead>
                    <TableHead scope="col">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importBatches.map((batch) => (
                    <TableRow key={batch.id} data-testid={`row-import-batch-${batch.id}`}>
                      <TableCell>{format(new Date(batch.createdAt), "PPp")}</TableCell>
                      <TableCell>{batch.fileName}</TableCell>
                      <TableCell>{batch.rowCount}</TableCell>
                      <TableCell>{batch.matchedCount}</TableCell>
                      <TableCell>{batch.unmatchedCount}</TableCell>
                      <TableCell>
                        <Badge variant={batch.status === "completed" ? "default" : "secondary"}>
                          {batch.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Properties</CardTitle>
                <CardDescription>Manage your cleaning properties</CardDescription>
              </div>
              <Button 
                onClick={() => setPropertyDialog({ open: true })} 
                data-testid="button-add-property"
                className="hover-elevate active-elevate-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Property
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background border-b">
                  <TableRow>
                    <TableHead scope="col">Name</TableHead>
                    <TableHead scope="col">Address</TableHead>
                    <TableHead scope="col">Location Group</TableHead>
                    <TableHead scope="col">Active</TableHead>
                    <TableHead scope="col">Clean Duration (min)</TableHead>
                    <TableHead scope="col">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => {
                    const locationGroup = locationGroups.find(lg => lg.id === property.locationGroupId);
                    return (
                      <TableRow key={property.id} data-testid={`row-property-${property.id}`}>
                        <TableCell className="font-medium">{property.name}</TableCell>
                        <TableCell>{property.address}</TableCell>
                        <TableCell>{locationGroup?.displayName || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={property.active ? "default" : "secondary"}>
                            {property.active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{property.defaultCleanDuration}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPropertyDialog({ open: true, property })}
                                  data-testid={`button-edit-property-${property.id}`}
                                  aria-label={`Edit ${property.name}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit property</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletePropertyConfirm(property)}
                                  data-testid={`button-delete-property-${property.id}`}
                                  aria-label={`Delete ${property.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete property</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Groups Tab */}
        <TabsContent value="location-groups" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Location Groups</CardTitle>
                <CardDescription>Organize properties by location for efficient scheduling</CardDescription>
              </div>
              <Button 
                onClick={() => setLocationGroupDialog({ open: true })} 
                data-testid="button-add-location-group"
                className="hover-elevate active-elevate-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Location Group
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background border-b">
                  <TableRow>
                    <TableHead scope="col">Name</TableHead>
                    <TableHead scope="col">Slug</TableHead>
                    <TableHead scope="col">Max Jobs/Day</TableHead>
                    <TableHead scope="col">Travel Time (min)</TableHead>
                    <TableHead scope="col">Property Count</TableHead>
                    <TableHead scope="col">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locationGroups.map((group) => {
                    const propertyCount = properties.filter(p => p.locationGroupId === group.id).length;
                    return (
                      <TableRow key={group.id} data-testid={`row-location-group-${group.id}`}>
                        <TableCell className="font-medium">{group.displayName}</TableCell>
                        <TableCell>{group.slug}</TableCell>
                        <TableCell>{group.maxJobsPerDay}</TableCell>
                        <TableCell>{group.travelTimeMinutes}</TableCell>
                        <TableCell>{propertyCount}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setLocationGroupDialog({ open: true, locationGroup: group })}
                                  data-testid={`button-edit-location-group-${group.id}`}
                                  aria-label={`Edit ${group.displayName}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit location group</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteLocationGroupConfirm(group)}
                                  data-testid={`button-delete-location-group-${group.id}`}
                                  aria-label={`Delete ${group.displayName}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete location group</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Schedule Tab */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Cleaning Schedule</CardTitle>
              <CardDescription>
                Auto-assign cleaning jobs to available staff based on location and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="schedule-start">Week Start</Label>
                  <Input
                    id="schedule-start"
                    type="date"
                    value={scheduleStartDate}
                    onChange={(e) => setScheduleStartDate(e.target.value)}
                    data-testid="input-schedule-start"
                  />
                </div>
                <div>
                  <Label htmlFor="schedule-end">Week End</Label>
                  <Input
                    id="schedule-end"
                    type="date"
                    value={scheduleEndDate}
                    onChange={(e) => setScheduleEndDate(e.target.value)}
                    data-testid="input-schedule-end"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => generateScheduleMutation.mutate({ startDate: scheduleStartDate, endDate: scheduleEndDate })}
                  disabled={generateScheduleMutation.isPending}
                  data-testid="button-generate-schedule"
                  className="hover-elevate active-elevate-2"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {generateScheduleMutation.isPending ? "Generating..." : "Auto-Generate Schedule"}
                </Button>

                {assignments.length > 0 && (
                  <Button 
                    onClick={() => sendSchedulesMutation.mutate({ 
                      assignmentIds: assignments.map(a => a.id), 
                      channel: "email" 
                    })}
                    disabled={sendSchedulesMutation.isPending}
                    data-testid="button-send-all"
                    variant="default"
                    className="hover-elevate active-elevate-2"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send to All
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Schedule Preview</CardTitle>
              <CardDescription>{assignments.length} assignments for selected period</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background border-b">
                  <TableRow>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">Property</TableHead>
                    <TableHead scope="col">Time Slot</TableHead>
                    <TableHead scope="col">Assigned Staff</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => {
                    const assignedStaff = staff.find(s => s.id === assignment.staffId);
                    return (
                      <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                        <TableCell>{format(new Date(assignment.assignedDate), "PP")}</TableCell>
                        <TableCell>Loading...</TableCell>
                        <TableCell>
                          {assignment.assignedSlotStart} - {assignment.assignedSlotEnd || "TBD"}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={assignment.staffId} 
                            onValueChange={(staffId) => {
                              updateAssignmentMutation.mutate({ 
                                id: assignment.id, 
                                data: { staffId } 
                              });
                            }}
                          >
                            <SelectTrigger data-testid={`select-staff-${assignment.id}`}>
                              <SelectValue>{assignedStaff?.fullName || "Select staff"}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {staff.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.fullName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={assignment.status === "sent" ? "default" : "secondary"}>
                            {assignment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => sendSchedulesMutation.mutate({ 
                              assignmentIds: [assignment.id], 
                              channel: "email" 
                            })}
                            disabled={assignment.status === "sent"}
                            data-testid={`button-send-${assignment.id}`}
                            className="hover-elevate active-elevate-2"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai-assistant" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Schedule Assistant
              </CardTitle>
              <CardDescription>
                Collaborate with AI to create optimal cleaning schedules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ai-week-start">Week Start</Label>
                  <Input
                    id="ai-week-start"
                    type="date"
                    value={scheduleStartDate}
                    onChange={(e) => setScheduleStartDate(e.target.value)}
                    data-testid="input-ai-week-start"
                  />
                </div>
                <div>
                  <Label htmlFor="ai-week-end">Week End</Label>
                  <Input
                    id="ai-week-end"
                    type="date"
                    value={scheduleEndDate}
                    onChange={(e) => setScheduleEndDate(e.target.value)}
                    data-testid="input-ai-week-end"
                  />
                </div>
              </div>
              
              {!activeConversationId ? (
                <Button 
                  onClick={() => createConversationMutation.mutate(scheduleStartDate)}
                  disabled={createConversationMutation.isPending}
                  data-testid="button-start-conversation"
                  className="hover-elevate active-elevate-2"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {createConversationMutation.isPending ? "Starting..." : "Start New Conversation"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="border rounded-md p-4">
                    <h3 className="text-sm font-medium mb-2">Conversation Messages</h3>
                    <ScrollArea className="h-64 pr-4">
                      {activeConversation?.messages && activeConversation.messages.length > 0 ? (
                        <div className="space-y-3">
                          {activeConversation.messages.map((msg, idx) => (
                            <div 
                              key={idx} 
                              className={`p-3 rounded-md ${msg.role === "user" ? "bg-primary text-primary-foreground ml-8" : "bg-muted mr-8"}`}
                              data-testid={`message-${msg.role}-${idx}`}
                            >
                              <div className="text-xs font-medium mb-1">
                                {msg.role === "user" ? "You" : "AI Assistant"}
                              </div>
                              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                            </div>
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No messages yet. Ask the AI for help with scheduling!</p>
                      )}
                    </ScrollArea>
                  </div>
                  
                  <div className="flex gap-2">
                    <Textarea 
                      placeholder="Ask the AI to create a schedule, check availability, or optimize assignments..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && messageInput.trim()) {
                          e.preventDefault();
                          sendMessageMutation.mutate({ conversationId: activeConversationId, message: messageInput });
                        }
                      }}
                      className="flex-1"
                      data-testid="textarea-message-input"
                    />
                    <Button
                      onClick={() => sendMessageMutation.mutate({ conversationId: activeConversationId, message: messageInput })}
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                      className="hover-elevate active-elevate-2"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Schedule Drafts</CardTitle>
              <CardDescription>AI-generated schedule suggestions for week of {format(new Date(scheduleStartDate), "PP")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {drafts.length > 0 ? (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background border-b">
                    <TableRow>
                      <TableHead scope="col">Draft #</TableHead>
                      <TableHead scope="col">Created</TableHead>
                      <TableHead scope="col">Summary</TableHead>
                      <TableHead scope="col">Assignments</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drafts.map((draft) => (
                      <TableRow 
                        key={draft.id} 
                        data-testid={`row-draft-${draft.id}`}
                        className={selectedDraftId === draft.id ? "bg-muted" : ""}
                        onClick={() => setSelectedDraftId(draft.id)}
                      >
                        <TableCell className="font-medium">v{draft.draftNumber}</TableCell>
                        <TableCell>{format(new Date(draft.createdAt), "PPp")}</TableCell>
                        <TableCell className="max-w-md truncate">{draft.summary || "No summary"}</TableCell>
                        <TableCell>{draft.assignments?.length || 0}</TableCell>
                        <TableCell>
                          <Badge variant={draft.status === "finalized" ? "default" : "secondary"}>
                            {draft.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFinalizeDraftConfirm(draft);
                              }}
                              disabled={draft.status === "finalized" || !draft.assignments || draft.assignments.length === 0}
                              data-testid={`button-finalize-${draft.id}`}
                              className="hover-elevate active-elevate-2"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Finalize
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No drafts yet. Start a conversation and ask the AI to create a schedule.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timetables Tab */}
        <TabsContent value="timetables" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <CardTitle>Schedule Timetables</CardTitle>
                  <CardDescription>
                    Generate, download, and distribute weekly cleaning schedules to your team
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setGenerateTimetableDialog(true)}
                  data-testid="button-generate-timetable"
                  className="hover-elevate active-elevate-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Timetable
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {timetables.length > 0 ? (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background border-b">
                    <TableRow>
                      <TableHead scope="col">Week</TableHead>
                      <TableHead scope="col">Generated</TableHead>
                      <TableHead scope="col">Cleaners</TableHead>
                      <TableHead scope="col">Accepted</TableHead>
                      <TableHead scope="col">Status</TableHead>
                      <TableHead scope="col">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timetables.map((timetable) => {
                      const cleanersCount = timetable.timetableData?.cleaners?.length || 0;
                      const totalAssignments = timetable.assignmentIds?.length || 0;
                      const acceptedCount = 0; // Will be populated from cleanerAcceptances in details
                      const weekStartDate = new Date(timetable.weekStart);
                      const weekEndDate = new Date(timetable.weekEnd);
                      
                      return (
                        <TableRow key={timetable.id} data-testid={`row-timetable-${timetable.id}`}>
                          <TableCell className="font-medium">
                            {format(weekStartDate, "EEE dd MMM")} - {format(weekEndDate, "EEE dd MMM")}
                          </TableCell>
                          <TableCell>{format(new Date(timetable.createdAt), "PPp")}</TableCell>
                          <TableCell>{cleanersCount}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {acceptedCount}/{cleanersCount}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={timetable.status === "active" ? "default" : "secondary"}>
                              {timetable.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  data-testid={`button-actions-${timetable.id}`}
                                  className="hover-elevate active-elevate-2"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => setTimetableDetailsDialog({ open: true, timetableId: timetable.id })}
                                  data-testid={`button-view-details-${timetable.id}`}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => downloadPDF(timetable.id)}
                                  data-testid={`button-download-pdf-${timetable.id}`}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => copyWhatsAppMessage(timetable.id)}
                                  data-testid={`button-copy-whatsapp-${timetable.id}`}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Copy WhatsApp Message
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setDeleteTimetableConfirm(timetable)}
                                  data-testid={`button-delete-${timetable.id}`}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No timetables yet. Generate your first timetable to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Location Group Dialog */}
      <LocationGroupDialog
        open={locationGroupDialog.open}
        locationGroup={locationGroupDialog.locationGroup}
        onClose={() => setLocationGroupDialog({ open: false })}
        onCreate={(data) => createLocationGroupMutation.mutate(data)}
        onUpdate={(id, data) => updateLocationGroupMutation.mutate({ id, data })}
      />

      {/* Property Dialog */}
      <PropertyDialog
        open={propertyDialog.open}
        property={propertyDialog.property}
        locationGroups={locationGroups}
        onClose={() => setPropertyDialog({ open: false })}
        onCreate={(data) => createPropertyMutation.mutate(data)}
        onUpdate={(id, data) => updatePropertyMutation.mutate({ id, data })}
      />

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={!!deletePropertyConfirm}
        onOpenChange={(open) => !open && setDeletePropertyConfirm(null)}
        title="Delete Property?"
        description={`Are you sure you want to delete ${deletePropertyConfirm?.name || 'this property'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => deletePropertyConfirm && deletePropertyMutation.mutate(deletePropertyConfirm.id)}
        isLoading={deletePropertyMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteLocationGroupConfirm}
        onOpenChange={(open) => !open && setDeleteLocationGroupConfirm(null)}
        title="Delete Location Group?"
        description={`Are you sure you want to delete ${deleteLocationGroupConfirm?.displayName || 'this location group'}? This will unassign all properties in this group.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => deleteLocationGroupConfirm && deleteLocationGroupMutation.mutate(deleteLocationGroupConfirm.id)}
        isLoading={deleteLocationGroupMutation.isPending}
      />

      <ConfirmDialog
        open={!!sendSchedulesConfirm}
        onOpenChange={(open) => !open && setSendSchedulesConfirm(null)}
        title="Send Schedules?"
        description={`Are you sure you want to send schedules to ${sendSchedulesConfirm?.count || 0} cleaners? They will receive emails/SMS immediately.`}
        confirmText="Send"
        cancelText="Cancel"
        variant="default"
        onConfirm={() => {
          if (sendSchedulesConfirm) {
            sendSchedulesMutation.mutate({ 
              assignmentIds: sendSchedulesConfirm.assignmentIds, 
              channel: 'email' 
            });
          }
        }}
        isLoading={sendSchedulesMutation.isPending}
      />

      <ConfirmDialog
        open={!!finalizeDraftConfirm}
        onOpenChange={(open) => !open && setFinalizeDraftConfirm(null)}
        title="Finalize Draft?"
        description={`Are you sure you want to finalize Draft v${finalizeDraftConfirm?.draftNumber || 0}? This will create ${finalizeDraftConfirm?.assignments?.length || 0} cleaning assignments and cannot be undone.`}
        confirmText="Finalize"
        cancelText="Cancel"
        variant="default"
        onConfirm={() => finalizeDraftConfirm && finalizeDraftMutation.mutate(finalizeDraftConfirm.id)}
        isLoading={finalizeDraftMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteTimetableConfirm}
        onOpenChange={(open) => !open && setDeleteTimetableConfirm(null)}
        title="Delete Timetable?"
        description={`Are you sure you want to delete this timetable? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => deleteTimetableConfirm && deleteTimetableMutation.mutate(deleteTimetableConfirm.id)}
        isLoading={deleteTimetableMutation.isPending}
      />

      {/* Generate Timetable Dialog */}
      <Dialog open={generateTimetableDialog} onOpenChange={setGenerateTimetableDialog}>
        <DialogContent data-testid="dialog-generate-timetable">
          <DialogHeader>
            <DialogTitle>Generate Timetable</DialogTitle>
            <DialogDescription>Generate a new timetable for distribution to cleaners</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="timetable-week-start">Week Start</Label>
              <Input
                id="timetable-week-start"
                type="date"
                value={scheduleStartDate}
                onChange={(e) => setScheduleStartDate(e.target.value)}
                data-testid="input-timetable-week-start"
              />
            </div>
            <div>
              <Label htmlFor="timetable-week-end">Week End</Label>
              <Input
                id="timetable-week-end"
                type="date"
                value={scheduleEndDate}
                onChange={(e) => setScheduleEndDate(e.target.value)}
                data-testid="input-timetable-week-end"
              />
            </div>
            <div className="border rounded p-4 space-y-2">
              <p className="text-sm font-medium">Assignment Selection</p>
              <p className="text-sm text-muted-foreground">
                {assignments.length} finalized assignments in selected date range
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                if (new Date(scheduleStartDate) >= new Date(scheduleEndDate)) {
                  toast({ 
                    title: "Invalid Date Range", 
                    description: "Week start must be before week end", 
                    variant: "destructive" 
                  });
                  return;
                }
                if (assignments.length === 0) {
                  toast({ 
                    title: "No Assignments", 
                    description: "No assignments found in selected date range", 
                    variant: "destructive" 
                  });
                  return;
                }
                generateTimetableMutation.mutate({ 
                  weekStart: scheduleStartDate, 
                  weekEnd: scheduleEndDate 
                });
              }}
              disabled={generateTimetableMutation.isPending}
              data-testid="button-submit-generate-timetable"
              className="hover-elevate active-elevate-2"
            >
              {generateTimetableMutation.isPending ? "Generating..." : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Timetable Details Dialog */}
      <Dialog 
        open={timetableDetailsDialog.open} 
        onOpenChange={(open) => !open && setTimetableDetailsDialog({ open: false })}
      >
        <DialogContent className="max-w-4xl" data-testid="dialog-timetable-details">
          {selectedTimetable && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Week of {format(new Date(selectedTimetable.weekStart), "PP")}
                </DialogTitle>
                <DialogDescription>
                  Timetable details and cleaner acceptance status
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="cleaners" className="mt-4">
                <TabsList>
                  <TabsTrigger value="cleaners">Cleaners</TabsTrigger>
                  {selectedTimetable.availabilityConflicts && selectedTimetable.availabilityConflicts.length > 0 && (
                    <TabsTrigger value="conflicts">
                      Conflicts ({selectedTimetable.availabilityConflicts.length})
                    </TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="cleaners" className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cleaner Name</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Total Assignments</TableHead>
                        <TableHead>Acceptance Status</TableHead>
                        <TableHead>Conflicts</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTimetable.timetableData?.cleaners?.map((cleaner) => {
                        const cleanerStaff = staff.find(s => s.id === cleaner.cleanerId);
                        const totalAssignments = cleaner.days?.reduce((sum, day) => sum + (day.assignments?.length || 0), 0) || 0;
                        const acceptance = (selectedTimetable as any).cleanerAcceptances?.find((a: any) => a.cleanerId === cleaner.cleanerId);
                        const conflicts = selectedTimetable.availabilityConflicts?.filter(c => c.cleanerId === cleaner.cleanerId) || [];
                        
                        return (
                          <TableRow key={cleaner.cleanerId}>
                            <TableCell className="font-medium">{cleaner.cleanerName}</TableCell>
                            <TableCell>{cleanerStaff?.phone || "N/A"}</TableCell>
                            <TableCell>{totalAssignments}</TableCell>
                            <TableCell>
                              <Badge variant={acceptance?.acceptedAt ? "default" : "secondary"}>
                                {acceptance?.acceptedAt ? "Accepted" : "Pending"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {conflicts.length > 0 && (
                                <div className="flex items-center gap-1 text-destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  {conflicts.length}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                onClick={() => sendSMSMutation.mutate({ 
                                  timetableId: selectedTimetable.id, 
                                  cleanerId: cleaner.cleanerId 
                                })}
                                disabled={sendSMSMutation.isPending}
                                data-testid={`button-send-sms-${cleaner.cleanerId}`}
                                className="hover-elevate active-elevate-2"
                              >
                                Send SMS
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TabsContent>
                
                {selectedTimetable.availabilityConflicts && selectedTimetable.availabilityConflicts.length > 0 && (
                  <TabsContent value="conflicts" className="space-y-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Warning: Some assignments conflict with cleaner availability
                      </AlertDescription>
                    </Alert>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cleaner Name</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Property Address</TableHead>
                          <TableHead>Issue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTimetable.availabilityConflicts.map((conflict, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{conflict.cleanerName}</TableCell>
                            <TableCell>{format(new Date(conflict.date), "PP")}</TableCell>
                            <TableCell>{conflict.propertyAddress}</TableCell>
                            <TableCell className="text-destructive">Cleaner marked unavailable</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BackToTop />
    </div>
  );
}

// Location Group Dialog Component
function LocationGroupDialog({
  open,
  locationGroup,
  onClose,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  locationGroup?: LocationGroup;
  onClose: () => void;
  onCreate: (data: z.infer<typeof locationGroupSchema>) => void;
  onUpdate: (id: string, data: Partial<LocationGroup>) => void;
}) {
  const form = useForm<z.infer<typeof locationGroupSchema>>({
    resolver: zodResolver(locationGroupSchema),
    defaultValues: locationGroup || {
      slug: "",
      displayName: "",
      maxJobsPerDay: 10,
      travelTimeMinutes: 15,
      notes: "",
    },
  });

  const handleSubmit = (data: z.infer<typeof locationGroupSchema>) => {
    if (locationGroup) {
      onUpdate(locationGroup.id, data);
    } else {
      onCreate(data);
    }
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-location-group">
        <DialogHeader>
          <DialogTitle>{locationGroup ? "Edit" : "Add"} Location Group</DialogTitle>
          <DialogDescription>Configure location group settings for scheduling</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-display-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-slug" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxJobsPerDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Jobs Per Day</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-max-jobs-per-day"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="travelTimeMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Travel Time (minutes)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-travel-time"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-location-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" data-testid="button-save-location-group" className="hover-elevate active-elevate-2">
                {locationGroup ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Property Dialog Component
function PropertyDialog({
  open,
  property,
  locationGroups,
  onClose,
  onCreate,
  onUpdate,
}: {
  open: boolean;
  property?: Property;
  locationGroups: LocationGroup[];
  onClose: () => void;
  onCreate: (data: z.infer<typeof propertySchema>) => void;
  onUpdate: (id: string, data: Partial<Property>) => void;
}) {
  const form = useForm<z.infer<typeof propertySchema>>({
    resolver: zodResolver(propertySchema),
    defaultValues: property || {
      name: "",
      address: "",
      uplistingId: "",
      locationGroupId: "",
      active: true,
      defaultCleanDuration: 120,
      notes: "",
    },
  });

  const handleSubmit = (data: z.infer<typeof propertySchema>) => {
    if (property) {
      onUpdate(property.id, data);
    } else {
      onCreate(data);
    }
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent data-testid="dialog-property">
        <DialogHeader>
          <DialogTitle>{property ? "Edit" : "Add"} Property</DialogTitle>
          <DialogDescription>Configure property details and settings</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-property-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-property-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="uplistingId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uplisting ID (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-uplisting-id" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="locationGroupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location Group</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-location-group">
                        <SelectValue placeholder="Select location group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {locationGroups.map(group => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultCleanDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Clean Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      data-testid="input-clean-duration"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" data-testid="button-save-property" className="hover-elevate active-elevate-2">
                {property ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
