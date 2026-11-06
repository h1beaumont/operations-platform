import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trophy, TrendingUp, Settings, Send, Pencil, Upload, Download, Trash2, Copy, Check, ExternalLink, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";
import * as Icons from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstructionPanel } from "@/components/instruction-panel";
import { currentStaffInstructions } from "@/lib/page-instructions";
import { BackToTop } from "@/components/back-to-top";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStaffSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import type { Staff, ComplianceEvent, PrizeSettings, StaffBadge, Badge as BadgeType } from "@shared/schema";
import Papa from "papaparse";
import { phoneNumberSchema } from "@/lib/validation";

type LeaderboardEntry = {
  staff: Staff;
  avgScore: number;
  totalEvents: number;
  badges: Array<StaffBadge & { badge: BadgeType }>;
  rank: number;
};

const staffFormSchema = insertStaffSchema.extend({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: phoneNumberSchema,
  roleType: z.enum(["driver", "non-driver"]),
  hireDate: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

const editStaffSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: phoneNumberSchema,
  roleType: z.enum(["driver", "non-driver"]),
  hireDate: z.string().optional(),
  status: z.enum(["active", "inactive", "on-leave"]).optional(),
  notes: z.string().optional(),
  niNumber: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: phoneNumberSchema,
  emergencyContactRelationship: z.string().optional(),
  contractType: z.enum(["full-time", "part-time", "zero-hours"]).optional(),
  hourlyRate: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  // Banking & Financial
  accountName: z.string().optional(),
  sortCode: z.string().optional(),
  accountNumber: z.string().optional(),
  // Preferences
  timezone: z.string().optional(),
  weekStartsOn: z.string().optional(),
  preferredNotificationTime: z.string().optional(),
  contactOptIn: z.boolean().optional(),
});

type EditStaffFormValues = z.infer<typeof editStaffSchema>;

const prizeSettingsSchema = z.object({
  firstPlacePrize: z.string().min(1, "First place prize is required"),
  secondPlacePrize: z.string().min(1, "Second place prize is required"),
  thirdPlacePrize: z.string().min(1, "Third place prize is required"),
});

type PrizeSettingsFormValues = z.infer<typeof prizeSettingsSchema>;

interface ParsedStaffRow {
  rowNumber: number;
  data: any;
  error?: string;
}

export default function CurrentStaff() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [editStaffOpen, setEditStaffOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [complianceHistoryOpen, setComplianceHistoryOpen] = useState(false);
  const [prizeSettingsOpen, setPrizeSettingsOpen] = useState(false);
  const [parsedStaffRows, setParsedStaffRows] = useState<ParsedStaffRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsStaffId, setSmsStaffId] = useState<string | null>(null);
  const [smsMessage, setSmsMessage] = useState("");

  // Fetch enhanced leaderboard with badges
  const { data: leaderboard = [], isLoading: loadingLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/staff/leaderboard/enhanced"],
  });

  // Fetch compliance history for selected staff
  const { data: complianceHistory = [] } = useQuery<ComplianceEvent[]>({
    queryKey: ["/api/staff", selectedStaffId, "compliance"],
    enabled: !!selectedStaffId && complianceHistoryOpen,
  });

  // Fetch prize settings
  const { data: prizeSettings } = useQuery<PrizeSettings>({
    queryKey: ["/api/prize-settings"],
  });

  // Add staff form
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      roleType: "non-driver",
      hireDate: "",
    },
  });

  // Edit staff form
  const editForm = useForm<EditStaffFormValues>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      roleType: "non-driver",
      hireDate: "",
      status: "active",
      notes: "",
      niNumber: "",
      address: "",
      dateOfBirth: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      contractType: undefined,
      hourlyRate: "",
    },
  });

  // Prize settings form
  const prizeForm = useForm<PrizeSettingsFormValues>({
    resolver: zodResolver(prizeSettingsSchema),
    values: prizeSettings
      ? {
          firstPlacePrize: prizeSettings.firstPlacePrize,
          secondPlacePrize: prizeSettings.secondPlacePrize,
          thirdPlacePrize: prizeSettings.thirdPlacePrize,
        }
      : {
          firstPlacePrize: "£50 bonus",
          secondPlacePrize: "£30 bonus",
          thirdPlacePrize: "£20 bonus",
        },
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      return apiRequest("POST", "/api/staff", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/leaderboard/enhanced"] });
      toast({
        title: "Success",
        description: "Staff member added successfully",
      });
      setAddStaffOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add staff member",
        variant: "destructive",
      });
    },
  });

  // Update staff mutation
  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EditStaffFormValues> }) => {
      return apiRequest("PATCH", `/api/staff/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/leaderboard/enhanced"] });
      toast({
        title: "Success",
        description: "Staff member updated successfully",
      });
      setEditStaffOpen(false);
      setSelectedStaffId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update staff member",
        variant: "destructive",
      });
    },
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return apiRequest("DELETE", `/api/staff/${staffId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/leaderboard/enhanced"] });
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete staff member",
        variant: "destructive",
      });
    },
  });

  // Bulk upload staff mutation
  const bulkUploadMutation = useMutation({
    mutationFn: async (staffData: any[]) => {
      return apiRequest("POST", "/api/staff/bulk-upload", { staffData });
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff/leaderboard/enhanced"] });
      setUploadResult(response);
      setParsedStaffRows([]);
      setCsvFileName(null);
      toast({
        title: "Upload Complete",
        description: response.message || `${response.created} staff members created, ${response.updated} updated`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload staff data",
        variant: "destructive",
      });
    },
  });

  // Update prize settings mutation
  const updatePrizesMutation = useMutation({
    mutationFn: async (data: PrizeSettingsFormValues) => {
      return apiRequest("PATCH", "/api/prize-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prize-settings"] });
      toast({
        title: "Success",
        description: "Prize settings updated successfully",
      });
      setPrizeSettingsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update prize settings",
        variant: "destructive",
      });
    },
  });

  // Send monthly rankings SMS mutation
  const sendRankingsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/send-monthly-rankings", {});
    },
    onSuccess: (response: any) => {
      toast({
        title: "SMS Sent Successfully",
        description: `Sent to ${response.sentCount} staff members. ${response.failedCount} failed.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send monthly rankings",
        variant: "destructive",
      });
    },
  });

  // Send SMS to staff member mutation
  const sendSmsMutation = useMutation({
    mutationFn: async ({ staffId, message }: { staffId: string; message: string }) => {
      return apiRequest("POST", `/api/staff/${staffId}/send-sms`, { message });
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "Message sent successfully via Twilio",
      });
      setSmsDialogOpen(false);
      setSmsMessage("");
      setSmsStaffId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StaffFormValues) => {
    createStaffMutation.mutate(data);
  };

  const onEditSubmit = (data: EditStaffFormValues) => {
    if (!selectedStaffId) return;
    
    // Prepare the data with nested structures
    const submitData = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      roleType: data.roleType,
      hireDate: data.hireDate,
      status: data.status,
      notes: data.notes,
      niNumber: data.niNumber,
      address: data.address,
      dateOfBirth: data.dateOfBirth,
      emergencyContactName: data.emergencyContactName,
      emergencyContactPhone: data.emergencyContactPhone,
      emergencyContactRelationship: data.emergencyContactRelationship,
      contractType: data.contractType,
      hourlyRate: data.hourlyRate,
      contactOptIn: data.contactOptIn,
      bankDetails: {
        accountName: data.accountName,
        sortCode: data.sortCode,
        accountNumber: data.accountNumber,
      },
      calendarPreferences: {
        timezone: data.timezone,
        weekStartsOn: data.weekStartsOn ? parseInt(data.weekStartsOn) : undefined,
        preferredNotificationTime: data.preferredNotificationTime,
      },
    };
    
    updateStaffMutation.mutate({ id: selectedStaffId, data: submitData });
  };

  const onPrizeSubmit = (data: PrizeSettingsFormValues) => {
    updatePrizesMutation.mutate(data);
  };

  const handleRowClick = (staffId: string) => {
    navigate(`/staff/${staffId}`);
  };

  const handleEditClick = (e: React.MouseEvent, staff: Staff) => {
    e.stopPropagation();
    setSelectedStaffId(staff.id);
    editForm.reset({
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone || "",
      roleType: staff.roleType as "driver" | "non-driver",
      hireDate: staff.hireDate || "",
      status: (staff.status as "active" | "inactive" | "on-leave") || "active",
      notes: staff.notes || "",
      niNumber: staff.niNumber || "",
      address: staff.address || "",
      dateOfBirth: staff.dateOfBirth || "",
      emergencyContactName: staff.emergencyContactName || "",
      emergencyContactPhone: staff.emergencyContactPhone || "",
      emergencyContactRelationship: staff.emergencyContactRelationship || "",
      contractType: staff.contractType as any || undefined,
      hourlyRate: staff.hourlyRate ? staff.hourlyRate.toString() : "",
      // Banking details
      accountName: (staff.bankDetails as any)?.accountName || "",
      sortCode: (staff.bankDetails as any)?.sortCode || "",
      accountNumber: (staff.bankDetails as any)?.accountNumber || "",
      // Preferences
      timezone: (staff.calendarPreferences as any)?.timezone || "Europe/London",
      weekStartsOn: (staff.calendarPreferences as any)?.weekStartsOn?.toString() || "1",
      preferredNotificationTime: (staff.calendarPreferences as any)?.preferredNotificationTime || "",
      contactOptIn: staff.contactOptIn !== false, // Default to true
    });
    setEditStaffOpen(true);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ParsedStaffRow[] = results.data.map((row, index) => {
          const rowNumber = index + 2;
          const staffData = {
            fullName: row["Full Name"] || row["fullName"] || "",
            email: row["Email"] || row["email"] || "",
            phone: row["Phone"] || row["phone"] || "",
            roleType: "non-driver", // Default to non-driver for simplified upload
            hireDate: new Date().toISOString().split('T')[0], // Default to today
            status: "active", // Default to active
          };

          let error: string | undefined;
          if (!staffData.fullName) error = "Full name is required";
          else if (!staffData.email) error = "Email is required";
          else if (!staffData.phone) error = "Phone number is required";

          return {
            rowNumber,
            data: staffData,
            error,
          };
        });

        setParsedStaffRows(rows);
      },
      error: () => {
        toast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive",
        });
      },
    });
  };

  const handleConfirmBulkUpload = () => {
    const validRows = parsedStaffRows.filter(row => !row.error);
    if (validRows.length === 0) {
      toast({
        title: "No valid rows",
        description: "Please fix errors in the CSV file",
        variant: "destructive",
      });
      return;
    }

    const staffData = validRows.map(row => row.data);
    bulkUploadMutation.mutate(staffData);
  };

  const handleDownloadTemplate = () => {
    const csvTemplate = `Full Name,Email,Phone`;
    
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'staff-upload-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 dark:text-green-400";
    if (percentage >= 75) return "text-blue-600 dark:text-blue-400";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Trophy className="w-4 h-4 text-amber-600" />;
    return <span className="text-muted-foreground">#{rank}</span>;
  };

  const selectedStaff = leaderboard.find((entry) => entry.staff.id === selectedStaffId);

  const validStaffRows = parsedStaffRows.filter(row => !row.error).length;
  const errorStaffRows = parsedStaffRows.filter(row => row.error).length;

  const leaderboardTVUrl = `${window.location.origin}/tv`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(leaderboardTVUrl);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Staff leaderboard TV display link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-page-title">
                Current Staff & Compliance
              </h1>
              <p className="text-muted-foreground mt-1">
                Track staff performance and compliance scores
              </p>
            </div>
            <InstructionPanel {...currentStaffInstructions} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={prizeSettingsOpen} onOpenChange={setPrizeSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-prize-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Prize Settings
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-prize-settings">
                <DialogHeader>
                  <DialogTitle>Prize Settings</DialogTitle>
                  <DialogDescription>
                    Configure prizes for top 3 staff members in monthly rankings
                  </DialogDescription>
                </DialogHeader>
                <Form {...prizeForm}>
                  <form onSubmit={prizeForm.handleSubmit(onPrizeSubmit)} className="space-y-4">
                    <FormField
                      control={prizeForm.control}
                      name="firstPlacePrize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>1st Place Prize</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="£50 bonus"
                              data-testid="input-first-prize"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prizeForm.control}
                      name="secondPlacePrize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>2nd Place Prize</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="£30 bonus"
                              data-testid="input-second-prize"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={prizeForm.control}
                      name="thirdPlacePrize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>3rd Place Prize</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="£20 bonus"
                              data-testid="input-third-prize"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPrizeSettingsOpen(false)}
                        data-testid="button-cancel-prizes"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updatePrizesMutation.isPending}
                        data-testid="button-save-prizes"
                      >
                        {updatePrizesMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" data-testid="button-send-rankings">
                  <Send className="w-4 h-4 mr-2" />
                  Send Monthly Rankings
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent data-testid="alert-send-rankings">
                <AlertDialogHeader>
                  <AlertDialogTitle>Send Monthly Rankings SMS?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send SMS notifications to all staff members with their current ranking and score.
                    This action will use SMS credits.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel data-testid="button-cancel-sms">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => sendRankingsMutation.mutate()}
                    disabled={sendRankingsMutation.isPending}
                    data-testid="button-confirm-sms"
                  >
                    {sendRankingsMutation.isPending ? "Sending..." : "Send SMS"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-bulk-upload">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]" data-testid="dialog-bulk-upload">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Staff from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file to add or update multiple staff members at once
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Download the template to see the required format
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      data-testid="button-download-staff-template"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                  </div>

                  <div className="border-2 border-dashed rounded-md p-6 text-center">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileUpload}
                      data-testid="input-csv-file"
                      className="max-w-sm mx-auto"
                    />
                    {csvFileName && (
                      <p className="text-sm text-muted-foreground mt-2" data-testid="text-csv-filename">
                        File: {csvFileName}
                      </p>
                    )}
                  </div>

                  {parsedStaffRows.length > 0 && (
                    <>
                      <div className="flex gap-2">
                        <Badge variant="default" className="bg-chart-2" data-testid="badge-valid-staff">
                          {validStaffRows} Valid
                        </Badge>
                        {errorStaffRows > 0 && (
                          <Badge variant="destructive" data-testid="badge-error-staff">
                            {errorStaffRows} Errors
                          </Badge>
                        )}
                      </div>

                      <div className="border rounded-md max-h-64 overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">Row</TableHead>
                              <TableHead>Full Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedStaffRows.map((row) => (
                              <TableRow key={row.rowNumber} data-testid={`row-staff-preview-${row.rowNumber}`}>
                                <TableCell className="font-mono text-xs">{row.rowNumber}</TableCell>
                                <TableCell>{row.data.fullName}</TableCell>
                                <TableCell className="font-mono text-xs">{row.data.email}</TableCell>
                                <TableCell>{row.data.roleType}</TableCell>
                                <TableCell>
                                  {row.error ? (
                                    <span className="text-xs text-destructive" data-testid={`error-staff-row-${row.rowNumber}`}>
                                      {row.error}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-chart-2">Valid</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}

                  {uploadResult && (
                    <div className="p-4 rounded-md bg-muted">
                      <p className="text-sm font-medium mb-2">Upload Results:</p>
                      <div className="flex gap-2">
                        <Badge variant="default" className="bg-chart-2" data-testid="badge-created-staff">
                          {uploadResult.created || 0} Created
                        </Badge>
                        <Badge variant="secondary" data-testid="badge-updated-staff">
                          {uploadResult.updated || 0} Updated
                        </Badge>
                        {uploadResult.errors?.length > 0 && (
                          <Badge variant="destructive" data-testid="badge-upload-errors">
                            {uploadResult.errors.length} Errors
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBulkUploadOpen(false);
                      setParsedStaffRows([]);
                      setCsvFileName(null);
                      setUploadResult(null);
                    }}
                    data-testid="button-cancel-bulk-upload"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleConfirmBulkUpload}
                    disabled={validStaffRows === 0 || bulkUploadMutation.isPending}
                    data-testid="button-confirm-bulk-upload"
                  >
                    {bulkUploadMutation.isPending ? "Uploading..." : `Upload ${validStaffRows} Staff`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-staff">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              </DialogTrigger>
            <DialogContent data-testid="dialog-add-staff">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Enter the details of the new staff member.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter full name"
                            data-testid="input-full-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Enter email address"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+44 20 1234 5678"
                            data-testid="input-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          data-testid="select-role-type"
                        >
                          <FormControl>
                            <SelectTrigger data-testid="trigger-role-type">
                              <SelectValue placeholder="Select role type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="driver" data-testid="option-driver">
                              Driver
                            </SelectItem>
                            <SelectItem value="non-driver" data-testid="option-non-driver">
                              Non-Driver
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hire Date (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            data-testid="input-hire-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddStaffOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createStaffMutation.isPending}
                      data-testid="button-submit-staff"
                    >
                      {createStaffMutation.isPending ? "Adding..." : "Add Staff"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Edit Staff Dialog with Tabs */}
        <Dialog open={editStaffOpen} onOpenChange={setEditStaffOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-edit-staff">
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update staff member information across different categories
              </DialogDescription>
            </DialogHeader>
            
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="flex-1 overflow-hidden flex flex-col">
                <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
                  <TabsList className="grid w-full grid-cols-6" data-testid="tabs-edit-staff">
                    <TabsTrigger value="basic" data-testid="tab-basic">Basic</TabsTrigger>
                    <TabsTrigger value="personal" data-testid="tab-personal">Personal</TabsTrigger>
                    <TabsTrigger value="emergency" data-testid="tab-emergency">Emergency</TabsTrigger>
                    <TabsTrigger value="employment" data-testid="tab-employment">Employment</TabsTrigger>
                    <TabsTrigger value="banking" data-testid="tab-banking">Banking</TabsTrigger>
                    <TabsTrigger value="preferences" data-testid="tab-preferences">Preferences</TabsTrigger>
                  </TabsList>

                  <div className="flex-1 overflow-auto py-4">
                    <TabsContent value="basic" className="space-y-4 mt-0" data-testid="content-basic">
                      <FormField
                        control={editForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full name" data-testid="input-edit-full-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter email address" data-testid="input-edit-email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+44 20 1234 5678" data-testid="input-edit-phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="roleType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-role-type">
                              <FormControl>
                                <SelectTrigger data-testid="trigger-edit-role-type">
                                  <SelectValue placeholder="Select role type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="driver" data-testid="option-edit-driver">Driver</SelectItem>
                                <SelectItem value="non-driver" data-testid="option-edit-non-driver">Non-Driver</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="hireDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hire Date</FormLabel>
                            <FormControl>
                              <Input type="date" data-testid="input-edit-hire-date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-status">
                              <FormControl>
                                <SelectTrigger data-testid="trigger-edit-status">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="active" data-testid="option-edit-active">Active</SelectItem>
                                <SelectItem value="inactive" data-testid="option-edit-inactive">Inactive</SelectItem>
                                <SelectItem value="on-leave" data-testid="option-edit-on-leave">On Leave</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Add any notes..." data-testid="input-edit-notes" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="personal" className="space-y-4 mt-0" data-testid="content-personal">
                      <FormField
                        control={editForm.control}
                        name="niNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>National Insurance Number</FormLabel>
                            <FormControl>
                              <Input placeholder="AB123456C" data-testid="input-edit-ni-number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address</FormLabel>
                            <FormControl>
                              <Textarea placeholder="123 Main St, City, Postcode" data-testid="input-edit-address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="dateOfBirth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date of Birth</FormLabel>
                            <FormControl>
                              <Input type="date" data-testid="input-edit-dob" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="emergency" className="space-y-4 mt-0" data-testid="content-emergency">
                      <FormField
                        control={editForm.control}
                        name="emergencyContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Contact Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter contact name" data-testid="input-edit-emergency-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="emergencyContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emergency Contact Phone</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+44 20 9876 5432" data-testid="input-edit-emergency-phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="emergencyContactRelationship"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relationship</FormLabel>
                            <FormControl>
                              <Input placeholder="Spouse, Parent, Sibling, etc." data-testid="input-edit-emergency-relationship" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="employment" className="space-y-4 mt-0" data-testid="content-employment">
                      <FormField
                        control={editForm.control}
                        name="contractType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contract Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-contract-type">
                              <FormControl>
                                <SelectTrigger data-testid="trigger-edit-contract-type">
                                  <SelectValue placeholder="Select contract type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="full-time" data-testid="option-edit-full-time">Full Time</SelectItem>
                                <SelectItem value="part-time" data-testid="option-edit-part-time">Part Time</SelectItem>
                                <SelectItem value="zero-hours" data-testid="option-edit-zero-hours">Zero Hours</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hourly Rate (£)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="12.50" data-testid="input-edit-hourly-rate" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="banking" className="space-y-4 mt-0" data-testid="content-banking">
                      <FormField
                        control={editForm.control}
                        name="accountName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter account name" data-testid="input-edit-account-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="sortCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sort Code</FormLabel>
                            <FormControl>
                              <Input placeholder="00-00-00" data-testid="input-edit-sort-code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number</FormLabel>
                            <FormControl>
                              <Input placeholder="00000000" data-testid="input-edit-account-number" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="preferences" className="space-y-4 mt-0" data-testid="content-preferences">
                      <FormField
                        control={editForm.control}
                        name="timezone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timezone</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-timezone">
                              <FormControl>
                                <SelectTrigger data-testid="trigger-edit-timezone">
                                  <SelectValue placeholder="Select timezone" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Europe/London" data-testid="option-edit-london">Europe/London</SelectItem>
                                <SelectItem value="Europe/Dublin" data-testid="option-edit-dublin">Europe/Dublin</SelectItem>
                                <SelectItem value="Europe/Paris" data-testid="option-edit-paris">Europe/Paris</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="weekStartsOn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Week Starts On</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} data-testid="select-edit-week-starts">
                              <FormControl>
                                <SelectTrigger data-testid="trigger-edit-week-starts">
                                  <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0" data-testid="option-edit-sunday">Sunday</SelectItem>
                                <SelectItem value="1" data-testid="option-edit-monday">Monday</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="preferredNotificationTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Notification Time</FormLabel>
                            <FormControl>
                              <Input type="time" data-testid="input-edit-notification-time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="contactOptIn"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <input 
                                type="checkbox" 
                                checked={field.value} 
                                onChange={field.onChange}
                                data-testid="checkbox-edit-opt-in"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Opt-in for SMS/Email Notifications</FormLabel>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </div>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditStaffOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateStaffMutation.isPending}
                    data-testid="button-save-edit"
                  >
                    {updateStaffMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* TV Display Link Card */}
        <Card className="mb-6" data-testid="card-tv-display-link">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Staff Leaderboard TV Display
            </CardTitle>
            <CardDescription>
              Copy this link to display the live leaderboard on a TV screen in the linen room
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm overflow-x-auto" data-testid="text-tv-url">
                {leaderboardTVUrl}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                data-testid="button-copy-tv-link"
                className="gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(leaderboardTVUrl, '_blank')}
                data-testid="button-open-tv-link"
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Staff Leaderboard
            </CardTitle>
            <CardDescription>
              Ranked by cumulative monthly score (resets monthly for prize eligibility)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLeaderboard ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" data-testid={`skeleton-row-${i}`} />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-no-staff">
                <p>No staff members found. Add staff to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background border-b">
                  <TableRow>
                    <TableHead scope="col" className="w-20" data-testid="header-rank">Rank</TableHead>
                    <TableHead scope="col" data-testid="header-name">Staff Name</TableHead>
                    <TableHead scope="col" data-testid="header-role">Role</TableHead>
                    <TableHead scope="col" data-testid="header-score">Monthly Score</TableHead>
                    <TableHead scope="col" data-testid="header-percentage">Percentage</TableHead>
                    <TableHead scope="col" data-testid="header-checks">Total Checks</TableHead>
                    <TableHead scope="col" data-testid="header-badges">Badges</TableHead>
                    <TableHead scope="col" data-testid="header-performance">Performance</TableHead>
                    <TableHead scope="col" className="w-20" data-testid="header-actions">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((entry) => {
                    const percentage = (entry.avgScore / 15.0) * 100;
                    return (
                      <TableRow
                        key={entry.staff.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => handleRowClick(entry.staff.id)}
                        data-testid={`row-staff-${entry.staff.id}`}
                      >
                        <TableCell data-testid={`cell-rank-${entry.rank}`}>
                          <div className="flex items-center gap-2">
                            {getRankBadge(entry.rank)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`cell-name-${entry.staff.id}`}>
                          {entry.staff.fullName}
                        </TableCell>
                        <TableCell data-testid={`cell-role-${entry.staff.id}`}>
                          <Badge variant={entry.staff.roleType === "driver" ? "default" : "secondary"}>
                            {entry.staff.roleType === "driver" ? "Driver" : "Non-Driver"}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`font-semibold ${getScoreColor(percentage)}`}
                          data-testid={`cell-score-${entry.staff.id}`}
                        >
                          {entry.avgScore.toFixed(2)} / 15.0
                        </TableCell>
                        <TableCell
                          className={getScoreColor(percentage)}
                          data-testid={`cell-percentage-${entry.staff.id}`}
                        >
                          {percentage.toFixed(1)}%
                        </TableCell>
                        <TableCell data-testid={`cell-checks-${entry.staff.id}`}>
                          {entry.totalEvents}
                        </TableCell>
                        <TableCell data-testid={`cell-badges-${entry.staff.id}`}>
                          <div className="flex gap-1">
                            {entry.badges?.slice(0, 3).map((sb: any) => {
                              const IconComponent = (Icons as any)[sb.badge.icon] || Icons.Award;
                              
                              return (
                                <IconComponent 
                                  key={sb.id} 
                                  className="h-5 w-5" 
                                  title={sb.badge.name}
                                  style={{ color: sb.badge.color }}
                                />
                              );
                            })}
                            {entry.badges && entry.badges.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{entry.badges.length - 3}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-performance-${entry.staff.id}`}>
                          <div className="w-32">
                            <Progress value={percentage} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSmsStaffId(entry.staff.id);
                                    setSmsDialogOpen(true);
                                  }}
                                  disabled={!entry.staff.phone}
                                  data-testid={`button-sms-staff-${entry.staff.id}`}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Send SMS</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => handleEditClick(e, entry.staff)}
                                  data-testid={`button-edit-staff-${entry.staff.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Details</TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`button-delete-staff-${entry.staff.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {entry.staff.fullName}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid={`button-cancel-delete-${entry.staff.id}`}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteStaffMutation.mutate(entry.staff.id)}
                                    className="bg-destructive text-destructive-foreground hover-elevate"
                                    data-testid={`button-confirm-delete-${entry.staff.id}`}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance History Dialog */}
        <Dialog open={complianceHistoryOpen} onOpenChange={setComplianceHistoryOpen}>
          <DialogContent className="max-w-3xl" data-testid="dialog-compliance-history">
            <DialogHeader>
              <DialogTitle>
                Compliance History - {selectedStaff?.staff.fullName}
              </DialogTitle>
              <DialogDescription>
                Detailed compliance check history
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {complianceHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-history">
                  No compliance events found for this staff member.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-compliance-date">Date</TableHead>
                      <TableHead data-testid="header-compliance-property">Property</TableHead>
                      <TableHead data-testid="header-compliance-score">Score</TableHead>
                      <TableHead data-testid="header-compliance-reason">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceHistory.map((event) => (
                      <TableRow key={event.eventId} data-testid={`row-compliance-${event.eventId}`}>
                        <TableCell data-testid={`cell-compliance-date-${event.eventId}`}>{new Date(event.eventDate).toLocaleDateString()}</TableCell>
                        <TableCell data-testid={`cell-compliance-property-${event.eventId}`}>{event.property || "N/A"}</TableCell>
                        <TableCell data-testid={`cell-compliance-score-${event.eventId}`}>
                          {event.points.toFixed(2)} / {event.maxPoints.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`cell-compliance-reason-${event.eventId}`}>{event.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* SMS Dialog */}
        <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
          <DialogContent data-testid="dialog-sms">
            <DialogHeader>
              <DialogTitle>Send SMS to Staff Member</DialogTitle>
              <DialogDescription>
                Message will be sent via Twilio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Staff Member</label>
                <p className="text-sm text-muted-foreground">
                  {smsStaffId && leaderboard.find(e => e.staff.id === smsStaffId)?.staff.fullName}
                </p>
              </div>
              <div>
                <label htmlFor="sms-message" className="text-sm font-medium">
                  Message
                </label>
                <Textarea
                  id="sms-message"
                  placeholder="Type your message here..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  className="mt-1.5"
                  rows={4}
                  data-testid="textarea-sms-message"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {smsMessage.length} / 160 characters
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setSmsDialogOpen(false)}
                data-testid="button-cancel-sms"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (smsStaffId && smsMessage.trim()) {
                    sendSmsMutation.mutate({ staffId: smsStaffId, message: smsMessage });
                  }
                }}
                disabled={!smsMessage.trim() || sendSmsMutation.isPending}
                data-testid="button-send-sms"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {sendSmsMutation.isPending ? "Sending..." : "Send SMS"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <BackToTop />
    </div>
  );
}
