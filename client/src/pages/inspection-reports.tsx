import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ClipboardCheck,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  TrendingUp,
  FileText,
  Camera,
  Star,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Building2,
  User,
  ChevronRight,
  XCircle,
  Upload,
  Loader2,
  X,
  Bell,
  Mail,
  Edit,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type {
  InspectionTemplate,
  InspectionReport,
  Property,
  Staff,
} from "@shared/schema";

// Score color helper
const getScoreColor = (score?: number | null) => {
  if (!score) return "text-gray-500";
  if (score >= 90) return "text-green-600";
  if (score >= 75) return "text-yellow-600";
  return "text-red-600";
};

// Calculate percentage score from checklist items
const calculatePercentageScore = (items: any[]) => {
  if (!items || items.length === 0) return 0;
  const passedItems = items.filter(item => item.passed === true).length;
  return Math.round((passedItems / items.length) * 100);
};

// Severity badge variant
const getSeverityVariant = (severity: string) => {
  switch (severity) {
    case "critical":
      return "destructive";
    case "major":
      return "default";
    default:
      return "secondary";
  }
};

export default function InspectionReports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedReport, setSelectedReport] = useState<InspectionReport | null>(null);
  const [showNewInspection, setShowNewInspection] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPropertyId, setFilterPropertyId] = useState<string>("all");
  
  // PDF Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [uploadedInspectionId, setUploadedInspectionId] = useState<string | null>(null);

  // Notification Settings states
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [editingNotification, setEditingNotification] = useState<any | null>(null);
  const [notificationForm, setNotificationForm] = useState({
    propertyId: "all",
    scoreThreshold: 75,
    enabled: true,
    recipientEmails: "",
    ccEmails: "",
  });

  // RentCheck states
  const [rentCheckSelectedFile, setRentCheckSelectedFile] = useState<File | null>(null);
  const [rentCheckUploading, setRentCheckUploading] = useState(false);

  // Fetch data
  const { data: templates = [], isLoading: templatesLoading } = useQuery<InspectionTemplate[]>({
    queryKey: ["/api/inspections/templates"],
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery<InspectionReport[]>({
    queryKey: ["/api/inspections/reports"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<any>({
    queryKey: ["/api/inspections/analytics"],
  });

  // Notification settings query
  const { data: notificationSettings = [], isLoading: notificationSettingsLoading } = useQuery<any[]>({
    queryKey: ["/api/inspections/notification-settings"],
  });

  // RentCheck queries
  const { data: rentCheckInspections, isLoading: rentCheckInspectionsLoading } = useQuery<any>({
    queryKey: ['/api/rentcheck/inspections'],
  });

  const { data: rentCheckAnalytics, isLoading: rentCheckAnalyticsLoading } = useQuery<any>({
    queryKey: ['/api/rentcheck/analytics'],
  });

  // Poll for uploaded inspection status
  const { data: uploadedInspection } = useQuery<InspectionReport>({
    queryKey: ['/api/inspections/reports', uploadedInspectionId],
    queryFn: async () => {
      if (!uploadedInspectionId) return null;
      const response = await fetch(`/api/inspections/reports/${uploadedInspectionId}`);
      if (!response.ok) throw new Error('Failed to fetch inspection');
      return response.json();
    },
    enabled: !!uploadedInspectionId,
    refetchInterval: (query) => {
      if (query.state.data?.status === 'in_progress') {
        return 2000; // Poll every 2 seconds
      }
      return false; // Stop polling when completed or failed
    },
  });

  // Create new inspection report
  const createReportMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/inspections/reports", { 
      method: "POST", 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections/reports"] });
      toast({
        title: "Inspection Started",
        description: "New inspection report created successfully.",
      });
      setShowNewInspection(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create inspection report.",
        variant: "destructive",
      });
    },
  });

  // PDF Upload mutation
  const uploadPdfMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      const response = await fetch('/api/inspections/upload-pdf', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections/reports"] });
      setUploadedInspectionId(data.id);
      setUploadedData(data);
      toast({
        title: "PDF Uploaded",
        description: "Your inspection report is being processed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload PDF file.",
        variant: "destructive",
      });
    },
  });

  // Notification Settings Mutations
  const createNotificationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/inspections/notification-settings", { 
      method: "POST", 
      body: JSON.stringify(data) 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections/notification-settings"] });
      toast({
        title: "Notification Created",
        description: "Notification setting created successfully.",
      });
      setShowNotificationDialog(false);
      setEditingNotification(null);
      setNotificationForm({
        propertyId: "all",
        scoreThreshold: 75,
        enabled: true,
        recipientEmails: "",
        ccEmails: "",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create notification setting.",
        variant: "destructive",
      });
    },
  });

  const updateNotificationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/inspections/notification-settings/${id}`, { 
        method: "PATCH", 
        body: JSON.stringify(data) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections/notification-settings"] });
      toast({
        title: "Notification Updated",
        description: "Notification setting updated successfully.",
      });
      setShowNotificationDialog(false);
      setEditingNotification(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update notification setting.",
        variant: "destructive",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/inspections/notification-settings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspections/notification-settings"] });
      toast({
        title: "Notification Deleted",
        description: "Notification setting deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete notification setting.",
        variant: "destructive",
      });
    },
  });

  // RentCheck upload mutation
  const rentCheckUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      
      const response = await fetch('/api/rentcheck/upload-inspection', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Inspection Uploaded Successfully",
        description: (
          <div className="space-y-1">
            <p className="font-medium">{data.summary.propertyAddress}</p>
            <p>Overall Score: {data.summary.overallScore}%</p>
            <p>Issues Found: {data.summary.totalIssues}</p>
            <p>Rooms Inspected: {data.summary.roomsInspected}</p>
            {data.summary.lastCleaner && (
              <p>Last cleaned {data.summary.lastCleaner.daysSince} days ago</p>
            )}
          </div>
        ),
      });
      setRentCheckSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/rentcheck/inspections'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filtered reports
  const filteredReports = reports.filter((report: any) => {
    if (filterStatus !== "all" && report.status !== filterStatus) return false;
    if (filterPropertyId !== "all" && report.propertyId !== filterPropertyId) return false;
    if (searchTerm) {
      const property = properties.find((p: Property) => p.id === report.propertyId);
      const inspector = staff.find((s: Staff) => s.id === report.inspectorId);
      const searchLower = searchTerm.toLowerCase();
      if (!property?.name?.toLowerCase().includes(searchLower) &&
          !inspector?.fullName?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  // Calculate stats
  const pendingInspections = reports.filter((r: any) => r.status === "pending").length;
  const completedToday = reports.filter((r: any) => {
    if (r.status !== "completed") return false;
    const completedDate = new Date(r.completedAt);
    const today = new Date();
    return completedDate.toDateString() === today.toDateString();
  }).length;
  const avgScore = analytics?.averageScore || 0;
  const issuesFound = analytics?.issuesFound || 0;

  // PDF Upload handlers
  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.includes('pdf')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Please select a PDF file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setUploadedData(null);
    setUploadedInspectionId(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadPdfMutation.mutate(selectedFile);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadedData(null);
    setUploadedInspectionId(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Use polled data if available, otherwise use initial upload data
  const displayData = uploadedInspection || uploadedData;

  // RentCheck helper functions
  const getRentCheckScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getRentCheckScoreBadge = (score: number) => {
    if (score >= 80) return <Badge variant="default" className="bg-green-600">Excellent</Badge>;
    if (score >= 60) return <Badge variant="default" className="bg-yellow-600">Good</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  const handleRentCheckFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setRentCheckSelectedFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a PDF file",
        variant: "destructive",
      });
    }
  };

  const handleRentCheckUpload = async () => {
    if (!rentCheckSelectedFile) return;
    setRentCheckUploading(true);
    try {
      await rentCheckUploadMutation.mutateAsync(rentCheckSelectedFile);
    } finally {
      setRentCheckUploading(false);
    }
  };

  const COLORS = ['#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#3b82f6'];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-title">
            Inspection Reports
          </h1>
          <p className="text-muted-foreground">
            Manage property quality control and inspections
          </p>
        </div>
        <Dialog open={showNewInspection} onOpenChange={setShowNewInspection}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-inspection">
              <Plus className="mr-2 h-4 w-4" />
              New Inspection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Start New Inspection</DialogTitle>
            </DialogHeader>
            <NewInspectionForm
              templates={templates}
              properties={properties}
              staff={staff}
              onSubmit={(data) => createReportMutation.mutate(data)}
              onCancel={() => setShowNewInspection(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Pending Inspections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold" data-testid="text-pending">
                {pendingInspections}
              </span>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold" data-testid="text-completed-today">
                {completedToday}
              </span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className={`text-2xl font-bold ${getScoreColor(avgScore)}`} data-testid="text-avg-score">
                {avgScore.toFixed(1)}%
              </span>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Issues Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold" data-testid="text-issues">
                {issuesFound}
              </span>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full max-w-[1200px]">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">
            Reports
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="pdf-upload" data-testid="tab-pdf-upload">
            <Upload className="h-4 w-4 mr-2" />
            PDF Upload
          </TabsTrigger>
          <TabsTrigger value="rentcheck-inspections" data-testid="tab-rentcheck-inspections">
            RentCheck Inspections
          </TabsTrigger>
          <TabsTrigger value="notification-settings" data-testid="tab-notification-settings">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Inspections */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Inspections</CardTitle>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.slice(0, 5).map((report: any) => {
                      const property = properties.find((p: Property) => p.id === report.propertyId);
                      const inspector = staff.find((s: Staff) => s.id === report.inspectorId);
                      return (
                        <div
                          key={report.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                          onClick={() => setSelectedReport(report)}
                          data-testid={`report-item-${report.id}`}
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium" data-testid={`text-property-${report.id}`}>{property?.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">
                                <span data-testid={`text-inspector-${report.id}`}>{inspector?.fullName || "Unknown"}</span> • <span data-testid={`text-date-${report.id}`}>{format(new Date(report.date), "MMM dd")}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {report.overallScore && (
                              <span className={`font-medium ${getScoreColor(report.overallScore)}`} data-testid={`text-score-${report.id}`}>
                                {report.overallScore}%
                              </span>
                            )}
                            <Badge variant={report.status === "completed" ? "default" : "secondary"} data-testid={`badge-status-${report.id}`}>
                              {report.status}
                            </Badge>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Property Performance</CardTitle>
              </CardHeader>
              <CardContent>
                {analyticsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics?.propertyStats?.slice(0, 5).map((stat: any) => (
                      <div key={stat.propertyId} className="flex items-center justify-between" data-testid={`property-perf-${stat.propertyId}`}>
                        <div className="flex-1">
                          <p className="text-sm font-medium" data-testid={`text-property-name-${stat.propertyId}`}>{stat.propertyName}</p>
                          <Progress value={stat.averageScore} className="h-2 mt-1" data-testid={`progress-score-${stat.propertyId}`} />
                        </div>
                        <span className={`text-sm font-medium ml-3 ${getScoreColor(stat.averageScore)}`} data-testid={`text-property-score-${stat.propertyId}`}>
                          {stat.averageScore.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Critical Issues */}
          {analytics?.criticalIssues > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Critical Issues Require Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700" data-testid="text-critical-issues">
                  There are {analytics.criticalIssues} critical issues that need immediate attention.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    setActiveTab("reports");
                    setFilterStatus("all");
                  }}
                  data-testid="button-view-critical"
                >
                  View Critical Issues
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="input-search"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPropertyId} onValueChange={setFilterPropertyId}>
              <SelectTrigger className="w-[200px]" data-testid="select-property-filter">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((property: Property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" data-testid="button-export">
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Reports Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Cleaner</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ) : filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No reports found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((report: any) => {
                      const property = properties.find((p: Property) => p.id === report.propertyId);
                      const inspector = staff.find((s: Staff) => s.id === report.inspectorId);
                      const cleaner = report.assignedCleanerId 
                        ? staff.find((s: Staff) => s.id === report.assignedCleanerId)
                        : null;
                      return (
                        <TableRow
                          key={report.id}
                          className="cursor-pointer hover:bg-accent"
                          onClick={() => setSelectedReport(report)}
                          data-testid={`table-row-${report.id}`}
                        >
                          <TableCell data-testid={`text-property-table-${report.id}`}>{property?.name || "Unknown"}</TableCell>
                          <TableCell data-testid={`text-inspector-table-${report.id}`}>{inspector?.fullName || "Unknown"}</TableCell>
                          <TableCell data-testid={`text-cleaner-table-${report.id}`}>
                            {cleaner ? (
                              <span className="text-sm">{cleaner.fullName}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell data-testid={`text-date-table-${report.id}`}>{format(new Date(report.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={report.status === "completed" ? "default" : "secondary"} data-testid={`badge-status-table-${report.id}`}>
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {report.overallScore ? (
                              <span className={getScoreColor(report.overallScore)} data-testid={`text-score-table-${report.id}`}>
                                {report.overallScore}%
                              </span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" data-testid={`button-view-${report.id}`}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab - Consolidated RentCheck Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          {analyticsLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          ) : (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Average Score */}
                <Card data-testid="metric-avg-score">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className={`text-3xl font-bold ${getScoreColor(analytics?.averageScore)}`}>
                        {(analytics?.averageScore || 0).toFixed(1)}%
                      </span>
                      <Star className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                {/* Total Inspections */}
                <Card data-testid="metric-total-inspections">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Inspections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold">
                        {analytics?.totalInspections || 0}
                      </span>
                      <ClipboardCheck className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                {/* Compliance Rate */}
                <Card data-testid="metric-compliance-rate">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Compliance Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className={`text-3xl font-bold ${(analytics?.complianceRate || 0) >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                        {(analytics?.complianceRate || 0).toFixed(1)}%
                      </span>
                      <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Scoring ≥75%
                    </p>
                  </CardContent>
                </Card>

                {/* Latest Inspection Date */}
                <Card data-testid="metric-latest-inspection">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Latest Inspection
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-bold">
                        {analytics?.latestInspectionDate
                          ? format(new Date(analytics.latestInspectionDate), "MMM dd")
                          : "N/A"}
                      </span>
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    {analytics?.latestInspectionDate && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(analytics.latestInspectionDate), "yyyy")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Score Trend Chart */}
              <Card data-testid="chart-score-trend">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Score Trend Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.scoreTrends && analytics.scoreTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.scoreTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="weekStart"
                          tickFormatter={(value) => format(new Date(value), "MMM dd")}
                          className="text-xs"
                        />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                          }}
                          labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                          formatter={(value: any) => [`${value.toFixed(1)}%`, 'Avg Score']}
                        />
                        <Line
                          type="monotone"
                          dataKey="averageScore"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No trend data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Score Distribution and Issue Severity - Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Distribution */}
                <Card data-testid="chart-score-distribution">
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.scoreDistribution ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={[
                            { range: 'Poor (0-59)', count: analytics.scoreDistribution.poor, fill: '#ef4444' },
                            { range: 'Fair (60-74)', count: analytics.scoreDistribution.fair, fill: '#f59e0b' },
                            { range: 'Good (75-89)', count: analytics.scoreDistribution.good, fill: '#eab308' },
                            { range: 'Excellent (90-100)', count: analytics.scoreDistribution.excellent, fill: '#22c55e' },
                          ]}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="range" className="text-xs" angle={-20} textAnchor="end" height={80} />
                          <YAxis className="text-xs" />
                          <RechartsTooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px',
                            }}
                            formatter={(value: any) => [`${value} inspections`, 'Count']}
                          />
                          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                            {[
                              { range: 'Poor (0-59)', count: analytics.scoreDistribution.poor, fill: '#ef4444' },
                              { range: 'Fair (60-74)', count: analytics.scoreDistribution.fair, fill: '#f59e0b' },
                              { range: 'Good (75-89)', count: analytics.scoreDistribution.good, fill: '#eab308' },
                              { range: 'Excellent (90-100)', count: analytics.scoreDistribution.excellent, fill: '#22c55e' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No distribution data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Issue Severity Breakdown */}
                <Card data-testid="chart-issue-severity">
                  <CardHeader>
                    <CardTitle>Issue Severity Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.issueSeverityBreakdown ? (
                      <div className="space-y-6">
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={[
                                {
                                  name: 'Critical',
                                  value: analytics.issueSeverityBreakdown.critical,
                                  fill: '#ef4444'
                                },
                                {
                                  name: 'Major',
                                  value: analytics.issueSeverityBreakdown.major,
                                  fill: '#f59e0b'
                                },
                                {
                                  name: 'Minor',
                                  value: analytics.issueSeverityBreakdown.minor,
                                  fill: '#9ca3af'
                                },
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              dataKey="value"
                            >
                              {[
                                { fill: '#ef4444' },
                                { fill: '#f59e0b' },
                                { fill: '#9ca3af' },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '6px',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              <span className="text-sm font-medium">Critical</span>
                            </div>
                            <span className="text-sm font-bold" data-testid="text-severity-critical">
                              {analytics.issueSeverityBreakdown.critical}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-orange-500" />
                              <span className="text-sm font-medium">Major</span>
                            </div>
                            <span className="text-sm font-bold" data-testid="text-severity-major">
                              {analytics.issueSeverityBreakdown.major}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gray-400" />
                              <span className="text-sm font-medium">Minor</span>
                            </div>
                            <span className="text-sm font-bold" data-testid="text-severity-minor">
                              {analytics.issueSeverityBreakdown.minor}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        No issues data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Top Issues List */}
              <Card data-testid="list-top-issues">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Top Issues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics?.topIssues && analytics.topIssues.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.topIssues.map((issue: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-lg"
                          data-testid={`issue-item-${idx}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{issue.description || 'No description'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={getSeverityVariant(issue.severity || 'minor')}>
                                {issue.severity || 'minor'}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {issue.count || 0} occurrence{issue.count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-muted-foreground">
                            {issue.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No issues found
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* RentCheck Analytics Section */}
              <Separator className="my-8" />
              
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">RentCheck Inspection Analytics</h2>
                <p className="text-muted-foreground">
                  Performance metrics and trends from RentCheck PDF inspections
                </p>
              </div>

              {rentCheckAnalyticsLoading ? (
                <div className="p-8">
                  <p className="text-center text-muted-foreground">Loading RentCheck analytics...</p>
                </div>
              ) : !rentCheckAnalytics ? (
                <div className="p-8">
                  <p className="text-center text-muted-foreground">No RentCheck analytics data available</p>
                </div>
              ) : (
                <>
                  {/* RentCheck Overview Cards */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total RentCheck Inspections
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">{rentCheckAnalytics.overview.totalInspections}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Average RentCheck Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                          {rentCheckAnalytics.overview.avgGoodPercentage}%
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Issues Found
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-3xl font-bold ${rentCheckAnalytics.overview.totalIssues > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {rentCheckAnalytics.overview.totalIssues}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* RentCheck Score Trends Over Time */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        RentCheck Score Trends
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Inspection scores across all properties</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={rentCheckAnalytics.scoreTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 100]} />
                          <RechartsTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} name="Score (%)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* RentCheck Property Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Property Performance Comparison
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Average scores and issue counts by property</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={rentCheckAnalytics.propertyPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="property" angle={-45} textAnchor="end" height={100} />
                          <YAxis yAxisId="left" orientation="left" stroke="#22c55e" />
                          <YAxis yAxisId="right" orientation="right" stroke="#ef4444" />
                          <RechartsTooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="avgScore" fill="#22c55e" name="Avg Score (%)" />
                          <Bar yAxisId="right" dataKey="totalIssues" fill="#ef4444" name="Total Issues" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Cleaner Accountability */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Cleaner Accountability Metrics
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Performance of cleaners based on post-cleaning inspections</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {rentCheckAnalytics.cleanerAccountability.length === 0 ? (
                          <p className="text-center text-muted-foreground py-8">
                            No cleaner data available yet
                          </p>
                        ) : (
                          rentCheckAnalytics.cleanerAccountability.map((cleaner: any) => (
                            <div key={cleaner.staffId} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-lg">{cleaner.name}</h3>
                                  <Badge variant="outline">{cleaner.inspectionCount} inspection{cleaner.inspectionCount !== 1 ? 's' : ''}</Badge>
                                </div>
                                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Avg Score: {Math.round(cleaner.avgScore)}%
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {cleaner.totalIssues} issue{cleaner.totalIssues !== 1 ? 's' : ''}
                                  </div>
                                  <div>
                                    Avg Days Since Cleaning: {Math.round(cleaner.avgDaysSinceCleaning)}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`text-2xl font-bold ${cleaner.avgScore >= 80 ? 'text-green-600' : cleaner.avgScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {Math.round(cleaner.avgScore)}%
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Room-Specific Issues */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Room-Specific Issue Trends</CardTitle>
                      <p className="text-sm text-muted-foreground">Which rooms have the most issues</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={rentCheckAnalytics.roomIssues} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="roomName" type="category" width={150} />
                          <RechartsTooltip />
                          <Legend />
                          <Bar dataKey="avgScore" fill="#22c55e" name="Avg Score (%)" />
                          <Bar dataKey="issueCount" fill="#ef4444" name="Issue Count" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </TabsContent>

        {/* PDF Upload Tab */}
        <TabsContent value="pdf-upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Inspection PDF</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload a RentCheck or similar inspection report PDF for AI processing
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Drag and Drop Zone */}
              {!uploadedData && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25"
                  }`}
                  data-testid="zone-pdf-drop"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className={`p-4 rounded-full ${isDragOver ? "bg-primary/10" : "bg-muted"}`}>
                      <Upload className={`h-8 w-8 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    
                    {!selectedFile ? (
                      <>
                        <div>
                          <p className="text-lg font-medium mb-1">
                            Drag and drop your PDF here
                          </p>
                          <p className="text-sm text-muted-foreground">
                            or click to browse
                          </p>
                        </div>
                        <Input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                          }}
                          className="hidden"
                          id="pdf-upload-input"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('pdf-upload-input')?.click()}
                          data-testid="button-browse-file"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Browse Files
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          PDF files only, max 10MB
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 p-4 bg-muted rounded-lg w-full max-w-md">
                          <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" data-testid="text-selected-file">
                              {selectedFile.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(selectedFile.size)}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClearFile}
                            data-testid="button-clear-file"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          onClick={handleUpload}
                          disabled={uploadPdfMutation.isPending}
                          className="w-full max-w-md"
                          data-testid="button-upload-pdf"
                        >
                          {uploadPdfMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload PDF
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Processing Status Display */}
              {uploadedData && (
                <div className="space-y-4" data-testid="status-processing">
                  {/* Status Card */}
                  <Card className={
                    displayData.status === "completed"
                      ? "border-green-200 bg-green-50"
                      : displayData.status === "failed"
                      ? "border-red-200 bg-red-50"
                      : "border-blue-200 bg-blue-50"
                  }>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {displayData.status === "in_progress" && (
                          <>
                            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                            <span className="text-blue-700">Processing...</span>
                          </>
                        )}
                        {displayData.status === "completed" && (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-green-700">Completed</span>
                          </>
                        )}
                        {displayData.status === "failed" && (
                          <>
                            <AlertCircle className="h-5 w-5 text-red-600" />
                            <span className="text-red-700">Failed</span>
                          </>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {displayData.status === "in_progress" && (
                        <p className="text-sm text-blue-700">
                          AI is analyzing your inspection report. This may take a moment...
                        </p>
                      )}
                      {displayData.status === "completed" && (
                        <p className="text-sm text-green-700">
                          Your inspection report has been successfully processed!
                        </p>
                      )}
                      {displayData.status === "failed" && (
                        <div>
                          <p className="text-sm text-red-700 mb-2">
                            Failed to process the inspection report.
                          </p>
                          {displayData.error && (
                            <p className="text-sm text-red-600">
                              Error: {displayData.error}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Extracted Data Display */}
                  {displayData.status === "completed" && displayData.data && (
                    <div className="space-y-4">
                      {/* Property and Score Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">
                              Property
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">
                                  {displayData.data.propertyName || "Unknown Property"}
                                </p>
                                {displayData.data.propertyAddress && (
                                  <p className="text-sm text-muted-foreground">
                                    {displayData.data.propertyAddress}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">
                              Overall Score
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-3xl font-bold ${getScoreColor(displayData.data.overallScore)}`}
                                data-testid="text-extracted-score"
                              >
                                {displayData.data.overallScore}%
                              </span>
                              <Progress
                                value={displayData.data.overallScore}
                                className="flex-1"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">
                              Items Checked
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                              <span className="text-2xl font-bold">
                                {displayData.data.itemsChecked || 0}
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-muted-foreground">
                              Issues Found
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <span className="text-2xl font-bold text-orange-600">
                                {displayData.data.issuesFound || 0}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Issues List */}
                      {displayData.data.issues && displayData.data.issues.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Issues Detected</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {displayData.data.issues.map((issue: any, index: number) => (
                                <div
                                  key={index}
                                  className="p-3 border rounded-lg"
                                  data-testid={`issue-item-${index}`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <p className="font-medium">{issue.description}</p>
                                      {issue.location && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          Location: {issue.location}
                                        </p>
                                      )}
                                    </div>
                                    <Badge variant={getSeverityVariant(issue.severity || "minor")}>
                                      {issue.severity || "minor"}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={handleClearFile}
                          data-testid="button-upload-another"
                        >
                          Upload Another PDF
                        </Button>
                        <Button
                          onClick={() => {
                            setActiveTab("reports");
                          }}
                          data-testid="button-view-all-reports"
                        >
                          View All Reports
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings Tab */}
        <TabsContent value="notification-settings" className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-2xl font-bold">Notification Settings</h2>
              <p className="text-muted-foreground">
                Configure automatic email notifications for inspection alerts
              </p>
            </div>
            <Button
              onClick={() => {
                setEditingNotification(null);
                setNotificationForm({
                  propertyId: "all",
                  scoreThreshold: 75,
                  enabled: true,
                  recipientEmails: "",
                  ccEmails: "",
                });
                setShowNotificationDialog(true);
              }}
              data-testid="button-add-notification"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Notification
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {notificationSettingsLoading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : notificationSettings.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No notification settings configured</p>
                  <p className="text-sm mt-1">
                    Add a notification to get alerted when inspection scores fall below thresholds
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Threshold</TableHead>
                      <TableHead>Recipients</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationSettings.map((setting: any) => {
                      const property = properties.find((p: Property) => p.id === setting.propertyId);
                      return (
                        <TableRow key={setting.id} data-testid={`row-notification-${setting.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium" data-testid={`text-notification-property-${setting.id}`}>
                                {property?.name || "All Properties"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                              <span data-testid={`text-notification-threshold-${setting.id}`}>Score &lt; {setting.scoreThreshold}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm" data-testid={`text-notification-recipients-${setting.id}`}>
                                {setting.recipientEmails?.length || 0} recipient(s)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={setting.enabled}
                              onCheckedChange={(checked) => {
                                updateNotificationMutation.mutate({
                                  id: setting.id,
                                  data: { enabled: checked },
                                });
                              }}
                              data-testid="toggle-notification-active"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingNotification(setting);
                                  setNotificationForm({
                                    propertyId: setting.propertyId || "all",
                                    scoreThreshold: setting.scoreThreshold,
                                    enabled: setting.enabled,
                                    recipientEmails: (setting.recipientEmails || []).join(", "),
                                    ccEmails: (setting.ccEmails || []).join(", "),
                                  });
                                  setShowNotificationDialog(true);
                                }}
                                data-testid={`button-edit-${setting.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this notification setting?")) {
                                    deleteNotificationMutation.mutate(setting.id);
                                  }
                                }}
                                data-testid={`button-delete-${setting.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Add/Edit Notification Dialog */}
          <Dialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
            <DialogContent data-testid="dialog-notification-setting">
              <DialogHeader>
                <DialogTitle>
                  {editingNotification ? "Edit Notification Setting" : "Add Notification Setting"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Property (Optional)</Label>
                  <Select
                    value={notificationForm.propertyId}
                    onValueChange={(value) =>
                      setNotificationForm({ ...notificationForm, propertyId: value })
                    }
                  >
                    <SelectTrigger data-testid="select-notification-property">
                      <SelectValue placeholder="All Properties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {properties.map((property: Property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Leave empty to apply to all properties
                  </p>
                </div>

                <div>
                  <Label>Score Threshold</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[notificationForm.scoreThreshold]}
                      onValueChange={(value) =>
                        setNotificationForm({ ...notificationForm, scoreThreshold: value[0] })
                      }
                      min={0}
                      max={100}
                      step={5}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={notificationForm.scoreThreshold}
                      onChange={(e) =>
                        setNotificationForm({
                          ...notificationForm,
                          scoreThreshold: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20"
                      data-testid="input-threshold-value"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Notify when inspection score falls below this value
                  </p>
                </div>

                <div>
                  <Label>Client Email Address(es)</Label>
                  <Input
                    type="text"
                    value={notificationForm.recipientEmails}
                    onChange={(e) =>
                      setNotificationForm({ ...notificationForm, recipientEmails: e.target.value })
                    }
                    placeholder="email@example.com, another@example.com"
                    data-testid="input-client-email"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Separate multiple emails with commas
                  </p>
                </div>

                <div>
                  <Label>CC Email Address(es) (Optional)</Label>
                  <Input
                    type="text"
                    value={notificationForm.ccEmails}
                    onChange={(e) =>
                      setNotificationForm({ ...notificationForm, ccEmails: e.target.value })
                    }
                    placeholder="manager@example.com"
                    data-testid="input-cc-email"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Additional recipients to be CC'd
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={notificationForm.enabled}
                    onCheckedChange={(checked) =>
                      setNotificationForm({ ...notificationForm, enabled: checked })
                    }
                    data-testid="toggle-notification-enabled"
                  />
                  <Label>Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowNotificationDialog(false);
                    setEditingNotification(null);
                  }}
                  data-testid="button-cancel-notification"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const recipientEmailsArray = notificationForm.recipientEmails
                      .split(",")
                      .map((email) => email.trim())
                      .filter((email) => email.length > 0);

                    const ccEmailsArray = notificationForm.ccEmails
                      .split(",")
                      .map((email) => email.trim())
                      .filter((email) => email.length > 0);

                    const data = {
                      propertyId: notificationForm.propertyId === "all" ? null : notificationForm.propertyId,
                      scoreThreshold: notificationForm.scoreThreshold,
                      enabled: notificationForm.enabled,
                      recipientEmails: recipientEmailsArray,
                      ccEmails: ccEmailsArray,
                    };

                    if (editingNotification) {
                      updateNotificationMutation.mutate({
                        id: editingNotification.id,
                        data,
                      });
                    } else {
                      createNotificationMutation.mutate(data);
                    }
                  }}
                  disabled={!notificationForm.recipientEmails.trim()}
                  data-testid="button-save-notification"
                >
                  {editingNotification ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* RentCheck Inspections Tab */}
        <TabsContent value="rentcheck-inspections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload New Inspection Report
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload a RentCheck PDF inspection report to automatically extract data and link to the last cleaner
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleRentCheckFileSelect}
                  className="hidden"
                  id="rentcheck-pdf-upload"
                  data-testid="input-rentcheck-pdf-file"
                />
                <label htmlFor="rentcheck-pdf-upload">
                  <Button variant="outline" asChild>
                    <span data-testid="button-select-rentcheck-pdf">
                      <FileText className="w-4 h-4 mr-2" />
                      Select PDF File
                    </span>
                  </Button>
                </label>
                
                {rentCheckSelectedFile && (
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{rentCheckSelectedFile.name}</span>
                    <Button
                      onClick={handleRentCheckUpload}
                      disabled={rentCheckUploading}
                      data-testid="button-upload-rentcheck-pdf"
                    >
                      {rentCheckUploading ? "Processing..." : "Upload & Process"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Recent Inspections</h2>
            
            {rentCheckInspectionsLoading ? (
              <Card>
                <CardContent className="p-8">
                  <p className="text-center text-muted-foreground">Loading inspections...</p>
                </CardContent>
              </Card>
            ) : !rentCheckInspections || rentCheckInspections.length === 0 ? (
              <Card>
                <CardContent className="p-8">
                  <p className="text-center text-muted-foreground">No inspections yet. Upload your first report above!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rentCheckInspections.map((inspection: any) => (
                  <a key={inspection.id} href={`/rentcheck-inspections/${inspection.id}`}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`card-rentcheck-inspection-${inspection.id}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{inspection.propertyAddress}</h3>
                              {getRentCheckScoreBadge(inspection.overallGoodPercentage)}
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {format(new Date(inspection.inspectionDate), 'MMM dd, yyyy')}
                              </div>
                              
                              {inspection.totalIssuesCount > 0 && (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertCircle className="w-4 h-4" />
                                  {inspection.totalIssuesCount} issue{inspection.totalIssuesCount !== 1 ? 's' : ''}
                                </div>
                              )}
                              
                              {inspection.totalIssuesCount === 0 && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                  No issues
                                </div>
                              )}
                            </div>

                            {inspection.lastCleanerName && (
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Last cleaned by:</span>
                                <span className="font-medium">{inspection.lastCleanerName}</span>
                                {inspection.daysSinceLastCleaning !== null && (
                                  <Badge variant="outline">
                                    {inspection.daysSinceLastCleaning} days ago
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="text-3xl font-bold">
                              {Math.round(inspection.overallGoodPercentage)}%
                            </div>
                            <div className={`w-32 h-2 rounded-full overflow-hidden bg-muted`}>
                              <div 
                                className={`h-full ${getRentCheckScoreColor(inspection.overallGoodPercentage)}`}
                                style={{ width: `${inspection.overallGoodPercentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* View Report Dialog */}
      {selectedReport && (
        <ViewReportDialog
          report={selectedReport}
          property={properties.find((p: Property) => p.id === selectedReport.propertyId)}
          inspector={staff.find((s: Staff) => s.id === selectedReport.inspectorId)}
          cleaner={selectedReport.assignedCleanerId 
            ? staff.find((s: Staff) => s.id === selectedReport.assignedCleanerId)
            : undefined
          }
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}

// New Inspection Form Component
function NewInspectionForm({
  templates,
  properties,
  staff,
  onSubmit,
  onCancel,
}: {
  templates: InspectionTemplate[];
  properties: Property[];
  staff: Staff[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    propertyId: "",
    templateId: "",
    inspectorId: "",
    notes: "",
  });

  const handleSubmit = () => {
    if (!formData.propertyId || !formData.templateId || !formData.inspectorId) {
      return;
    }
    onSubmit({
      ...formData,
      status: "in_progress",
      date: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="property">Property</Label>
        <Select
          value={formData.propertyId}
          onValueChange={(value) => setFormData({ ...formData, propertyId: value })}
        >
          <SelectTrigger data-testid="select-property">
            <SelectValue placeholder="Select a property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property: Property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="template">Inspection Template</Label>
        <Select
          value={formData.templateId}
          onValueChange={(value) => setFormData({ ...formData, templateId: value })}
        >
          <SelectTrigger data-testid="select-template">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template: InspectionTemplate) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name} ({template.category})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="inspector">Inspector</Label>
        <Select
          value={formData.inspectorId}
          onValueChange={(value) => setFormData({ ...formData, inspectorId: value })}
        >
          <SelectTrigger data-testid="select-inspector">
            <SelectValue placeholder="Select an inspector" />
          </SelectTrigger>
          <SelectContent>
            {staff.map((person: Staff) => (
              <SelectItem key={person.id} value={person.id}>
                {person.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="notes">Initial Notes (Optional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any initial observations or notes..."
          data-testid="textarea-notes"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!formData.propertyId || !formData.templateId || !formData.inspectorId}
          data-testid="button-start-inspection"
        >
          Start Inspection
        </Button>
      </DialogFooter>
    </div>
  );
}

// View Report Dialog Component
function ViewReportDialog({
  report,
  property,
  inspector,
  cleaner,
  onClose,
}: {
  report: any;
  property?: Property;
  inspector?: Staff;
  cleaner?: Staff;
  onClose: () => void;
}) {
  const { data: fullReport, isLoading } = useQuery<any>({
    queryKey: [`/api/inspections/reports/${report.id}`],
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inspection Report</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Report Header */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Property</Label>
                <p className="font-medium">{property?.name || "Unknown"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Inspector</Label>
                <p className="font-medium">{inspector?.fullName || "Unknown"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Assigned Cleaner</Label>
                <p className="font-medium">
                  {cleaner ? cleaner.fullName : <span className="text-muted-foreground">Not assigned</span>}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Date</Label>
                <p className="font-medium">
                  {format(new Date(report.date), "MMMM dd, yyyy")}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge variant={report.status === "completed" ? "default" : "secondary"}>
                  {report.status}
                </Badge>
              </div>
            </div>

            {/* Overall Score */}
            {report.overallScore && (
              <Card>
                <CardHeader>
                  <CardTitle>Overall Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <span className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`}>
                      {report.overallScore}%
                    </span>
                    <Progress value={report.overallScore} className="flex-1" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Checklist Items */}
            {fullReport?.items && fullReport.items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Inspection Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fullReport.items.map((item: any) => (
                      <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        {item.passed !== null && (
                          item.passed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          )
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.itemDescription}</p>
                          <p className="text-sm text-muted-foreground">{item.itemCategory}</p>
                          {item.rating && (
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= item.rating
                                      ? "fill-yellow-500 text-yellow-500"
                                      : "text-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-sm mt-2">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Issues */}
            {fullReport?.issues && fullReport.issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Issues Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fullReport.issues.map((issue: any) => (
                      <div key={issue.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{issue.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={getSeverityVariant(issue.severity)}>
                                {issue.severity}
                              </Badge>
                              {issue.resolved && (
                                <Badge variant="outline" className="text-green-600">
                                  Resolved
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {report.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{report.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}