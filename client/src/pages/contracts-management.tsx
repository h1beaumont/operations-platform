import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Upload, CheckCircle2, AlertTriangle, Calendar, Eye, Edit, Trash2, Download, Bell, RefreshCw, Info, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ManagementContract } from "@shared/schema";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const uploadSchema = z.object({
  propertyName: z.string().min(1, "Property name is required"),
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Valid email is required"),
  ownerPhone: z.string().optional(),
  file: z.any(),
});

const editSchema = z.object({
  contractName: z.string().optional(),
  ownerName: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  ownerPhone: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  renewalDate: z.string().optional(),
  managementFeePercentage: z.string().optional(),
  managementFeeFixed: z.string().optional(),
  paymentSchedule: z.string().optional(),
  specialTerms: z.string().optional(),
  maintenancePreference: z.string().optional(),
  maintenanceApprovalLimit: z.string().optional(),
  notes: z.string().optional(),
});

const renewalSchema = z.object({
  newStartDate: z.string().min(1, "Start date is required"),
  newEndDate: z.string().min(1, "End date is required"),
});

export default function ContractsManagement() {
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<ManagementContract | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [daysAhead, setDaysAhead] = useState(90);

  // Fetch all contracts
  const { data: contracts = [], isLoading } = useQuery<ManagementContract[]>({
    queryKey: ['/api/contracts'],
  });

  // Fetch expiring contracts for renewal calendar
  const { data: expiringContractsForCalendar = [], isLoading: isLoadingExpiring } = useQuery<ManagementContract[]>({
    queryKey: ['/api/contracts/expiring', daysAhead],
  });

  // Upload form
  const uploadForm = useForm({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      propertyName: "",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
    },
  });

  // Edit form
  const editForm = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {},
  });

  // Renewal form
  const renewalForm = useForm({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      newStartDate: "",
      newEndDate: "",
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: data,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts/expiring'], exact: false });
      toast({
        title: "Success",
        description: "Contract uploaded and analysis in progress",
      });
      setUploadDialogOpen(false);
      uploadForm.reset();
      setSelectedFile(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload contract",
        variant: "destructive",
      });
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/contracts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts/expiring'], exact: false });
      toast({
        title: "Success",
        description: "Contract updated successfully",
      });
      setEditDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update contract",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/contracts/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts/expiring'], exact: false });
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
      setDeleteDialogOpen(false);
      setContractToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contract",
        variant: "destructive",
      });
    },
  });

  // Mark notification sent mutation
  const notificationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/contracts/${id}/renewal-notification`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts/expiring'], exact: false });
      toast({
        title: "Success",
        description: "Notification marked as sent",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification",
        variant: "destructive",
      });
    },
  });

  // Generate renewal mutation
  const generateRenewalMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest(`/api/contracts/${id}/generate-renewal`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts/expiring'], exact: false });
      toast({
        title: "Success",
        description: "Renewal contract generated",
      });
      setRenewalDialogOpen(false);
      renewalForm.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate renewal",
        variant: "destructive",
      });
    },
  });

  const handleUpload = async (values: any) => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('contract', selectedFile);
    formData.append('propertyName', values.propertyName);
    formData.append('ownerName', values.ownerName);
    formData.append('ownerEmail', values.ownerEmail);
    if (values.ownerPhone) {
      formData.append('ownerPhone', values.ownerPhone);
    }

    uploadMutation.mutate(formData);
  };

  const handleEdit = (values: any) => {
    if (!selectedContract) return;
    editMutation.mutate({ id: selectedContract.id, data: values });
  };

  const handleRenewal = (values: any) => {
    if (!selectedContract) return;
    generateRenewalMutation.mutate({ id: selectedContract.id, data: values });
  };

  const handleDelete = () => {
    if (contractToDelete) {
      deleteMutation.mutate(contractToDelete);
    }
  };

  const openDetailDialog = (contract: ManagementContract) => {
    setSelectedContract(contract);
    setDetailDialogOpen(true);
  };

  const openEditDialog = (contract: ManagementContract) => {
    setSelectedContract(contract);
    editForm.reset({
      contractName: contract.contractName || "",
      ownerName: contract.ownerName || "",
      ownerEmail: contract.ownerEmail || "",
      ownerPhone: contract.ownerPhone || "",
      startDate: contract.startDate ? format(new Date(contract.startDate), 'yyyy-MM-dd') : "",
      endDate: contract.endDate ? format(new Date(contract.endDate), 'yyyy-MM-dd') : "",
      renewalDate: contract.renewalDate ? format(new Date(contract.renewalDate), 'yyyy-MM-dd') : "",
      managementFeePercentage: contract.managementFeePercentage?.toString() || "",
      managementFeeFixed: contract.managementFeeFixed?.toString() || "",
      paymentSchedule: contract.paymentSchedule || "",
      specialTerms: contract.specialTerms || "",
      maintenancePreference: contract.maintenancePreference || "",
      maintenanceApprovalLimit: contract.maintenanceApprovalLimit?.toString() || "",
      notes: contract.notes || "",
    });
    setEditDialogOpen(true);
  };

  const openRenewalDialog = (contract: ManagementContract) => {
    setSelectedContract(contract);
    setRenewalDialogOpen(true);
  };

  const confirmDelete = (contractId: string) => {
    setContractToDelete(contractId);
    setDeleteDialogOpen(true);
  };

  // Filter contracts by status
  const activeContracts = contracts.filter(c => c.status === 'active');
  const expiringContracts = contracts.filter(c => c.status === 'expiring_soon');
  const expiredContracts = contracts.filter(c => c.status === 'expired');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      active: { variant: "default", label: "Active" },
      expiring_soon: { variant: "secondary", label: "Expiring Soon" },
      expired: { variant: "destructive", label: "Expired" },
      pending_renewal: { variant: "outline", label: "Pending Renewal" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };

  // Utility functions for Renewal Calendar
  const getDaysUntilRenewal = (renewalDate: string | null) => {
    if (!renewalDate) return null;
    return differenceInDays(new Date(renewalDate), new Date());
  };

  const getUrgencyColor = (daysUntil: number | null) => {
    if (daysUntil === null) return "muted";
    if (daysUntil < 30) return "destructive";
    if (daysUntil < 90) return "secondary";
    return "default";
  };

  const getUrgencyLabel = (daysUntil: number | null) => {
    if (daysUntil === null) return "No renewal date";
    if (daysUntil < 0) return "Overdue";
    if (daysUntil < 30) return `${daysUntil} days (Urgent)`;
    if (daysUntil < 90) return `${daysUntil} days (Soon)`;
    return `${daysUntil} days`;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Management Contracts</h1>
          <p className="text-muted-foreground mt-1">Upload and manage property management contracts</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-contract">
              <Upload className="w-4 h-4 mr-2" />
              Upload Contract
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-upload-contract">
            <DialogHeader>
              <DialogTitle>Upload New Contract</DialogTitle>
              <DialogDescription>
                Upload a PDF contract for AI analysis and tracking
              </DialogDescription>
            </DialogHeader>
            <Form {...uploadForm}>
              <form onSubmit={uploadForm.handleSubmit(handleUpload)} className="space-y-4">
                <div>
                  <FormLabel>Contract File (PDF) *</FormLabel>
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    data-testid="input-contract-file"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
                <FormField
                  control={uploadForm.control}
                  name="propertyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Manor House Apt 1" data-testid="input-property-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={uploadForm.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="John Smith" data-testid="input-owner-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={uploadForm.control}
                  name="ownerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Email *</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="owner@example.com" data-testid="input-owner-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={uploadForm.control}
                  name="ownerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+44 7123 456789" data-testid="input-owner-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={uploadMutation.isPending} data-testid="button-submit-upload">
                    {uploadMutation.isPending ? "Uploading..." : "Upload & Analyze"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-contracts">All Contracts ({contracts.length})</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">Active ({activeContracts.length})</TabsTrigger>
          <TabsTrigger value="expiring" data-testid="tab-expiring-soon">Expiring Soon ({expiringContracts.length})</TabsTrigger>
          <TabsTrigger value="expired" data-testid="tab-expired">Expired ({expiredContracts.length})</TabsTrigger>
          <TabsTrigger value="renewal" data-testid="tab-renewal-calendar">Renewal Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <ContractGrid contracts={contracts} onView={openDetailDialog} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="active" className="mt-6">
          <ContractGrid contracts={activeContracts} onView={openDetailDialog} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="expiring" className="mt-6">
          <ContractGrid contracts={expiringContracts} onView={openDetailDialog} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="expired" className="mt-6">
          <ContractGrid contracts={expiredContracts} onView={openDetailDialog} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="renewal" className="mt-6">
          <div className="space-y-6">
            <div className="flex gap-2">
              <Button
                variant={daysAhead === 30 ? "default" : "outline"}
                onClick={() => setDaysAhead(30)}
                data-testid="filter-30-days"
              >
                Next 30 Days
              </Button>
              <Button
                variant={daysAhead === 90 ? "default" : "outline"}
                onClick={() => setDaysAhead(90)}
                data-testid="filter-90-days"
              >
                Next 90 Days
              </Button>
              <Button
                variant={daysAhead === 180 ? "default" : "outline"}
                onClick={() => setDaysAhead(180)}
                data-testid="filter-180-days"
              >
                Next 6 Months
              </Button>
              <Button
                variant={daysAhead === 365 ? "default" : "outline"}
                onClick={() => setDaysAhead(365)}
                data-testid="filter-365-days"
              >
                Next 12 Months
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Renewals</CardTitle>
                <CardDescription>
                  Contracts expiring in the next {daysAhead} days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingExpiring ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : expiringContractsForCalendar.length === 0 ? (
                  <div className="text-center py-12" data-testid="text-empty-renewal-state">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">No contracts expiring soon</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      No contracts are due for renewal in the next {daysAhead} days
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead data-testid="header-property">Property</TableHead>
                        <TableHead data-testid="header-owner">Owner</TableHead>
                        <TableHead data-testid="header-renewal-date">Renewal Date</TableHead>
                        <TableHead data-testid="header-days-remaining">Days Until Renewal</TableHead>
                        <TableHead data-testid="header-notification-status">Notification Status</TableHead>
                        <TableHead data-testid="header-actions">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringContractsForCalendar.map((contract) => {
                        const daysUntil = getDaysUntilRenewal(contract.renewalDate);
                        const urgencyColor = getUrgencyColor(daysUntil);
                        
                        return (
                          <TableRow key={contract.id} data-testid={`row-renewal-contract-${contract.id}`}>
                            <TableCell className="font-medium">
                              <span data-testid={`text-renewal-property-name-${contract.id}`}>{contract.propertyName}</span>
                            </TableCell>
                            <TableCell>
                              <span data-testid={`text-renewal-owner-name-${contract.id}`}>{contract.ownerName}</span>
                            </TableCell>
                            <TableCell>
                              <span data-testid={`text-renewal-date-${contract.id}`}>
                                {contract.renewalDate
                                  ? format(new Date(contract.renewalDate), 'PPP')
                                  : "Not set"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={urgencyColor as any} data-testid={`badge-urgency-${contract.id}`}>
                                <span data-testid={`text-days-remaining-${contract.id}`}>{getUrgencyLabel(daysUntil)}</span>
                              </Badge>
                              {daysUntil !== null && daysUntil < 90 && !contract.renewalNotificationSent && (
                                <Badge variant="destructive" className="ml-2" data-testid={`badge-action-required-${contract.id}`}>
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Action Required
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {contract.renewalNotificationSent ? (
                                <Badge variant="outline" data-testid={`badge-notification-status-${contract.id}`}>
                                  Sent {contract.renewalNotificationSentAt && format(new Date(contract.renewalNotificationSentAt), 'PP')}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" data-testid={`badge-notification-status-${contract.id}`}>Not Sent</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => notificationMutation.mutate(contract.id)}
                                  disabled={contract.renewalNotificationSent || notificationMutation.isPending}
                                  data-testid={`button-send-notification-${contract.id}`}
                                >
                                  <Bell className="w-3 h-3 mr-1" />
                                  {contract.renewalNotificationSent ? "Sent" : "Send"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openRenewalDialog(contract)}
                                  data-testid={`button-renew-contract-${contract.id}`}
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Renew
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openDetailDialog(contract)}
                                  data-testid={`button-view-renewal-contract-${contract.id}`}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Contract Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="dialog-contract-details">
          <DialogHeader>
            <DialogTitle>{selectedContract?.propertyName}</DialogTitle>
            <DialogDescription>Contract Details</DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedContract.status)}
                {selectedContract.isLegallyValid === true && (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    Legally Valid
                  </Badge>
                )}
                {selectedContract.isLegallyValid === false && (
                  <Badge variant="outline" className="gap-1">
                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                    Issues Found
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Owner</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-owner-name">{selectedContract.ownerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-owner-email">{selectedContract.ownerEmail}</p>
                </div>
                {selectedContract.startDate && (
                  <div>
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-start-date">
                      {format(new Date(selectedContract.startDate), 'PPP')}
                    </p>
                  </div>
                )}
                {selectedContract.endDate && (
                  <div>
                    <p className="text-sm font-medium">End Date</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-end-date">
                      {format(new Date(selectedContract.endDate), 'PPP')}
                    </p>
                  </div>
                )}
                {selectedContract.renewalDate && (
                  <div>
                    <p className="text-sm font-medium">Renewal Date</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-renewal-date">
                      {format(new Date(selectedContract.renewalDate), 'PPP')}
                    </p>
                  </div>
                )}
                {selectedContract.managementFeePercentage && (
                  <div>
                    <p className="text-sm font-medium">Management Fee</p>
                    <p className="text-sm text-muted-foreground" data-testid="text-management-fee">{selectedContract.managementFeePercentage}%</p>
                  </div>
                )}
              </div>

              {selectedContract.aiAnalysisSummary && (
                <div>
                  <p className="text-sm font-medium mb-2">AI Analysis Summary</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap" data-testid="text-ai-summary">{selectedContract.aiAnalysisSummary}</p>
                  </div>
                </div>
              )}

              {selectedContract.legalAnalysisNotes && (
                <div>
                  <p className="text-sm font-medium mb-2">Legal Analysis Notes</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap" data-testid="text-legal-notes">{selectedContract.legalAnalysisNotes}</p>
                  </div>
                </div>
              )}

              {selectedContract.specialTerms && (
                <div>
                  <p className="text-sm font-medium mb-2">Special Terms</p>
                  <p className="text-sm text-muted-foreground">{selectedContract.specialTerms}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => notificationMutation.mutate(selectedContract.id)}
                  disabled={selectedContract.renewalNotificationSent || notificationMutation.isPending}
                  data-testid="button-mark-notification-sent"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {selectedContract.renewalNotificationSent ? "Notification Sent" : "Mark Notification Sent"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openRenewalDialog(selectedContract)}
                  data-testid="button-generate-renewal"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate Renewal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    openEditDialog(selectedContract);
                  }}
                  data-testid="button-edit-contract"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    confirmDelete(selectedContract.id);
                  }}
                  data-testid="button-delete-contract"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-edit-contract">
          <DialogHeader>
            <DialogTitle>Edit Contract</DialogTitle>
            <DialogDescription>Update contract details manually</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="contractName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-contractName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="ownerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-ownerName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="ownerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" data-testid="input-edit-ownerEmail" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="ownerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owner Phone</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-ownerPhone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-edit-startDate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-edit-endDate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="renewalDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Renewal Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-edit-renewalDate" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="managementFeePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Management Fee (%)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-edit-managementFeePercentage" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="specialTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Terms</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-edit-specialTerms" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={editMutation.isPending} data-testid="button-submit-edit">
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Renewal Dialog */}
      <Dialog open={renewalDialogOpen} onOpenChange={setRenewalDialogOpen}>
        <DialogContent data-testid="dialog-generate-renewal">
          <DialogHeader>
            <DialogTitle>Generate Renewal Contract</DialogTitle>
            <DialogDescription>Set new contract dates for renewal</DialogDescription>
          </DialogHeader>
          <Form {...renewalForm}>
            <form onSubmit={renewalForm.handleSubmit(handleRenewal)} className="space-y-4">
              <FormField
                control={renewalForm.control}
                name="newStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Start Date *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-new-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={renewalForm.control}
                name="newEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New End Date *</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid="input-new-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={generateRenewalMutation.isPending} data-testid="button-confirm-renewal">
                  {generateRenewalMutation.isPending ? "Generating..." : "Generate Renewal"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the contract. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ContractGrid({
  contracts,
  onView,
  isLoading,
}: {
  contracts: ManagementContract[];
  onView: (contract: ManagementContract) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No contracts found</p>
          <p className="text-sm text-muted-foreground mt-1">Upload a contract to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {contracts.map((contract) => (
        <Card
          key={contract.id}
          className="hover-elevate cursor-pointer"
          onClick={() => onView(contract)}
          data-testid={`card-contract-${contract.id}`}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-start justify-between gap-2">
              <span data-testid={`text-property-name-${contract.id}`}>{contract.propertyName}</span>
              {contract.isLegallyValid === true && (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" data-testid={`status-validity-${contract.id}`} />
              )}
              {contract.isLegallyValid === false && (
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" data-testid={`status-validity-${contract.id}`} />
              )}
            </CardTitle>
            <CardDescription data-testid={`text-owner-name-${contract.id}`}>{contract.ownerName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={contract.status === 'active' ? 'default' : contract.status === 'expiring_soon' ? 'secondary' : 'destructive'} data-testid={`badge-status-${contract.id}`}>
                {contract.status === 'active' ? 'Active' : contract.status === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}
              </Badge>
              {contract.analysisCompleted && (
                <Badge variant="outline">
                  <Info className="w-3 h-3 mr-1" />
                  Analyzed
                </Badge>
              )}
            </div>

            {contract.startDate && contract.endDate && (
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span data-testid={`text-contract-dates-${contract.id}`}>
                    {format(new Date(contract.startDate), 'PP')} - {format(new Date(contract.endDate), 'PP')}
                  </span>
                </div>
              </div>
            )}

            {contract.managementFeePercentage && (
              <div className="text-sm text-muted-foreground" data-testid={`text-management-fee-${contract.id}`}>
                Fee: {contract.managementFeePercentage}%
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="ghost" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); onView(contract); }} data-testid={`button-view-contract-${contract.id}`}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
