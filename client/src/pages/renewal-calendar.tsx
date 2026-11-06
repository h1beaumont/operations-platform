import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Bell, RefreshCw, Eye, AlertCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { ManagementContract } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const renewalSchema = z.object({
  newStartDate: z.string().min(1, "Start date is required"),
  newEndDate: z.string().min(1, "End date is required"),
});

export default function RenewalCalendar() {
  const { toast } = useToast();
  const [daysAhead, setDaysAhead] = useState(90);
  const [selectedContract, setSelectedContract] = useState<ManagementContract | null>(null);
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Fetch expiring contracts
  const { data: expiringContracts = [], isLoading } = useQuery<ManagementContract[]>({
    queryKey: ['/api/contracts/expiring', daysAhead],
  });

  // Renewal form
  const renewalForm = useForm({
    resolver: zodResolver(renewalSchema),
    defaultValues: {
      newStartDate: "",
      newEndDate: "",
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
      queryClient.invalidateQueries({ queryKey: ['/api/contracts/expiring', daysAhead] });
      toast({
        title: "Success",
        description: "Renewal notification sent and marked",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send notification",
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
      queryClient.invalidateQueries({ queryKey: ['/api/contracts/expiring', daysAhead] });
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

  const handleRenewal = (values: any) => {
    if (!selectedContract) return;
    generateRenewalMutation.mutate({ id: selectedContract.id, data: values });
  };

  const openRenewalDialog = (contract: ManagementContract) => {
    setSelectedContract(contract);
    setRenewalDialogOpen(true);
  };

  const openDetailDialog = (contract: ManagementContract) => {
    setSelectedContract(contract);
    setDetailDialogOpen(true);
  };

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
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Contract Renewal Calendar</h1>
        <p className="text-muted-foreground mt-1">
          Track and manage contract renewals with 3-month advance notices
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={daysAhead === 30 ? "default" : "outline"}
          onClick={() => setDaysAhead(30)}
          data-testid="tab-30-days"
        >
          Next 30 Days
        </Button>
        <Button
          variant={daysAhead === 90 ? "default" : "outline"}
          onClick={() => setDaysAhead(90)}
          data-testid="tab-90-days"
        >
          Next 90 Days
        </Button>
        <Button
          variant={daysAhead === 180 ? "default" : "outline"}
          onClick={() => setDaysAhead(180)}
          data-testid="tab-180-days"
        >
          Next 6 Months
        </Button>
        <Button
          variant={daysAhead === 365 ? "default" : "outline"}
          onClick={() => setDaysAhead(365)}
          data-testid="tab-365-days"
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
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : expiringContracts.length === 0 ? (
            <div className="text-center py-12" data-testid="text-empty-state">
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
                {expiringContracts.map((contract) => {
                  const daysUntil = getDaysUntilRenewal(contract.renewalDate);
                  const urgencyColor = getUrgencyColor(daysUntil);
                  
                  return (
                    <TableRow key={contract.id} data-testid={`row-contract-${contract.id}`}>
                      <TableCell className="font-medium">
                        <span data-testid={`text-property-name-${contract.id}`}>{contract.propertyName}</span>
                      </TableCell>
                      <TableCell>
                        <span data-testid={`text-owner-name-${contract.id}`}>{contract.ownerName}</span>
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
                            data-testid={`button-generate-renewal-${contract.id}`}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Renew
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDetailDialog(contract)}
                            data-testid={`button-view-contract-${contract.id}`}
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

      {/* Renewal Dialog */}
      <Dialog open={renewalDialogOpen} onOpenChange={setRenewalDialogOpen}>
        <DialogContent data-testid="dialog-generate-renewal">
          <DialogHeader>
            <DialogTitle>Generate Renewal Contract</DialogTitle>
            <DialogDescription>
              Set new contract dates for {selectedContract?.propertyName}
            </DialogDescription>
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

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-contract-details">
          <DialogHeader>
            <DialogTitle>{selectedContract?.propertyName}</DialogTitle>
            <DialogDescription>Contract Details</DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Owner</p>
                  <p className="text-sm text-muted-foreground">{selectedContract.ownerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{selectedContract.ownerEmail}</p>
                </div>
                {selectedContract.startDate && (
                  <div>
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedContract.startDate), 'PPP')}
                    </p>
                  </div>
                )}
                {selectedContract.endDate && (
                  <div>
                    <p className="text-sm font-medium">End Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedContract.endDate), 'PPP')}
                    </p>
                  </div>
                )}
                {selectedContract.renewalDate && (
                  <div>
                    <p className="text-sm font-medium">Renewal Date</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(selectedContract.renewalDate), 'PPP')}
                    </p>
                  </div>
                )}
                {selectedContract.managementFeePercentage && (
                  <div>
                    <p className="text-sm font-medium">Management Fee</p>
                    <p className="text-sm text-muted-foreground">{selectedContract.managementFeePercentage}%</p>
                  </div>
                )}
              </div>

              {selectedContract.specialTerms && (
                <div>
                  <p className="text-sm font-medium mb-2">Special Terms</p>
                  <p className="text-sm text-muted-foreground">{selectedContract.specialTerms}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
