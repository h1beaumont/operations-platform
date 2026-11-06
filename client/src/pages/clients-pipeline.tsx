import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  Building2,
  TrendingUp,
  DollarSign,
  Trophy,
  Plus,
  Search,
  Filter,
  GripVertical,
  FileText,
  MessageSquare,
  Calendar,
  Phone,
  Mail,
  User,
  Users,
  Home,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  PhoneCall,
  Send,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageTransition, AnimatedCard, AnimatedNumber, LoadingSpinner } from "@/lib/animations";
import type { PotentialClient, ClientPipelineStage, InsertPotentialClient, ClientMeeting } from "@shared/schema";
import { insertPotentialClientSchema } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
import { ScheduleClientMeetingDialog } from "@/components/schedule-client-meeting-dialog";
import { LogMeetingOutcomeDialog } from "@/components/log-meeting-outcome-dialog";

// Pipeline stages configuration
const PIPELINE_STAGES = [
  { id: "lead", label: "Lead", color: "bg-gray-500" },
  { id: "initial-contact", label: "Initial Contact", color: "bg-blue-500" },
  { id: "meeting-scheduled", label: "Meeting Scheduled", color: "bg-purple-500" },
  { id: "meeting-held", label: "Meeting Held", color: "bg-indigo-500" },
  { id: "proposal-sent", label: "Proposal Sent", color: "bg-orange-500" },
  { id: "negotiating", label: "Negotiating", color: "bg-yellow-500" },
  { id: "won", label: "Won", color: "bg-green-500" },
  { id: "lost", label: "Lost", color: "bg-red-500" },
] as const;

// Priority colors
const PRIORITY_COLORS = {
  hot: "bg-red-500 text-white",
  warm: "bg-orange-500 text-white",
  cold: "bg-blue-500 text-white",
};

// Client with stage info interface
interface ClientWithStage extends PotentialClient {
  currentStage?: string;
  propertiesCount?: number;
  daysInStage?: number;
}

// Form schema for adding new client
const addClientFormSchema = insertPotentialClientSchema.extend({
  organizationName: z.string().min(1, "Organization name is required"),
  primaryContactName: z.string().min(1, "Primary contact name is required"),
  primaryContactEmail: z.string().email("Invalid email address"),
  primaryContactPhone: z.string().optional(),
  source: z.enum(["referral", "website", "cold-outreach", "networking", "other"]).optional(),
  priority: z.enum(["hot", "warm", "cold"]).optional(),
  estimatedValue: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().min(0)).optional(),
  confidenceLevel: z.coerce.number().min(0).max(100).default(50),
  notes: z.string().optional(),
});

type AddClientFormData = z.infer<typeof addClientFormSchema>;

// Source badge colors
const SOURCE_COLORS = {
  referral: "bg-purple-500 text-white",
  website: "bg-blue-500 text-white",
  "cold-outreach": "bg-indigo-500 text-white",
  networking: "bg-green-500 text-white",
  other: "bg-gray-500 text-white",
};

// Draggable Client Card Component
function DraggableClientCard({
  client,
  onViewDetails,
}: {
  client: ClientWithStage;
  onViewDetails: (client: ClientWithStage) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityBadge = client.priority ? (
    <Badge className={PRIORITY_COLORS[client.priority as keyof typeof PRIORITY_COLORS]} data-testid={`badge-priority-${client.id}`}>
      {client.priority.charAt(0).toUpperCase() + client.priority.slice(1)}
    </Badge>
  ) : null;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-move hover-elevate mb-3"
      data-testid={`card-client-${client.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate" data-testid={`text-org-name-${client.id}`}>
                {client.organizationName}
              </h3>
            </div>
          </div>
          {priorityBadge}
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground ml-6">
          <div className="truncate" data-testid={`text-contact-${client.id}`}>
            {client.primaryContactName}
          </div>
          <div className="truncate">{client.primaryContactEmail}</div>
        </div>

        {client.estimatedValue && (
          <div className="mt-2 ml-6">
            <p className="text-lg font-bold text-primary" data-testid={`text-value-${client.id}`}>
              £{client.estimatedValue.toLocaleString()}
            </p>
          </div>
        )}

        {client.propertiesCount !== undefined && client.propertiesCount > 0 && (
          <div className="mt-2 ml-6 text-xs text-muted-foreground">
            {client.propertiesCount} {client.propertiesCount === 1 ? "property" : "properties"}
          </div>
        )}

        {client.daysInStage !== undefined && (
          <div className="mt-2 ml-6 text-xs text-muted-foreground">
            {client.daysInStage} {client.daysInStage === 1 ? "day" : "days"} in stage
          </div>
        )}

        <div className="flex gap-2 mt-3 ml-6">
          <Button
            size="sm"
            variant="outline"
            data-testid={`button-details-${client.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(client);
            }}
          >
            <FileText className="h-3 w-3 mr-1" />
            View Details
          </Button>
          <Button size="sm" variant="ghost" data-testid={`button-note-${client.id}`}>
            <MessageSquare className="h-3 w-3 mr-1" />
            Note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Stage Column Component
function StageColumn({
  stage,
  clients,
  onViewDetails,
}: {
  stage: typeof PIPELINE_STAGES[number];
  clients: ClientWithStage[];
  onViewDetails: (client: ClientWithStage) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: stage.id,
  });

  return (
    <div className="flex-shrink-0 w-80" data-testid={`column-${stage.id}`}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${stage.color}`} />
            <CardTitle className="text-sm font-semibold">{stage.label}</CardTitle>
            <Badge variant="secondary" className="ml-auto" data-testid={`badge-count-${stage.id}`}>
              {clients.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div ref={setNodeRef} className="min-h-[200px]">
              <SortableContext items={clients.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {clients.map((client) => (
                    <DraggableClientCard
                      key={client.id}
                      client={client}
                      onViewDetails={onViewDetails}
                    />
                  ))}
                </div>
              </SortableContext>
              {clients.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No clients in this stage
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ClientsPipeline() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientWithStage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all clients with stage info
  const { data: allClients = [], isLoading: loadingClients } = useQuery<ClientWithStage[]>({
    queryKey: ["/api/potential-clients"],
  });

  // Add client mutation
  const addClientMutation = useMutation({
    mutationFn: async (data: AddClientFormData) => {
      return apiRequest("/api/potential-clients", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/potential-clients"] });
      setAddClientOpen(false);
      form.reset();
      toast({
        title: "Client added",
        description: "New potential client has been added to the pipeline.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to add client",
        description: error.message || "Could not add client. Please try again.",
      });
    },
  });

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ clientId, newStage }: { clientId: string; newStage: string }) => {
      return apiRequest(`/api/potential-clients/${clientId}/stage`, { method: "PATCH", body: JSON.stringify({ currentStage: newStage }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/potential-clients"] });
      toast({
        title: "Stage updated",
        description: "Client has been moved to the new stage.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update stage",
        description: error.message || "Could not update stage. Please try again.",
      });
    },
  });

  // Form setup
  const form = useForm<AddClientFormData>({
    resolver: zodResolver(addClientFormSchema),
    defaultValues: {
      organizationName: "",
      primaryContactName: "",
      primaryContactEmail: "",
      primaryContactPhone: "",
      source: undefined,
      priority: undefined,
      estimatedValue: undefined,
      confidenceLevel: 50,
      notes: "",
    },
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    let filtered = allClients.filter((client) => {
      const matchesSearch =
        searchQuery === "" ||
        client.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.primaryContactName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority =
        priorityFilter === "all" || client.priority === priorityFilter;

      const matchesSource =
        sourceFilter === "all" || client.source === sourceFilter;

      return matchesSearch && matchesPriority && matchesSource;
    });

    // Sort
    if (sortBy === "newest") {
      filtered = filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortBy === "oldest") {
      filtered = filtered.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (sortBy === "highest-value") {
      filtered = filtered.sort(
        (a, b) => (b.estimatedValue || 0) - (a.estimatedValue || 0)
      );
    } else if (sortBy === "lowest-value") {
      filtered = filtered.sort(
        (a, b) => (a.estimatedValue || 0) - (b.estimatedValue || 0)
      );
    }

    return filtered;
  }, [allClients, searchQuery, priorityFilter, sourceFilter, sortBy]);

  // Group clients by stage
  const clientsByStage = useMemo(() => {
    const grouped: Record<string, ClientWithStage[]> = {};
    PIPELINE_STAGES.forEach((stage) => {
      grouped[stage.id] = filteredClients.filter((c) => c.currentStage === stage.id);
    });
    return grouped;
  }, [filteredClients]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalLeads = allClients.length;
    const activeOpportunities = allClients.filter(
      (c) => c.currentStage && !["won", "lost"].includes(c.currentStage)
    ).length;
    const estimatedValue = allClients
      .filter((c) => c.currentStage && !["won", "lost"].includes(c.currentStage))
      .reduce((sum, c) => sum + (c.estimatedValue || 0), 0);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const wonThisMonth = allClients.filter((c) => {
      if (c.currentStage !== "won") return false;
      const createdDate = new Date(c.createdAt);
      return (
        createdDate.getMonth() === currentMonth &&
        createdDate.getFullYear() === currentYear
      );
    }).length;

    return {
      totalLeads,
      activeOpportunities,
      estimatedValue,
      wonThisMonth,
    };
  }, [allClients]);

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeClient = allClients.find((c) => c.id === active.id);
    if (!activeClient) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not find the client being moved",
      });
      return;
    }

    // Determine which stage the client was dropped into
    let targetStageId = over.id as string;

    // If dropped on another client, find which stage that client is in
    if (!PIPELINE_STAGES.some(s => s.id === targetStageId)) {
      const overClient = allClients.find((c) => c.id === targetStageId);
      if (overClient && overClient.currentStage) {
        targetStageId = overClient.currentStage;
      } else {
        toast({
          variant: "destructive",
          title: "Invalid drop target",
          description: "Please drop clients into a valid pipeline stage",
        });
        return;
      }
    }

    // Update if stage changed
    if (activeClient.currentStage !== targetStageId) {
      updateStageMutation.mutate({
        clientId: activeClient.id,
        newStage: targetStageId,
      });
    }
  };

  const onSubmit = (data: AddClientFormData) => {
    addClientMutation.mutate(data);
  };

  const activeClient = activeId ? allClients.find((c) => c.id === activeId) : null;

  const handleViewDetails = (client: ClientWithStage) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedClient(null), 300); // Wait for animation
  };

  return (
    <PageTransition>
      <div className="container mx-auto p-6">
        {/* Header */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Clients Pipeline
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage potential clients through the acquisition process
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <AnimatedCard delay={0.1}>
            <Card data-testid="card-total-leads">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-leads">
                  {loadingClients ? <LoadingSpinner size={20} /> : <AnimatedNumber value={metrics.totalLeads} />}
                </div>
                <p className="text-xs text-muted-foreground">All potential clients</p>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={0.2}>
            <Card data-testid="card-active-opportunities">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Opportunities</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-opportunities">
                  {loadingClients ? <LoadingSpinner size={20} /> : <AnimatedNumber value={metrics.activeOpportunities} />}
                </div>
                <p className="text-xs text-muted-foreground">In progress</p>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={0.3}>
            <Card data-testid="card-estimated-value">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-estimated-value">
                  {loadingClients ? (
                    <LoadingSpinner size={20} />
                  ) : (
                    <>£<AnimatedNumber value={metrics.estimatedValue} /></>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Active pipeline value</p>
              </CardContent>
            </Card>
          </AnimatedCard>

          <AnimatedCard delay={0.4}>
            <Card data-testid="card-won-this-month">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Won This Month</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-won-this-month">
                  {loadingClients ? <LoadingSpinner size={20} /> : <AnimatedNumber value={metrics.wonThisMonth} />}
                </div>
                <p className="text-xs text-muted-foreground">Closed deals</p>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search organizations or contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search"
                  />
                </div>
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger data-testid="select-priority-filter">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger data-testid="select-source-filter">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="cold-outreach">Cold Outreach</SelectItem>
                  <SelectItem value="networking">Networking</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highest-value">Highest Value</SelectItem>
                  <SelectItem value="lowest-value">Lowest Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-x-auto pb-4">
            {loadingClients ? (
              <div className="flex gap-4">
                {PIPELINE_STAGES.map((stage) => (
                  <div key={stage.id} className="flex-shrink-0 w-80">
                    <Card>
                      <CardHeader>
                        <Skeleton className="h-6 w-32" />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-4">
                {PIPELINE_STAGES.map((stage) => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    clients={clientsByStage[stage.id] || []}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>

          <DragOverlay>
            {activeClient ? (
              <DraggableClientCard
                client={activeClient}
                onViewDetails={handleViewDetails}
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Add Client FAB */}
        <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
              data-testid="button-add-client"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new potential client record in the pipeline
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Organization Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Acme Properties Ltd"
                            {...field}
                            data-testid="input-organization-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Smith"
                            {...field}
                            data-testid="input-contact-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryContactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact Email *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="team@example.com"
                            {...field}
                            data-testid="input-contact-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Contact Phone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+44 20 1234 5678"
                            {...field}
                            data-testid="input-contact-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-source">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="referral">Referral</SelectItem>
                            <SelectItem value="website">Website</SelectItem>
                            <SelectItem value="cold-outreach">Cold Outreach</SelectItem>
                            <SelectItem value="networking">Networking</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
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
                        <FormLabel>Priority</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-priority">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="hot">Hot</SelectItem>
                            <SelectItem value="warm">Warm</SelectItem>
                            <SelectItem value="cold">Cold</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimatedValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Value (£)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="10000"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value || ""}
                            data-testid="input-estimated-value"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confidenceLevel"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Confidence Level: {field.value}%</FormLabel>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value ?? 50]}
                            onValueChange={(values) => field.onChange(values[0])}
                            data-testid="slider-confidence"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional information about this client..."
                            rows={3}
                            {...field}
                            data-testid="textarea-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAddClientOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addClientMutation.isPending}
                    data-testid="button-submit"
                  >
                    {addClientMutation.isPending ? (
                      <>
                        <LoadingSpinner size={16} />
                        <span className="ml-2">Adding...</span>
                      </>
                    ) : (
                      "Add Client"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Client Detail Modal */}
        <ClientDetailModal
          client={selectedClient}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </PageTransition>
  );
}

// Client Detail Modal Component
function ClientDetailModal({
  client,
  isOpen,
  onClose,
}: {
  client: ClientWithStage | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false);
  const [logOutcomeOpen, setLogOutcomeOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<ClientMeeting | null>(null);
  const { toast } = useToast();

  // Fetch client details and related data with parallel queries
  const { data: clientDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ["/api/potential-clients", client?.id],
    enabled: !!client?.id && isOpen,
  });

  const { data: stageHistory = [], isLoading: loadingHistory } = useQuery<any>({
    queryKey: ["/api/potential-clients", client?.id, "stage-history"],
    enabled: !!client?.id && isOpen,
  });

  const { data: communications = [], isLoading: loadingCommunications } = useQuery<any>({
    queryKey: ["/api/potential-clients", client?.id, "communications"],
    enabled: !!client?.id && isOpen,
  });

  const { data: meetings = [], isLoading: loadingMeetings } = useQuery<any>({
    queryKey: ["/api/potential-clients", client?.id, "meetings"],
    enabled: !!client?.id && isOpen,
  });

  const { data: followUps = [], isLoading: loadingFollowUps } = useQuery<any>({
    queryKey: ["/api/potential-clients", client?.id, "follow-ups"],
    enabled: !!client?.id && isOpen,
  });

  const { data: contacts = [], isLoading: loadingContacts } = useQuery<any>({
    queryKey: ["/api/potential-clients", client?.id, "contacts"],
    enabled: !!client?.id && isOpen,
  });

  const { data: properties = [], isLoading: loadingProperties } = useQuery<any>({
    queryKey: ["/api/potential-clients", client?.id, "properties"],
    enabled: !!client?.id && isOpen,
  });

  const { data: upcomingMeetings = [], isLoading: loadingUpcomingMeetings } = useQuery<ClientMeeting[]>({
    queryKey: ["/api/potential-clients", client?.id, "meetings", "upcoming"],
    enabled: !!client?.id && isOpen,
  });

  // Mutations
  const scheduleMeetingMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/potential-clients/${client?.id}/meetings`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/potential-clients", client?.id, "meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/potential-clients", client?.id, "meetings", "upcoming"] });
      toast({
        title: "Meeting scheduled",
        description: "The meeting has been scheduled successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error scheduling meeting",
        description: error.message || "Failed to schedule meeting",
        variant: "destructive",
      });
    },
  });

  const logOutcomeMutation = useMutation({
    mutationFn: async ({ meetingId, data }: { meetingId: string; data: any }) => {
      return apiRequest(`/api/meetings/${meetingId}/outcome`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/potential-clients", client?.id, "meetings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/potential-clients", client?.id, "meetings", "upcoming"] });
      toast({
        title: "Outcome logged",
        description: "The meeting outcome has been logged successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error logging outcome",
        description: error.message || "Failed to log meeting outcome",
        variant: "destructive",
      });
    },
  });

  if (!client) return null;

  const currentStage = PIPELINE_STAGES.find((s) => s.id === client.currentStage);

  // Build unified timeline from all activities
  const timelineItems = useMemo(() => {
    const items: any[] = [];

    // Add stage changes
    stageHistory.forEach((stage: any) => {
      items.push({
        type: "stage-change",
        timestamp: stage.changedAt,
        icon: TrendingUp,
        title: "Stage changed",
        description: (
          <>
            From <Badge variant="outline">{stage.fromStage || "New"}</Badge> to{" "}
            <Badge variant="outline">{stage.toStage}</Badge>
          </>
        ),
        user: stage.changedBy,
        details: stage.note,
      });
    });

    // Add communications
    communications.forEach((comm: any) => {
      const icon = comm.type === "email" ? Mail : comm.type === "sms" ? Send : MessageSquare;
      items.push({
        type: "communication",
        timestamp: comm.communicatedAt,
        icon,
        title: `${comm.type.charAt(0).toUpperCase() + comm.type.slice(1)} sent`,
        description: comm.subject || "Communication logged",
        user: comm.createdBy,
        details: comm.content,
        expanded: false,
      });
    });

    // Add meetings
    meetings.forEach((meeting: any) => {
      items.push({
        type: "meeting",
        timestamp: meeting.scheduledAt,
        icon: Calendar,
        title: meeting.outcome === "completed" ? "Meeting completed" : "Meeting scheduled",
        description: meeting.title,
        user: meeting.createdBy,
        details: meeting.notes,
        expanded: false,
      });
    });

    // Add follow-ups
    followUps.forEach((followUp: any) => {
      items.push({
        type: "follow-up",
        timestamp: followUp.dueDate,
        icon: followUp.completedAt ? CheckCircle2 : Circle,
        title: followUp.completedAt ? "Follow-up completed" : "Follow-up created",
        description: followUp.description,
        user: followUp.assignedTo,
        details: followUp.notes,
        expanded: false,
      });
    });

    // Sort by most recent first
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [stageHistory, communications, meetings, followUps]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-hidden p-0"
        data-testid="modal-client-details"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2" data-testid="text-org-name">
                {client.organizationName}
              </h2>
              <div className="flex flex-wrap gap-2">
                {currentStage && (
                  <Badge className={currentStage.color} data-testid="badge-current-stage">
                    {currentStage.label}
                  </Badge>
                )}
                {client.priority && (
                  <Badge
                    className={PRIORITY_COLORS[client.priority as keyof typeof PRIORITY_COLORS]}
                    data-testid="badge-priority"
                  >
                    {client.priority.charAt(0).toUpperCase() + client.priority.slice(1)}
                  </Badge>
                )}
                {client.source && (
                  <Badge
                    className={SOURCE_COLORS[client.source as keyof typeof SOURCE_COLORS]}
                    data-testid="badge-source"
                  >
                    {client.source.charAt(0).toUpperCase() + client.source.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 border-b">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent" data-testid="tabs-client-detail">
              <TabsTrigger
                value="overview"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                data-testid="tab-overview"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                data-testid="tab-timeline"
              >
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value="contacts"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                data-testid="tab-contacts"
              >
                Contacts
              </TabsTrigger>
              <TabsTrigger
                value="properties"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                data-testid="tab-properties"
              >
                Properties
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                data-testid="tab-documents"
              >
                Documents
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 max-h-[calc(90vh-200px)]">
            {/* Overview Tab */}
            <TabsContent value="overview" className="p-6 space-y-6" data-testid="content-overview">
              {loadingDetails ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-1">Days in Stage</div>
                        <div className="text-2xl font-bold" data-testid="text-days-in-stage">
                          {client.daysInStage || 0}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-1">Estimated Value</div>
                        <div className="text-2xl font-bold" data-testid="text-estimated-value-modal">
                          £{client.estimatedValue?.toLocaleString() || "0"}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-sm text-muted-foreground mb-1">Created</div>
                        <div className="text-lg font-semibold" data-testid="text-created-date">
                          {format(new Date(client.createdAt), "MMM d, yyyy")}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Confidence Level */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Confidence Level</span>
                      <span className="text-sm font-bold" data-testid="text-confidence">
                        {client.confidenceLevel || 0}%
                      </span>
                    </div>
                    <Progress value={client.confidenceLevel || 0} data-testid="progress-confidence" />
                  </div>

                  <Separator />

                  {/* Primary Contact */}
                  <div>
                    <h3 className="font-semibold mb-3">Primary Contact</h3>
                    <Card>
                      <CardContent className="pt-6 space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span data-testid="text-primary-contact-name">{client.primaryContactName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`mailto:${client.primaryContactEmail}`}
                            className="text-primary hover:underline"
                            data-testid="link-primary-contact-email"
                          >
                            {client.primaryContactEmail}
                          </a>
                        </div>
                        {client.primaryContactPhone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <a
                              href={`tel:${client.primaryContactPhone}`}
                              className="text-primary hover:underline"
                              data-testid="link-primary-contact-phone"
                            >
                              {client.primaryContactPhone}
                            </a>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Notes */}
                  {client.notes && (
                    <div>
                      <h3 className="font-semibold mb-2">Notes</h3>
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-sm whitespace-pre-wrap" data-testid="text-notes">
                            {client.notes}
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Next Meeting */}
                  {upcomingMeetings.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Next Meeting</h3>
                      <Card>
                        <CardContent className="pt-6 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium mb-1" data-testid="text-next-meeting-type">
                                {upcomingMeetings[0].meetingType
                                  ? upcomingMeetings[0].meetingType.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
                                  : "Meeting"}
                              </div>
                              <div className="text-sm text-muted-foreground mb-2" data-testid="text-next-meeting-date">
                                {format(new Date(upcomingMeetings[0].scheduledAt), "PPp")}
                              </div>
                              {upcomingMeetings[0].location && (
                                <div className="text-sm text-muted-foreground">
                                  {upcomingMeetings[0].location}
                                </div>
                              )}
                              {upcomingMeetings[0].attendees && upcomingMeetings[0].attendees.length > 0 && (
                                <div className="text-sm text-muted-foreground">
                                  Attendees: {upcomingMeetings[0].attendees.join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setScheduleMeetingOpen(true)}
                              data-testid="button-edit-meeting"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMeeting(upcomingMeetings[0]);
                                setLogOutcomeOpen(true);
                              }}
                              data-testid="button-log-meeting-outcome"
                            >
                              Log Outcome
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div>
                    <h3 className="font-semibold mb-3">Quick Actions</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setScheduleMeetingOpen(true)}
                        data-testid="button-schedule-meeting"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Meeting
                      </Button>
                      <Button variant="outline" data-testid="button-add-communication">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Add Communication
                      </Button>
                      <Button variant="outline" data-testid="button-mark-won">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Mark as Won
                      </Button>
                      <Button variant="outline" data-testid="button-mark-lost">
                        <X className="h-4 w-4 mr-2" />
                        Mark as Lost
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="p-6" data-testid="content-timeline">
              {loadingHistory || loadingCommunications || loadingMeetings || loadingFollowUps ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : timelineItems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground" data-testid="text-no-timeline">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No activity yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timelineItems.map((item, index) => (
                    <TimelineItem key={index} item={item} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Contacts Tab */}
            <TabsContent value="contacts" className="p-6" data-testid="content-contacts">
              {loadingContacts ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Additional Contacts</h3>
                    <Button size="sm" data-testid="button-add-contact">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Contact
                    </Button>
                  </div>
                  {contacts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground" data-testid="text-no-contacts">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No additional contacts</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {contacts.map((contact: any) => (
                        <Card key={contact.id} data-testid={`card-contact-${contact.id}`}>
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium" data-testid={`text-contact-name-${contact.id}`}>
                                    {contact.name}
                                  </span>
                                  {contact.role && (
                                    <Badge variant="secondary" data-testid={`badge-contact-role-${contact.id}`}>
                                      {contact.role}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="text-primary hover:underline"
                                    data-testid={`link-contact-email-${contact.id}`}
                                  >
                                    {contact.email}
                                  </a>
                                </div>
                                {contact.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    <a
                                      href={`tel:${contact.phone}`}
                                      className="text-primary hover:underline"
                                      data-testid={`link-contact-phone-${contact.id}`}
                                    >
                                      {contact.phone}
                                    </a>
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" data-testid={`button-edit-contact-${contact.id}`}>
                                  Edit
                                </Button>
                                <Button size="sm" variant="ghost" data-testid={`button-remove-contact-${contact.id}`}>
                                  Remove
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Properties Tab */}
            <TabsContent value="properties" className="p-6" data-testid="content-properties">
              {loadingProperties ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-6">
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Property Interests</h3>
                    <Button size="sm" data-testid="button-add-property">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Property Interest
                    </Button>
                  </div>
                  {properties.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground" data-testid="text-no-properties">
                      <Home className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No property interests recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {properties.map((property: any) => (
                        <Card key={property.id} data-testid={`card-property-${property.id}`}>
                          <CardContent className="pt-6">
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium" data-testid={`text-property-name-${property.id}`}>
                                    {property.address}
                                  </span>
                                </div>
                                {property.status && (
                                  <Badge variant="secondary" data-testid={`badge-property-status-${property.id}`}>
                                    {property.status}
                                  </Badge>
                                )}
                              </div>
                              {property.propertyType && (
                                <div className="text-sm text-muted-foreground">
                                  Type: {property.propertyType}
                                </div>
                              )}
                              {property.targetBudget && (
                                <div className="text-sm text-muted-foreground">
                                  Budget: £{property.targetBudget.toLocaleString()}
                                </div>
                              )}
                              {property.notes && (
                                <div className="text-sm text-muted-foreground">
                                  {property.notes}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="p-6" data-testid="content-documents">
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Coming Soon</p>
                <p className="text-sm mt-2">Document management features will be available in a future update</p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>

      {/* Dialogs for meeting management */}
      <ScheduleClientMeetingDialog
        open={scheduleMeetingOpen}
        onOpenChange={setScheduleMeetingOpen}
        client={client}
        onSchedule={async (data) => {
          await scheduleMeetingMutation.mutateAsync(data);
        }}
        isSaving={scheduleMeetingMutation.isPending}
      />

      <LogMeetingOutcomeDialog
        open={logOutcomeOpen}
        onOpenChange={setLogOutcomeOpen}
        meeting={selectedMeeting}
        onLogOutcome={async (data) => {
          if (selectedMeeting) {
            await logOutcomeMutation.mutateAsync({ meetingId: selectedMeeting.id, data });
          }
        }}
        isSaving={logOutcomeMutation.isPending}
      />
    </Dialog>
  );
}

// Timeline Item Component
function TimelineItem({ item }: { item: any }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = item.icon;
  const hasDetails = item.details && item.details.length > 0;

  return (
    <div className="flex gap-3" data-testid={`timeline-item-${item.type}`}>
      <div className="flex-shrink-0">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <p className="font-semibold text-sm" data-testid="timeline-item-title">
            {item.title}
          </p>
          <span
            className="text-xs text-muted-foreground whitespace-nowrap ml-2"
            title={format(new Date(item.timestamp), "PPpp")}
            data-testid="timeline-item-time"
          >
            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
          </span>
        </div>
        <div className="text-sm text-muted-foreground mb-1" data-testid="timeline-item-description">
          {item.description}
        </div>
        {item.user && (
          <p className="text-xs text-muted-foreground" data-testid="timeline-item-user">
            by {item.user}
          </p>
        )}
        {hasDetails && (
          <div className="mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-auto p-0 text-xs hover:bg-transparent"
              data-testid="button-toggle-details"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show details
                </>
              )}
            </Button>
            {isExpanded && (
              <div className="mt-2 p-3 bg-muted rounded-md text-sm" data-testid="timeline-item-details">
                {item.details}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}