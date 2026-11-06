import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Package, Send, CheckCircle, Clock, Truck, Building2, Upload, FileText, TrendingUp, AlertTriangle, Calendar as CalendarIcon, Trash2, Plus, MessageSquare, Mail } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { InstructionPanel } from "@/components/instruction-panel";
import { dwellLinenInstructions } from "@/lib/page-instructions";
import { staggerContainer, staggerItem } from "@/lib/animations";
import type { DwellLinenOrder, LinenDeliveryNote, LinenOrderSchedule } from "@shared/schema";

const formSchema = z.object({
  building: z.enum(["dwell", "heritage"], { required_error: "Please select a building" }),
  cagesToCollect: z.string().min(1, "Required").transform((val) => parseInt(val, 10)),
  pillowcases: z.string().transform((val) => parseInt(val, 10) || 0),
  singleSheets: z.string().transform((val) => parseInt(val, 10) || 0),
  singleDuvets: z.string().transform((val) => parseInt(val, 10) || 0),
  superkingSheets: z.string().transform((val) => parseInt(val, 10) || 0),
  superkingDuvets: z.string().transform((val) => parseInt(val, 10) || 0),
  bathTowels: z.string().transform((val) => parseInt(val, 10) || 0),
  handTowels: z.string().transform((val) => parseInt(val, 10) || 0),
  bathMats: z.string().transform((val) => parseInt(val, 10) || 0),
  teaTowels: z.string().transform((val) => parseInt(val, 10) || 0),
});

type FormValues = z.infer<typeof formSchema>;

const scheduleFormSchema = z.object({
  scheduleDay: z.string().min(1, "Required"),
  scheduleTime: z.string().min(1, "Required"),
  recipientName: z.string().min(1, "Required"),
  recipientPhone: z.string().min(1, "Required"),
  isActive: z.boolean().default(true),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function HotelLinenOrders() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBuilding, setSelectedBuilding] = useState<string>("all");
  const [uploadBuilding, setUploadBuilding] = useState<string>("dwell");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery<DwellLinenOrder[]>({
    queryKey: ["/api/dwell-linen"],
  });

  // Fetch delivery notes
  const { data: deliveryNotes = [], isLoading: notesLoading } = useQuery<LinenDeliveryNote[]>({
    queryKey: ["/api/linen-delivery-notes"],
  });

  // Fetch analytics
  const { data: analytics } = useQuery<any>({
    queryKey: ["/api/linen-delivery-notes/analytics"],
  });

  // Fetch schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<LinenOrderSchedule[]>({
    queryKey: ["/api/linen-order-schedules"],
  });

  const filteredOrders = orders.filter((order) => {
    const statusMatch = selectedStatus === "all" || order.status === selectedStatus;
    const buildingMatch = selectedBuilding === "all" || order.building === selectedBuilding;
    return statusMatch && buildingMatch;
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      building: "dwell",
      cagesToCollect: "0",
      pillowcases: "0",
      singleSheets: "0",
      singleDuvets: "0",
      superkingSheets: "0",
      superkingDuvets: "0",
      bathTowels: "0",
      handTowels: "0",
      bathMats: "0",
      teaTowels: "0",
    },
  });

  const scheduleForm = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      scheduleDay: "monday",
      scheduleTime: "09:00",
      recipientName: "StaffC",
      recipientPhone: "",
      isActive: true,
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return await apiRequest("/api/dwell-linen-orders", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dwell-linen-orders"] });
      toast({
        title: "Order Placed Successfully",
        description: "Automated notifications have been sent to the team.",
        variant: "default",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/dwell-linen-orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dwell-linen-orders"] });
      toast({
        title: "Status Updated",
        description: "Order status has been updated successfully.",
      });
    },
  });

  const confirmOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/linen-order/${id}/confirm`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dwell-linen-orders"] });
      toast({
        title: "Order Confirmed",
        description: "Order has been confirmed and Imperial has been notified via email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormValues) => {
      if (editingScheduleId) {
        return await apiRequest(`/api/linen-order-schedules/${editingScheduleId}`, {
          method: "PATCH",
          body: JSON.stringify(data),
        });
      } else {
        return await apiRequest("/api/linen-order-schedules", {
          method: "POST",
          body: JSON.stringify(data),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linen-order-schedules"] });
      toast({
        title: editingScheduleId ? "Schedule Updated" : "Schedule Created",
        description: editingScheduleId 
          ? "Automated schedule has been updated successfully."
          : "Automated schedule has been created successfully.",
      });
      scheduleForm.reset();
      setEditingScheduleId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/linen-order-schedules/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/linen-order-schedules"] });
      toast({
        title: "Schedule Deleted",
        description: "Automated schedule has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createOrderMutation.mutate(data);
  };

  const onScheduleSubmit = (data: ScheduleFormValues) => {
    createScheduleMutation.mutate(data);
  };

  const handleEditSchedule = (schedule: LinenOrderSchedule) => {
    setEditingScheduleId(schedule.id);
    scheduleForm.reset({
      scheduleDay: schedule.scheduleDay,
      scheduleTime: schedule.scheduleTime,
      recipientName: schedule.recipientName,
      recipientPhone: schedule.recipientPhone,
      isActive: schedule.isActive,
    });
  };

  const handleCancelEdit = () => {
    setEditingScheduleId(null);
    scheduleForm.reset();
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast({
        title: "No File Selected",
        description: "Please select a PDF file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", uploadFile);
      formData.append("building", uploadBuilding);

      const response = await fetch("/api/linen-delivery-notes/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();

      toast({
        title: "Delivery Note Extracted Successfully",
        description: `Fulfillment: ${result.analytics.fulfillmentPercentage}% • ${result.analytics.totalDelivered}/${result.analytics.totalOrdered} items delivered`,
        variant: "default",
      });

      // Reset upload state
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ["/api/linen-delivery-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/linen-delivery-notes/analytics"] });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "awaiting_confirmation":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "confirmed":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "sent_to_imperial":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "delivered":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "awaiting_confirmation":
        return <AlertTriangle className="h-4 w-4" />;
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />;
      case "sent_to_imperial":
        return <Mail className="h-4 w-4" />;
      case "delivered":
        return <Truck className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "awaiting_confirmation":
        return "Awaiting Confirmation";
      case "sent_to_imperial":
        return "Sent to Imperial";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const filteredDeliveryNotes = deliveryNotes.filter((note) => {
    return selectedBuilding === "all" || note.building === selectedBuilding;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Hotel Linen Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Order linen supplies and track Imperial delivery verification - managed by StaffC
          </p>
        </div>
        <InstructionPanel instructions={dwellLinenInstructions} />
      </div>

      <Tabs defaultValue="ordering" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ordering" data-testid="tab-ordering">
            <Package className="h-4 w-4 mr-2" />
            Ordering
          </TabsTrigger>
          <TabsTrigger value="schedules" data-testid="tab-schedules">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Automated Schedules
          </TabsTrigger>
          <TabsTrigger value="delivery" data-testid="tab-delivery">
            <FileText className="h-4 w-4 mr-2" />
            Delivery Verification
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* ORDERING TAB */}
        <TabsContent value="ordering" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card data-testid="card-order-form">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                New Linen Order
              </CardTitle>
              <CardDescription>
                Place a new order - notifications will be sent automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="building"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-building">
                              <SelectValue placeholder="Select building" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="dwell">Building A</SelectItem>
                            <SelectItem value="heritage">Building B</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cagesToCollect"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cages to Collect *</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} data-testid="input-cages" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pillowcases"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pillowcases</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} data-testid="input-pillowcases" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="singleSheets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Single Sheets</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} data-testid="input-single-sheets" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="singleDuvets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Single Duvets</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} data-testid="input-single-duvets" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="superkingSheets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Superking Sheets</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} data-testid="input-superking-sheets" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="superkingDuvets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Superking Duvets</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} data-testid="input-superking-duvets" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bathTowels"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bath Towels</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} data-testid="input-bath-towels" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="handTowels"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hand Towels</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} data-testid="input-hand-towels" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bathMats"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bath Mats</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} data-testid="input-bath-mats" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="teaTowels"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tea Towels</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" placeholder="0" {...field} data-testid="input-tea-towels" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createOrderMutation.isPending}
                    data-testid="button-submit-order"
                  >
                    {createOrderMutation.isPending ? "Placing Order..." : "Place Order & Send Notifications"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Order History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card data-testid="card-order-history">
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-sm font-medium">Building:</span>
                    {["all", "dwell", "heritage"].map((building) => (
                      <Badge
                        key={building}
                        variant={selectedBuilding === building ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setSelectedBuilding(building)}
                        data-testid={`badge-filter-building-${building}`}
                      >
                        {building.charAt(0).toUpperCase() + building.slice(1)}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-sm font-medium">Status:</span>
                    {["all", "pending", "awaiting_confirmation", "sent_to_imperial"].map((status) => (
                      <Badge
                        key={status}
                        variant={selectedStatus === status ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setSelectedStatus(status)}
                        data-testid={`badge-filter-${status}`}
                      >
                        {status === "awaiting_confirmation" ? "Awaiting Confirm" : status === "sent_to_imperial" ? "Sent to Imperial" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : filteredOrders.length === 0 ? (
                <p className="text-muted-foreground">No orders found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Building</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted By</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <motion.tr variants={staggerContainer} initial="initial" animate="animate">
                        {filteredOrders.map((order) => {
                          const itemCount = 
                            order.pillowcases +
                            order.singleSheets +
                            order.singleDuvets +
                            order.superkingSheets +
                            order.superkingDuvets +
                            order.bathTowels +
                            order.handTowels +
                            order.bathMats +
                            order.teaTowels;

                          const buildingName = order.building === 'heritage' ? 'Building B' : 'Building A';

                          return (
                            <motion.tr key={order.id} variants={staggerItem} data-testid={`row-order-${order.id}`}>
                              <TableCell className="font-medium" data-testid={`text-order-date-${order.id}`}>
                                {format(new Date(order.createdAt), "MMM d, yyyy")}
                                <br />
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(order.createdAt), "h:mm a")}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" data-testid={`badge-building-${order.id}`}>
                                  {buildingName}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{order.cagesToCollect} cages</div>
                                  <div className="text-muted-foreground">{itemCount} items</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(order.status)} data-testid={`badge-status-${order.id}`}>
                                  <span className="flex items-center gap-1">
                                    {getStatusIcon(order.status)}
                                    {getStatusLabel(order.status)}
                                  </span>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div className="font-medium">{order.submittedBy || "N/A"}</div>
                                  {order.submittedAt && (
                                    <div className="text-xs text-muted-foreground">
                                      {format(new Date(order.submittedAt), "MMM d, h:mm a")}
                                    </div>
                                  )}
                                  {order.confirmedBy && order.confirmedAt && (
                                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                      Confirmed by staff
                                      <br />
                                      {format(new Date(order.confirmedAt), "MMM d, h:mm a")}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 flex-col">
                                  {order.status === "awaiting_confirmation" && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => confirmOrderMutation.mutate(order.id)}
                                      disabled={confirmOrderMutation.isPending}
                                      data-testid={`button-confirm-send-${order.id}`}
                                    >
                                      <Mail className="h-4 w-4 mr-1" />
                                      Confirm & Send to Imperial
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </motion.tr>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
          </div>
        </TabsContent>

        {/* AUTOMATED SCHEDULES TAB */}
        <TabsContent value="schedules" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Schedule Form */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card data-testid="card-schedule-form">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    {editingScheduleId ? "Edit Schedule" : "Create Schedule"}
                  </CardTitle>
                  <CardDescription>
                    Set up automated SMS reminders for StaffC to submit linen orders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...scheduleForm}>
                    <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)} className="space-y-4">
                      <FormField
                        control={scheduleForm.control}
                        name="scheduleDay"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Day of Week *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-schedule-day">
                                  <SelectValue placeholder="Select day" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {DAYS_OF_WEEK.map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {day.charAt(0).toUpperCase() + day.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={scheduleForm.control}
                        name="scheduleTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time *</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} data-testid="input-schedule-time" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={scheduleForm.control}
                        name="recipientName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="StaffC" {...field} data-testid="input-recipient-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={scheduleForm.control}
                        name="recipientPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Phone *</FormLabel>
                            <FormControl>
                              <Input placeholder="+447123456789" {...field} data-testid="input-recipient-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={scheduleForm.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel>Active</FormLabel>
                              <div className="text-sm text-muted-foreground">
                                Enable this schedule to send automated SMS
                              </div>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-schedule-active"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          className="flex-1"
                          disabled={createScheduleMutation.isPending}
                          data-testid="button-save-schedule"
                        >
                          {createScheduleMutation.isPending 
                            ? "Saving..." 
                            : editingScheduleId 
                            ? "Update Schedule" 
                            : "Create Schedule"}
                        </Button>
                        {editingScheduleId && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelEdit}
                            data-testid="button-cancel-edit"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Message Preview */}
              <Card className="mt-6" data-testid="card-message-preview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    SMS Preview
                  </CardTitle>
                  <CardDescription>
                    This is what StaffC will receive via SMS
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <p className="text-sm font-medium mb-2">To: {scheduleForm.watch("recipientName")} ({scheduleForm.watch("recipientPhone") || "Phone not set"})</p>
                    <p className="text-sm">
                      Hi {scheduleForm.watch("recipientName")}, it's time to submit the weekly linen order! Click the link to fill out the form: [Secure Link]
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Schedules List */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <Card data-testid="card-schedules-list">
                <CardHeader>
                  <CardTitle>Active Schedules</CardTitle>
                  <CardDescription>
                    Manage automated linen order reminders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {schedulesLoading ? (
                    <p className="text-muted-foreground">Loading...</p>
                  ) : schedules.length === 0 ? (
                    <p className="text-muted-foreground">No schedules configured yet</p>
                  ) : (
                    <div className="space-y-3">
                      {schedules.map((schedule) => (
                        <Card key={schedule.id} data-testid={`card-schedule-${schedule.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant={schedule.isActive ? "default" : "secondary"} data-testid={`badge-schedule-status-${schedule.id}`}>
                                    {schedule.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  <span className="text-sm font-medium">
                                    {schedule.scheduleDay.charAt(0).toUpperCase() + schedule.scheduleDay.slice(1)} at {schedule.scheduleTime}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <div>Recipient: {schedule.recipientName}</div>
                                  <div>Phone: {schedule.recipientPhone}</div>
                                  {schedule.lastSentDate && (
                                    <div className="text-xs">
                                      Last sent: {format(new Date(schedule.lastSentDate), "MMM d, yyyy")}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditSchedule(schedule)}
                                  data-testid={`button-edit-schedule-${schedule.id}`}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                                  disabled={deleteScheduleMutation.isPending}
                                  data-testid={`button-delete-schedule-${schedule.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* DELIVERY VERIFICATION TAB */}
        <TabsContent value="delivery" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PDF Upload Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card data-testid="card-pdf-upload">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Delivery Note
                  </CardTitle>
                  <CardDescription>
                    Upload Imperial's PDF delivery note for automatic extraction
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Building *</label>
                    <Select value={uploadBuilding} onValueChange={setUploadBuilding}>
                      <SelectTrigger data-testid="select-upload-building">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dwell">Building A</SelectItem>
                        <SelectItem value="heritage">Building B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Delivery Note PDF *</label>
                    <Input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      data-testid="input-pdf-file"
                    />
                    {uploadFile && (
                      <p className="text-sm text-muted-foreground mt-2" data-testid="text-filename">
                        Selected: {uploadFile.name}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleFileUpload}
                    disabled={!uploadFile || isUploading}
                    className="w-full"
                    data-testid="button-upload-pdf"
                  >
                    {isUploading ? "Extracting..." : "Upload & Extract Data"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Building Filter */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
              <Card data-testid="card-filter">
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                  <CardDescription>Filter delivery notes by building</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {["all", "dwell", "heritage"].map((building) => (
                      <Badge
                        key={building}
                        variant={selectedBuilding === building ? "default" : "outline"}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setSelectedBuilding(building)}
                        data-testid={`badge-filter-delivery-${building}`}
                      >
                        {building.charAt(0).toUpperCase() + building.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Delivery Notes Table */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <Card data-testid="card-delivery-notes">
              <CardHeader>
                <CardTitle>Delivery Notes</CardTitle>
                <CardDescription>
                  All uploaded delivery notes with fulfillment tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                {notesLoading ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : filteredDeliveryNotes.length === 0 ? (
                  <p className="text-muted-foreground">No delivery notes found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Building</TableHead>
                          <TableHead>Del Note #</TableHead>
                          <TableHead>Ordered</TableHead>
                          <TableHead>Delivered</TableHead>
                          <TableHead>To Follow</TableHead>
                          <TableHead>Fulfillment %</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDeliveryNotes.map((note) => {
                          const fulfillmentPercentage = note.totalOrdered > 0
                            ? Math.round((note.totalDelivered / note.totalOrdered) * 100)
                            : 0;

                          return (
                            <TableRow key={note.id} data-testid={`row-note-${note.id}`}>
                              <TableCell className="font-medium" data-testid={`text-note-date-${note.id}`}>
                                {note.deliveryDate ? format(new Date(note.deliveryDate), "MMM d, yyyy") : "N/A"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" data-testid={`badge-note-building-${note.id}`}>
                                  {note.building === "heritage" ? "Building B" : "Building A"}
                                </Badge>
                              </TableCell>
                              <TableCell data-testid={`text-note-number-${note.id}`}>
                                {note.deliveryNoteNumber}
                              </TableCell>
                              <TableCell data-testid={`text-ordered-${note.id}`}>
                                {note.totalOrdered}
                              </TableCell>
                              <TableCell data-testid={`text-delivered-${note.id}`}>
                                {note.totalDelivered}
                              </TableCell>
                              <TableCell data-testid={`text-to-follow-${note.id}`}>
                                {note.totalToFollow}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    fulfillmentPercentage === 100
                                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                                      : fulfillmentPercentage >= 75
                                      ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                      : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                  }
                                  data-testid={`badge-fulfillment-${note.id}`}
                                >
                                  {fulfillmentPercentage}%
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(note.pdfUrl, "_blank")}
                                  data-testid={`button-view-pdf-${note.id}`}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  View PDF
                                </Button>
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
          </motion.div>
        </TabsContent>

        {/* ANALYTICS TAB */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Overall Stats Cards */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <motion.div variants={staggerItem}>
              <Card data-testid="card-stat-total-deliveries">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Deliveries</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-deliveries">
                    {analytics?.totalDeliveries || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All-time delivery notes
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card data-testid="card-stat-avg-fulfillment">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Fulfillment</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-fulfillment">
                    {analytics?.avgFulfillmentPercentage || 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average across all deliveries
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Card data-testid="card-stat-total-to-follow">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total To Follow</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-to-follow">
                    {analytics?.totalToFollowItems || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Items pending delivery
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Week-over-week Trends */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <Card data-testid="card-weekly-trends">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Week-over-Week Fulfillment Trends
                </CardTitle>
                <CardDescription>
                  Fulfillment percentage by week
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.weeklyTrends && analytics.weeklyTrends.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Week</TableHead>
                          <TableHead>Deliveries</TableHead>
                          <TableHead>Avg Fulfillment</TableHead>
                          <TableHead>Total Ordered</TableHead>
                          <TableHead>Total Delivered</TableHead>
                          <TableHead>Total To Follow</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.weeklyTrends.map((week: any, index: number) => (
                          <TableRow key={index} data-testid={`row-week-${index}`}>
                            <TableCell className="font-medium" data-testid={`text-week-${index}`}>
                              {week.week}
                            </TableCell>
                            <TableCell data-testid={`text-week-deliveries-${index}`}>
                              {week.deliveryCount}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  week.avgFulfillmentPercentage === 100
                                    ? "bg-green-500/10 text-green-500 border-green-500/20"
                                    : week.avgFulfillmentPercentage >= 75
                                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                                }
                                data-testid={`badge-week-fulfillment-${index}`}
                              >
                                {week.avgFulfillmentPercentage}%
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-week-ordered-${index}`}>
                              {week.totalOrdered}
                            </TableCell>
                            <TableCell data-testid={`text-week-delivered-${index}`}>
                              {week.totalDelivered}
                            </TableCell>
                            <TableCell data-testid={`text-week-to-follow-${index}`}>
                              {week.totalToFollow}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No weekly trend data available</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Top 10 "To Follow" Items */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <Card data-testid="card-top-to-follow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Top 10 "To Follow" Items
                </CardTitle>
                <CardDescription>
                  Items most frequently short on delivery
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.topToFollowItems && analytics.topToFollowItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rank</TableHead>
                          <TableHead>Item Description</TableHead>
                          <TableHead>Total To Follow</TableHead>
                          <TableHead>Occurrences</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.topToFollowItems.map((item: any, index: number) => (
                          <TableRow key={index} data-testid={`row-item-${index}`}>
                            <TableCell className="font-medium" data-testid={`text-rank-${index}`}>
                              #{index + 1}
                            </TableCell>
                            <TableCell data-testid={`text-item-description-${index}`}>
                              {item.itemDescription}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" data-testid={`badge-item-count-${index}`}>
                                {item.totalToFollow}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-item-occurrences-${index}`}>
                              {item.occurrences} times
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No "to follow" items data available</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
