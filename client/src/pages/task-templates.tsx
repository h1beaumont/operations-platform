import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Clock, Users, CheckSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { TaskTemplate } from "@shared/schema";
import { InstructionPanel } from "@/components/instruction-panel";
import { taskTemplatesInstructions } from "@/lib/page-instructions";

const taskTemplateFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.enum(["compliance", "guest_services", "maintenance", "admin", "cleaning", "other"]),
  recurrenceType: z.enum(["daily", "specific_days", "one_time"]),
  daysOfWeek: z.array(z.number()).optional(),
  timeOfDay: z.enum(["early_morning", "morning", "afternoon", "evening", "all_day"]).optional(),
  assignedToStaffId: z.string().optional(),
  assignedToRole: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]),
  estimatedMinutes: z.number().min(1).max(480),
  isActive: z.boolean(),
});

type TaskTemplateFormData = z.infer<typeof taskTemplateFormSchema>;

const DAYS_OF_WEEK = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

const CATEGORIES = [
  { label: "Compliance", value: "compliance", color: "bg-purple-500" },
  { label: "Guest Services", value: "guest_services", color: "bg-green-500" },
  { label: "Maintenance", value: "maintenance", color: "bg-orange-500" },
  { label: "Admin", value: "admin", color: "bg-blue-500" },
  { label: "Cleaning", value: "cleaning", color: "bg-cyan-500" },
  { label: "Other", value: "other", color: "bg-gray-500" },
];

const PRIORITIES = [
  { label: "High", value: "high", color: "bg-red-500" },
  { label: "Medium", value: "medium", color: "bg-yellow-500" },
  { label: "Low", value: "low", color: "bg-blue-500" },
];

const TIMES_OF_DAY = [
  { label: "Early Morning (5:00-8:00 AM)", value: "early_morning", icon: "🌅" },
  { label: "Morning (8:00 AM-12:00 PM)", value: "morning", icon: "☀️" },
  { label: "Afternoon (12:00-5:00 PM)", value: "afternoon", icon: "🌤️" },
  { label: "Evening (5:00-9:00 PM)", value: "evening", icon: "🌆" },
  { label: "All Day", value: "all_day", icon: "📅" },
];

export default function TaskTemplates() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery<TaskTemplate[]>({
    queryKey: ['/api/tasks/templates'],
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff'],
  });

  const form = useForm<TaskTemplateFormData>({
    resolver: zodResolver(taskTemplateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "admin",
      recurrenceType: "daily",
      daysOfWeek: [],
      timeOfDay: "morning",
      assignedToStaffId: "",
      assignedToRole: "",
      priority: "medium",
      estimatedMinutes: 15,
      isActive: true,
    },
  });

  const recurrenceType = form.watch("recurrenceType");

  const createMutation = useMutation({
    mutationFn: async (data: TaskTemplateFormData) => {
      // Convert "none" to empty string for optional assignment fields
      const apiData = {
        ...data,
        assignedToStaffId: data.assignedToStaffId === "none" ? "" : data.assignedToStaffId,
        assignedToRole: data.assignedToRole === "none" ? "" : data.assignedToRole,
      };
      return await apiRequest("POST", "/api/tasks/templates", apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/templates'] });
      toast({
        title: "Template Created",
        description: "Task template has been created successfully",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TaskTemplateFormData> }) => {
      // Convert "none" to empty string for optional assignment fields
      const apiData = {
        ...data,
        assignedToStaffId: data.assignedToStaffId === "none" ? "" : data.assignedToStaffId,
        assignedToRole: data.assignedToRole === "none" ? "" : data.assignedToRole,
      };
      return await apiRequest("PATCH", `/api/tasks/templates/${id}`, apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/templates'] });
      toast({
        title: "Template Updated",
        description: "Task template has been updated successfully",
      });
      setDialogOpen(false);
      setEditingTemplate(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/templates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/templates'] });
      toast({
        title: "Template Deleted",
        description: "Task template has been deleted successfully",
      });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    setEditingTemplate(null);
    form.reset();
    setDialogOpen(true);
  };

  const handleEdit = (template: TaskTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      category: template.category as any,
      recurrenceType: template.recurrenceType as any,
      daysOfWeek: template.daysOfWeek || [],
      timeOfDay: (template.timeOfDay || "morning") as any,
      assignedToStaffId: template.assignedToStaffId || "",
      assignedToRole: template.assignedToRole || "",
      priority: template.priority as any,
      estimatedMinutes: template.estimatedMinutes || 15,
      isActive: template.isActive,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const onSubmit = (data: TaskTemplateFormData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.color || "bg-gray-500";
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITIES.find((p) => p.value === priority)?.color || "bg-gray-500";
  };

  const getDaysOfWeekDisplay = (days: number[] | null) => {
    if (!days || days.length === 0) return "N/A";
    return days
      .sort()
      .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label.substring(0, 3))
      .join(", ");
  };

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
              <CheckSquare className="w-8 h-8 text-primary" />
              Task Templates
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-page-description">
              Create and manage recurring task templates for your team
            </p>
          </div>
          <Button onClick={handleAdd} data-testid="button-add-template">
            <Plus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        </div>

        <InstructionPanel {...taskTemplatesInstructions} />

        <Card>
          <CardHeader>
            <CardTitle>All Templates</CardTitle>
            <CardDescription>
              {templates.length} template{templates.length !== 1 ? "s" : ""} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="text-empty">
                No templates found. Click "Add Template" to create one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Recurrence</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Est. Time</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} data-testid={`row-template-${template.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${template.id}`}>
                        {template.name}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(template.category)}>
                          {CATEGORIES.find((c) => c.value === template.category)?.label || template.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(template.priority)}>
                          {template.priority}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-recurrence-${template.id}`}>
                        {template.recurrenceType === "daily" && "Daily"}
                        {template.recurrenceType === "specific_days" && getDaysOfWeekDisplay(template.daysOfWeek)}
                        {template.recurrenceType === "one_time" && "One-Time"}
                      </TableCell>
                      <TableCell data-testid={`text-assigned-${template.id}`}>
                        {template.assignedToStaffId
                          ? staff.find((s: any) => s.id === template.assignedToStaffId)?.fullName || "Staff"
                          : template.assignedToRole || "Unassigned"}
                      </TableCell>
                      <TableCell data-testid={`text-time-${template.id}`}>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {template.estimatedMinutes}m
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(template)}
                            data-testid={`button-edit-${template.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(template.id)}
                            data-testid={`button-delete-${template.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-template-form">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingTemplate ? "Edit Template" : "Add Template"}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate ? "Update the task template details" : "Create a new task template"}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Morning Property Check" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Describe the task in detail..."
                          rows={3}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
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
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRIORITIES.map((pri) => (
                              <SelectItem key={pri.value} value={pri.value}>
                                {pri.label}
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
                  name="recurrenceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurrence Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-recurrence">
                            <SelectValue placeholder="Select recurrence" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="specific_days">Specific Days</SelectItem>
                          <SelectItem value="one_time">One-Time</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {recurrenceType === "specific_days" && (
                  <FormField
                    control={form.control}
                    name="daysOfWeek"
                    render={() => (
                      <FormItem>
                        <FormLabel>Days of Week *</FormLabel>
                        <FormDescription>Select which days this task should run</FormDescription>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <FormField
                              key={day.value}
                              control={form.control}
                              name="daysOfWeek"
                              render={({ field }) => (
                                <FormItem
                                  key={day.value}
                                  className="flex flex-row items-center space-x-2 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day.value)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        field.onChange(
                                          checked
                                            ? [...current, day.value]
                                            : current.filter((v) => v !== day.value)
                                        );
                                      }}
                                      data-testid={`checkbox-day-${day.value}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal">{day.label}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="timeOfDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time of Day</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-time-of-day">
                            <SelectValue placeholder="Select time of day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMES_OF_DAY.map((time) => (
                            <SelectItem key={time.value} value={time.value}>
                              {time.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>When during the day should this task be done?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assignedToStaffId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Staff</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-staff">
                              <SelectValue placeholder="Select staff (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {staff.map((member: any) => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Or assign to a role below</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="assignedToRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assign to Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-role">
                              <SelectValue placeholder="Select role (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="cleaner">Cleaner</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="estimatedMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Time (minutes) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          min={1}
                          max={480}
                          data-testid="input-minutes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Only active templates will generate daily tasks
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-active"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="dialog-delete-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this task template. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => templateToDelete && deleteMutation.mutate(templateToDelete)}
                data-testid="button-delete-confirm"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
