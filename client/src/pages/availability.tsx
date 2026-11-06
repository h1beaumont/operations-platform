import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Send, Loader2, UserPlus, Trash2, CheckCircle2, Clock, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff, AvailabilityResponse, AvailabilityRequest } from "@shared/schema";
import { insertStaffSchema } from "@shared/schema";
import { cn } from "@/lib/utils";
import { InstructionPanel } from "@/components/instruction-panel";
import { availabilityInstructions } from "@/lib/page-instructions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";

const staffFormSchema = insertStaffSchema.extend({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  roleType: z.enum(["driver", "non-driver"]),
  hireDate: z.string().optional(),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

export default function AvailabilityMatrixV2() {
  const { toast } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [deleteStaffId, setDeleteStaffId] = useState<string | null>(null);

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const { data: staff = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: responses = [], isLoading: responsesLoading } = useQuery<AvailabilityResponse[]>({
    queryKey: ["/api/availability-responses", format(currentWeekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(
        `/api/availability-responses?startDate=${format(currentWeekStart, "yyyy-MM-dd")}&endDate=${format(weekEnd, "yyyy-MM-dd")}`
      );
      if (!response.ok) throw new Error("Failed to fetch availability responses");
      return response.json();
    },
  });

  // Fetch most recent availability request
  const { data: recentRequests = [] } = useQuery<AvailabilityRequest[]>({
    queryKey: ["/api/availability-requests"],
  });

  const mostRecentRequest = recentRequests[0];

  // Fetch submission status for most recent request
  const { data: submissionStatus = [], isLoading: submissionStatusLoading } = useQuery<Array<{ staffId: string; staffName: string; phone: string | null; token: string; submitted: boolean }>>({
    queryKey: ["/api/availability-requests", mostRecentRequest?.id, "status"],
    queryFn: async () => {
      if (!mostRecentRequest?.id) return [];
      const response = await fetch(`/api/availability-requests/${mostRecentRequest.id}/status`);
      if (!response.ok) throw new Error("Failed to fetch submission status");
      return response.json();
    },
    enabled: !!mostRecentRequest?.id,
  });

  const sendSMSMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/availability-requests/send", { sendSMS: true });
    },
    onSuccess: (data: any) => {
      toast({
        title: "SMS Sent!",
        description: data.message || `Sent to ${data.sentCount} staff members`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability-responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availability-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS requests",
        variant: "destructive",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      if (!mostRecentRequest?.id) throw new Error("No recent request found");
      return apiRequest("POST", `/api/availability-requests/${mostRecentRequest.id}/send-reminders`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Reminders Sent!",
        description: data.message || `Sent to ${data.sentCount} non-responders`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminders",
        variant: "destructive",
      });
    },
  });

  const sendNudgeMutation = useMutation({
    mutationFn: async () => {
      if (!mostRecentRequest?.id) throw new Error("No recent request found");
      return apiRequest("POST", `/api/availability-requests/${mostRecentRequest.id}/nudge`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Nudge Sent!",
        description: data.message || `Nudged ${data.sentCount} non-responders`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send nudge",
        variant: "destructive",
      });
    },
  });

  const sendIndividualNudgeMutation = useMutation({
    mutationFn: async (staffId: string) => {
      if (!mostRecentRequest?.id) throw new Error("No recent request found");
      return apiRequest("POST", `/api/availability-requests/${mostRecentRequest.id}/nudge/${staffId}`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Nudge Sent!",
        description: data.message || `Nudged ${data.staffName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/availability-requests"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send nudge",
        variant: "destructive",
      });
    },
  });

  // Add staff form
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      roleType: "non-driver",
      hireDate: "",
    },
  });

  // Create staff mutation
  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormValues) => {
      return apiRequest("POST", "/api/staff", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Success",
        description: "Staff member added successfully",
      });
      setAddStaffOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add staff member",
        variant: "destructive",
      });
    },
  });

  // Delete staff mutation
  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/staff/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({
        title: "Success",
        description: "Staff member removed successfully",
      });
      setDeleteStaffId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove staff member",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StaffFormValues) => {
    createStaffMutation.mutate(data);
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const isLoading = staffLoading || responsesLoading;
  const today = new Date();

  const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
  const timeSlotLabels: Record<string, string> = {
    "10:00": "10am",
    "11:00": "11am",
    "12:00": "12pm",
    "13:00": "1pm",
    "14:00": "2pm",
    "15:00": "3pm",
  };

  // Build response map: staffId -> date -> timeSlot -> available
  const responseMap = new Map<string, Map<string, Map<string, boolean | null>>>();
  responses.forEach((response) => {
    if (!responseMap.has(response.staffId)) {
      responseMap.set(response.staffId, new Map());
    }
    if (!responseMap.get(response.staffId)!.has(response.date)) {
      responseMap.get(response.staffId)!.set(response.date, new Map());
    }
    responseMap.get(response.staffId)!.get(response.date)!.set(response.timeSlot, response.available);
  });

  const getStaffAvailabilityForDate = (staffId: string, date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayMap = responseMap.get(staffId)?.get(dateStr);
    if (!dayMap) return null;

    const availableSlots = timeSlots.filter((slot) => dayMap.get(slot) === true).length;
    const nullSlots = timeSlots.filter((slot) => dayMap.get(slot) === null).length;
    const totalSlots = timeSlots.length;

    // If all slots are null, return null to indicate "awaiting response"
    if (nullSlots === totalSlots) return null;

    // Simple logic: either full shift available or unavailable
    // Available = ALL slots marked as available (full 10am-3pm shift)
    // Unavailable = anything else (partial availability or marked unavailable)
    if (availableSlots === totalSlots) return "available";
    return "unavailable";
  };

  // Calculate staff not included in current request (only after data loads)
  const activeStaffWithPhones = staff.filter(s => s.status === "active" && s.phone);
  const staffInCurrentRequest = submissionStatus.map(s => s.staffId);
  const missingStaff = activeStaffWithPhones.filter(s => !staffInCurrentRequest.includes(s.id));
  const hasMissingStaff = missingStaff.length > 0 && mostRecentRequest && !submissionStatusLoading;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <CardTitle data-testid="text-availability-title">Availability Matrix</CardTitle>
                <CardDescription>
                  Staff availability for the week of {format(currentWeekStart, "MMM d, yyyy")}
                </CardDescription>
              </div>
              <InstructionPanel {...availabilityInstructions} />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
                data-testid="button-current-week"
              >
                <CalendarIcon className="h-4 w-4" />
                Today
              </Button>
              <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-add-staff">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-staff">
                  <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                    <DialogDescription>
                      Add a new cleaner to the availability system
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter full name" data-testid="input-full-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter email address" type="email" data-testid="input-email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="+447700900000" type="tel" data-testid="input-phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="roleType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-role">
                                  <SelectValue placeholder="Select role type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="driver">Driver</SelectItem>
                                <SelectItem value="non-driver">Non-Driver</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="hireDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hire Date (Optional)</FormLabel>
                            <FormControl>
                              <Input type="date" data-testid="input-hire-date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setAddStaffOpen(false)}
                          data-testid="button-cancel-add"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createStaffMutation.isPending}
                          data-testid="button-submit-add"
                        >
                          {createStaffMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Adding...
                            </>
                          ) : (
                            "Add Staff"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Button
                variant="default"
                size="sm"
                onClick={() => sendSMSMutation.mutate()}
                disabled={sendSMSMutation.isPending}
                data-testid="button-send-sms"
                title="Create new availability request for ALL active staff"
              >
                {sendSMSMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {hasMissingStaff ? "Send New Request to All Staff" : "Send SMS"}
              </Button>
            </div>
          </div>

          {/* Alert: New staff not included in current request */}
          {hasMissingStaff && (
            <Alert className="mt-4" data-testid="alert-missing-staff">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{missingStaff.length} staff member{missingStaff.length > 1 ? 's' : ''} not included in the current request:</strong>{' '}
                {missingStaff.map(s => s.fullName).join(', ')}. 
                Click <strong>"Send New Request to All Staff"</strong> above to create a fresh availability request that includes everyone.
              </AlertDescription>
            </Alert>
          )}

          {/* Submission Status Section - Only show staff who haven't submitted */}
          {mostRecentRequest && submissionStatus.filter(s => !s.submitted).length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Not Yet Submitted</h3>
                  <div className="flex flex-wrap gap-2">
                    {submissionStatus
                      .filter((status) => !status.submitted)
                      .map((status) => (
                        <div
                          key={status.staffId}
                          className="flex items-center gap-1"
                        >
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                            data-testid={`badge-status-${status.staffId}`}
                          >
                            <Clock className="h-3 w-3" />
                            <span>{status.staffName}</span>
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => sendIndividualNudgeMutation.mutate(status.staffId)}
                            disabled={sendIndividualNudgeMutation.isPending}
                            data-testid={`button-nudge-individual-${status.staffId}`}
                            title={`Nudge ${status.staffName}`}
                          >
                            <Bell className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                  </div>
                  {mostRecentRequest.deadline && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Deadline: {new Date(mostRecentRequest.deadline).toLocaleString('en-GB', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!mostRecentRequest.reminderSentAt && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendReminderMutation.mutate()}
                      disabled={sendReminderMutation.isPending || submissionStatus.every(s => s.submitted)}
                      data-testid="button-send-reminder"
                    >
                      {sendReminderMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Bell className="h-4 w-4 mr-1" />
                      )}
                      Send Reminder
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sendNudgeMutation.mutate()}
                    disabled={sendNudgeMutation.isPending || submissionStatus.every(s => s.submitted)}
                    data-testid="button-nudge"
                  >
                    {sendNudgeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Bell className="h-4 w-4 mr-1" />
                    )}
                    Nudge
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              data-testid="button-previous-week"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Week
            </Button>
            <span className="text-sm font-medium" data-testid="text-week-range">
              {format(currentWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
              data-testid="button-next-week"
            >
              Next Week
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="loading-availability">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading availability...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" data-testid="table-availability">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="border p-2 text-left bg-muted font-medium sticky left-0 z-30">
                      Staff Member
                    </th>
                    {weekDays.map((day) => (
                      <th
                        key={day.toISOString()}
                        className={cn(
                          "border p-2 text-center font-medium min-w-[100px] sticky top-0 z-20",
                          isSameDay(day, today) ? "bg-primary/10" : "bg-muted"
                        )}
                        data-testid={`header-day-${format(day, "yyyy-MM-dd")}`}
                      >
                        <div className="text-sm">{format(day, "EEE")}</div>
                        <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border p-4 text-center text-muted-foreground">
                        No staff members found
                      </td>
                    </tr>
                  ) : (
                    staff.map((staffMember) => (
                      <tr key={staffMember.id} data-testid={`row-staff-${staffMember.id}`}>
                        <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm">{staffMember.fullName}</div>
                              <div className="text-xs text-muted-foreground">{staffMember.roleType}</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteStaffId(staffMember.id)}
                              className="h-6 w-6 shrink-0"
                              data-testid={`button-delete-${staffMember.id}`}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </td>
                        {weekDays.map((day) => {
                          const status = getStaffAvailabilityForDate(staffMember.id, day);
                          const isCurrentDay = isSameDay(day, today);
                          
                          return (
                            <td
                              key={day.toISOString()}
                              className={cn(
                                "border p-2 text-center",
                                isCurrentDay && "bg-primary/5",
                                status === "available" && "bg-green-100 dark:bg-green-900/30",
                                status === "unavailable" && "bg-red-100 dark:bg-red-900/30",
                                status === null && "bg-gray-50 dark:bg-gray-800/30"
                              )}
                              data-testid={`cell-availability-${staffMember.id}-${format(day, "yyyy-MM-dd")}`}
                            >
                              {status === "available" && (
                                <div className="flex flex-col items-center">
                                  <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
                                  <span className="text-xs text-muted-foreground">Full shift</span>
                                </div>
                              )}
                              {status === "unavailable" && (
                                <div className="flex flex-col items-center">
                                  <span className="text-red-600 dark:text-red-400 text-2xl">✗</span>
                                  <span className="text-xs text-muted-foreground">Unavailable</span>
                                </div>
                              )}
                              {status === null && (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 border" />
              <span>Full Shift Available (10am-3pm)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 border" />
              <span>Unavailable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 dark:bg-gray-800/30 border" />
              <span>No Response</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteStaffId} onOpenChange={(open) => !open && setDeleteStaffId(null)}>
        <AlertDialogContent data-testid="alert-delete-staff">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this staff member from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteStaffId && deleteStaffMutation.mutate(deleteStaffId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteStaffMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Removing...
                </>
              ) : (
                "Remove Staff"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
