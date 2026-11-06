import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import DailyTasks from "@/pages/daily-tasks";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  Upload,
  Plus,
  Pencil,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  GripVertical,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WeeklyRotaTask, InsertWeeklyRotaTask } from "@shared/schema";
import { insertWeeklyRotaTaskSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DAY_COLORS: Record<string, string> = {
  Monday: "bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800",
  Tuesday: "bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800",
  Wednesday: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800",
  Thursday: "bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800",
  Friday: "bg-pink-100 dark:bg-pink-900/30 text-pink-900 dark:text-pink-100 border-pink-200 dark:border-pink-800",
  Saturday: "bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100 border-orange-200 dark:border-orange-800",
  Sunday: "bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800",
};

type LayoutView = "list" | "kanban" | "calendar";

const weeklyRotaFormSchema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  time: z.string().min(1, "Time is required"),
  task: z.string().min(1, "Task description is required"),
  responsible: z.string().min(1, "Responsible person is required"),
  checkMethod: z.string().min(1, "Check method is required"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

type WeeklyRotaFormData = z.infer<typeof weeklyRotaFormSchema>;

// Sortable Task Item Component
function SortableTaskItem({
  task,
  onEdit,
  onDelete,
}: {
  task: WeeklyRotaTask;
  onEdit: (task: WeeklyRotaTask) => void;
  onDelete: (task: WeeklyRotaTask) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-3 bg-card border rounded-md hover-elevate"
      data-testid={`task-item-${task.id}`}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1 shrink-0"
          data-testid={`drag-handle-${task.id}`}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <Badge variant="outline" className="flex items-center gap-1 shrink-0 w-fit">
            <Clock className="w-3 h-3" />
            {task.time}
          </Badge>
          <p className="font-medium break-words" data-testid={`text-task-${task.id}`}>
            {task.task}
          </p>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1 min-w-0">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate" data-testid={`text-responsible-${task.id}`}>{task.responsible}</span>
            </div>
            <div className="flex items-center gap-1 min-w-0">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span className="truncate" data-testid={`text-check-method-${task.id}`}>{task.checkMethod}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(task)}
            data-testid={`button-edit-${task.id}`}
            aria-label={`Edit task ${task.task}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(task)}
            data-testid={`button-delete-${task.id}`}
            aria-label={`Delete task ${task.task}`}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Droppable Day Column Component for Kanban
function DroppableDay({
  day,
  tasks,
  onEdit,
  onDelete,
  onAddTask,
}: {
  day: string;
  tasks: WeeklyRotaTask[];
  onEdit: (task: WeeklyRotaTask) => void;
  onDelete: (task: WeeklyRotaTask) => void;
  onAddTask: (day: string) => void;
}) {
  return (
    <div className="flex flex-col min-h-[400px] min-w-0">
      <div className={`${DAY_COLORS[day]} rounded-t-md p-3 border-b-2`}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold truncate">{day}</h3>
          <Badge variant="outline" className="bg-background/50 shrink-0">
            {tasks.length}
          </Badge>
        </div>
      </div>
      <div className="flex-1 p-2 bg-muted/30 rounded-b-md border border-t-0 min-w-0">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No tasks</p>
              </div>
            )}
          </div>
        </SortableContext>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => onAddTask(day)}
          data-testid={`button-add-task-${day.toLowerCase()}`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>
    </div>
  );
}

export default function WeeklyRota() {
  const { toast } = useToast();

  // Main tab state with localStorage persistence
  const [mainTab, setMainTab] = useState<string>(() => {
    const saved = localStorage.getItem("taskManagementTab");
    return saved || "today";
  });

  useEffect(() => {
    localStorage.setItem("taskManagementTab", mainTab);
  }, [mainTab]);

  // Layout state with localStorage persistence
  const [layoutView, setLayoutView] = useState<LayoutView>(() => {
    const saved = localStorage.getItem("weeklyRotaLayout");
    return (saved as LayoutView) || "list";
  });

  useEffect(() => {
    localStorage.setItem("weeklyRotaLayout", layoutView);
  }, [layoutView]);

  // Dialog and form state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<WeeklyRotaTask | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<WeeklyRotaTask | null>(null);

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch weekly rota tasks
  const { data: tasks = [], isLoading } = useQuery<WeeklyRotaTask[]>({
    queryKey: ["/api/weekly-rota/tasks"],
  });

  // Form
  const form = useForm<WeeklyRotaFormData>({
    resolver: zodResolver(weeklyRotaFormSchema),
    defaultValues: {
      day: "Monday",
      time: "",
      task: "",
      responsible: "",
      checkMethod: "",
      isActive: true,
    },
  });

  // Import CSV mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/weekly-rota/import-csv");
    },
    onSuccess: (data: any) => {
      toast({
        title: "CSV Imported Successfully",
        description: `Imported ${data.count} tasks from the CSV file.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-rota/tasks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import CSV data",
        variant: "destructive",
      });
    },
  });

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: async (data: WeeklyRotaFormData) => {
      return await apiRequest("POST", "/api/weekly-rota/tasks", data);
    },
    onSuccess: () => {
      toast({
        title: "Task Created",
        description: "Weekly rota task created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-rota/tasks"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WeeklyRotaFormData> }) => {
      return await apiRequest("PATCH", `/api/weekly-rota/tasks/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Task Updated",
        description: "Weekly rota task updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-rota/tasks"] });
      setDialogOpen(false);
      setEditingTask(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/weekly-rota/tasks/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Task Deleted",
        description: "Weekly rota task deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-rota/tasks"] });
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    return DAYS_OF_WEEK.reduce((acc, day) => {
      acc[day] = tasks.filter((task) => task.day === day);
      return acc;
    }, {} as Record<string, WeeklyRotaTask[]>);
  }, [tasks]);

  // Handlers
  const handleAddTask = (day?: string) => {
    setEditingTask(null);
    form.reset({
      day: (day as any) || "Monday",
      time: "",
      task: "",
      responsible: "",
      checkMethod: "",
      isActive: true,
    });
    setDialogOpen(true);
  };

  const handleEditTask = (task: WeeklyRotaTask) => {
    setEditingTask(task);
    form.reset({
      day: task.day as any,
      time: task.time,
      task: task.task,
      responsible: task.responsible,
      checkMethod: task.checkMethod,
      isActive: task.isActive,
    });
    setDialogOpen(true);
  };

  const handleDeleteTask = (task: WeeklyRotaTask) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (data: WeeklyRotaFormData) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) return;

    // Extract day from droppable id (format: "day-Monday")
    const newDay = over.id.toString().replace("day-", "");

    if (activeTask.day !== newDay && DAYS_OF_WEEK.includes(newDay)) {
      // Update task day
      updateMutation.mutate({ 
        id: activeTask.id, 
        data: { day: newDay as any } 
      });
    }
  };

  // Keyboard shortcut for adding tasks (Cmd+N / Ctrl+N)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleAddTask();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4 sm:p-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4 sm:p-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold" data-testid="text-page-title">
            Task Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage daily tasks and weekly recurring schedules
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab} className="flex-1 flex flex-col">
        <div className="border-b px-4 sm:px-6">
          <TabsList className="h-12" data-testid="tabs-main">
            <TabsTrigger value="today" data-testid="tab-today">
              Today's Tasks
            </TabsTrigger>
            <TabsTrigger value="weekly" data-testid="tab-weekly">
              Weekly Schedule
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Today's Tasks Tab */}
        <TabsContent value="today" className="flex-1 m-0 overflow-hidden">
          <DailyTasks />
        </TabsContent>

        {/* Weekly Schedule Tab */}
        <TabsContent value="weekly" className="flex-1 m-0 flex flex-col overflow-hidden">
          {/* Weekly Schedule Header Actions */}
          <div className="border-b p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold">Baseline Weekly Schedule</h2>
                <p className="text-sm text-muted-foreground">
                  Recurring weekly operations tasks
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Layout Selector */}
                <div className="flex gap-1 bg-muted p-1 rounded-md">
                  <Button
                    size="sm"
                    variant={layoutView === "list" ? "default" : "ghost"}
                    onClick={() => setLayoutView("list")}
                    data-testid="button-layout-list"
                  >
                    <ListIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={layoutView === "kanban" ? "default" : "ghost"}
                    onClick={() => setLayoutView("kanban")}
                    data-testid="button-layout-kanban"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={layoutView === "calendar" ? "default" : "ghost"}
                    onClick={() => setLayoutView("calendar")}
                    data-testid="button-layout-calendar"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  onClick={() => handleAddTask()}
                  data-testid="button-add-task"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/weekly-rota-template.csv';
                    link.download = 'weekly-rota-template.csv';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    toast({
                      title: "Template Downloaded",
                      description: "Use this CSV template to import your weekly tasks",
                    });
                  }}
                  data-testid="button-download-template"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => importMutation.mutate()}
                  disabled={importMutation.isPending}
                  data-testid="button-import-csv"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {importMutation.isPending ? "Importing..." : "Import CSV"}
                </Button>
              </div>
            </div>
          </div>

          {/* Weekly Schedule Content */}
          <div className="flex-1 overflow-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {tasks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Tasks Found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Click "Add Task" or "Import CSV Data" to get started
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <>
              {/* List View */}
              {layoutView === "list" && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-6"
                >
                  {DAYS_OF_WEEK.map((day) => {
                    const dayTasks = tasksByDay[day] || [];
                    if (dayTasks.length === 0) return null;

                    return (
                      <Card key={day} data-testid={`card-day-${day.toLowerCase()}`}>
                        <CardHeader className={`${DAY_COLORS[day]} rounded-t-md`}>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <CalendarIcon className="w-5 h-5" />
                              {day}
                            </CardTitle>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-background/50"
                              onClick={() => handleAddTask(day)}
                              data-testid={`button-add-task-${day.toLowerCase()}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Task
                            </Button>
                          </div>
                          <CardDescription className="text-inherit opacity-80">
                            {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                          <div className="divide-y">
                            {dayTasks.map((task) => (
                              <div
                                key={task.id}
                                className="p-4 hover-elevate"
                                data-testid={`task-item-${task.id}`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-1 grid gap-3">
                                    <div className="flex items-start gap-3">
                                      <Badge variant="outline" className="flex items-center gap-1 shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {task.time}
                                      </Badge>
                                      <p className="font-medium flex-1" data-testid={`text-task-${task.id}`}>
                                        {task.task}
                                      </p>
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <User className="w-4 h-4 shrink-0" />
                                        <span className="font-medium">Responsible:</span>
                                        <span data-testid={`text-responsible-${task.id}`}>
                                          {task.responsible}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-muted-foreground">
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                        <span className="font-medium">Check:</span>
                                        <span data-testid={`text-check-method-${task.id}`}>
                                          {task.checkMethod}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleEditTask(task)}
                                      data-testid={`button-edit-${task.id}`}
                                      aria-label={`Edit task ${task.task}`}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleDeleteTask(task)}
                                      data-testid={`button-delete-${task.id}`}
                                      aria-label={`Delete task ${task.task}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </motion.div>
              )}

              {/* Kanban View */}
              {layoutView === "kanban" && (
                <motion.div
                  key="kanban"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
                      {DAYS_OF_WEEK.map((day) => (
                        <SortableContext
                          key={day}
                          items={tasksByDay[day]?.map(t => t.id) || []}
                          strategy={verticalListSortingStrategy}
                          id={`day-${day}`}
                        >
                          <DroppableDay
                            day={day}
                            tasks={tasksByDay[day] || []}
                            onEdit={handleEditTask}
                            onDelete={handleDeleteTask}
                            onAddTask={handleAddTask}
                          />
                        </SortableContext>
                      ))}
                    </div>
                    <DragOverlay>
                      {activeTask ? (
                        <div className="p-3 bg-card border rounded-md shadow-lg">
                          <div className="flex items-start gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                            <div className="flex-1 space-y-2">
                              <Badge variant="outline">
                                <Clock className="w-3 h-3 mr-1" />
                                {activeTask.time}
                              </Badge>
                              <p className="font-medium">{activeTask.task}</p>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                </motion.div>
              )}

              {/* Calendar View */}
              {layoutView === "calendar" && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="overflow-x-auto"
                >
                  <div className="min-w-[800px]">
                    <div className="grid grid-cols-8 gap-px bg-border">
                      {/* Header Row */}
                      <div className="bg-muted p-2 font-semibold">Time</div>
                      {DAYS_OF_WEEK.map((day) => (
                        <div
                          key={day}
                          className={`${DAY_COLORS[day]} p-2 font-semibold text-center`}
                        >
                          {day}
                        </div>
                      ))}

                      {/* Time Slots */}
                      {["Morning", "Afternoon", "Evening", "All Day"].map((timeSlot) => (
                        <>
                          <div key={timeSlot} className="bg-muted p-2 font-medium text-sm">
                            {timeSlot}
                          </div>
                          {DAYS_OF_WEEK.map((day) => {
                            const dayTasks = tasksByDay[day] || [];
                            const slotTasks = dayTasks.filter(
                              (task) =>
                                task.time.toLowerCase().includes(timeSlot.toLowerCase()) ||
                                (timeSlot === "All Day" && task.time.toLowerCase().includes("all day"))
                            );

                            return (
                              <div
                                key={`${day}-${timeSlot}`}
                                className="bg-background p-2 min-h-[100px] hover-elevate cursor-pointer"
                                onClick={() => handleAddTask(day)}
                                data-testid={`calendar-cell-${day.toLowerCase()}-${timeSlot.toLowerCase().replace(" ", "-")}`}
                              >
                                <div className="space-y-2">
                                  {slotTasks.map((task) => (
                                    <div
                                      key={task.id}
                                      className="p-2 bg-primary/10 border border-primary/20 rounded text-xs hover-elevate"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditTask(task);
                                      }}
                                      data-testid={`calendar-task-${task.id}`}
                                    >
                                      <p className="font-medium truncate">{task.task}</p>
                                      <p className="text-muted-foreground truncate">
                                        {task.responsible}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-task-form">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Edit Task" : "Create New Task"}
            </DialogTitle>
            <DialogDescription>
              {editingTask
                ? "Update the weekly rota task details below"
                : "Add a new task to the weekly rota"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-day">
                          <SelectValue placeholder="Select a day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day} value={day} data-testid={`select-day-${day.toLowerCase()}`}>
                            {day}
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
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder='e.g., "Morning", "2:00pm", "All Day"'
                        data-testid="input-time"
                      />
                    </FormControl>
                    <FormDescription>
                      Free text: Morning, Afternoon, specific time like "11:00am"
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="task"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the task to be completed"
                        rows={3}
                        data-testid="textarea-task"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsible Person</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Name of person responsible"
                        data-testid="input-responsible"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Method</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="How to verify completion"
                        data-testid="input-check-method"
                      />
                    </FormControl>
                    <FormDescription>
                      How will this task be verified as complete?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Task is active and should be displayed
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingTask(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingTask
                    ? "Update Task"
                    : "Create Task"}
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
              This will delete the task "{taskToDelete?.task}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => taskToDelete && deleteMutation.mutate(taskToDelete.id)}
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