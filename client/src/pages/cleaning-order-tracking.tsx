import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, CheckCircle2, Clock, Send, FileDown, Package, Eye } from "lucide-react";
import type { CleaningOrder, CleaningOrderReminderLog } from "@shared/schema";
import { InstructionPanel } from "@/components/instruction-panel";
import { PageTransition } from "@/lib/animations";
import { format } from "date-fns";

export default function CleaningOrderTracking() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "submitted" | "verified">("all");
  const [selectedOrder, setSelectedOrder] = useState<CleaningOrder | null>(null);

  const { data: orders = [], isLoading: ordersLoading } = useQuery<CleaningOrder[]>({
    queryKey: ["/api/cleaning-orders"],
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<CleaningOrderReminderLog[]>({
    queryKey: ["/api/cleaning-order-logs"],
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      return apiRequest(`/api/cleaning-order-schedules/${scheduleId}/send-now`, { method: "POST" });
    },
    onSuccess: () => {
      toast({
        title: "Reminder Sent",
        description: "SMS reminder has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    },
  });

  const verifyOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return apiRequest(`/api/cleaning-orders/${orderId}/verify`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-orders"] });
      toast({
        title: "Order Verified",
        description: "Order has been marked as verified.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify order",
        variant: "destructive",
      });
    },
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.submittedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1" data-testid="badge-pending">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="secondary" className="gap-1" data-testid="badge-submitted">
            <Package className="h-3 w-3" />
            Submitted
          </Badge>
        );
      case "verified":
        return (
          <Badge variant="default" className="gap-1 bg-green-600" data-testid="badge-verified">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportToCSV = (data: CleaningOrder[]) => {
    const headers = ["Property", "Order Date", "Status", "Submitted By", "Submitted At", "Verified At", "Items", "Notes"];
    const rows = data.map(order => [
      order.propertyName,
      order.orderDate,
      order.status,
      order.submittedBy,
      order.submittedAt ? format(new Date(order.submittedAt), "PPpp") : "N/A",
      order.verifiedAt ? format(new Date(order.verifiedAt), "PPpp") : "N/A",
      order.items.map(item => `${item.name}: ${item.quantity}`).join("; "),
      order.notes || "N/A"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cleaning-orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-title">
            Order Tracking
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-subtitle">
            Monitor, verify, and manage cleaning supply orders
          </p>
        </div>

        <InstructionPanel
          title="How to Manage Cleaning Supply Orders"
          description="Track orders from submission to verification"
          steps={[
            {
              step: 1,
              title: "Monitor Order Status",
              description: "View orders in three states: Pending, Submitted, and Verified.",
              tips: [
                "Pending: Reminder sent, awaiting cleaner submission",
                "Submitted: Order received, needs admin verification",
                "Verified: Admin has reviewed and approved the order",
              ],
            },
            {
              step: 2,
              title: "Send Reminders",
              description: "For pending orders, send SMS reminders to cleaners.",
              tips: [
                "Click 'Send Reminder' button on pending orders",
                "Reminders are sent to the property's designated recipient",
                "Track all sent reminders in the 'Reminders Sent' tab",
              ],
            },
            {
              step: 3,
              title: "Verify Submissions",
              description: "Review submitted orders and mark them as verified.",
              tips: [
                "Check order details and quantities",
                "Click 'Mark as Verified' to approve",
                "Verification records who approved and when",
              ],
            },
            {
              step: 4,
              title: "Export & Report",
              description: "Download order history for record-keeping.",
              tips: [
                "Use filters to find specific orders",
                "Export to CSV for invoicing or reporting",
                "All verification details included in exports",
              ],
            },
          ]}
        />

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="orders" data-testid="tab-orders">
              Orders
            </TabsTrigger>
            <TabsTrigger value="reminders" data-testid="tab-reminders">
              Reminders Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div>
                    <CardTitle data-testid="text-orders-title">Cleaning Supply Orders</CardTitle>
                    <CardDescription>
                      {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    <Input
                      placeholder="Search property or cleaner..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-64"
                      data-testid="input-search"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCSV(filteredOrders)}
                      disabled={filteredOrders.length === 0}
                      data-testid="button-export"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap pt-2">
                  <Button
                    variant={statusFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("all")}
                    data-testid="button-filter-all"
                  >
                    All
                  </Button>
                  <Button
                    variant={statusFilter === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("pending")}
                    data-testid="button-filter-pending"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Button>
                  <Button
                    variant={statusFilter === "submitted" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("submitted")}
                    data-testid="button-filter-submitted"
                  >
                    <Package className="h-3 w-3 mr-1" />
                    Submitted
                  </Button>
                  <Button
                    variant={statusFilter === "verified" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter("verified")}
                    data-testid="button-filter-verified"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="flex items-center justify-center p-8" data-testid="loader-orders">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground" data-testid="text-no-orders">
                    No orders found{statusFilter !== "all" && ` with status "${statusFilter}"`}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="header-property">Property</TableHead>
                          <TableHead data-testid="header-cleaner">Cleaner</TableHead>
                          <TableHead data-testid="header-date">Order Date</TableHead>
                          <TableHead data-testid="header-status">Status</TableHead>
                          <TableHead data-testid="header-submitted">Submitted</TableHead>
                          <TableHead data-testid="header-details">Details</TableHead>
                          <TableHead data-testid="header-action">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order) => (
                          <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                            <TableCell data-testid={`cell-property-${order.id}`}>
                              <div className="font-medium">{order.propertyName}</div>
                              <div className="text-xs text-muted-foreground">
                                {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                              </div>
                            </TableCell>
                            <TableCell data-testid={`cell-cleaner-${order.id}`}>
                              {order.submittedBy}
                            </TableCell>
                            <TableCell data-testid={`cell-date-${order.id}`}>
                              {order.orderDate}
                            </TableCell>
                            <TableCell data-testid={`cell-status-${order.id}`}>
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell data-testid={`cell-submitted-${order.id}`}>
                              {order.submittedAt ? (
                                <div className="text-sm">
                                  <div>{format(new Date(order.submittedAt), "MMM d")}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(order.submittedAt), "h:mm a")}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell data-testid={`cell-details-${order.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                                data-testid={`button-view-details-${order.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View Items
                              </Button>
                            </TableCell>
                            <TableCell data-testid={`cell-action-${order.id}`}>
                              {order.status === "pending" && order.scheduleId && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => sendReminderMutation.mutate(order.scheduleId!)}
                                  disabled={sendReminderMutation.isPending}
                                  data-testid={`button-remind-${order.id}`}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Send Reminder
                                </Button>
                              )}
                              {order.status === "submitted" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => verifyOrderMutation.mutate(order.id)}
                                  disabled={verifyOrderMutation.isPending}
                                  data-testid={`button-verify-${order.id}`}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Mark as Verified
                                </Button>
                              )}
                              {order.status === "verified" && order.verifiedAt && (
                                <div className="text-sm text-green-600" data-testid={`verified-info-${order.id}`}>
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span className="font-medium">Verified</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(order.verifiedAt), "MMM d, h:mm a")}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-reminders-title">SMS Reminders</CardTitle>
                <CardDescription>
                  {logs.length} reminder{logs.length !== 1 ? "s" : ""} sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center p-8" data-testid="loader-reminders">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground" data-testid="text-no-reminders">
                    No reminders sent yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="header-sent-at">Sent At</TableHead>
                          <TableHead data-testid="header-recipient">Recipient</TableHead>
                          <TableHead data-testid="header-message-status">Message Status</TableHead>
                          <TableHead data-testid="header-order-status">Order Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map((log) => (
                          <TableRow key={log.id} data-testid={`row-reminder-${log.id}`}>
                            <TableCell data-testid={`cell-sent-${log.id}`}>
                              {format(new Date(log.sentAt), "PPpp")}
                            </TableCell>
                            <TableCell data-testid={`cell-recipient-${log.id}`}>
                              {log.recipientPhone}
                            </TableCell>
                            <TableCell data-testid={`cell-status-${log.id}`}>
                              <Badge variant={log.messageStatus === "sent" || log.messageStatus === "delivered" ? "default" : "destructive"}>
                                {log.messageStatus}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`cell-order-status-${log.id}`}>
                              {log.orderSubmitted ? (
                                <div className="flex items-center gap-2 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>
                                    Submitted
                                    {log.submittedAt && ` - ${format(new Date(log.submittedAt), "MMM d, h:mm a")}`}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-yellow-600">
                                  <Clock className="h-4 w-4" />
                                  <span>Pending</span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl" data-testid="dialog-order-details">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">Order Details</DialogTitle>
              <DialogDescription>
                Complete breakdown of cleaning supply order
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Property</div>
                    <div className="font-semibold" data-testid="text-order-property">{selectedOrder.propertyName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Submitted By</div>
                    <div className="font-semibold" data-testid="text-order-submitter">{selectedOrder.submittedBy}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Order Date</div>
                    <div className="font-semibold" data-testid="text-order-date">{selectedOrder.orderDate}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Status</div>
                    <div data-testid="text-order-status">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  {selectedOrder.submittedAt && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Submitted At</div>
                      <div className="font-semibold" data-testid="text-order-submitted-at">
                        {format(new Date(selectedOrder.submittedAt), "PPpp")}
                      </div>
                    </div>
                  )}
                  {selectedOrder.verifiedAt && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Verified At</div>
                      <div className="font-semibold text-green-600" data-testid="text-order-verified-at">
                        {format(new Date(selectedOrder.verifiedAt), "PPpp")}
                      </div>
                    </div>
                  )}
                </div>

                {/* Items Ordered */}
                <div>
                  <h3 className="font-semibold text-lg mb-3" data-testid="text-items-heading">
                    Items Ordered ({selectedOrder.items.length})
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Item</TableHead>
                          <TableHead className="font-semibold text-right">Quantity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => (
                          <TableRow key={index} data-testid={`row-item-${index}`}>
                            <TableCell className="font-medium" data-testid={`cell-item-name-${index}`}>
                              {item.name}
                            </TableCell>
                            <TableCell className="text-right font-semibold" data-testid={`cell-item-quantity-${index}`}>
                              {item.quantity}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2" data-testid="text-notes-heading">Additional Notes</h3>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm" data-testid="text-order-notes">{selectedOrder.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
