import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, Send, Edit, TrendingUp, TrendingDown, Users, DollarSign, Loader2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function WageReportsPage() {
  const { toast } = useToast();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMonth, setNewMonth] = useState<number>(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState<number>(new Date().getFullYear());
  const [editCleanerDialogOpen, setEditCleanerDialogOpen] = useState(false);
  const [editingCleaner, setEditingCleaner] = useState<any>(null);
  const [confirmSendAllOpen, setConfirmSendAllOpen] = useState(false);
  const properlyFileRef = useRef<HTMLInputElement>(null);
  const connectFileRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: periods = [], isLoading: periodsLoading } = useQuery({
    queryKey: ['/api/wages/periods'],
  });

  const { data: periodData, isLoading: periodDataLoading, refetch: refetchPeriod } = useQuery({
    queryKey: ['/api/wages/periods', selectedPeriodId],
    enabled: !!selectedPeriodId,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/wages/analytics', selectedPeriodId],
    queryFn: async () => {
      if (!selectedPeriodId) return null;
      const response = await fetch(`/api/wages/analytics?wagePeriodId=${selectedPeriodId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    enabled: !!selectedPeriodId,
  });

  // Mutations
  const createPeriodMutation = useMutation({
    mutationFn: async (data: { month: number; year: number }) => {
      return apiRequest('/api/wages/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/wages/periods'] });
      setSelectedPeriodId(data.id);
      setCreateDialogOpen(false);
      toast({ title: "Period Created", description: `${MONTHS[data.month - 1].label} ${data.year} wage period created.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create wage period", variant: "destructive" });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, reportType }: { file: File; reportType: 'properly' | 'connect' }) => {
      // First check for duplicates
      const checkFormData = new FormData();
      checkFormData.append('file', file);
      checkFormData.append('wagePeriodId', selectedPeriodId || '');
      
      const checkResponse = await fetch('/api/wage-reports/check-duplicate', {
        method: 'POST',
        credentials: 'include',
        body: checkFormData,
      });
      
      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        throw new Error(errorData.message || 'Duplicate check failed');
      }
      
      const checkResult = await checkResponse.json();
      
      if (checkResult.isDuplicate) {
        throw new Error(checkResult.message || 'This file has already been uploaded for this period');
      }
      
      // If not a duplicate, proceed with upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('reportType', reportType);
      
      const response = await fetch(`/api/wages/periods/${selectedPeriodId}/reports/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wages/periods', selectedPeriodId] });
      toast({ title: "File Uploaded", description: "Document uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Upload Failed", 
        description: error.message || "Failed to upload file", 
        variant: "destructive" 
      });
    },
  });

  const extractDataMutation = useMutation({
    mutationFn: async (reportId: string) => {
      return apiRequest(`/api/wages/periods/${selectedPeriodId}/reports/${reportId}/extract`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wages/periods', selectedPeriodId] });
      queryClient.invalidateQueries({ queryKey: ['/api/wages/analytics'] });
      toast({ title: "Data Extracted", description: "Wage data extracted and processed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to extract data", variant: "destructive" });
    },
  });

  const approvePeriodMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/wages/periods/${selectedPeriodId}/approve`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wages/periods', selectedPeriodId] });
      queryClient.invalidateQueries({ queryKey: ['/api/wages/periods'] });
      toast({ title: "Approved", description: "Wage period verified and approved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve period", variant: "destructive" });
    },
  });

  const updateCleanerMutation = useMutation({
    mutationFn: async (data: { cleanerId: string; updates: any }) => {
      return apiRequest(`/api/wages/periods/${selectedPeriodId}/cleaners/${data.cleanerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wages/periods', selectedPeriodId] });
      queryClient.invalidateQueries({ queryKey: ['/api/wages/analytics'] });
      setEditCleanerDialogOpen(false);
      toast({ title: "Updated", description: "Cleaner wage updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update cleaner wage", variant: "destructive" });
    },
  });

  const sendSingleSMSMutation = useMutation({
    mutationFn: async (cleanerId: string) => {
      return apiRequest(`/api/wages/periods/${selectedPeriodId}/cleaners/${cleanerId}/send-sms`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wages/periods', selectedPeriodId] });
      toast({ title: "SMS Sent", description: "Wage notification sent successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send SMS", variant: "destructive" });
    },
  });

  const sendAllSMSMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/wages/periods/${selectedPeriodId}/send-sms`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wages/periods', selectedPeriodId] });
      queryClient.invalidateQueries({ queryKey: ['/api/wages/periods'] });
      setConfirmSendAllOpen(false);
      toast({ title: "All SMS Sent", description: "Wage notifications sent to all cleaners" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send SMS notifications", variant: "destructive" });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, reportType: 'properly' | 'connect') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!selectedPeriodId) {
      toast({ title: "Error", description: "Please select a wage period first", variant: "destructive" });
      return;
    }

    uploadFileMutation.mutate({ file, reportType });
    if (e.target) e.target.value = '';
  };

  const handleEditCleaner = (cleaner: any) => {
    setEditingCleaner({
      ...cleaner,
      fixedCleaningEarnings: parseFloat(cleaner.fixedCleaningEarnings),
      hourlyEarnings: parseFloat(cleaner.hourlyEarnings),
    });
    setEditCleanerDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingCleaner) return;
    updateCleanerMutation.mutate({
      cleanerId: editingCleaner.id,
      updates: {
        fixedCleaningEarnings: editingCleaner.fixedCleaningEarnings.toFixed(2),
        hourlyEarnings: editingCleaner.hourlyEarnings.toFixed(2),
        cleanerPhone: editingCleaner.cleanerPhone,
      },
    });
  };

  const selectedPeriod = periods.find((p: any) => p.id === selectedPeriodId);
  const cleaners = periodData?.cleaners || [];
  const reports = periodData?.reports || [];
  const properlyReports = reports.filter((r: any) => r.reportType === 'properly');
  const connectReports = reports.filter((r: any) => r.reportType === 'connect');

  const analytics = analyticsData || {
    totalWageBill: 0,
    totalCleaners: 0,
    averageEarnings: 0,
    highestEarner: null,
    lowestEarner: null,
    fixedCleaningTotal: 0,
    hourlyWorkTotal: 0,
    smsStats: { sent: 0, pending: 0, failed: 0 },
    comparison: [],
  };

  // Chart data
  const topEarnersData = cleaners
    .slice(0, 10)
    .map((c: any) => ({
      name: c.cleanerName,
      total: parseFloat(c.totalEarnings),
    }));

  const trendData = analytics.comparison?.slice().reverse().map((c: any) => ({
    month: `${MONTHS[c.month - 1]?.label.slice(0, 3)} ${c.year}`,
    amount: c.totalWageBill,
  })) || [];

  const splitData = [
    { name: 'Fixed Cleaning', value: analytics.fixedCleaningTotal },
    { name: 'Hourly Work', value: analytics.hourlyWorkTotal },
  ];

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-wage-reports">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Wage Period Management</span>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              size="sm"
              data-testid="button-create-period"
            >
              Create New Period
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Label>Select Wage Period</Label>
              <Select value={selectedPeriodId || ""} onValueChange={setSelectedPeriodId}>
                <SelectTrigger data-testid="select-period">
                  <SelectValue placeholder="Choose a period..." />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period: any) => (
                    <SelectItem key={period.id} value={period.id} data-testid={`option-period-${period.id}`}>
                      {MONTHS[period.month - 1]?.label} {period.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPeriod && (
              <>
                <div className="flex items-center gap-2">
                  <Label>Status:</Label>
                  <Badge
                    variant={selectedPeriod.status === 'sent' ? 'default' : selectedPeriod.status === 'verified' ? 'secondary' : 'outline'}
                    data-testid="badge-period-status"
                  >
                    {selectedPeriod.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Total:</Label>
                  <span className="text-lg font-bold text-green-600" data-testid="text-total-amount">
                    £{parseFloat(selectedPeriod.totalAmount || '0').toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {selectedPeriod.status === 'draft' && cleaners.length > 0 && (
                  <Button
                    onClick={() => approvePeriodMutation.mutate()}
                    disabled={approvePeriodMutation.isPending}
                    data-testid="button-approve-period"
                  >
                    {approvePeriodMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify & Approve
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedPeriodId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Document Upload</CardTitle>
              <CardDescription>Upload Properly (fixed-price) and Connect (hourly) reports</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="properly">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="properly" data-testid="tab-properly">Properly Reports (Fixed-Price)</TabsTrigger>
                  <TabsTrigger value="connect" data-testid="tab-connect">Connect Reports (Hourly)</TabsTrigger>
                </TabsList>

                <TabsContent value="properly" className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      ref={properlyFileRef}
                      type="file"
                      accept=".csv,.pdf,.xlsx,.xls"
                      onChange={(e) => handleFileUpload(e, 'properly')}
                      className="hidden"
                      data-testid="input-file-properly"
                    />
                    <Button
                      onClick={() => properlyFileRef.current?.click()}
                      disabled={uploadFileMutation.isPending}
                      data-testid="button-upload-properly"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Properly Report
                    </Button>
                  </div>

                  {properlyReports.length > 0 && (
                    <div className="space-y-2">
                      <Label>Uploaded Reports</Label>
                      {properlyReports.map((report: any) => (
                        <Card key={report.id} data-testid={`card-report-${report.id}`}>
                          <CardContent className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium" data-testid={`text-filename-${report.id}`}>{report.fileName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(report.uploadDate), 'PPp')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={report.status === 'processed' ? 'default' : 'outline'}>
                                {report.status}
                              </Badge>
                              {report.status === 'pending' && (
                                <Button
                                  onClick={() => extractDataMutation.mutate(report.id)}
                                  disabled={extractDataMutation.isPending}
                                  size="sm"
                                  data-testid={`button-extract-${report.id}`}
                                >
                                  {extractDataMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Extract Data
                                </Button>
                              )}
                              {report.status === 'processed' && (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="connect" className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      ref={connectFileRef}
                      type="file"
                      accept=".csv,.pdf,.xlsx,.xls"
                      onChange={(e) => handleFileUpload(e, 'connect')}
                      className="hidden"
                      data-testid="input-file-connect"
                    />
                    <Button
                      onClick={() => connectFileRef.current?.click()}
                      disabled={uploadFileMutation.isPending}
                      data-testid="button-upload-connect"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Connect Report
                    </Button>
                  </div>

                  {connectReports.length > 0 && (
                    <div className="space-y-2">
                      <Label>Uploaded Reports</Label>
                      {connectReports.map((report: any) => (
                        <Card key={report.id} data-testid={`card-report-${report.id}`}>
                          <CardContent className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium" data-testid={`text-filename-${report.id}`}>{report.fileName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(report.uploadDate), 'PPp')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={report.status === 'processed' ? 'default' : 'outline'}>
                                {report.status}
                              </Badge>
                              {report.status === 'pending' && (
                                <Button
                                  onClick={() => extractDataMutation.mutate(report.id)}
                                  disabled={extractDataMutation.isPending}
                                  size="sm"
                                  data-testid={`button-extract-${report.id}`}
                                >
                                  {extractDataMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Extract Data
                                </Button>
                              )}
                              {report.status === 'processed' && (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {cleaners.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                    <span>Cleaner Wage Breakdown</span>
                    {selectedPeriod?.status !== 'draft' && (
                      <Button
                        onClick={() => setConfirmSendAllOpen(true)}
                        disabled={sendAllSMSMutation.isPending}
                        data-testid="button-send-all-sms"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send All SMS
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cleaner Name</TableHead>
                          <TableHead>Fixed Cleaning</TableHead>
                          <TableHead>Hourly Work</TableHead>
                          <TableHead>Total Earnings</TableHead>
                          <TableHead>SMS Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cleaners.map((cleaner: any) => (
                          <TableRow key={cleaner.id} data-testid={`row-cleaner-${cleaner.id}`}>
                            <TableCell className="font-medium" data-testid={`text-name-${cleaner.id}`}>
                              {cleaner.cleanerName}
                            </TableCell>
                            <TableCell data-testid={`text-fixed-${cleaner.id}`}>
                              £{parseFloat(cleaner.fixedCleaningEarnings).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                              <span className="text-muted-foreground text-sm ml-1">
                                ({cleaner.fixedCleaningJobs} jobs)
                              </span>
                            </TableCell>
                            <TableCell data-testid={`text-hourly-${cleaner.id}`}>
                              £{parseFloat(cleaner.hourlyEarnings).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                              <span className="text-muted-foreground text-sm ml-1">
                                ({cleaner.hourlyHours}h)
                              </span>
                            </TableCell>
                            <TableCell className="font-bold text-green-600" data-testid={`text-total-${cleaner.id}`}>
                              £{parseFloat(cleaner.totalEarnings).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  cleaner.smsStatus === 'sent' ? 'default' :
                                  cleaner.smsStatus === 'failed' ? 'destructive' :
                                  'outline'
                                }
                                data-testid={`badge-sms-${cleaner.id}`}
                              >
                                {cleaner.smsStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditCleaner(cleaner)}
                                  data-testid={`button-edit-${cleaner.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {cleaner.cleanerPhone && cleaner.smsStatus !== 'sent' && selectedPeriod?.status !== 'draft' && (
                                  <Button
                                    size="sm"
                                    onClick={() => sendSingleSMSMutation.mutate(cleaner.id)}
                                    disabled={sendSingleSMSMutation.isPending}
                                    data-testid={`button-send-sms-${cleaner.id}`}
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
                    <CardTitle className="text-sm font-medium">Total Wage Bill</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="text-analytics-total">
                      £{analytics.totalWageBill.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </div>
                    {analytics.comparison.length > 1 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        {analytics.comparison[0].changePercent > 0 ? (
                          <><TrendingUp className="h-3 w-3 text-green-600" />+{analytics.comparison[0].changePercent.toFixed(1)}%</>
                        ) : analytics.comparison[0].changePercent < 0 ? (
                          <><TrendingDown className="h-3 w-3 text-red-600" />{analytics.comparison[0].changePercent.toFixed(1)}%</>
                        ) : (
                          <>No change</>
                        )}
                        {' '}vs last month
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
                    <CardTitle className="text-sm font-medium">Average Earnings</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-analytics-average">
                      £{analytics.averageEarnings.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">per cleaner</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
                    <CardTitle className="text-sm font-medium">Total Cleaners</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-analytics-cleaners">
                      {analytics.totalCleaners}
                    </div>
                    <p className="text-xs text-muted-foreground">paid this period</p>
                  </CardContent>
                </Card>

                {analytics.highestEarner && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
                      <CardTitle className="text-sm font-medium">Highest Earner</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold" data-testid="text-analytics-highest-name">
                        {analytics.highestEarner.name}
                      </div>
                      <p className="text-sm text-green-600" data-testid="text-analytics-highest-amount">
                        £{analytics.highestEarner.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {analytics.lowestEarner && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
                      <CardTitle className="text-sm font-medium">Lowest Earner</CardTitle>
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-bold" data-testid="text-analytics-lowest-name">
                        {analytics.lowestEarner.name}
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid="text-analytics-lowest-amount">
                        £{analytics.lowestEarner.amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-1">
                    <CardTitle className="text-sm font-medium">SMS Status</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="default">{analytics.smsStats.sent} Sent</Badge>
                      <Badge variant="outline">{analytics.smsStats.pending} Pending</Badge>
                      {analytics.smsStats.failed > 0 && (
                        <Badge variant="destructive">{analytics.smsStats.failed} Failed</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {topEarnersData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Top 10 Earners</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={topEarnersData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `£${value.toFixed(2)}`} />
                          <Bar dataKey="total" fill="hsl(var(--chart-1))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {trendData.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Wage Bill Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: any) => `£${value.toFixed(2)}`} />
                          <Line type="monotone" dataKey="amount" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {analytics.fixedCleaningTotal > 0 && analytics.hourlyWorkTotal > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Fixed vs Hourly Split</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={splitData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.name}: £${entry.value.toFixed(2)}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {splitData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => `£${value.toFixed(2)}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>

              {analytics.comparison && analytics.comparison.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Month-over-Month Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead>Total Wage Bill</TableHead>
                            <TableHead>Total Cleaners</TableHead>
                            <TableHead>Average Earnings</TableHead>
                            <TableHead>Change %</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.comparison.map((c: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {MONTHS[c.month - 1]?.label} {c.year}
                              </TableCell>
                              <TableCell>
                                £{c.totalWageBill.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>{c.totalCleaners}</TableCell>
                              <TableCell>
                                £{c.averageEarnings.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                {idx > 0 && (
                                  <span className={c.changePercent > 0 ? 'text-green-600' : c.changePercent < 0 ? 'text-red-600' : ''}>
                                    {c.changePercent > 0 ? '+' : ''}{c.changePercent.toFixed(1)}%
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent data-testid="dialog-create-period">
          <DialogHeader>
            <DialogTitle>Create New Wage Period</DialogTitle>
            <DialogDescription>Create a new monthly wage period for processing</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="month">Month</Label>
              <Select value={newMonth.toString()} onValueChange={(v) => setNewMonth(parseInt(v))}>
                <SelectTrigger data-testid="select-new-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(parseInt(e.target.value))}
                data-testid="input-new-year"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button
              onClick={() => createPeriodMutation.mutate({ month: newMonth, year: newYear })}
              disabled={createPeriodMutation.isPending}
              data-testid="button-confirm-create"
            >
              {createPeriodMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editCleanerDialogOpen} onOpenChange={setEditCleanerDialogOpen}>
        <DialogContent data-testid="dialog-edit-cleaner">
          <DialogHeader>
            <DialogTitle>Edit Cleaner Wage</DialogTitle>
            <DialogDescription>Manually adjust cleaner wage amounts and phone number</DialogDescription>
          </DialogHeader>
          {editingCleaner && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Cleaner Name</Label>
                <Input value={editingCleaner.cleanerName} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={editingCleaner.cleanerPhone}
                  onChange={(e) => setEditingCleaner({ ...editingCleaner, cleanerPhone: e.target.value })}
                  data-testid="input-edit-phone"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fixed">Fixed Cleaning Earnings (£)</Label>
                <Input
                  id="fixed"
                  type="number"
                  step="0.01"
                  value={editingCleaner.fixedCleaningEarnings}
                  onChange={(e) => setEditingCleaner({ ...editingCleaner, fixedCleaningEarnings: parseFloat(e.target.value) })}
                  data-testid="input-edit-fixed"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hourly">Hourly Earnings (£)</Label>
                <Input
                  id="hourly"
                  type="number"
                  step="0.01"
                  value={editingCleaner.hourlyEarnings}
                  onChange={(e) => setEditingCleaner({ ...editingCleaner, hourlyEarnings: parseFloat(e.target.value) })}
                  data-testid="input-edit-hourly"
                />
              </div>
              <div className="grid gap-2">
                <Label>Total Earnings</Label>
                <Input
                  value={`£${(editingCleaner.fixedCleaningEarnings + editingCleaner.hourlyEarnings).toFixed(2)}`}
                  disabled
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCleanerDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateCleanerMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateCleanerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmSendAllOpen} onOpenChange={setConfirmSendAllOpen}>
        <DialogContent data-testid="dialog-confirm-send-all">
          <DialogHeader>
            <DialogTitle>Send All SMS Notifications?</DialogTitle>
            <DialogDescription>
              This will send wage notifications to all cleaners with phone numbers. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmSendAllOpen(false)} data-testid="button-cancel-send-all">
              Cancel
            </Button>
            <Button
              onClick={() => sendAllSMSMutation.mutate()}
              disabled={sendAllSMSMutation.isPending}
              data-testid="button-confirm-send-all"
            >
              {sendAllSMSMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
