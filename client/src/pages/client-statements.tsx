import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, FileText, Download, Send, Eye, Trash2, AlertCircle, ChevronDown, ChevronUp, Filter, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { InstructionPanel } from "@/components/instruction-panel";
import { clientStatementsInstructions } from "@/lib/page-instructions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";

const uploadStatementSchema = z.object({
  landlordId: z.coerce.number().min(1, "Please select a landlord"),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
  totalIncome: z.coerce.number().optional().nullable(),
  totalExpenses: z.coerce.number().optional().nullable(),
  netAmount: z.coerce.number().optional().nullable(),
  file: z.any().refine((files) => files?.length > 0, "File is required"),
});

type UploadStatementFormValues = z.infer<typeof uploadStatementSchema>;

interface Landlord {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  statementDay: number | null;
}

interface MonthlyStatement {
  id: number;
  landlordId: number;
  month: number;
  year: number;
  fileName: string;
  filePath: string;
  totalIncome: string | null;
  totalExpenses: string | null;
  netAmount: string | null;
  status: string;
  sentDate: string | null;
  notes: string | null;
  createdAt: string;
}

interface MaintenanceRequest {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  estimatedCost: number | null;
  actualCost: number | null;
  status: string;
  priority: string;
  reportedDate: string;
  property?: {
    name: string;
  };
}

interface MaintenanceVerification {
  [requestId: string]: boolean; // Track which maintenance items are verified as charged
}

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

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

export default function ClientStatements() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<MonthlyStatement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState<MonthlyStatement | null>(null);
  const [maintenanceVerified, setMaintenanceVerified] = useState<MaintenanceVerification>({});
  
  // Filters
  const [filterLandlord, setFilterLandlord] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Fetch landlords
  const { data: landlords = [] } = useQuery<Landlord[]>({
    queryKey: ["/api/landlords"],
  });

  // Fetch statements
  const { data: statements = [], isLoading: statementsLoading } = useQuery<MonthlyStatement[]>({
    queryKey: ["/api/statements"],
  });

  // Fetch maintenance for reconciliation with custom queryFn
  const { 
    data: maintenanceRequests = [], 
    isLoading: maintenanceLoading,
    isError: maintenanceError,
    error: maintenanceFetchError 
  } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/landlords", selectedStatement?.landlordId, "maintenance", selectedStatement?.month, selectedStatement?.year],
    queryFn: async () => {
      if (!selectedStatement) return [];
      
      const statementDate = new Date(selectedStatement.year, selectedStatement.month - 1, 1);
      const startDate = format(startOfMonth(statementDate), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(statementDate), 'yyyy-MM-dd');
      
      const url = `/api/landlords/${selectedStatement.landlordId}/maintenance?startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(url, { credentials: "include" });
      
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      
      return res.json();
    },
    enabled: !!selectedStatement && reconciliationOpen,
    retry: 1, // Only retry once to fail faster on persistent errors
  });

  const form = useForm<UploadStatementFormValues>({
    resolver: zodResolver(uploadStatementSchema),
    defaultValues: {
      landlordId: 0,
      month: new Date().getMonth() + 1,
      year: currentYear,
      totalIncome: null,
      totalExpenses: null,
      netAmount: null,
    },
  });

  // Upload statement mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/statements/upload', {
        method: 'POST',
        body: data,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      toast({
        title: "Success",
        description: "Statement uploaded successfully",
      });
      form.reset();
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload statement",
        variant: "destructive",
      });
    },
  });

  // Delete statement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/statements/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      toast({
        title: "Success",
        description: "Statement deleted successfully",
      });
      setDeleteDialogOpen(false);
      setStatementToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete statement",
        variant: "destructive",
      });
    },
  });

  // Send statement mutation
  const sendMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/statements/${id}/send`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      toast({
        title: "Success",
        description: "Statement sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send statement",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      form.setValue("file", e.target.files);
    }
  };

  const handleSubmit = (data: UploadStatementFormValues) => {
    const formData = new FormData();
    formData.append("file", selectedFile!);
    formData.append("landlordId", data.landlordId.toString());
    formData.append("month", data.month.toString());
    formData.append("year", data.year.toString());
    if (data.totalIncome) formData.append("totalIncome", data.totalIncome.toString());
    if (data.totalExpenses) formData.append("totalExpenses", data.totalExpenses.toString());
    if (data.netAmount) formData.append("netAmount", data.netAmount.toString());
    
    uploadMutation.mutate(formData);
  };

  const handleDelete = (statement: MonthlyStatement) => {
    setStatementToDelete(statement);
    setDeleteDialogOpen(true);
  };

  const handleDownload = (filePath: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = `/${filePath}`;
    link.download = fileName;
    link.click();
  };

  const handleSend = async (id: number) => {
    // Find the statement
    const statement = statements.find(s => s.id === id);
    if (!statement) return;

    // Check if there's maintenance for this period that needs verification
    const statementDate = new Date(statement.year, statement.month - 1, 1);
    const startDate = format(startOfMonth(statementDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(statementDate), 'yyyy-MM-dd');
    
    try {
      const url = `/api/landlords/${statement.landlordId}/maintenance?startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(url, { credentials: "include" });
      
      if (!res.ok) {
        // Fail closed: cannot verify maintenance status, block send
        toast({
          title: "Unable to Verify Maintenance",
          description: "Could not check for maintenance items. Please try again or contact support if the issue persists.",
          variant: "destructive",
        });
        return;
      }
      
      const maintenance = await res.json();
      
      if (maintenance.length > 0) {
        // Maintenance found: block send and force verification
        toast({
          title: "Maintenance Verification Required",
          description: `This statement has ${maintenance.length} maintenance item(s). Please open Reconciliation and verify all items before sending.`,
          variant: "destructive",
        });
        
        // Auto-open reconciliation to make it easy for them
        setSelectedStatement(statement);
        setReconciliationOpen(true);
        setMaintenanceVerified({}); // Reset verification
        return;
      }
      
      // No maintenance found: safe to send
      sendMutation.mutate(id);
      
    } catch (error) {
      // Fail closed: network or parse error, block send
      console.error("Error checking maintenance:", error);
      toast({
        title: "Connection Error",
        description: "Unable to verify maintenance status. Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  const handleReconciliation = (statement: MonthlyStatement) => {
    setSelectedStatement(statement);
    setReconciliationOpen(true);
    setMaintenanceVerified({}); // Reset verification when opening new statement
  };

  const toggleMaintenanceVerification = (requestId: string) => {
    setMaintenanceVerified(prev => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-600" data-testid={`badge-status-sent`}>Sent</Badge>;
      case "failed":
        return <Badge variant="destructive" data-testid={`badge-status-failed`}>Failed</Badge>;
      default:
        return <Badge variant="secondary" data-testid={`badge-status-pending`}>Pending</Badge>;
    }
  };

  const getLandlordName = (landlordId: number) => {
    return landlords.find(l => l.id === landlordId)?.name || "Unknown";
  };

  // Filter statements
  const filteredStatements = statements.filter(stmt => {
    if (filterLandlord && filterLandlord !== "all" && stmt.landlordId !== parseInt(filterLandlord)) return false;
    if (filterMonth && filterMonth !== "all" && stmt.month !== parseInt(filterMonth)) return false;
    if (filterYear && filterYear !== "all" && stmt.year !== parseInt(filterYear)) return false;
    if (filterStatus && filterStatus !== "all" && stmt.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calculate maintenance reconciliation
  const totalMaintenanceCost = maintenanceRequests.reduce((sum, req) => {
    return sum + (req.actualCost || req.estimatedCost || 0);
  }, 0);

  // Group maintenance by property for better visibility
  const maintenanceByProperty = maintenanceRequests.reduce((acc, req) => {
    const propertyName = req.property?.name || "Unknown Property";
    if (!acc[propertyName]) {
      acc[propertyName] = {
        requests: [],
        totalCost: 0
      };
    }
    const cost = req.actualCost || req.estimatedCost || 0;
    acc[propertyName].requests.push(req);
    acc[propertyName].totalCost += cost;
    return acc;
  }, {} as Record<string, { requests: MaintenanceRequest[], totalCost: number }>);

  // Calculate if maintenance costs are properly accounted for in statement
  const statementExpenses = selectedStatement ? parseFloat(selectedStatement.totalExpenses || "0") : 0;
  const maintenanceNotCharged = totalMaintenanceCost > 0 && totalMaintenanceCost > statementExpenses;
  const unchargedAmount = Math.max(0, totalMaintenanceCost - statementExpenses);

  // Manual verification tracking
  const verifiedCount = Object.values(maintenanceVerified).filter(Boolean).length;
  const unverifiedCount = maintenanceRequests.length - verifiedCount;
  const allVerified = maintenanceRequests.length > 0 && verifiedCount === maintenanceRequests.length;

  const MAINTENANCE_THRESHOLD = 500; // Warning threshold for high maintenance costs

  return (
    <div className="flex-1 overflow-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-client-statements">Client Statements</h1>
            <p className="text-muted-foreground mt-1">
              Manage monthly financial statements for landlords
            </p>
          </div>
          <InstructionPanel {...clientStatementsInstructions} />
        </div>

        {/* Section A: Upload Statement */}
        <Card className="mb-6" data-testid="card-upload-statement">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Monthly Statement
            </CardTitle>
            <CardDescription>
              Upload financial statements for landlords (PDF, Excel, or CSV)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="landlordId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Landlord</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-landlord">
                              <SelectValue placeholder="Select landlord" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {landlords.map((landlord) => (
                              <SelectItem key={landlord.id} value={landlord.id.toString()}>
                                {landlord.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-month">
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {MONTHS.map((month) => (
                              <SelectItem key={month.value} value={month.value.toString()}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-year">
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {YEARS.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="file"
                    render={() => (
                      <FormItem>
                        <FormLabel>Statement File</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept=".pdf,.xlsx,.xls,.csv"
                            onChange={handleFileChange}
                            data-testid="input-file"
                          />
                        </FormControl>
                        <FormMessage />
                        {selectedFile && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Selected: {selectedFile.name}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalIncome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Income (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-total-income"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="totalExpenses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Expenses (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-total-expenses"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="netAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Net Amount (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-net-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={uploadMutation.isPending}
                  data-testid="button-upload-statement"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload Statement"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Section B: Statement List Table */}
        <Card data-testid="card-statement-list">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Statement History
            </CardTitle>
            <CardDescription>
              View and manage all uploaded statements
            </CardDescription>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
              <Select value={filterLandlord} onValueChange={setFilterLandlord}>
                <SelectTrigger data-testid="filter-landlord">
                  <SelectValue placeholder="All Landlords" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Landlords</SelectItem>
                  {landlords.map((landlord) => (
                    <SelectItem key={landlord.id} value={landlord.id.toString()}>
                      {landlord.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger data-testid="filter-month">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger data-testid="filter-year">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {statementsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading statements...</div>
            ) : filteredStatements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No statements found. Upload your first statement above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Landlord</TableHead>
                    <TableHead>Month/Year</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStatements.map((statement) => (
                    <TableRow key={statement.id} data-testid={`row-statement-${statement.id}`}>
                      <TableCell>{getLandlordName(statement.landlordId)}</TableCell>
                      <TableCell>
                        {MONTHS.find(m => m.value === statement.month)?.label} {statement.year}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleDownload(statement.filePath, statement.fileName)}
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid={`button-download-${statement.id}`}
                        >
                          <Download className="h-4 w-4" />
                          {statement.fileName}
                        </button>
                      </TableCell>
                      <TableCell>{getStatusBadge(statement.status)}</TableCell>
                      <TableCell>
                        {statement.sentDate
                          ? format(new Date(statement.sentDate), "MMM d, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {statement.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSend(statement.id)}
                              disabled={sendMutation.isPending}
                              data-testid={`button-send-${statement.id}`}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReconciliation(statement)}
                            data-testid={`button-reconcile-${statement.id}`}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Reconcile
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(statement)}
                            data-testid={`button-delete-${statement.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Section C: Maintenance Reconciliation */}
        {selectedStatement && reconciliationOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="mt-6" data-testid="card-maintenance-reconciliation">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Maintenance Cost Reconciliation
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReconciliationOpen(false)}
                    data-testid="button-close-reconciliation"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  {getLandlordName(selectedStatement.landlordId)} -{" "}
                  {MONTHS.find(m => m.value === selectedStatement.month)?.label} {selectedStatement.year}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {maintenanceLoading ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading maintenance records...
                  </div>
                ) : maintenanceError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Unable to Load Maintenance Records</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-3">
                        <p>
                          Failed to fetch maintenance data for this period. This prevents verification of maintenance costs.
                        </p>
                        <p className="text-sm">
                          Error: {maintenanceFetchError instanceof Error ? maintenanceFetchError.message : 'Unknown error'}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReconciliationOpen(false);
                            setTimeout(() => setReconciliationOpen(true), 100);
                          }}
                          data-testid="button-retry-maintenance"
                        >
                          Retry
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : maintenanceRequests.length === 0 ? (
                  <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-900 dark:text-green-100">No Maintenance Costs</AlertTitle>
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      No maintenance requests found for this period. Statement can be sent without reconciliation concerns.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <>
                    {/* Critical Warning: Unverified Maintenance */}
                    {unverifiedCount > 0 && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>⚠️ Manual Verification Required</AlertTitle>
                        <AlertDescription>
                          <div className="space-y-2 mt-2">
                            <p className="font-semibold">
                              {unverifiedCount} of {maintenanceRequests.length} maintenance {unverifiedCount === 1 ? 'item' : 'items'} not verified
                            </p>
                            <p className="text-sm">
                              <strong>IMPORTANT:</strong> Check each maintenance item below against the uploaded statement to confirm it's been charged back to the landlord.
                              Tick the checkbox for each item you've verified is included in the statement expenses.
                            </p>
                            {maintenanceNotCharged && (
                              <p className="text-sm border-t pt-2 mt-2">
                                <strong>Note:</strong> Total maintenance (£{totalMaintenanceCost.toFixed(2)}) exceeds statement expenses (£{statementExpenses.toFixed(2)}) by £{unchargedAmount.toFixed(2)}.
                                This may indicate missing charges.
                              </p>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Warning for High Maintenance Costs */}
                    {totalMaintenanceCost > MAINTENANCE_THRESHOLD && !maintenanceNotCharged && (
                      <Alert className="mb-4 border-yellow-600 bg-yellow-50 dark:bg-yellow-950">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <AlertTitle className="text-yellow-900 dark:text-yellow-100">High Maintenance Costs</AlertTitle>
                        <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                          Total maintenance costs (£{totalMaintenanceCost.toFixed(2)}) are significant for this period.
                          Please verify all costs are correctly charged in the statement.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Success Indicator: All Verified */}
                    {allVerified && (
                      <Alert className="mb-4 border-green-600 bg-green-50 dark:bg-green-950">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertTitle className="text-green-900 dark:text-green-100">All Maintenance Items Verified</AlertTitle>
                        <AlertDescription className="text-green-800 dark:text-green-200">
                          You've confirmed that all {maintenanceRequests.length} maintenance {maintenanceRequests.length === 1 ? 'item is' : 'items are'} charged back to the landlord.
                          {!maintenanceNotCharged && totalMaintenanceCost <= statementExpenses && (
                            <span> Statement expenses (£{statementExpenses.toFixed(2)}) cover all maintenance costs (£{totalMaintenanceCost.toFixed(2)}).</span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Charged</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenanceRequests.map((request) => (
                          <TableRow key={request.id} className={maintenanceVerified[request.id] ? "bg-green-50 dark:bg-green-950/30" : ""}>
                            <TableCell>
                              <input
                                type="checkbox"
                                checked={maintenanceVerified[request.id] || false}
                                onChange={() => toggleMaintenanceVerification(request.id)}
                                className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                                data-testid={`checkbox-verify-${request.id}`}
                                title="Check when confirmed this cost is charged to landlord"
                              />
                            </TableCell>
                            <TableCell>{request.property?.name || "Unknown"}</TableCell>
                            <TableCell>{request.title}</TableCell>
                            <TableCell className="font-medium">
                              £{(request.actualCost || request.estimatedCost || 0).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {format(new Date(request.reportedDate), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={request.status === "completed" ? "default" : "secondary"}>
                                {request.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Property-Level Breakdown */}
                    {Object.keys(maintenanceByProperty).length > 1 && (
                      <div className="mt-6 space-y-3">
                        <h3 className="font-semibold text-lg">Maintenance Costs by Property</h3>
                        <div className="grid gap-3">
                          {Object.entries(maintenanceByProperty).map(([propertyName, data]) => (
                            <Collapsible key={propertyName}>
                              <div className="border rounded-lg p-3">
                                <CollapsibleTrigger className="flex items-center justify-between w-full hover-elevate">
                                  <div className="flex items-center gap-2">
                                    <ChevronDown className="h-4 w-4" />
                                    <span className="font-medium">{propertyName}</span>
                                    <Badge variant="outline">{data.requests.length} {data.requests.length === 1 ? 'job' : 'jobs'}</Badge>
                                  </div>
                                  <span className="font-semibold text-primary">
                                    £{data.totalCost.toFixed(2)}
                                  </span>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-3 space-y-2">
                                  {data.requests.map((req) => (
                                    <div key={req.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                                      <div className="flex-1">
                                        <p className="font-medium">{req.title}</p>
                                        <p className="text-muted-foreground text-xs">{req.description}</p>
                                      </div>
                                      <div className="text-right ml-2">
                                        <p className="font-medium">£{(req.actualCost || req.estimatedCost || 0).toFixed(2)}</p>
                                        <Badge variant={req.status === "completed" ? "default" : "secondary"} className="text-xs">
                                          {req.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Total Maintenance Costs:</span>
                        <span className="text-2xl font-bold text-primary">
                          £{totalMaintenanceCost.toFixed(2)}
                        </span>
                      </div>
                      {selectedStatement && selectedStatement.totalExpenses && (
                        <>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Statement Expenses:</span>
                            <span>£{statementExpenses.toFixed(2)}</span>
                          </div>
                          {unchargedAmount > 0 && (
                            <div className="flex items-center justify-between text-sm font-semibold text-destructive mt-1 pt-2 border-t">
                              <span>Not Charged Back:</span>
                              <span>£{unchargedAmount.toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Send Statement Button - Only shown when all verified */}
                    {selectedStatement && selectedStatement.status === "pending" && (
                      <div className="mt-4 p-4 border rounded-lg bg-card">
                        {allVerified ? (
                          <div className="space-y-3">
                            <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertTitle className="text-green-900 dark:text-green-100">Ready to Send</AlertTitle>
                              <AlertDescription className="text-green-800 dark:text-green-200">
                                All maintenance items verified. You can now send this statement to the landlord.
                              </AlertDescription>
                            </Alert>
                            <Button
                              onClick={() => {
                                setReconciliationOpen(false);
                                sendMutation.mutate(selectedStatement.id);
                              }}
                              disabled={sendMutation.isPending}
                              className="w-full"
                              data-testid="button-send-verified"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {sendMutation.isPending ? "Sending..." : "Send Statement to Landlord"}
                            </Button>
                          </div>
                        ) : (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Verification Incomplete</AlertTitle>
                            <AlertDescription>
                              Please verify all {unverifiedCount} maintenance {unverifiedCount === 1 ? 'item' : 'items'} above before sending this statement.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Statement</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this statement? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => statementToDelete && deleteMutation.mutate(statementToDelete.id)}
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </div>
  );
}
