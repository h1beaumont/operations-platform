import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Send, Pencil, Trash2, Loader2, Calendar, Clock, Phone, MapPin, Smartphone, CheckCircle2 } from "lucide-react";
import type { CleaningOrderSchedule } from "@shared/schema";
import { InstructionPanel } from "@/components/instruction-panel";
import { PageTransition } from "@/lib/animations";

const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export default function CleaningOrderAdmin() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<CleaningOrderSchedule | null>(null);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  
  // Form state
  const [formData, setFormData] = useState({
    propertyName: "",
    scheduleDay: "sunday",
    scheduleTime: "11:00",
    recipientName: "",
    recipientPhone: "",
    deliveryDay: "thursday",
    isActive: true,
  });

  const { data: schedules = [], isLoading } = useQuery<CleaningOrderSchedule[]>({
    queryKey: ["/api/cleaning-order-schedules"],
  });

  // Fetch active staff for selector
  const { data: activeStaff } = useQuery({
    queryKey: ["/api/staff/active"],
  });

  // Fetch QR code for cleaning assistant
  const { data: qrData } = useQuery<{ qrCode: string; url: string }>({
    queryKey: ["/api/cleaning-assistant/qr-code"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/cleaning-order-schedules", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-order-schedules"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Schedule Created",
        description: "Cleaning supply reminder schedule has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create schedule",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof formData> }) => {
      return apiRequest("PATCH", `/api/cleaning-order-schedules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-order-schedules"] });
      setEditingSchedule(null);
      resetForm();
      toast({
        title: "Schedule Updated",
        description: "Schedule has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/cleaning-order-schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-order-schedules"] });
      toast({
        title: "Schedule Deleted",
        description: "Schedule has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete schedule",
        variant: "destructive",
      });
    },
  });

  const sendNowMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/cleaning-order-schedules/${id}/send-now`);
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success ? "SMS Sent Successfully" : "SMS Failed",
        description: data.success 
          ? "Reminder SMS has been sent successfully."
          : data.message || "Failed to send SMS",
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      propertyName: "",
      scheduleDay: "sunday",
      scheduleTime: "11:00",
      recipientName: "",
      recipientPhone: "",
      deliveryDay: "thursday",
      isActive: true,
    });
    setSelectedStaffId("");
  };

  const handleSubmit = () => {
    if (!formData.propertyName || !formData.recipientName || !formData.recipientPhone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingSchedule) {
      updateMutation.mutate({ id: editingSchedule.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openEditDialog = (schedule: CleaningOrderSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      propertyName: schedule.propertyName,
      scheduleDay: schedule.scheduleDay,
      scheduleTime: schedule.scheduleTime,
      recipientName: schedule.recipientName,
      recipientPhone: schedule.recipientPhone,
      deliveryDay: schedule.deliveryDay,
      isActive: schedule.isActive,
    });
    setSelectedStaffId("");
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingSchedule(null);
    resetForm();
  };

  const filteredSchedules = schedules.filter(schedule => {
    if (filterActive === "active") return schedule.isActive;
    if (filterActive === "inactive") return !schedule.isActive;
    return true;
  });

  return (
    <PageTransition>
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* QR Code for Cleaning Chatbot - AT THE TOP, LARGE AND SCANNABLE */}
        {qrData && (
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 rounded-3xl shadow-2xl p-12 border-8 border-red-500">
              {/* Critical Warning */}
              <div className="bg-red-600 text-white rounded-2xl p-8 mb-8 text-center shadow-xl">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-5xl font-black uppercase">IMPORTANT!</h3>
                </div>
                <p className="text-4xl font-bold leading-tight">
                  MUST CHECK FOR SPECIAL REQUEST ITEMS
                </p>
                <p className="text-2xl mt-4 opacity-90">
                  Replacement cutlery, glasses, lamps, duvets, and any items reported from previous cleans
                </p>
              </div>

              {/* Large QR Code - Centered and Prominent */}
              <div className="flex flex-col items-center justify-center">
                <div className="bg-white p-12 rounded-3xl shadow-2xl mb-8" style={{ maxWidth: '600px', width: '100%' }}>
                  <img 
                    src={qrData.qrCode} 
                    alt="Cleaning Assistant QR Code" 
                    className="w-full h-auto"
                    data-testid="img-qr-code"
                  />
                </div>

                {/* Instructions */}
                <div className="text-center space-y-6 max-w-3xl">
                  <div className="flex items-center justify-center gap-4 mb-4">
                    <Smartphone className="w-16 h-16 text-primary" />
                    <h3 className="text-5xl font-bold">Scan QR Code</h3>
                  </div>
                  <p className="text-3xl text-muted-foreground font-semibold">Use AI Chatbot for Linen Packing</p>

                  <div className="grid grid-cols-3 gap-6 mt-8">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <div className="text-2xl font-bold mb-2">Get Instant Answers</div>
                      <div className="text-lg text-muted-foreground">Ask about linen quantities and special requests</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <div className="text-2xl font-bold mb-2">Earn Points</div>
                      <div className="text-lg text-muted-foreground">+1.5 pts for using chatbot every time</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
                      <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <div className="text-2xl font-bold mb-2">No Missed Requests</div>
                      <div className="text-lg text-muted-foreground">+1.5 pts bonus for accuracy</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Office Number - ONLY this, NO Direct Booking Link */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 border-4 border-gray-300 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div>
                  <div className="text-lg text-muted-foreground mb-1">Office Number</div>
                  <div className="text-4xl font-bold" data-testid="text-office-number">+44 7700 900000</div>
                </div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('+44 7700 900000');
                }}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl flex items-center gap-3 text-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                data-testid="button-copy-office"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="heading-title">
              Cleaning Supplies Ordering
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-subtitle">
              Manage automated reminder schedules for cleaning supply orders
            </p>
          </div>

          <Dialog open={isAddDialogOpen || !!editingSchedule} onOpenChange={(open) => !open && closeDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-schedule">
                <Plus className="mr-2 h-4 w-4" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]" data-testid="dialog-schedule-form">
              <DialogHeader>
                <DialogTitle data-testid="text-dialog-title">
                  {editingSchedule ? "Edit Schedule" : "Add New Schedule"}
                </DialogTitle>
                <DialogDescription>
                  Configure automated SMS reminders for cleaning supply orders
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyName">Property Name *</Label>
                  <Input
                    id="propertyName"
                    data-testid="input-property-name"
                    value={formData.propertyName}
                    onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                    placeholder="e.g., Building C Quarters"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduleDay">Reminder Day *</Label>
                    <Select
                      value={formData.scheduleDay}
                      onValueChange={(value) => setFormData({ ...formData, scheduleDay: value })}
                    >
                      <SelectTrigger id="scheduleDay" data-testid="select-schedule-day">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day) => (
                          <SelectItem key={day} value={day} data-testid={`option-day-${day}`}>
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduleTime">Reminder Time *</Label>
                    <Input
                      id="scheduleTime"
                      type="time"
                      data-testid="input-schedule-time"
                      value={formData.scheduleTime}
                      onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                    />
                  </div>
                </div>

                {/* Staff Selector with Manual Override */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="staffSelector">Select Staff Member (or enter manually below)</Label>
                    <Select
                      value={selectedStaffId}
                      onValueChange={(staffId) => {
                        setSelectedStaffId(staffId);
                        const staff = activeStaff?.find((s: any) => s.id === staffId);
                        if (staff) {
                          setFormData({
                            ...formData,
                            recipientName: staff.fullName,
                            recipientPhone: staff.phone || "",
                          });
                        }
                      }}
                    >
                      <SelectTrigger id="staffSelector" data-testid="select-staff-member">
                        <SelectValue placeholder="Choose a staff member..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual" data-testid="option-manual-entry">
                          Manual Entry (Type Below)
                        </SelectItem>
                        {activeStaff?.map((staff: any) => (
                          <SelectItem key={staff.id} value={staff.id} data-testid={`option-staff-${staff.id}`}>
                            {staff.fullName} - {staff.phone || "No phone"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="recipientName">
                      Recipient Name {selectedStaffId && selectedStaffId !== "manual" && "(Auto-filled)"}
                    </Label>
                    <Input
                      id="recipientName"
                      data-testid="input-recipient-name"
                      value={formData.recipientName}
                      onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                      placeholder="Enter cleaner name"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="recipientPhone">
                      Recipient Phone {selectedStaffId && selectedStaffId !== "manual" && "(Auto-filled)"}
                    </Label>
                    <Input
                      id="recipientPhone"
                      data-testid="input-recipient-phone"
                      value={formData.recipientPhone}
                      onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                      placeholder="+44..."
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryDay">Delivery Day *</Label>
                  <Select
                    value={formData.deliveryDay}
                    onValueChange={(value) => setFormData({ ...formData, deliveryDay: value })}
                  >
                    <SelectTrigger id="deliveryDay" data-testid="select-delivery-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day) => (
                        <SelectItem key={day} value={day} data-testid={`option-delivery-${day}`}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    data-testid="switch-is-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active (enable automated reminders)</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeDialog} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-schedule"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingSchedule ? "Update" : "Create"} Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <InstructionPanel
          title="How the Cleaning Supplies Ordering System Works"
          description="Automated SMS reminders for cleaning supply orders"
          steps={[
            {
              step: 1,
              title: "Set Up Schedules",
              description: "Create reminder schedules for each property with recipient details.",
              tips: [
                "Specify property name, reminder day/time, and delivery day",
                "Add recipient name and phone number for SMS notifications",
                "Toggle active/inactive to control automated reminders",
              ],
            },
            {
              step: 2,
              title: "Automated Reminders",
              description: "System sends SMS automatically at scheduled time.",
              tips: [
                "SMS includes order submission link",
                "Link is valid for order completion",
                "Recipients can submit orders via mobile device",
              ],
            },
            {
              step: 3,
              title: "Test Manually",
              description: "Use 'Send Now' to test before relying on automation.",
              tips: [
                "Verify SMS delivery and link functionality",
                "Check order submission flow",
                "Ensure recipient can complete the form",
              ],
            },
            {
              step: 4,
              title: "Track Orders",
              description: "Monitor submissions in the Order Tracking page.",
              tips: [
                "View all sent reminders and order status",
                "Track which orders have been submitted",
                "Update order status as items are delivered",
              ],
            },
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle data-testid="text-schedules-title">Active Schedules</CardTitle>
                <CardDescription>
                  {filteredSchedules.length} schedule{filteredSchedules.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={filterActive === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterActive("all")}
                  data-testid="button-filter-all"
                >
                  All
                </Button>
                <Button
                  variant={filterActive === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterActive("active")}
                  data-testid="button-filter-active"
                >
                  Active
                </Button>
                <Button
                  variant={filterActive === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterActive("inactive")}
                  data-testid="button-filter-inactive"
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8" data-testid="loader-schedules">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSchedules.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground" data-testid="text-no-schedules">
                No schedules found. Create your first schedule to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-property">Property</TableHead>
                      <TableHead data-testid="header-recipient">Recipient</TableHead>
                      <TableHead data-testid="header-schedule">Schedule</TableHead>
                      <TableHead data-testid="header-delivery">Delivery Day</TableHead>
                      <TableHead data-testid="header-status">Status</TableHead>
                      <TableHead data-testid="header-actions">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchedules.map((schedule) => (
                      <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                        <TableCell data-testid={`cell-property-${schedule.id}`}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{schedule.propertyName}</span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-recipient-${schedule.id}`}>
                          <div>
                            <div className="font-medium">{schedule.recipientName}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {schedule.recipientPhone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-schedule-${schedule.id}`}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">{schedule.scheduleDay}</span>
                            <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                            <span>{schedule.scheduleTime}</span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`cell-delivery-${schedule.id}`}>
                          <span className="capitalize">{schedule.deliveryDay}</span>
                        </TableCell>
                        <TableCell data-testid={`cell-status-${schedule.id}`}>
                          <Badge variant={schedule.isActive ? "default" : "secondary"}>
                            {schedule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendNowMutation.mutate(schedule.id)}
                              disabled={sendNowMutation.isPending}
                              data-testid={`button-send-${schedule.id}`}
                            >
                              {sendNowMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-1" />
                                  Send Now
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(schedule)}
                              data-testid={`button-edit-${schedule.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this schedule?")) {
                                  deleteMutation.mutate(schedule.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${schedule.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
