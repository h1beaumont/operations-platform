import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  CheckSquare,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Filter,
  Plus,
  CheckCircle2,
  Circle,
  XCircle,
  Play,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  ListChecks,
  TrendingUp,
  Sparkles,
  Target,
  Award,
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DailyTaskInstance, TaskTemplate } from "@shared/schema";
import { InstructionPanel } from "@/components/instruction-panel";
import { dailyTasksInstructions, taskTemplatesInstructions } from "@/lib/page-instructions";

// Task Template Form Schema
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

const STATUSES = [
  { label: "Pending", value: "pending", icon: Circle, color: "text-gray-500" },
  { label: "In Progress", value: "in_progress", icon: Play, color: "text-blue-500" },
  { label: "Completed", value: "completed", icon: CheckCircle2, color: "text-green-500" },
  { label: "Skipped", value: "skipped", icon: XCircle, color: "text-orange-500" },
];

const TIMES_OF_DAY = [
  { label: "Early Morning (5:00-8:00 AM)", value: "early_morning", icon: "🌅", shortLabel: "Early Morning" },
  { label: "Morning (8:00 AM-12:00 PM)", value: "morning", icon: "☀️", shortLabel: "Morning" },
  { label: "Afternoon (12:00-5:00 PM)", value: "afternoon", icon: "🌤️", shortLabel: "Afternoon" },
  { label: "Evening (5:00-9:00 PM)", value: "evening", icon: "🌆", shortLabel: "Evening" },
  { label: "All Day", value: "all_day", icon: "📅", shortLabel: "All Day" },
];

export default function DailyTasks() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tasks");
  
  // Daily Tasks State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTimeOfDay, setFilterTimeOfDay] = useState<string>("all");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<"category" | "status" | "time" | "none">("time");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DailyTaskInstance | null>(null);
  const [notes, setNotes] = useState("");

  // Task Templates State
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  // Queries
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<DailyTaskInstance[]>({
    queryKey: ['/api/tasks/daily', dateStr],
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<TaskTemplate[]>({
    queryKey: ['/api/tasks/templates'],
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff'],
  });

  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
  });

  // Mutations
  const generateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/tasks/daily/generate?date=${dateStr}`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/daily', dateStr] });
      toast({
        title: "Tasks Generated",
        description: `${data.tasksCreated || 0} task(s) created for ${format(selectedDate, "MMM d, yyyy")}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate tasks",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<DailyTaskInstance> }) => {
      return await apiRequest("PATCH", `/api/tasks/daily/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/daily', dateStr] });
    },
  });

  const createTemplateMutation = useMutation({
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
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      templateForm.reset();
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskTemplateFormData }) => {
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
      setTemplateDialogOpen(false);
      setEditingTemplate(null);
      templateForm.reset();
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/templates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/templates'] });
      toast({
        title: "Template Deleted",
        description: "Task template has been removed",
      });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
  });

  const templateForm = useForm<TaskTemplateFormData>({
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

  const recurrenceType = templateForm.watch("recurrenceType");

  // Daily Tasks Functions
  const handleQuickStatusChange = (task: DailyTaskInstance, newStatus: string) => {
    updateMutation.mutate(
      { id: task.id, data: { status: newStatus } },
      {
        onSuccess: () => {
          if (newStatus === "completed") {
            toast({
              title: "Task Completed! 🎉",
              description: `"${task.name}" has been marked as complete`,
            });
          }
        },
      }
    );
  };

  const handleUpdateStatus = (task: DailyTaskInstance, status: string) => {
    updateMutation.mutate({ id: task.id, data: { status } });
  };

  const handleAddNotes = (task: DailyTaskInstance) => {
    setSelectedTask(task);
    setNotes(task.notes || "");
    setNotesDialogOpen(true);
  };

  const handleSaveNotes = () => {
    if (selectedTask) {
      updateMutation.mutate(
        { id: selectedTask.id, data: { notes } },
        {
          onSuccess: () => {
            toast({
              title: "Notes Saved",
              description: "Task notes have been updated",
            });
            setNotesDialogOpen(false);
            setSelectedTask(null);
            setNotes("");
          },
        }
      );
    }
  };

  const handleMarkAllComplete = () => {
    const incompleteTasks = filteredTasks.filter((t) => t.status !== "completed");
    Promise.all(
      incompleteTasks.map((task) =>
        updateMutation.mutateAsync({ id: task.id, data: { status: "completed" } })
      )
    ).then(() => {
      toast({
        title: "All Tasks Completed! 🎉",
        description: `${incompleteTasks.length} task(s) marked as complete`,
      });
    });
  };

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Template Functions
  const handleCreateTemplate = () => {
    templateForm.reset();
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: TaskTemplate) => {
    setEditingTemplate(template);
    templateForm.reset({
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
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmitTemplate = (data: TaskTemplateFormData) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  // Filter tasks
  let filteredTasks = [...tasks];

  if (filterCategory !== "all") {
    filteredTasks = filteredTasks.filter((t) => t.category === filterCategory);
  }

  if (filterStatus !== "all") {
    filteredTasks = filteredTasks.filter((t) => t.status === filterStatus);
  }

  if (filterTimeOfDay !== "all") {
    filteredTasks = filteredTasks.filter((t) => t.timeOfDay === filterTimeOfDay);
  }

  if (myTasksOnly && currentUser) {
    const userStaff = staff.find((s: any) => s.email === currentUser.email);
    if (userStaff) {
      filteredTasks = filteredTasks.filter((t) => t.assignedTo === userStaff.id);
    }
  }

  // Group tasks
  const groupedTasks: Record<string, DailyTaskInstance[]> = {};
  if (groupBy === "none") {
    groupedTasks["All Tasks"] = filteredTasks;
  } else if (groupBy === "category") {
    filteredTasks.forEach((task) => {
      const cat = CATEGORIES.find((c) => c.value === task.category)?.label || "Other";
      if (!groupedTasks[cat]) groupedTasks[cat] = [];
      groupedTasks[cat].push(task);
    });
  } else if (groupBy === "status") {
    filteredTasks.forEach((task) => {
      const stat = STATUSES.find((s) => s.value === task.status)?.label || "Unknown";
      if (!groupedTasks[stat]) groupedTasks[stat] = [];
      groupedTasks[stat].push(task);
    });
  } else if (groupBy === "time") {
    filteredTasks.forEach((task) => {
      const timeSlot = TIMES_OF_DAY.find((t) => t.value === task.timeOfDay)?.shortLabel || "Morning";
      if (!groupedTasks[timeSlot]) groupedTasks[timeSlot] = [];
      groupedTasks[timeSlot].push(task);
    });
    // Sort groups by time of day order
    const sortedGroupedTasks: Record<string, DailyTaskInstance[]> = {};
    TIMES_OF_DAY.forEach((time) => {
      if (groupedTasks[time.shortLabel]) {
        sortedGroupedTasks[time.shortLabel] = groupedTasks[time.shortLabel];
      }
    });
    Object.assign(groupedTasks, {});
    Object.keys(sortedGroupedTasks).forEach((key) => {
      groupedTasks[key] = sortedGroupedTasks[key];
    });
  }

  // Calculate progress
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const getCategoryColor = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.color || "bg-gray-500";
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITIES.find((p) => p.value === priority)?.color || "bg-gray-500";
  };

  const getStatusIcon = (status: string) => {
    return STATUSES.find((s) => s.value === status)?.icon || Circle;
  };

  const getStatusColor = (status: string) => {
    return STATUSES.find((s) => s.value === status)?.color || "text-gray-500";
  };

  const getStaffName = (staffId: string) => {
    return staff.find((s: any) => s.id === staffId)?.fullName || "Unknown";
  };

  const getTimeOfDayDisplay = (timeOfDay: string | null | undefined) => {
    const time = TIMES_OF_DAY.find((t) => t.value === timeOfDay);
    return time ? `${time.icon} ${time.shortLabel}` : "☀️ Morning";
  };

  const getDayName = (day: number) => {
    return DAYS_OF_WEEK.find((d) => d.value === day)?.label || "";
  };

  const getRecurrenceDisplay = (template: TaskTemplate) => {
    if (template.recurrenceType === "daily") {
      return "Every day";
    } else if (template.recurrenceType === "specific_days" && template.daysOfWeek) {
      return template.daysOfWeek.map((d) => getDayName(d).substring(0, 3)).join(", ");
    } else if (template.recurrenceType === "one_time") {
      return "One time";
    }
    return "Unknown";
  };

  // Analytics calculations using useMemo for performance
  const analyticsStats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "completed").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const pendingTasks = tasks.filter((t) => t.status === "pending").length;
    const skippedTasks = tasks.filter((t) => t.status === "skipped").length;
    
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Category breakdown
    const categoryBreakdown = CATEGORIES.map((cat) => ({
      ...cat,
      count: tasks.filter((t) => t.category === cat.value).length,
      completed: tasks.filter((t) => t.category === cat.value && t.status === "completed").length,
    })).filter((cat) => cat.count > 0);
    
    // Average completion time (estimated from task durations)
    const completedTasksWithTime = tasks.filter((t) => t.status === "completed" && t.estimatedMinutes);
    const avgCompletionTime = completedTasksWithTime.length > 0
      ? Math.round(
          completedTasksWithTime.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0) /
            completedTasksWithTime.length
        )
      : 0;
    
    // Motivational message based on completion rate
    let motivationalMessage = "Let's get started!";
    let messageColor = "text-gray-600";
    let messageIcon = Target;
    
    if (completionRate === 100 && totalTasks > 0) {
      motivationalMessage = "All tasks complete! Great work!";
      messageColor = "text-green-600";
      messageIcon = Award;
    } else if (completionRate >= 76) {
      motivationalMessage = "Almost done!";
      messageColor = "text-blue-600";
      messageIcon = TrendingUp;
    } else if (completionRate >= 51) {
      motivationalMessage = "Over halfway there!";
      messageColor = "text-purple-600";
      messageIcon = TrendingUp;
    } else if (completionRate >= 26) {
      motivationalMessage = "Making good progress!";
      messageColor = "text-indigo-600";
      messageIcon = TrendingUp;
    }
    
    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      skippedTasks,
      completionRate,
      categoryBreakdown,
      avgCompletionTime,
      motivationalMessage,
      messageColor,
      messageIcon,
    };
  }, [tasks]);

  // Show confetti when 100% complete
  const [showConfetti, setShowConfetti] = useState(false);
  
  useEffect(() => {
    if (analyticsStats.completionRate === 100 && analyticsStats.totalTasks > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [analyticsStats.completionRate, analyticsStats.totalTasks]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
              <CheckSquare className="w-8 h-8 text-primary" />
              Daily Tasks
            </h1>
            <p className="text-muted-foreground mt-1" data-testid="text-page-description">
              Manage daily tasks and recurring task templates
            </p>
          </div>
        </div>

        {/* Confetti Animation */}
        <AnimatePresence>
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-50"
              data-testid="confetti-container"
            >
              {[...Array(50)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{
                    x: typeof window !== "undefined" ? Math.random() * window.innerWidth : 0,
                    y: -20,
                    rotate: 0,
                  }}
                  animate={{
                    y: typeof window !== "undefined" ? window.innerHeight + 100 : 1000,
                    rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    ease: "linear",
                    delay: Math.random() * 0.5,
                  }}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: [
                      "#10b981",
                      "#3b82f6",
                      "#f59e0b",
                      "#ef4444",
                      "#8b5cf6",
                      "#ec4899",
                    ][Math.floor(Math.random() * 6)],
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analytics Dashboard */}
        {activeTab === "tasks" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Main Analytics Card */}
            <Card className="overflow-hidden" data-testid="card-analytics">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2" data-testid="text-analytics-title">
                      <TrendingUp className="w-6 h-6 text-primary" />
                      Today's Progress
                    </CardTitle>
                    <CardDescription data-testid="text-analytics-date">
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </CardDescription>
                  </div>
                  <motion.div
                    key={analyticsStats.motivationalMessage}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center gap-2 ${analyticsStats.messageColor} font-semibold text-lg`}
                    data-testid="text-motivational-message"
                  >
                    <analyticsStats.messageIcon className="w-5 h-5" />
                    {analyticsStats.motivationalMessage}
                    {analyticsStats.completionRate === 100 && analyticsStats.totalTasks > 0 && (
                      <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                    )}
                  </motion.div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Overall Completion */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" data-testid="text-overall-completion">
                      {analyticsStats.completedTasks} of {analyticsStats.totalTasks} tasks completed
                    </span>
                    <motion.span
                      key={analyticsStats.completionRate}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="text-2xl font-bold"
                      data-testid="text-completion-percentage"
                    >
                      {Math.round(analyticsStats.completionRate)}%
                    </motion.span>
                  </div>
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="origin-left"
                  >
                    <Progress
                      value={analyticsStats.completionRate}
                      className="h-3"
                      data-testid="progress-analytics"
                    />
                  </motion.div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-lg border hover-elevate"
                    data-testid="stat-completed"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-muted-foreground">Completed</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      {analyticsStats.completedTasks}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-lg border hover-elevate"
                    data-testid="stat-in-progress"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-muted-foreground">In Progress</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      {analyticsStats.inProgressTasks}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-4 rounded-lg border hover-elevate"
                    data-testid="stat-pending"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Circle className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-muted-foreground">Pending</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-600">
                      {analyticsStats.pendingTasks}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-4 rounded-lg border hover-elevate"
                    data-testid="stat-skipped"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-muted-foreground">Skipped</span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">
                      {analyticsStats.skippedTasks}
                    </div>
                  </motion.div>
                </div>

                {/* Category Breakdown */}
                {analyticsStats.categoryBreakdown.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <ListChecks className="w-4 h-4" />
                      Category Breakdown
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {analyticsStats.categoryBreakdown.map((cat, index) => (
                        <motion.div
                          key={cat.value}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                          data-testid={`category-stat-${cat.value}`}
                        >
                          <div className="flex items-center gap-2">
                            <Badge className={cat.color}>{cat.label}</Badge>
                          </div>
                          <div className="text-sm font-medium">
                            {cat.completed}/{cat.count}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Average Completion Time */}
                {analyticsStats.avgCompletionTime > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                    data-testid="stat-avg-time"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Average task duration: {analyticsStats.avgCompletionTime} minutes</span>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="tasks" data-testid="tab-daily-tasks">
              <CheckSquare className="w-4 h-4 mr-2" />
              Daily Tasks
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-task-templates">
              <ListChecks className="w-4 h-4 mr-2" />
              Task Templates
            </TabsTrigger>
          </TabsList>

          {/* Daily Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <InstructionPanel {...dailyTasksInstructions} />

            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" data-testid="button-date-picker">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {format(selectedDate, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                data-testid="button-generate-tasks"
              >
                <Plus className="w-4 h-4 mr-2" />
                {generateMutation.isPending ? "Generating..." : "New Recurring Task"}
              </Button>
            </div>

            {/* Progress Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle data-testid="text-progress-title">
                      {format(selectedDate, "EEEE, MMMM d, yyyy")}
                    </CardTitle>
                    <CardDescription data-testid="text-progress-description">
                      {completedCount} of {totalCount} tasks completed
                    </CardDescription>
                  </div>
                  <div className="text-3xl font-bold" data-testid="text-progress-percent">
                    {totalCount > 0 ? Math.round(progressPercent) : 0}%
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={progressPercent} className="h-2" data-testid="progress-bar" />
              </CardContent>
            </Card>

            {/* Filters and Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filters:</span>
                  </div>

                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-[180px]" data-testid="select-filter-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]" data-testid="select-filter-status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {STATUSES.map((stat) => (
                        <SelectItem key={stat.value} value={stat.value}>
                          {stat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterTimeOfDay} onValueChange={setFilterTimeOfDay}>
                    <SelectTrigger className="w-[180px]" data-testid="select-filter-time">
                      <SelectValue placeholder="Time of Day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Times</SelectItem>
                      {TIMES_OF_DAY.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.icon} {time.shortLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                    <SelectTrigger className="w-[180px]" data-testid="select-group-by">
                      <SelectValue placeholder="Group by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Grouping</SelectItem>
                      <SelectItem value="time">⏰ By Time of Day</SelectItem>
                      <SelectItem value="category">By Category</SelectItem>
                      <SelectItem value="status">By Status</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant={myTasksOnly ? "default" : "outline"}
                    onClick={() => setMyTasksOnly(!myTasksOnly)}
                    data-testid="button-my-tasks"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    My Tasks Only
                  </Button>

                  <Separator orientation="vertical" className="h-8" />

                  <Button
                    variant="outline"
                    onClick={handleMarkAllComplete}
                    disabled={filteredTasks.filter((t) => t.status !== "completed").length === 0}
                    data-testid="button-mark-all-complete"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark All Complete
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Task Lists */}
            {tasksLoading ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground" data-testid="text-loading">
                    Loading tasks...
                  </div>
                </CardContent>
              </Card>
            ) : filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground" data-testid="text-empty">
                    {tasks.length === 0
                      ? "No tasks for this date. Click 'Generate Tasks' to create them."
                      : "No tasks match the selected filters."}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
                  <motion.div
                    key={groupName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span data-testid={`text-group-${groupName}`}>{groupName}</span>
                          <Badge variant="secondary">
                            {groupTasks.filter((t) => t.status === "completed").length}/{groupTasks.length}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {groupTasks.map((task) => {
                            const isExpanded = expandedTasks.has(task.id);
                            const StatusIcon = getStatusIcon(task.status);

                            return (
                              <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                                className="rounded-lg border p-4 hover-elevate"
                                data-testid={`card-task-${task.id}`}
                              >
                                <div className="flex items-start gap-4">
                                  <Checkbox
                                    checked={task.status === "completed"}
                                    onCheckedChange={() => handleQuickStatusChange(task, task.status === "completed" ? "pending" : "completed")}
                                    className="mt-1"
                                    data-testid={`checkbox-complete-${task.id}`}
                                  />

                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h3
                                            className={`font-semibold ${
                                              task.status === "completed" ? "line-through text-muted-foreground" : ""
                                            }`}
                                            data-testid={`text-task-name-${task.id}`}
                                          >
                                            {task.name}
                                          </h3>
                                          <StatusIcon className={`w-4 h-4 ${getStatusColor(task.status)}`} />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                          <Badge className={getCategoryColor(task.category)} data-testid={`badge-category-${task.id}`}>
                                            {CATEGORIES.find((c) => c.value === task.category)?.label || task.category}
                                          </Badge>
                                          <Badge className={getPriorityColor(task.priority)} data-testid={`badge-priority-${task.id}`}>
                                            {task.priority}
                                          </Badge>
                                          <div className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            <span data-testid={`text-assigned-${task.id}`}>
                                              {getStaffName(task.assignedTo)}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span data-testid={`text-estimated-minutes-${task.id}`}>{task.estimatedMinutes}m</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <Select
                                          value={task.status}
                                          onValueChange={(v) => handleUpdateStatus(task, v)}
                                        >
                                          <SelectTrigger className="w-[140px]" data-testid={`select-status-${task.id}`}>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {STATUSES.map((stat) => (
                                              <SelectItem key={stat.value} value={stat.value}>
                                                {stat.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <Button
                                          variant="outline"
                                          size="icon"
                                          onClick={() => handleAddNotes(task)}
                                          data-testid={`button-notes-${task.id}`}
                                        >
                                          <MessageSquare className="w-4 h-4" />
                                        </Button>

                                        {task.description && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => toggleTaskExpanded(task.id)}
                                            data-testid={`button-expand-${task.id}`}
                                          >
                                            {isExpanded ? (
                                              <ChevronUp className="w-4 h-4" />
                                            ) : (
                                              <ChevronDown className="w-4 h-4" />
                                            )}
                                          </Button>
                                        )}
                                      </div>
                                    </div>

                                    <AnimatePresence>
                                      {isExpanded && task.description && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          exit={{ opacity: 0, height: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="pt-2 border-t"
                                        >
                                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                            {task.description}
                                          </p>
                                          {task.notes && (
                                            <div className="mt-2 p-2 bg-muted rounded-md">
                                              <p className="text-xs font-medium text-muted-foreground mb-1">Notes:</p>
                                              <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
                                            </div>
                                          )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Task Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <InstructionPanel {...taskTemplatesInstructions} />

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Task Templates</h2>
                <p className="text-muted-foreground">
                  Define recurring tasks that generate automatically
                </p>
              </div>
              <Button onClick={handleCreateTemplate} data-testid="button-create-template">
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                {templatesLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading templates...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No task templates yet. Create one to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Recurrence</TableHead>
                        <TableHead>Time of Day</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((template) => (
                        <TableRow key={template.id} data-testid={`template-row-${template.id}`}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>
                            <Badge className={getCategoryColor(template.category)}>
                              {CATEGORIES.find((c) => c.value === template.category)?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>{getRecurrenceDisplay(template)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getTimeOfDayDisplay(template.timeOfDay)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {template.assignedToStaffId
                              ? getStaffName(template.assignedToStaffId)
                              : template.assignedToRole || "Unassigned"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={template.isActive ? "default" : "secondary"}>
                              {template.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTemplate(template)}
                              data-testid={`button-edit-${template.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTemplate(template.id)}
                              data-testid={`button-delete-${template.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Notes Dialog */}
        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Task Notes</DialogTitle>
              <DialogDescription>
                Add notes or comments about this task
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes here..."
              className="min-h-[150px]"
              data-testid="textarea-notes"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveNotes} data-testid="button-save-notes">
                Save Notes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Form Dialog */}
        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-template-form">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingTemplate ? "Edit Template" : "Create Template"}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate ? "Update the task template details" : "Create a new task template"}
              </DialogDescription>
            </DialogHeader>

            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(handleSubmitTemplate)} className="space-y-4">
                <FormField
                  control={templateForm.control}
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
                  control={templateForm.control}
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
                    control={templateForm.control}
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
                    control={templateForm.control}
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
                  control={templateForm.control}
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
                    control={templateForm.control}
                    name="daysOfWeek"
                    render={() => (
                      <FormItem>
                        <FormLabel>Days of Week *</FormLabel>
                        <FormDescription>Select which days this task should run</FormDescription>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {DAYS_OF_WEEK.map((day) => (
                            <FormField
                              key={day.value}
                              control={templateForm.control}
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
                  control={templateForm.control}
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
                    control={templateForm.control}
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
                    control={templateForm.control}
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
                  control={templateForm.control}
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
                  control={templateForm.control}
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
                    onClick={() => setTemplateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    data-testid="button-save"
                  >
                    {createTemplateMutation.isPending || updateTemplateMutation.isPending ? "Saving..." : "Save Template"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Template Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent data-testid="dialog-delete-confirm">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this template? This action cannot be undone.
                Existing task instances will not be affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => templateToDelete && deleteTemplateMutation.mutate(templateToDelete)}
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
