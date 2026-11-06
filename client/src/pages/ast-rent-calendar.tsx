import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, AlertCircle, AlertTriangle, Check, Mail, MoreHorizontal, Bell } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InstructionPanel } from "@/components/instruction-panel";
import { astRentCalendarInstructions } from "@/lib/page-instructions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RentPayment = {
  id: string;
  tenancyId: string;
  dueDate: string;
  amount: number;
  status: string;
  paidDate?: string;
  paymentMethod?: string;
  reference?: string;
  tenancy: {
    tenantName: string;
    tenantEmail?: string;
    property: {
      name: string;
    };
  };
};

type OverduePaymentDetail = {
  paymentId: string;
  tenantName: string;
  tenantEmail: string | null;
  tenantPhone: string | null;
  propertyName: string;
  propertyAddress: string;
  amount: string;
  dueDate: string;
  daysOverdue: number;
  status: string;
};

type OverdueBreakdown = {
  total: number;
  totalAmount: number;
  overduePayments: OverduePaymentDetail[];
};

export default function ASTRentCalendarPage() {
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<RentPayment | null>(null);
  const [markAsPaidDialogOpen, setMarkAsPaidDialogOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [reference, setReference] = useState("");

  const { data: upcomingPayments = [], isLoading } = useQuery<RentPayment[]>({
    queryKey: ["/api/ast/rent-payments/upcoming"],
  });

  const pendingPayments = upcomingPayments.filter((p) => p.status === "pending");
  const overduePayments = upcomingPayments.filter((p) => {
    const dueDate = startOfDay(new Date(p.dueDate));
    const today = startOfDay(new Date());
    return p.status === "pending" && dueDate < today;
  });

  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  const markAsPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return await apiRequest(`/api/ast/rent-payments/${paymentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "paid",
          paidDate,
          paymentMethod,
          reference,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/rent-payments/upcoming"] });
      toast({
        title: "Payment Marked as Paid",
        description: "The rent payment has been updated successfully.",
      });
      setMarkAsPaidDialogOpen(false);
      setSelectedPayment(null);
      setPaidDate(format(new Date(), "yyyy-MM-dd"));
      setPaymentMethod("Bank Transfer");
      setReference("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark payment as paid",
        variant: "destructive",
      });
    },
  });

  const sendReceiptMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return await apiRequest(`/api/ast/rent-payments/${paymentId}/send-receipt`, {
        method: "POST",
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Receipt Sent",
        description: data.message || "Payment receipt sent successfully to tenant.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send receipt",
        variant: "destructive",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return await apiRequest(`/api/ast/rent-payments/${paymentId}/send-reminder`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/rent-payments/upcoming"] });
      toast({
        title: "Payment Reminder Sent",
        description: "Payment reminder sent to tenant via email and SMS",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send payment reminder",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsPaid = (payment: RentPayment) => {
    setSelectedPayment(payment);
    setPaidDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentMethod("Bank Transfer");
    setReference("");
    setMarkAsPaidDialogOpen(true);
  };

  const handleSendReceipt = (payment: RentPayment) => {
    if (!payment.tenancy.tenantEmail) {
      toast({
        title: "No Email Address",
        description: "Tenant email address is not available.",
        variant: "destructive",
      });
      return;
    }
    sendReceiptMutation.mutate(payment.id);
  };

  const handleSendReminder = (payment: RentPayment) => {
    sendReminderMutation.mutate(payment.id);
  };

  return (
    <div className="h-full overflow-auto p-6">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="max-w-7xl mx-auto space-y-6"
      >
        <motion.div variants={staggerItem} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rent Calendar</h1>
            <p className="text-muted-foreground">Track upcoming rent payments for AST properties</p>
          </div>
          <InstructionPanel {...astRentCalendarInstructions} />
        </motion.div>

        <motion.div variants={staggerItem} className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-pending-amount">£{totalPending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground" data-testid="text-total-pending-count">{pendingPayments.length} payments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming (30 days)</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-upcoming-count">{upcomingPayments.length}</div>
              <p className="text-xs text-muted-foreground">due in next 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive" data-testid="text-overdue-count">{overduePayments.length}</div>
              <p className="text-xs text-muted-foreground">needs attention</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Rent Payments</CardTitle>
              <CardDescription>Next 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading payments...</p>
              ) : upcomingPayments.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4" />
                  <p>No upcoming rent payments</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingPayments.map((payment) => {
                    const isOverdue = startOfDay(new Date(payment.dueDate)) < startOfDay(new Date()) && payment.status === "pending";
                    const isPaid = payment.status === "paid";
                    
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                        data-testid={`payment-${payment.id}`}
                      >
                        <div className="flex-1">
                          <div className="font-semibold" data-testid={`text-payment-tenant-name-${payment.id}`}>{payment.tenancy?.tenantName || "Unknown Tenant"}</div>
                          <div className="text-sm text-muted-foreground" data-testid={`text-payment-property-name-${payment.id}`}>
                            {payment.tenancy?.property?.name || "Unknown Property"}
                          </div>
                          {isPaid && payment.paidDate && (
                            <div className="text-sm text-muted-foreground" data-testid={`text-payment-paid-date-${payment.id}`}>
                              Paid: {format(new Date(payment.paidDate), "dd MMM yyyy")}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold" data-testid={`text-payment-amount-${payment.id}`}>£{payment.amount.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-payment-due-date-${payment.id}`}>
                              Due: {format(new Date(payment.dueDate), "dd MMM yyyy")}
                            </div>
                          </div>
                          <Badge variant={isOverdue ? "destructive" : isPaid ? "default" : "outline"} data-testid={`badge-payment-status-${payment.id}`}>
                            {isOverdue ? "Overdue" : payment.status}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-actions-${payment.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!isPaid && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsPaid(payment)}
                                  data-testid={`button-mark-paid-${payment.id}`}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {isOverdue && (
                                <DropdownMenuItem
                                  onClick={() => handleSendReminder(payment)}
                                  disabled={sendReminderMutation.isPending}
                                  data-testid={`button-send-reminder-${payment.id}`}
                                >
                                  <Bell className="h-4 w-4 mr-2" />
                                  {sendReminderMutation.isPending ? "Sending..." : "Send Payment Reminder"}
                                </DropdownMenuItem>
                              )}
                              {isPaid && payment.tenancy.tenantEmail && (
                                <DropdownMenuItem
                                  onClick={() => handleSendReceipt(payment)}
                                  disabled={sendReceiptMutation.isPending}
                                  data-testid={`button-send-receipt-${payment.id}`}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  {sendReceiptMutation.isPending ? "Sending..." : "Send Receipt"}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Mark as Paid Dialog */}
      <Dialog open={markAsPaidDialogOpen} onOpenChange={setMarkAsPaidDialogOpen}>
        <DialogContent data-testid="dialog-mark-paid">
          <DialogHeader>
            <DialogTitle>Mark Payment as Paid</DialogTitle>
            <DialogDescription>
              Record payment details for {selectedPayment?.tenancy?.tenantName}'s rent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paid-date">Paid Date</Label>
              <Input
                id="paid-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                data-testid="input-paid-date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method" data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Standing Order">Standing Order</SelectItem>
                  <SelectItem value="Direct Debit">Direct Debit</SelectItem>
                  <SelectItem value="Card Payment">Card Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input
                id="reference"
                placeholder="e.g., Transaction ID, Reference Number"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                data-testid="input-reference"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMarkAsPaidDialogOpen(false)}
              data-testid="button-cancel-mark-paid"
            >
              Cancel
            </Button>
            <Button
              onClick={() => selectedPayment && markAsPaidMutation.mutate(selectedPayment.id)}
              disabled={markAsPaidMutation.isPending}
              data-testid="button-confirm-mark-paid"
            >
              {markAsPaidMutation.isPending ? "Saving..." : "Mark as Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
