import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Upload, FileText, Send, Eye, Trash2, AlertCircle, CheckCircle, 
  Clock, Edit, Calendar, TrendingUp, DollarSign, Bed
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { format } from "date-fns";

const uploadStatementSchema = z.object({
  landlordId: z.coerce.number().min(1, "Please select a landlord"),
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020),
  file: z.any().refine((files) => files?.length > 0, "File is required"),
});

type UploadStatementFormValues = z.infer<typeof uploadStatementSchema>;

interface Landlord {
  id: number;
  name: string;
  email: string;
}

interface MonthlyStatement {
  id: number;
  landlordId: number;
  month: number;
  year: number;
  fileName: string;
  filePath: string;
  extractedData?: {
    statementNumber?: string;
    propertyName?: string;
    propertyAddress?: string;
    totalNights?: number;
    totalRevenue?: number;
    managementFees?: number;
    channelCommission?: number;
    ownerPayout?: number;
    bookings?: Array<{
      guestName: string;
      channel: string;
      nights: number;
      total: number;
    }>;
  };
  generatedEmail?: string;
  emailSubject?: string;
  emailApproved: boolean;
  emailApprovedAt?: string;
  scheduledSendDate?: string;
  status: string;
  sentDate?: string;
  createdAt: string;
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

export default function LandlordStatementsAI() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedStatement, setSelectedStatement] = useState<MonthlyStatement | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [editedEmail, setEditedEmail] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statementToDelete, setStatementToDelete] = useState<MonthlyStatement | null>(null);

  // Fetch landlords
  const { data: landlords = [] } = useQuery<Landlord[]>({
    queryKey: ["/api/landlords"],
  });

  // Fetch all statements
  const { data: statements = [], isLoading: statementsLoading } = useQuery<MonthlyStatement[]>({
    queryKey: ["/api/statements"],
  });

  // Fetch approved statements
  const { data: approvedStatements = [] } = useQuery<MonthlyStatement[]>({
    queryKey: ["/api/statements/approved"],
  });

  // Fetch checklist
  const { data: checklist = [] } = useQuery<any[]>({
    queryKey: ["/api/statements/checklist", new Date().getMonth() + 1, currentYear],
    queryFn: async () => {
      const res = await fetch(
        `/api/statements/checklist?month=${new Date().getMonth() + 1}&year=${currentYear}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch checklist");
      return res.json();
    },
  });

  const form = useForm<UploadStatementFormValues>({
    resolver: zodResolver(uploadStatementSchema),
    defaultValues: {
      landlordId: 0,
      month: new Date().getMonth() + 1,
      year: currentYear,
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
    onSuccess: (statement: MonthlyStatement) => {
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statements/checklist"] });
      toast({
        title: "Success",
        description: "Statement uploaded and processed with AI",
      });
      form.reset();
      setSelectedFile(null);
      
      // Auto-open review dialog if AI processing succeeded
      if (statement.extractedData && statement.generatedEmail) {
        setSelectedStatement(statement);
        setEditedEmail(statement.generatedEmail);
        setEditedSubject(statement.emailSubject || "");
        setReviewDialogOpen(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload statement",
        variant: "destructive",
      });
    },
  });

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async ({ id, emailSubject, generatedEmail }: { id: number; emailSubject: string; generatedEmail: string }) => {
      return apiRequest("POST", `/api/statements/${id}/update-email`, { emailSubject, generatedEmail });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      toast({
        title: "Success",
        description: "Email updated successfully",
      });
    },
  });

  // Approve statement mutation
  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/statements/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statements/approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statements/checklist"] });
      toast({
        title: "Approved!",
        description: "Statement approved and scheduled for the 7th of next month",
      });
      setReviewDialogOpen(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/statements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/statements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statements/checklist"] });
      toast({
        title: "Success",
        description: "Statement deleted successfully",
      });
      setDeleteDialogOpen(false);
      setStatementToDelete(null);
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
    
    uploadMutation.mutate(formData);
  };

  const handleReview = (statement: MonthlyStatement) => {
    setSelectedStatement(statement);
    setEditedEmail(statement.generatedEmail || "");
    setEditedSubject(statement.emailSubject || "");
    setReviewDialogOpen(true);
  };

  const handleSaveEmail = () => {
    if (!selectedStatement) return;
    updateEmailMutation.mutate({
      id: selectedStatement.id,
      emailSubject: editedSubject,
      generatedEmail: editedEmail,
    });
  };

  const handleApprove = () => {
    if (!selectedStatement) return;
    
    // Save email changes first if modified
    if (editedEmail !== selectedStatement.generatedEmail || editedSubject !== selectedStatement.emailSubject) {
      handleSaveEmail();
    }
    
    approveMutation.mutate(selectedStatement.id);
  };

  const handleDelete = (statement: MonthlyStatement) => {
    setStatementToDelete(statement);
    setDeleteDialogOpen(true);
  };

  const getLandlordName = (landlordId: number) => {
    return landlords.find(l => l.id === landlordId)?.name || "Unknown";
  };

  const pendingReviewStatements = statements.filter(s => 
    !s.emailApproved && s.extractedData && s.generatedEmail
  );

  return (
    <div className="flex-1 overflow-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-landlord-statements">
              AI-Powered Landlord Statements
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload statements, AI extracts data and generates comprehensive emails
            </p>
          </div>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" data-testid="tab-upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Statement
            </TabsTrigger>
            <TabsTrigger value="review" data-testid="tab-review">
              <Eye className="h-4 w-4 mr-2" />
              Review Pending ({pendingReviewStatements.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              <CheckCircle className="h-4 w-4 mr-2" />
              Approved ({approvedStatements.length})
            </TabsTrigger>
            <TabsTrigger value="checklist" data-testid="tab-checklist">
              <Calendar className="h-4 w-4 mr-2" />
              Checklist
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card data-testid="card-upload">
              <CardHeader>
                <CardTitle>Upload Monthly Statement</CardTitle>
                <CardDescription>
                  Upload PDF statement - AI will extract data and generate a comprehensive email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    </div>

                    <FormField
                      control={form.control}
                      name="file"
                      render={() => (
                        <FormItem>
                          <FormLabel>Statement PDF</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".pdf"
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

                    <Button 
                      type="submit" 
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload"
                    >
                      {uploadMutation.isPending ? "Processing with AI..." : "Upload & Process"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Review Pending Tab */}
          <TabsContent value="review">
            {statementsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">Loading statements...</p>
                </CardContent>
              </Card>
            ) : pendingReviewStatements.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Statements Pending Review</AlertTitle>
                    <AlertDescription>
                      Upload statements in the Upload tab. They will appear here for review.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingReviewStatements.map((statement) => (
                  <Card key={statement.id} data-testid={`card-statement-${statement.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {getLandlordName(statement.landlordId)}
                            <Badge variant="outline">
                              {MONTHS.find(m => m.value === statement.month)?.label} {statement.year}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            {statement.extractedData?.propertyName || "Property"}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleReview(statement)}
                            data-testid={`button-review-${statement.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review Email
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => handleDelete(statement)}
                            data-testid={`button-delete-${statement.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {statement.extractedData && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                            <p className="text-lg font-semibold flex items-center" data-testid={`text-revenue-${statement.id}`}>
                              <DollarSign className="h-4 w-4 mr-1" />
                              £{statement.extractedData.totalRevenue?.toFixed(2) || "0.00"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Total Nights</p>
                            <p className="text-lg font-semibold flex items-center" data-testid={`text-nights-${statement.id}`}>
                              <Bed className="h-4 w-4 mr-1" />
                              {statement.extractedData.totalNights || 0}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Management Fees</p>
                            <p className="text-lg font-semibold" data-testid={`text-fees-${statement.id}`}>
                              £{statement.extractedData.managementFees?.toFixed(2) || "0.00"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Channel Commission</p>
                            <p className="text-lg font-semibold" data-testid={`text-commission-${statement.id}`}>
                              £{statement.extractedData.channelCommission?.toFixed(2) || "0.00"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Owner Payout</p>
                            <p className="text-lg font-semibold flex items-center text-primary" data-testid={`text-payout-${statement.id}`}>
                              <TrendingUp className="h-4 w-4 mr-1" />
                              £{statement.extractedData.ownerPayout?.toFixed(2) || "0.00"}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Approved Tab */}
          <TabsContent value="approved">
            {approvedStatements.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Approved Statements</AlertTitle>
                    <AlertDescription>
                      Once you approve statements, they will appear here scheduled to send on the 7th.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Approved Statements</CardTitle>
                  <CardDescription>
                    These statements are scheduled to be sent on the 7th of the month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Landlord</TableHead>
                        <TableHead>Property</TableHead>
                        <TableHead>Month</TableHead>
                        <TableHead>Owner Payout</TableHead>
                        <TableHead>Scheduled Send</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedStatements.map((statement) => (
                        <TableRow key={statement.id} data-testid={`row-approved-${statement.id}`}>
                          <TableCell className="font-medium">
                            {getLandlordName(statement.landlordId)}
                          </TableCell>
                          <TableCell>
                            {statement.extractedData?.propertyName || "N/A"}
                          </TableCell>
                          <TableCell>
                            {MONTHS.find(m => m.value === statement.month)?.label} {statement.year}
                          </TableCell>
                          <TableCell data-testid={`text-approved-payout-${statement.id}`}>
                            £{statement.extractedData?.ownerPayout?.toFixed(2) || "0.00"}
                          </TableCell>
                          <TableCell>
                            {statement.scheduledSendDate ? (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {format(new Date(statement.scheduledSendDate), "MMM dd, yyyy")}
                              </div>
                            ) : (
                              "Not scheduled"
                            )}
                          </TableCell>
                          <TableCell>
                            {statement.sentDate ? (
                              <Badge variant="default" data-testid={`badge-sent-${statement.id}`}>
                                <Send className="h-3 w-3 mr-1" />
                                Sent
                              </Badge>
                            ) : (
                              <Badge variant="outline" data-testid={`badge-scheduled-${statement.id}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                Scheduled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReview(statement)}
                              data-testid={`button-preview-${statement.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Checklist Tab */}
          <TabsContent value="checklist">
            <Card>
              <CardHeader>
                <CardTitle>Statement Checklist</CardTitle>
                <CardDescription>
                  Track which landlords have submitted statements for {MONTHS.find(m => m.value === new Date().getMonth() + 1)?.label} {currentYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {checklist.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Landlords Found</AlertTitle>
                    <AlertDescription>
                      No landlords with active management properties found.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {checklist.map((item: any) => (
                      <div
                        key={item.landlordId}
                        className="flex items-center justify-between p-4 border rounded-md"
                        data-testid={`checklist-item-${item.landlordId}`}
                      >
                        <div className="flex items-center gap-3">
                          {item.hasStatement ? (
                            <CheckCircle className="h-5 w-5 text-green-600" data-testid={`icon-check-${item.landlordId}`} />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-600" data-testid={`icon-warning-${item.landlordId}`} />
                          )}
                          <div>
                            <p className="font-medium">{item.landlordName}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.propertyCount} active {item.propertyCount === 1 ? "property" : "properties"}
                            </p>
                          </div>
                        </div>
                        <div>
                          {item.hasStatement ? (
                            <Badge variant="default" data-testid={`badge-submitted-${item.landlordId}`}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Statement Uploaded
                            </Badge>
                          ) : (
                            <Badge variant="outline" data-testid={`badge-missing-${item.landlordId}`}>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Missing Statement
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-review">
          <DialogHeader>
            <DialogTitle>Review Statement Email</DialogTitle>
            <DialogDescription>
              Review the AI-generated email and make any necessary edits before approving
            </DialogDescription>
          </DialogHeader>

          {selectedStatement && (
            <div className="space-y-6">
              {/* Extracted Data Summary */}
              {selectedStatement.extractedData && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Extracted Statement Data</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Property</p>
                        <p className="font-semibold" data-testid="text-review-property">
                          {selectedStatement.extractedData.propertyName || "N/A"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Revenue</p>
                        <p className="font-semibold" data-testid="text-review-revenue">
                          £{selectedStatement.extractedData.totalRevenue?.toFixed(2) || "0.00"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Total Nights</p>
                        <p className="font-semibold" data-testid="text-review-nights">
                          {selectedStatement.extractedData.totalNights || 0}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Management Fees</p>
                        <p className="font-semibold" data-testid="text-review-fees">
                          £{selectedStatement.extractedData.managementFees?.toFixed(2) || "0.00"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Channel Commission</p>
                        <p className="font-semibold" data-testid="text-review-commission">
                          £{selectedStatement.extractedData.channelCommission?.toFixed(2) || "0.00"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Owner Payout</p>
                        <p className="font-semibold text-primary" data-testid="text-review-payout">
                          £{selectedStatement.extractedData.ownerPayout?.toFixed(2) || "0.00"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Bookings List */}
                  {selectedStatement.extractedData.bookings && selectedStatement.extractedData.bookings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Bookings</h4>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Guest Name</TableHead>
                              <TableHead>Channel</TableHead>
                              <TableHead>Nights</TableHead>
                              <TableHead>Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedStatement.extractedData.bookings.map((booking, idx) => (
                              <TableRow key={idx} data-testid={`row-booking-${idx}`}>
                                <TableCell>{booking.guestName}</TableCell>
                                <TableCell>{booking.channel}</TableCell>
                                <TableCell>{booking.nights}</TableCell>
                                <TableCell>£{booking.total.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Email Subject */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Email Subject</label>
                <Input
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                  placeholder="Email subject"
                  data-testid="input-email-subject"
                />
              </div>

              {/* Email Body */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Email Body</label>
                <Textarea
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  rows={15}
                  placeholder="Email body"
                  data-testid="textarea-email-body"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <div className="flex gap-2 w-full justify-end">
              <Button
                variant="outline"
                onClick={() => setReviewDialogOpen(false)}
                data-testid="button-cancel-review"
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveEmail}
                disabled={updateEmailMutation.isPending}
                data-testid="button-save-changes"
              >
                <Edit className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending}
                data-testid="button-approve"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {approveMutation.isPending ? "Approving..." : "Approve & Schedule for 7th"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent data-testid="dialog-delete">
          <DialogHeader>
            <DialogTitle>Delete Statement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this statement? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {statementToDelete && (
            <div className="py-4">
              <p className="text-sm">
                <span className="font-semibold">Landlord:</span> {getLandlordName(statementToDelete.landlordId)}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Period:</span> {MONTHS.find(m => m.value === statementToDelete.month)?.label} {statementToDelete.year}
              </p>
              <p className="text-sm">
                <span className="font-semibold">File:</span> {statementToDelete.fileName}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => statementToDelete && deleteMutation.mutate(statementToDelete.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Statement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
