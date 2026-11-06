import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Edit2, Trash2, 
  Clock, Users, Loader2, AlertCircle 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { 
  AdminStaff, AdminShiftTemplate, AdminScheduledShift,
  InsertAdminStaff, InsertAdminShiftTemplate, InsertAdminScheduledShift 
} from "@shared/schema";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" }
];

const STAFF_COLORS: Record<string, string> = {
  "StaffL": "bg-blue-500 dark:bg-blue-600",
  "Alex": "bg-purple-500 dark:bg-purple-600",
  "StaffB": "bg-green-500 dark:bg-green-600",
  "StaffA": "bg-orange-500 dark:bg-orange-600",
};

const staffFormSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  backupEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  preferredContact: z.string().default("email"),
  slackHandle: z.string().optional(),
  teamsHandle: z.string().optional(),
  role: z.string().optional(),
  employmentStatus: z.string().default("full-time"),
  receivesReminders: z.boolean().default(true),
});

const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  staffId: z.string().min(1, "Staff member is required"),
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  effectiveFrom: z.string().min(1, "Start date is required"),
  effectiveTo: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

const shiftFormSchema = z.object({
  staffId: z.string().min(1, "Staff member is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  notes: z.string().optional(),
});

export default function AdminAvailability() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("schedule");
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [editingStaff, setEditingStaff] = useState<AdminStaff | null>(null);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AdminShiftTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<AdminScheduledShift | null>(null);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);

  const weekStartStr = format(currentWeekStart, "yyyy-MM-dd");
  const weekEndStr = format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), "yyyy-MM-dd");

  // Queries
  const { data: adminStaff, isLoading: isLoadingStaff } = useQuery<AdminStaff[]>({
    queryKey: ["/api/admin-staff"],
  });

  const { data: shiftTemplates, isLoading: isLoadingTemplates } = useQuery<AdminShiftTemplate[]>({
    queryKey: ["/api/admin-shift-templates"],
  });

  const { data: shifts, isLoading: isLoadingShifts } = useQuery<AdminScheduledShift[]>({
    queryKey: ["/api/admin-shifts", { startDate: weekStartStr, endDate: weekEndStr }],
  });

  const { data: weeklyHoursSummary } = useQuery<Array<{
    staffId: string;
    staffName: string;
    totalHours: number;
    byDay: Record<string, number>;
  }>>({
    queryKey: ["/api/admin-shifts/weekly-summary", { startDate: weekStartStr, endDate: weekEndStr }],
  });

  // Forms
  const staffForm = useForm<z.infer<typeof staffFormSchema>>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      backupEmail: "",
      preferredContact: "email",
      slackHandle: "",
      teamsHandle: "",
      role: "",
      employmentStatus: "full-time",
      receivesReminders: true,
    },
  });

  const templateForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      staffId: "",
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      effectiveFrom: format(new Date(), "yyyy-MM-dd"),
      effectiveTo: "",
      isActive: true,
      notes: "",
    },
  });

  const shiftForm = useForm<z.infer<typeof shiftFormSchema>>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      staffId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "17:00",
      notes: "",
    },
  });

  // Staff Mutations
  const createStaffMutation = useMutation({
    mutationFn: async (data: Omit<InsertAdminStaff, "id">) => {
      return apiRequest("POST", "/api/admin-staff", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-staff"] });
      toast({ title: "Staff Created", description: "Staff member added successfully" });
      setStaffDialogOpen(false);
      setEditingStaff(null);
      staffForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create staff member", variant: "destructive" });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertAdminStaff> }) => {
      return apiRequest("PUT", `/api/admin-staff/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-staff"] });
      toast({ title: "Staff Updated", description: "Staff member updated successfully" });
      setStaffDialogOpen(false);
      setEditingStaff(null);
      staffForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update staff member", variant: "destructive" });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin-staff/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-staff"] });
      toast({ title: "Staff Deleted", description: "Staff member removed successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete staff member", variant: "destructive" });
    },
  });

  // Template Mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: Omit<InsertAdminShiftTemplate, "id">) => {
      return apiRequest("POST", "/api/admin-shift-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shift-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts/weekly-summary"] });
      toast({ title: "Template Created", description: "Shift template created successfully" });
      setTemplateDialogOpen(false);
      templateForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertAdminShiftTemplate> }) => {
      return apiRequest("PUT", `/api/admin-shift-templates/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shift-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts/weekly-summary"] });
      toast({ title: "Template Updated", description: "Shift template updated successfully" });
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      templateForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin-shift-templates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shift-templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts/weekly-summary"] });
      toast({ title: "Template Deleted", description: "Shift template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    },
  });

  // Shift Mutations
  const createShiftMutation = useMutation({
    mutationFn: async (data: Omit<InsertAdminScheduledShift, "id" | "durationHours">) => {
      const [startHour, startMin] = data.startTime.split(':').map(Number);
      const [endHour, endMin] = data.endTime.split(':').map(Number);
      const durationHours = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;
      
      return apiRequest("POST", "/api/admin-shifts", {
        ...data,
        durationHours: durationHours.toString(),
        source: "manual",
        status: "scheduled",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts/weekly-summary"] });
      toast({ title: "Shift Created", description: "Shift created successfully" });
      setShiftDialogOpen(false);
      shiftForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create shift", variant: "destructive" });
    },
  });

  const updateShiftMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertAdminScheduledShift> }) => {
      return apiRequest("PUT", `/api/admin-shifts/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts/weekly-summary"] });
      toast({ title: "Shift Updated", description: "Shift updated successfully" });
      setShiftDialogOpen(false);
      setEditingShift(null);
      shiftForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update shift", variant: "destructive" });
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin-shifts/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts/weekly-summary"] });
      toast({ title: "Shift Deleted", description: "Shift deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete shift", variant: "destructive" });
    },
  });

  const generateShiftsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin-shifts/generate", {
        startDate: weekStartStr,
        endDate: weekEndStr,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin-shifts/weekly-summary"] });
      toast({ 
        title: "Shifts Generated", 
        description: `Created ${data.shiftsCreated} shifts from templates` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate shifts", variant: "destructive" });
    },
  });

  // Handlers
  const handleEditStaff = (staff: AdminStaff) => {
    setEditingStaff(staff);
    staffForm.reset({
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone || "",
      backupEmail: staff.backupEmail || "",
      preferredContact: staff.preferredContact || "email",
      slackHandle: staff.slackHandle || "",
      teamsHandle: staff.teamsHandle || "",
      role: staff.role || "",
      employmentStatus: staff.employmentStatus || "full-time",
      receivesReminders: staff.receivesReminders,
    });
    setStaffDialogOpen(true);
  };

  const handleStaffSubmit = (values: z.infer<typeof staffFormSchema>) => {
    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, updates: values });
    } else {
      createStaffMutation.mutate({
        ...values,
        role: values.role || "",
      });
    }
  };

  const handleEditTemplate = (template: AdminShiftTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
      name: template.name,
      staffId: template.staffId,
      dayOfWeek: template.dayOfWeek,
      startTime: template.startTime,
      endTime: template.endTime,
      effectiveFrom: template.effectiveFrom,
      effectiveTo: template.effectiveTo || "",
      isActive: template.isActive,
      notes: template.notes || "",
    });
    setTemplateDialogOpen(true);
  };

  const handleSubmitTemplate = (values: z.infer<typeof templateFormSchema>) => {
    const data = {
      ...values,
      effectiveTo: values.effectiveTo || undefined,
    };
    
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, updates: data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleEditShift = (shift: AdminScheduledShift) => {
    setEditingShift(shift);
    shiftForm.reset({
      staffId: shift.staffId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      notes: shift.notes || "",
    });
    setShiftDialogOpen(true);
  };

  const handleSubmitShift = (values: z.infer<typeof shiftFormSchema>) => {
    if (editingShift) {
      const [startHour, startMin] = values.startTime.split(':').map(Number);
      const [endHour, endMin] = values.endTime.split(':').map(Number);
      const durationHours = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;
      
      updateShiftMutation.mutate({ 
        id: editingShift.id, 
        updates: {
          ...values,
          durationHours: durationHours.toString(),
        }
      });
    } else {
      createShiftMutation.mutate(values);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleThisWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const getStaffColor = (staffName: string) => {
    return STAFF_COLORS[staffName] || "bg-gray-500 dark:bg-gray-600";
  };

  const formatTime = (time: string) => {
    const [hour, min] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  if (isLoadingStaff) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2" data-testid="loading-admin-availability">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Admin Shift Scheduler
          </h1>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-testid="tabs-main-navigation">
          <TabsTrigger value="schedule" data-testid="tab-schedule">
            <Calendar className="h-4 w-4 mr-2" />
            Weekly Schedule
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <Clock className="h-4 w-4 mr-2" />
            Shift Templates
          </TabsTrigger>
          <TabsTrigger value="staff" data-testid="tab-staff">
            <Users className="h-4 w-4 mr-2" />
            Staff Management
          </TabsTrigger>
        </TabsList>

        {/* Staff Management Tab */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle data-testid="text-staff-management-title">Staff Management</CardTitle>
                  <CardDescription>Manage admin staff contact information and settings</CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setEditingStaff(null);
                    staffForm.reset();
                    setStaffDialogOpen(true);
                  }}
                  data-testid="button-add-staff"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-staff-name">Name</TableHead>
                    <TableHead data-testid="header-staff-email">Email</TableHead>
                    <TableHead data-testid="header-staff-phone">Phone</TableHead>
                    <TableHead data-testid="header-staff-role">Role</TableHead>
                    <TableHead data-testid="header-staff-status">Employment Status</TableHead>
                    <TableHead data-testid="header-staff-actions">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminStaff && adminStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <Users className="h-12 w-12 text-muted-foreground opacity-50" />
                          <div>
                            <div className="font-semibold text-lg mb-1">No Admin Staff Added Yet</div>
                            <div className="text-muted-foreground mb-4">
                              Get started by adding your first admin staff member
                            </div>
                          </div>
                          <Button 
                            onClick={() => {
                              setEditingStaff(null);
                              staffForm.reset();
                              setStaffDialogOpen(true);
                            }}
                            data-testid="button-add-first-staff"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Staff Member
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    adminStaff?.map((staff) => (
                    <TableRow key={staff.id} data-testid={`row-staff-${staff.id}`}>
                      <TableCell data-testid={`text-staff-name-${staff.id}`}>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getStaffColor(staff.fullName)} text-white`}>
                            {staff.fullName.charAt(0)}
                          </Badge>
                          {staff.fullName}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-staff-email-${staff.id}`}>{staff.email}</TableCell>
                      <TableCell data-testid={`text-staff-phone-${staff.id}`}>{staff.phone || "-"}</TableCell>
                      <TableCell data-testid={`text-staff-role-${staff.id}`}>{staff.role || "-"}</TableCell>
                      <TableCell data-testid={`text-staff-employment-${staff.id}`}>
                        <Badge variant="outline">{staff.employmentStatus || "full-time"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditStaff(staff)}
                            data-testid={`button-edit-staff-${staff.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                data-testid={`button-delete-staff-${staff.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent data-testid={`dialog-delete-confirm-${staff.id}`}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {staff.fullName}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-delete-${staff.id}`}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteStaffMutation.mutate(staff.id)}
                                  data-testid={`button-confirm-delete-${staff.id}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shift Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle data-testid="text-templates-title">Shift Templates</CardTitle>
                  <CardDescription>Create recurring shift patterns for staff members</CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setEditingTemplate(null);
                    templateForm.reset();
                    setTemplateDialogOpen(true);
                  }}
                  data-testid="button-create-template"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTemplates ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : shiftTemplates && shiftTemplates.length > 0 ? (
                <Accordion type="single" collapsible className="w-full">
                  {adminStaff?.map((staff) => {
                    const staffTemplates = shiftTemplates.filter(t => t.staffId === staff.id);
                    if (staffTemplates.length === 0) return null;
                    
                    return (
                      <AccordionItem key={staff.id} value={staff.id}>
                        <AccordionTrigger data-testid={`accordion-staff-${staff.id}`}>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStaffColor(staff.fullName)} text-white`}>
                              {staff.fullName.charAt(0)}
                            </Badge>
                            <span>{staff.fullName}</span>
                            <Badge variant="outline">{staffTemplates.length} templates</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {staffTemplates.map((template) => (
                              <div 
                                key={template.id} 
                                className="flex items-center justify-between p-3 border rounded-lg"
                                data-testid={`template-${template.id}`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium" data-testid={`text-template-name-${template.id}`}>
                                      {template.name}
                                    </span>
                                    {template.isActive && <Badge variant="outline">Active</Badge>}
                                  </div>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div data-testid={`text-template-schedule-${template.id}`}>
                                      {DAYS_OF_WEEK[template.dayOfWeek].label}: {formatTime(template.startTime)} - {formatTime(template.endTime)}
                                    </div>
                                    <div data-testid={`text-template-dates-${template.id}`}>
                                      Effective: {template.effectiveFrom} {template.effectiveTo ? `to ${template.effectiveTo}` : "onwards"}
                                    </div>
                                    {template.notes && (
                                      <div className="text-xs" data-testid={`text-template-notes-${template.id}`}>
                                        {template.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditTemplate(template)}
                                    data-testid={`button-edit-template-${template.id}`}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => deleteTemplateMutation.mutate(template.id)}
                                    data-testid={`button-delete-template-${template.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No shift templates created yet. Click "Create Template" to get started.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          {/* Weekly Hours Summary */}
          {weeklyHoursSummary && weeklyHoursSummary.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle data-testid="text-hours-summary-title">Weekly Hours Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {weeklyHoursSummary.map((summary) => (
                    <div 
                      key={summary.staffId} 
                      className="flex items-center gap-2"
                      data-testid={`summary-${summary.staffId}`}
                    >
                      <Badge className={`${getStaffColor(summary.staffName)} text-white`}>
                        {summary.staffName.charAt(0)}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm" data-testid={`text-summary-name-${summary.staffId}`}>
                          {summary.staffName}
                        </div>
                        <div className="text-xs text-muted-foreground" data-testid={`text-summary-hours-${summary.staffId}`}>
                          {summary.totalHours.toFixed(1)} hrs
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Week Navigator */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePreviousWeek}
                    data-testid="button-previous-week"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-center">
                    <div className="font-semibold" data-testid="text-week-range">
                      {format(currentWeekStart, "MMM d")} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), "MMM d, yyyy")}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleNextWeek}
                    data-testid="button-next-week"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleThisWeek}
                    data-testid="button-this-week"
                  >
                    This Week
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => generateShiftsMutation.mutate()}
                    disabled={generateShiftsMutation.isPending}
                    variant="outline"
                    data-testid="button-generate-shifts"
                  >
                    {generateShiftsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate from Templates"
                    )}
                  </Button>
                  <Button 
                    onClick={() => {
                      setEditingShift(null);
                      shiftForm.reset({
                        staffId: "",
                        date: format(currentWeekStart, "yyyy-MM-dd"),
                        startTime: "09:00",
                        endTime: "17:00",
                        notes: "",
                      });
                      setShiftDialogOpen(true);
                    }}
                    data-testid="button-add-shift"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Shift
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingShifts ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dayStr = format(day, "yyyy-MM-dd");
                    const dayShifts = shifts?.filter(s => s.date === dayStr) || [];
                    
                    return (
                      <div key={dayStr} className="border rounded-lg p-2" data-testid={`day-column-${dayStr}`}>
                        <div className="text-center mb-2">
                          <div className="font-semibold text-sm" data-testid={`text-day-name-${dayStr}`}>
                            {format(day, "EEE")}
                          </div>
                          <div className="text-xs text-muted-foreground" data-testid={`text-day-date-${dayStr}`}>
                            {format(day, "MMM d")}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {dayShifts.map((shift) => {
                            const staff = adminStaff?.find(s => s.id === shift.staffId);
                            if (!staff) return null;
                            
                            return (
                              <div
                                key={shift.id}
                                className={`${getStaffColor(staff.fullName)} text-white p-2 rounded cursor-pointer hover-elevate`}
                                onClick={() => handleEditShift(shift)}
                                data-testid={`shift-block-${shift.id}`}
                              >
                                <div className="text-xs font-semibold mb-1" data-testid={`text-shift-staff-${shift.id}`}>
                                  {staff.fullName}
                                </div>
                                <div className="text-xs" data-testid={`text-shift-time-${shift.id}`}>
                                  {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                                </div>
                                <div className="text-xs font-medium" data-testid={`text-shift-duration-${shift.id}`}>
                                  {parseFloat(shift.durationHours).toFixed(1)} hrs
                                </div>
                              </div>
                            );
                          })}
                          {dayShifts.length === 0 && (
                            <div className="text-xs text-muted-foreground text-center py-4">
                              No shifts
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Staff Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent data-testid="dialog-edit-staff">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-staff-title">
              {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
            </DialogTitle>
          </DialogHeader>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit(handleStaffSubmit)} className="space-y-4">
              <FormField
                control={staffForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-staff-fullname" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={staffForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} data-testid="input-staff-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={staffForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-staff-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={staffForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-staff-role" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={staffForm.control}
                name="employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-staff-employment">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contractor">Contractor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createStaffMutation.isPending || updateStaffMutation.isPending} 
                  data-testid="button-save-staff"
                >
                  {(createStaffMutation.isPending || updateStaffMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingStaff ? "Save Changes" : "Add Staff"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent data-testid="dialog-template">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-template-title">
              {editingTemplate ? "Edit Template" : "Create Template"}
            </DialogTitle>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(handleSubmitTemplate)} className="space-y-4">
              <FormField
                control={templateForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Monday Office Hours" data-testid="input-template-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={templateForm.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-staff">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {adminStaff?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={templateForm.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-template-day">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={templateForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-template-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={templateForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-template-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={templateForm.control}
                  name="effectiveFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective From</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-template-from" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={templateForm.control}
                  name="effectiveTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Effective To (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-template-to" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={templateForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-template-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  data-testid="button-save-template"
                >
                  {(createTemplateMutation.isPending || updateTemplateMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingTemplate ? "Update Template" : "Create Template"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Shift Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent data-testid="dialog-shift">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-shift-title">
              {editingShift ? "Edit Shift" : "Add Shift"}
            </DialogTitle>
          </DialogHeader>
          <Form {...shiftForm}>
            <form onSubmit={shiftForm.handleSubmit(handleSubmitShift)} className="space-y-4">
              <FormField
                control={shiftForm.control}
                name="staffId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Staff Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-shift-staff">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {adminStaff?.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={shiftForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-shift-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={shiftForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-shift-start" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={shiftForm.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-shift-end" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={shiftForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-shift-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex justify-between">
                {editingShift && (
                  <Button 
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      deleteShiftMutation.mutate(editingShift.id);
                      setShiftDialogOpen(false);
                      setEditingShift(null);
                    }}
                    disabled={deleteShiftMutation.isPending}
                    data-testid="button-delete-shift"
                  >
                    Delete Shift
                  </Button>
                )}
                <Button 
                  type="submit" 
                  disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                  data-testid="button-save-shift"
                >
                  {(createShiftMutation.isPending || updateShiftMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingShift ? "Update Shift" : "Add Shift"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
