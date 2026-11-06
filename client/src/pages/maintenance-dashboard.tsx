import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Wrench, Plus, Calendar as CalendarIcon, DollarSign, AlertCircle, Clock, 
  CheckCircle, Phone, Mail, Building, Filter, BarChart3,
  ChevronRight, Star, X, Edit, Trash2, User, FileText, MapPin, TrendingUp, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import type { MaintenanceRequest, Contractor, Property, Staff, LocationGroup } from "@shared/schema";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { 
  arrayMove,
  SortableContext, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy 
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { InstructionPanel } from "@/components/instruction-panel";
import { maintenanceInstructions } from "@/lib/page-instructions";
import { cn } from "@/lib/utils";
import { phoneNumberSchema, currencyAmountSchema } from "@/lib/validation";

// Form schemas - for frontend form handling
const maintenanceRequestSchema = z.object({
  propertyId: z.string().min(1, "Property is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  priority: z.enum(["critical", "high", "medium", "low"]),
  serviceType: z.enum(["general", "waste_disposal", "electrician", "plumber", "locksmith"]),
  assignedWorkerId: z.string().min(1, "Staff assignment is required"),
  photoGcsPaths: z.array(z.string()).optional(), // Storage keys from cloud upload
  googleDriveLink: z.union([z.string().url(), z.literal("")]).optional(),
  
  // Contractor suggestion
  suggestedContractorId: z.string().optional(),
  
  // Guest information
  guestName: z.string().optional(),
  guestPhone: phoneNumberSchema,
  
  // Availability
  availabilityDate: z.date().optional(),
  availabilityTime: z.string().optional(),
  
  // Property access details (auto-populated from critical info)
  propertyAddress: z.string().optional(),
  accessCode: z.string().optional(),
  wifiDetails: z.string().optional(),
  checkInDetails: z.string().optional(),
  detailsVerified: z.boolean().default(false),
  
  // Landlord reference (for AST properties)
  landlordId: z.string().optional(), // String in form, will be converted to number for API
  
  // Cost estimate for landlord notification (max £10,000)
  likelyCost: currencyAmountSchema(10000).optional(), // String in form, will be converted to number for API
  
  // Client notification
  notifyClient: z.boolean().default(true),
  
  notes: z.string().optional(),
});

const contractorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  phone: phoneNumberSchema.refine((val) => val && val.length > 0, { message: "Phone is required" }),
  email: z.string().email("Invalid email"),
  specialties: z.array(z.string()).optional(),
  rating: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  assignedLocationGroupIds: z.array(z.string()).optional(),
  assignedPropertyIds: z.array(z.string()).optional(),
  priority: z.coerce.number().min(1).max(10).int().optional(),
});

// Priority badge component
function PriorityBadge({ priority, testId }: { priority: string; testId?: string }) {
  const variants: Record<string, { className: string; icon: any }> = {
    critical: { className: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
    high: { className: "bg-orange-100 text-orange-800 border-orange-200", icon: ChevronRight },
    medium: { className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
    low: { className: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
  };

  const variant = variants[priority] || variants.medium;
  const Icon = variant.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", variant.className)} data-testid={testId}>
      <Icon className="w-3 h-3" />
      {priority}
    </Badge>
  );
}

// Status badge component
function StatusBadge({ status, testId }: { status: string; testId?: string }) {
  const variants: Record<string, { className: string; icon: any }> = {
    pending: { className: "bg-gray-100 text-gray-800 border-gray-200", icon: Clock },
    assigned: { className: "bg-blue-100 text-blue-800 border-blue-200", icon: User },
    in_progress: { className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Wrench },
    completed: { className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
    cancelled: { className: "bg-red-100 text-red-800 border-red-200", icon: X },
  };

  const variant = variants[status] || variants.pending;
  const Icon = variant.icon;

  return (
    <Badge variant="outline" className={cn("gap-1", variant.className)} data-testid={testId}>
      <Icon className="w-3 h-3" />
      {status.replace("_", " ")}
    </Badge>
  );
}

// Contractor priority badge component (1-10 scale)
function ContractorPriorityBadge({ priority }: { priority: number }) {
  if (!priority || priority === 0) return null;
  
  const getVariant = (p: number) => {
    if (p >= 8) return { className: "bg-purple-100 text-purple-800 border-purple-200", label: "High Priority" };
    if (p >= 5) return { className: "bg-blue-100 text-blue-800 border-blue-200", label: "Medium Priority" };
    return { className: "bg-gray-100 text-gray-800 border-gray-200", label: "Low Priority" };
  };

  const variant = getVariant(priority);

  return (
    <Badge variant="outline" className={cn("gap-1", variant.className)}>
      <TrendingUp className="w-3 h-3" />
      {variant.label}
    </Badge>
  );
}

// Draggable request card for Kanban
function DraggableRequestCard({ request, onView }: { request: MaintenanceRequest; onView: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: request.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-move"
      data-testid={`maintenance-card-${request.id}`}
    >
      <Card className="mb-2 hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-sm line-clamp-1" data-testid={`text-request-title-${request.id}`}>{request.title}</h4>
            <PriorityBadge priority={request.priority} testId={`badge-priority-${request.id}`} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2" data-testid={`text-description-${request.id}`}>{request.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground" data-testid={`text-date-${request.id}`}>
              {format(new Date(request.createdAt), "MMM d")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
              data-testid={`button-view-${request.id}`}
            >
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Kanban column component
function KanbanColumn({ 
  status, 
  requests, 
  onViewRequest 
}: { 
  status: string; 
  requests: MaintenanceRequest[];
  onViewRequest: (request: MaintenanceRequest) => void;
}) {
  const columnTitles: Record<string, string> = {
    pending: "Pending",
    assigned: "Assigned",
    in_progress: "In Progress",
    completed: "Completed",
  };

  return (
    <div className="flex-1 min-w-[300px]" data-testid={`kanban-column-${status}`}>
      <div className="bg-muted rounded-t-lg p-3 flex items-center justify-between">
        <h3 className="font-semibold" data-testid={`kanban-column-title-${status}`}>{columnTitles[status] || status}</h3>
        <Badge variant="secondary" data-testid={`kanban-column-count-${status}`}>{requests.length}</Badge>
      </div>
      <div className="bg-muted/20 rounded-b-lg p-2 min-h-[400px]">
        <SortableContext
          items={requests.map(r => r.id)}
          strategy={verticalListSortingStrategy}
        >
          {requests.map((request) => (
            <DraggableRequestCard
              key={request.id}
              request={request}
              onView={() => onViewRequest(request)}
            />
          ))}
        </SortableContext>
        {requests.length === 0 && (
          <div className="text-center text-muted-foreground text-sm p-8">
            No requests
          </div>
        )}
      </div>
    </div>
  );
}

export default function MaintenanceDashboard() {
  const { toast } = useToast();
  const [location] = useLocation();
  
  // Detect maintenance type from route
  const maintenanceType = location === "/maintenance/plumbing" ? "plumbing" 
    : location === "/maintenance/electrical" ? "electrical"
    : location === "/specialized-services/gardening" ? "gardening"
    : location === "/specialized-services/locksmith" ? "locksmith"
    : location === "/specialized-services/gutter-window" ? "gutter-window"
    : "general";
  
  // Determine page title and subtitle based on route
  const pageTitle = maintenanceType === "plumbing" ? "Plumbing Maintenance"
    : maintenanceType === "electrical" ? "Electrical Maintenance"
    : maintenanceType === "gardening" ? "Gardening Services"
    : maintenanceType === "locksmith" ? "Locksmith Services"
    : maintenanceType === "gutter-window" ? "Gutter & Window Cleaning"
    : "General Maintenance";
  
  const pageSubtitle = maintenanceType === "plumbing" ? "Manage plumbing repairs and installations"
    : maintenanceType === "electrical" ? "Manage electrical repairs and installations"
    : maintenanceType === "gardening" ? "Manage garden maintenance and landscaping"
    : maintenanceType === "locksmith" ? "Manage lock repairs and security installations"
    : maintenanceType === "gutter-window" ? "Manage gutter and window cleaning services"
    : "Track and manage property maintenance requests";
  
  const defaultServiceType = maintenanceType === "plumbing" ? "plumber"
    : maintenanceType === "electrical" ? "electrician"
    : maintenanceType === "locksmith" ? "locksmith"
    : "general";
  
  const [activeTab, setActiveTab] = useState("requests");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [showAddRequest, setShowAddRequest] = useState(false);
  const [showAddContractor, setShowAddContractor] = useState(false);
  const [showEditContractor, setShowEditContractor] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [draggedItem, setDraggedItem] = useState<MaintenanceRequest | null>(null);
  
  // Contractor suggestion state
  const [contractorSuggestion, setContractorSuggestion] = useState<{
    suggestedContractorId: string;
    contractor: Contractor;
    reason: string;
  } | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  
  // Filter states - set initial serviceType filter based on route
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterServiceType, setFilterServiceType] = useState<string>(
    maintenanceType === "general" ? "all" : defaultServiceType
  );

  // Fetch data
  const { data: requests = [], isLoading: loadingRequests } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance/requests", { propertyId: filterProperty, status: filterStatus, priority: filterPriority, serviceType: filterServiceType }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterProperty && filterProperty !== "all") params.append("propertyId", filterProperty);
      if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);
      if (filterPriority && filterPriority !== "all") params.append("priority", filterPriority);
      if (filterServiceType && filterServiceType !== "all") params.append("serviceType", filterServiceType);
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await apiRequest("GET", `/api/maintenance/requests${query}`, null);
      return await res.json();
    },
  });

  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ["/api/maintenance/contractors"],
  });

  // Fetch active contractors for suggestion dropdown
  const { data: activeContractors = [], isLoading: loadingActiveContractors } = useQuery<Contractor[]>({
    queryKey: ["/api/maintenance/contractors", { isActive: true }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/maintenance/contractors?isActive=true", null);
      return await res.json();
    },
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: locationGroups = [] } = useQuery<LocationGroup[]>({
    queryKey: ["/api/location-groups"],
  });

  const { data: staff = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Fetch landlords for auto-selection
  const { data: landlords = [] } = useQuery<Array<{ id: number; name: string }>>({
    queryKey: ["/api/landlords"],
  });

  // Fetch AST properties to link properties to landlords
  const { data: astProperties = [] } = useQuery<Array<{ id: string; name: string; landlordId: number }>>({
    queryKey: ["/api/ast-properties"],
  });

  const { data: stats } = useQuery<{
    propertyStats: Array<{
      property: Property;
      totalRequests: number;
      pendingRequests: number;
      completedRequests: number;
      totalCost: number;
      avgCompletionTime: number;
    }>;
    contractorPerformance: Array<{
      contractor: Contractor;
      assignmentCount: number;
      completedCount: number;
      avgCompletionTime: number;
      avgCost: number;
      rating: number;
    }>;
  }>({
    queryKey: ["/api/maintenance/stats"],
  });

  // State for photo uploads
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ name: string; storageKey: string }>>([]);

  // Forms - use route-based default serviceType
  const requestForm = useForm<z.infer<typeof maintenanceRequestSchema>>({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      priority: "medium",
      serviceType: defaultServiceType as any,
      assignedWorkerId: "",
      photoGcsPaths: [],
      googleDriveLink: "",
      suggestedContractorId: "",
      guestName: "",
      guestPhone: "",
      availabilityTime: "",
      propertyAddress: "",
      accessCode: "",
      wifiDetails: "",
      checkInDetails: "",
      detailsVerified: false,
      landlordId: "",
      likelyCost: "",
      notifyClient: true,
      notes: "",
    },
  });

  // Watch property selection for auto-population
  const selectedPropertyId = requestForm.watch("propertyId");
  const selectedServiceType = requestForm.watch("serviceType");

  // Auto-populate property access details when property is selected
  useEffect(() => {
    if (!selectedPropertyId) return;

    // FIRST: Reset all auto-populated fields to prevent stale data
    requestForm.setValue("landlordId", "");
    requestForm.setValue("propertyAddress", "");
    requestForm.setValue("accessCode", "");
    requestForm.setValue("wifiDetails", "");
    requestForm.setValue("checkInDetails", "");

    const fetchCriticalInfo = async () => {
      try {
        const selectedProperty = properties.find(p => p.id === selectedPropertyId);
        if (!selectedProperty) return;

        // Fetch critical info for this property
        const criticalInfoList = await apiRequest("GET", `/api/critical-info?search=${encodeURIComponent(selectedProperty.name)}`, null);
        
        // Find the most relevant critical info entry (exact property name match preferred)
        const relevantInfo = Array.isArray(criticalInfoList) 
          ? criticalInfoList.find((info: any) => 
              info.propertyName?.toLowerCase() === selectedProperty.name.toLowerCase()
            ) || criticalInfoList[0]
          : null;

        if (relevantInfo) {
          // Auto-populate access details
          requestForm.setValue("propertyAddress", relevantInfo.value || selectedProperty.address || "");
          requestForm.setValue("accessCode", relevantInfo.accessCode || "");
          requestForm.setValue("wifiDetails", relevantInfo.wifiDetails || "");
          requestForm.setValue("checkInDetails", relevantInfo.checkInInstructions || "");
          
          // Auto-check details verified since we auto-populated from trusted source
          requestForm.setValue("detailsVerified", true);
        } else {
          // Fallback to property address if no critical info found
          requestForm.setValue("propertyAddress", selectedProperty.address || "");
        }

        // Auto-select landlord if this property is linked to an AST property
        const astProperty = astProperties.find(ap => 
          ap.name.toLowerCase().includes(selectedProperty.name.toLowerCase()) ||
          selectedProperty.name.toLowerCase().includes(ap.name.toLowerCase())
        );
        
        if (astProperty && astProperty.landlordId) {
          requestForm.setValue("landlordId", astProperty.landlordId.toString());
        }
      } catch (error) {
        console.error("Error fetching critical info:", error);
      }
    };

    fetchCriticalInfo();
  }, [selectedPropertyId, properties, astProperties, requestForm]);

  // Auto-suggest contractor when propertyId or serviceType change
  useEffect(() => {
    // Only trigger if both propertyId and serviceType are set
    if (!selectedPropertyId || !selectedServiceType) {
      setContractorSuggestion(null);
      return;
    }

    const fetchContractorSuggestion = async () => {
      setLoadingSuggestion(true);
      try {
        const response = await apiRequest("POST", "/api/maintenance/suggest-contractor", {
          serviceType: selectedServiceType,
          propertyId: selectedPropertyId,
        });

        const data = await response.json();

        if (data && data.suggestedContractorId) {
          // Find the contractor details from activeContractors
          const contractor = Array.isArray(activeContractors) 
            ? activeContractors.find(c => c.id === data.suggestedContractorId)
            : null;
          
          if (contractor) {
            setContractorSuggestion({
              suggestedContractorId: data.suggestedContractorId,
              contractor: contractor,
              reason: data.reason || "Based on specialty and location",
            });
            
            // Auto-populate the form field
            requestForm.setValue("suggestedContractorId", data.suggestedContractorId);
          }
        } else {
          setContractorSuggestion(null);
        }
      } catch (error) {
        console.error("Error fetching contractor suggestion:", error);
        setContractorSuggestion(null);
      } finally {
        setLoadingSuggestion(false);
      }
    };

    fetchContractorSuggestion();
  }, [selectedPropertyId, selectedServiceType, activeContractors, requestForm]);

  const contractorForm = useForm<z.infer<typeof contractorSchema>>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      specialties: [],
      rating: 5,
      assignedLocationGroupIds: [],
      assignedPropertyIds: [],
      priority: 0,
    },
  });

  const editContractorForm = useForm<z.infer<typeof contractorSchema>>({
    resolver: zodResolver(contractorSchema),
    defaultValues: {
      specialties: [],
      rating: 5,
      assignedLocationGroupIds: [],
      assignedPropertyIds: [],
      priority: 0,
    },
  });

  // Cloud storage photo upload handler
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingPhotos(true);
    const newUploadedPhotos: Array<{ name: string; storageKey: string }> = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a JPEG or PNG image`,
            variant: "destructive",
          });
          continue;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds 10MB limit`,
            variant: "destructive",
          });
          continue;
        }

        // Step 1: Get signed upload URL from backend
        const uploadUrlResponse = await fetch("/api/maintenance/photos/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            maintenanceRequestId: "pending", // Will be updated after request creation
            fileName: file.name,
            mimeType: file.type,
            fileSize: file.size, // Include file size for backend validation
          }),
        });

        if (!uploadUrlResponse.ok) {
          throw new Error(`Failed to get upload URL for ${file.name}`);
        }

        const { uploadURL, storageKey } = await uploadUrlResponse.json();

        // Step 2: Upload directly to Google Cloud Storage
        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name} to cloud storage`);
        }

        // Track successful upload
        newUploadedPhotos.push({ name: file.name, storageKey });
      }

      // Update state and form
      const allPhotos = [...uploadedPhotos, ...newUploadedPhotos];
      setUploadedPhotos(allPhotos);
      requestForm.setValue("photoGcsPaths", allPhotos.map(p => p.storageKey));

      toast({
        title: "Success",
        description: `${newUploadedPhotos.length} photo(s) uploaded to cloud storage`,
      });
    } catch (error: any) {
      console.error("Error uploading photos:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photos",
        variant: "destructive",
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Remove uploaded photo
  const handleRemovePhoto = (storageKey: string) => {
    const filtered = uploadedPhotos.filter(p => p.storageKey !== storageKey);
    setUploadedPhotos(filtered);
    requestForm.setValue("photoGcsPaths", filtered.map(p => p.storageKey));
  };

  // Mutations
  const createRequestMutation = useMutation({
    mutationFn: async (formData: z.infer<typeof maintenanceRequestSchema> & { reportedBy: string }) => {
      // Send JSON with cloud storage keys instead of multipart form data
      const requestData: any = {
        propertyId: formData.propertyId,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        serviceType: formData.serviceType,
        assignedWorkerId: formData.assignedWorkerId,
        reportedBy: formData.reportedBy,
        detailsVerified: formData.detailsVerified,
        notifyClient: formData.notifyClient,
      };
      
      // Add optional fields
      if (formData.googleDriveLink && formData.googleDriveLink.trim() !== "") {
        requestData.googleDriveLink = formData.googleDriveLink;
      }
      
      if (formData.suggestedContractorId && formData.suggestedContractorId !== "none") {
        requestData.suggestedContractorId = formData.suggestedContractorId;
      }
      
      if (formData.guestName) requestData.guestName = formData.guestName;
      if (formData.guestPhone) requestData.guestPhone = formData.guestPhone;
      if (formData.availabilityDate) {
        requestData.availabilityDate = formData.availabilityDate.toISOString();
      }
      if (formData.availabilityTime) requestData.availabilityTime = formData.availabilityTime;
      if (formData.propertyAddress) requestData.propertyAddress = formData.propertyAddress;
      if (formData.accessCode) requestData.accessCode = formData.accessCode;
      if (formData.wifiDetails) requestData.wifiDetails = formData.wifiDetails;
      if (formData.checkInDetails) requestData.checkInDetails = formData.checkInDetails;
      
      if (formData.landlordId && formData.landlordId !== "" && formData.landlordId !== "none") {
        requestData.landlordId = formData.landlordId;
      }
      
      if (formData.likelyCost && formData.likelyCost !== "") {
        requestData.likelyCost = formData.likelyCost;
      }
      
      if (formData.notes) requestData.notes = formData.notes;
      
      // Add cloud storage photo paths
      if (formData.photoGcsPaths && formData.photoGcsPaths.length > 0) {
        requestData.photoGcsPaths = formData.photoGcsPaths;
      }
      
      // Send as JSON
      return apiRequest("POST", "/api/maintenance/requests", requestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/requests"] });
      toast({ title: "Success", description: "Maintenance request created" });
      setShowAddRequest(false);
      requestForm.reset();
      setUploadedPhotos([]); // Clear uploaded photos
    },
    onError: (error: any) => {
      console.error("Error creating request:", error);
      toast({ 
        title: "Error", 
        description: error?.message || "Failed to create request", 
        variant: "destructive" 
      });
    },
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/maintenance/requests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/requests"] });
      toast({ title: "Success", description: "Request updated" });
      setSelectedRequest(null);
    },
  });

  const assignRequestMutation = useMutation({
    mutationFn: ({ id, contractorId, scheduledDate, estimatedCost }: any) =>
      apiRequest("POST", `/api/maintenance/requests/${id}/assign`, { contractorId, scheduledDate, estimatedCost }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/requests"] });
      toast({ title: "Success", description: "Request assigned to contractor" });
      setShowAssignModal(false);
    },
  });

  const completeRequestMutation = useMutation({
    mutationFn: ({ id, actualCost, notes }: any) =>
      apiRequest("POST", `/api/maintenance/requests/${id}/complete`, { actualCost, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/stats"] });
      toast({ title: "Success", description: "Request marked as completed" });
      setSelectedRequest(null);
    },
  });

  const createContractorMutation = useMutation({
    mutationFn: (data: z.infer<typeof contractorSchema>) =>
      apiRequest("POST", "/api/maintenance/contractors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/contractors"] });
      toast({ title: "Success", description: "Contractor added" });
      setShowAddContractor(false);
      contractorForm.reset();
    },
  });

  const updateContractorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/maintenance/contractors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/contractors"] });
      toast({ title: "Success", description: "Contractor updated" });
      setShowEditContractor(false);
      setSelectedContractor(null);
    },
  });

  // Open edit dialog with pre-filled data
  const handleEditContractor = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    editContractorForm.reset({
      name: contractor.name,
      company: contractor.company || "",
      phone: contractor.phone,
      email: contractor.email,
      specialties: contractor.specialties || [],
      rating: contractor.rating || 5,
      notes: contractor.notes || "",
      assignedLocationGroupIds: contractor.assignedLocationGroupIds || [],
      assignedPropertyIds: contractor.assignedPropertyIds || [],
      priority: contractor.priority || 0,
    });
    setShowEditContractor(true);
  };

  // Ensure requests is an array
  const safeRequests = Array.isArray(requests) ? requests : [];

  // Drag and drop handlers
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const request = safeRequests.find(r => r.id === active.id);
    setDraggedItem(request || null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setDraggedItem(null);
      return;
    }

    const activeRequest = safeRequests.find(r => r.id === active.id);
    if (!activeRequest) return;

    // Determine new status based on drop zone
    const newStatus = over.id;
    if (["pending", "assigned", "in_progress", "completed"].includes(newStatus)) {
      updateRequestMutation.mutate({
        id: activeRequest.id,
        data: { status: newStatus },
      });
    }

    setDraggedItem(null);
  };

  // Group requests by status for kanban view
  const requestsByStatus = {
    pending: safeRequests.filter(r => r.status === "pending"),
    assigned: safeRequests.filter(r => r.status === "assigned"),
    in_progress: safeRequests.filter(r => r.status === "in_progress"),
    completed: safeRequests.filter(r => r.status === "completed"),
  };

  // Prepare chart data
  const costByPropertyData = stats?.propertyStats.map(s => ({
    name: s.property.name,
    cost: s.totalCost,
    requests: s.totalRequests,
  })) || [];

  const priorityDistribution = [
    { name: "Critical", value: safeRequests.filter(r => r.priority === "critical").length, color: "#ef4444" },
    { name: "High", value: safeRequests.filter(r => r.priority === "high").length, color: "#f97316" },
    { name: "Medium", value: safeRequests.filter(r => r.priority === "medium").length, color: "#eab308" },
    { name: "Low", value: safeRequests.filter(r => r.priority === "low").length, color: "#3b82f6" },
  ];

  // Get current user for reportedBy field
  const currentStaff = staff[0]; // In a real app, get from auth context

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-maintenance">{pageTitle}</h1>
          <p className="text-muted-foreground">{pageSubtitle}</p>
        </div>
        <div className="flex gap-2">
          <InstructionPanel {...maintenanceInstructions} />
          <Button onClick={() => setShowAddRequest(true)} data-testid="button-add-request">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests" data-testid="tab-requests">Requests</TabsTrigger>
          <TabsTrigger value="contractors" data-testid="tab-contractors">Contractors</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          {/* Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card data-testid="metric-card-total">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-count">{safeRequests.length}</div>
                <p className="text-xs text-muted-foreground">All maintenance requests</p>
              </CardContent>
            </Card>
            <Card data-testid="metric-card-pending">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-pending-count">
                  {safeRequests.filter(r => r.status === "pending").length}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting assignment</p>
              </CardContent>
            </Card>
            <Card data-testid="metric-card-in-progress">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Wrench className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-in-progress-count">
                  {safeRequests.filter(r => r.status === "in_progress" || r.status === "assigned").length}
                </div>
                <p className="text-xs text-muted-foreground">Active work</p>
              </CardContent>
            </Card>
            <Card data-testid="metric-card-completed">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-completed-count">
                  {safeRequests.filter(r => r.status === "completed").length}
                </div>
                <p className="text-xs text-muted-foreground">Finished tasks</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and view toggle */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={filterProperty} onValueChange={setFilterProperty}>
                    <SelectTrigger className="w-[200px]" data-testid="filter-property">
                      <SelectValue placeholder="All Properties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Properties</SelectItem>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]" data-testid="filter-status">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-[150px]" data-testid="filter-priority">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterServiceType} onValueChange={setFilterServiceType}>
                    <SelectTrigger className="w-[180px]" data-testid="filter-service-type">
                      <SelectValue placeholder="All Service Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Service Types</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="waste_disposal">Waste Disposal</SelectItem>
                      <SelectItem value="electrician">Electrician</SelectItem>
                      <SelectItem value="plumber">Plumber</SelectItem>
                      <SelectItem value="locksmith">Locksmith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    data-testid="button-view-list"
                  >
                    List
                  </Button>
                  <Button
                    variant={viewMode === "kanban" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("kanban")}
                    data-testid="button-view-kanban"
                  >
                    Kanban
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requests view */}
          {loadingRequests ? (
            <div className="space-y-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : viewMode === "list" ? (
            <div className="space-y-2">
              {safeRequests.map((request) => (
                <Card key={request.id} className="cursor-pointer hover:shadow-md transition-shadow" 
                  onClick={() => setSelectedRequest(request)}
                  data-testid={`request-card-${request.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold" data-testid={`text-request-title-${request.id}`}>{request.title}</h3>
                          <PriorityBadge priority={request.priority} testId={`badge-priority-${request.id}`} />
                          <StatusBadge status={request.status} testId={`badge-status-${request.id}`} />
                        </div>
                        <p className="text-sm text-muted-foreground mb-2" data-testid={`text-description-${request.id}`}>{request.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1" data-testid={`text-property-${request.id}`}>
                            <Building className="w-3 h-3" />
                            {properties.find(p => p.id === request.propertyId)?.name}
                          </span>
                          <span className="flex items-center gap-1" data-testid={`text-date-${request.id}`}>
                            <CalendarIcon className="w-3 h-3" />
                            {format(new Date(request.createdAt), "MMM d, yyyy")}
                          </span>
                          {request.likelyCost && (
                            <span className="flex items-center gap-1" data-testid={`text-cost-${request.id}`}>
                              <DollarSign className="w-3 h-3" />
                              ${request.likelyCost}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {safeRequests.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground">
                    No maintenance requests found
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-4">
                {Object.entries(requestsByStatus).map(([status, statusRequests]) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    requests={statusRequests}
                    onViewRequest={setSelectedRequest}
                  />
                ))}
              </div>
              <DragOverlay>
                {draggedItem && (
                  <Card>
                    <CardContent className="p-3">
                      <h4 className="font-medium">{draggedItem.title}</h4>
                    </CardContent>
                  </Card>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </TabsContent>

        <TabsContent value="contractors" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAddContractor(true)} data-testid="button-add-contractor">
              <Plus className="w-4 h-4 mr-2" />
              Add Contractor
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contractors.map((contractor) => (
              <Card key={contractor.id} data-testid={`contractor-card-${contractor.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold" data-testid={`text-contractor-name-${contractor.id}`}>{contractor.name}</h3>
                      {contractor.company && (
                        <p className="text-sm text-muted-foreground" data-testid={`text-company-${contractor.id}`}>{contractor.company}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {contractor.rating && (
                        <div className="flex items-center gap-1" data-testid={`text-rating-${contractor.id}`}>
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                          <span className="text-sm font-medium">{contractor.rating.toFixed(1)}</span>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditContractor(contractor)}
                        data-testid={`button-edit-contractor-${contractor.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm mb-3">
                    <div className="flex items-center gap-2" data-testid={`text-phone-${contractor.id}`}>
                      <Phone className="w-3 h-3" />
                      <span>{contractor.phone}</span>
                    </div>
                    <div className="flex items-center gap-2" data-testid={`text-email-${contractor.id}`}>
                      <Mail className="w-3 h-3" />
                      <span>{contractor.email}</span>
                    </div>
                  </div>
                  
                  {/* Assignment Information */}
                  <div className="space-y-2 mb-3">
                    {contractor.assignedLocationGroupIds && contractor.assignedLocationGroupIds.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Location Groups:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {contractor.assignedLocationGroupIds.map((lgId) => {
                            const lg = locationGroups.find(g => g.id === lgId);
                            return lg ? (
                              <Badge key={lgId} variant="secondary" className="text-xs" data-testid={`badge-location-group-${lgId}`}>
                                {lg.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                    
                    {contractor.assignedPropertyIds && contractor.assignedPropertyIds.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          <span data-testid={`text-properties-count-${contractor.id}`}>
                            {contractor.assignedPropertyIds.length} {contractor.assignedPropertyIds.length === 1 ? 'property' : 'properties'}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {contractor.priority !== undefined && contractor.priority > 0 && (
                      <div data-testid={`contractor-priority-${contractor.id}`}>
                        <ContractorPriorityBadge priority={contractor.priority} />
                      </div>
                    )}
                  </div>
                  
                  {contractor.specialties && contractor.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1" data-testid={`specialties-${contractor.id}`}>
                      {contractor.specialties.map((specialty, idx) => (
                        <Badge key={specialty} variant="outline" className="text-xs" data-testid={`badge-specialty-${contractor.id}-${idx}`}>
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card data-testid="chart-cost-by-property">
              <CardHeader>
                <CardTitle>Maintenance Costs by Property</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costByPropertyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cost" fill="#3b82f6" name="Total Cost (£)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="chart-priority-distribution">
              <CardHeader>
                <CardTitle>Request Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={priorityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {priorityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {stats?.contractorPerformance && (
            <Card data-testid="stats-contractor-performance">
              <CardHeader>
                <CardTitle>Contractor Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.contractorPerformance.map((perf) => (
                    <div key={perf.contractor.id} className="flex items-center justify-between border-b pb-2" data-testid={`performance-${perf.contractor.id}`}>
                      <div>
                        <p className="font-medium" data-testid={`performance-name-${perf.contractor.id}`}>{perf.contractor.name}</p>
                        <p className="text-sm text-muted-foreground" data-testid={`performance-completed-${perf.contractor.id}`}>
                          {perf.completedCount} / {perf.assignmentCount} completed
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium" data-testid={`performance-cost-${perf.contractor.id}`}>£{perf.avgCost.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground" data-testid={`performance-time-${perf.contractor.id}`}>
                          Avg {perf.avgCompletionTime.toFixed(1)} days
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Request Dialog */}
      <Dialog open={showAddRequest} onOpenChange={setShowAddRequest}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Maintenance Issue</DialogTitle>
            <DialogDescription>Create a new maintenance request for a property</DialogDescription>
          </DialogHeader>
          <Form {...requestForm}>
            <form onSubmit={requestForm.handleSubmit((data) => {
              console.log("[Maintenance Form] Submitting data:", data);
              console.log("[Maintenance Form] Form state:", requestForm.formState);
              createRequestMutation.mutate({ ...data, reportedBy: currentStaff?.id || "" });
            }, (errors) => {
              console.error("[Maintenance Form] Validation errors:", errors);
              console.log("[Maintenance Form] Form values:", requestForm.getValues());
            })} className="space-y-4">
              <FormField
                control={requestForm.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="input-property">
                          <SelectValue placeholder="Select property" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={requestForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Brief description of the issue" data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={requestForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Detailed description of the maintenance issue" rows={4} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={requestForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="input-priority">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={requestForm.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="input-service-type">
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General Maintenance</SelectItem>
                        <SelectItem value="waste_disposal">Waste Disposal</SelectItem>
                        <SelectItem value="electrician">Electrician</SelectItem>
                        <SelectItem value="plumber">Plumber</SelectItem>
                        <SelectItem value="locksmith">Locksmith</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={requestForm.control}
                name="assignedWorkerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Internal Staff Member</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="input-assigned-worker">
                          <SelectValue placeholder="Select staff member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staff.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>All maintenance reports require internal staff assignment</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contractor Suggestion Field */}
              <FormField
                control={requestForm.control}
                name="suggestedContractorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suggested External Contractor</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={loadingSuggestion || loadingActiveContractors}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="input-suggested-contractor">
                          <SelectValue placeholder={
                            loadingSuggestion 
                              ? "Loading suggestion..." 
                              : "Select external contractor (optional)"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {Array.isArray(activeContractors) && activeContractors.map((contractor) => (
                          <SelectItem key={contractor.id} value={contractor.id}>
                            {contractor.name} {contractor.company ? `- ${contractor.company}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      External contractor to assist with this job (auto-suggested based on specialty and location)
                    </FormDescription>
                    {contractorSuggestion && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          Auto-suggested: {contractorSuggestion.reason}
                        </Badge>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Photo Files Upload Section - Cloud Storage */}
              <div className="space-y-2">
                <Label>
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Upload Photos (JPEG/PNG)
                  </div>
                </Label>
                <Input 
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  multiple
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  disabled={uploadingPhotos}
                  data-testid="input-photo-files"
                />
                <p className="text-sm text-muted-foreground">
                  Upload JPEG or PNG images to cloud storage (max 10MB each)
                </p>
                
                {uploadingPhotos && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 animate-spin" />
                    Uploading to cloud storage...
                  </div>
                )}
                
                {uploadedPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {uploadedPhotos.map((photo, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {photo.name}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.storageKey)}
                          className="ml-1 hover:text-destructive"
                          data-testid={`button-remove-photo-${index}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Google Drive Link Section */}
              <FormField
                control={requestForm.control}
                name="googleDriveLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Drive Link (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="https://drive.google.com/..."
                        data-testid="input-google-drive-link"
                      />
                    </FormControl>
                    <FormDescription>
                      Provide a Google Drive link with additional photos or documents
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="my-4" />

              {/* Guest Information Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Guest Information (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={requestForm.control}
                    name="guestName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guest Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Guest name" data-testid="input-guest-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="guestPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guest Phone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Guest phone number" data-testid="input-guest-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator className="my-4" />

              {/* Availability Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Property Availability for Maintenance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={requestForm.control}
                    name="availabilityDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date"
                            value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                            data-testid="input-availability-date"
                          />
                        </FormControl>
                        <FormDescription>When property is available for visit</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="availabilityTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Time</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 10:00 AM - 2:00 PM" data-testid="input-availability-time" />
                        </FormControl>
                        <FormDescription>Time slot for maintenance visit</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator className="my-4" />

              {/* Landlord Selection */}
              <FormField
                control={requestForm.control}
                name="landlordId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Landlord (Optional - For AST Properties)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="input-landlord">
                          <SelectValue placeholder="Select landlord (auto-selected if AST)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {landlords.map((landlord) => (
                          <SelectItem key={landlord.id} value={landlord.id.toString()}>
                            {landlord.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Automatically selected for AST properties with linked landlords</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator className="my-4" />

              {/* Property Access Details Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Property Access Details (Auto-populated)</h3>
                <div className="space-y-3">
                  <FormField
                    control={requestForm.control}
                    name="propertyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Auto-populated from property data" data-testid="input-property-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="accessCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Access Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Auto-populated from critical info" data-testid="input-access-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="wifiDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WiFi Details</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Auto-populated from critical info" rows={2} data-testid="input-wifi-details" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="checkInDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Check-in / Access Instructions</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Auto-populated from critical info" rows={3} data-testid="input-checkin-details" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator className="my-4" />

              {/* Notes field */}
              <FormField
                control={requestForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Any additional information..." rows={3} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={requestForm.control}
                name="likelyCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Likely Cost (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        placeholder="0.00" 
                        data-testid="input-likely-cost" 
                      />
                    </FormControl>
                    <FormDescription>Estimated cost for landlord notification</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Client Notification Toggle */}
              <FormField
                control={requestForm.control}
                name="notifyClient"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-notify-client"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Notify Client
                      </FormLabel>
                      <FormDescription>
                        Send automated notification to the guest/client about the maintenance visit
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <Separator className="my-4" />

              {/* Verification Checkbox */}
              <FormField
                control={requestForm.control}
                name="detailsVerified"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-details-verified"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        I have verified all property access details are correct
                      </FormLabel>
                      <FormDescription>
                        Please confirm all access codes, WiFi details, and check-in instructions are accurate before submitting
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowAddRequest(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRequestMutation.isPending || !requestForm.watch("detailsVerified")} 
                  data-testid="button-submit-request"
                >
                  {createRequestMutation.isPending ? "Creating..." : "Create Request"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Contractor Dialog */}
      <Dialog open={showAddContractor} onOpenChange={setShowAddContractor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Contractor</DialogTitle>
            <DialogDescription>Add a new contractor to your maintenance network</DialogDescription>
          </DialogHeader>
          <Form {...contractorForm}>
            <form onSubmit={contractorForm.handleSubmit((data) => createContractorMutation.mutate(data))} className="space-y-4">
              <FormField
                control={contractorForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Contractor name" data-testid="input-contractor-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={contractorForm.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Company name" data-testid="input-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contractorForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+1234567890" data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contractorForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contractor@example.com" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={contractorForm.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (1-5)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="5" 
                          step="0.1"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-rating" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={contractorForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority (1-10)</FormLabel>
                      <Select 
                        value={field.value?.toString() || "5"} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-contractor-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 - Very Low</SelectItem>
                          <SelectItem value="2">2 - Low</SelectItem>
                          <SelectItem value="3">3 - Low-Medium</SelectItem>
                          <SelectItem value="4">4 - Below Medium</SelectItem>
                          <SelectItem value="5">5 - Medium</SelectItem>
                          <SelectItem value="6">6 - Above Medium</SelectItem>
                          <SelectItem value="7">7 - Medium-High</SelectItem>
                          <SelectItem value="8">8 - High</SelectItem>
                          <SelectItem value="9">9 - Very High</SelectItem>
                          <SelectItem value="10">10 - Maximum</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Higher priority = preferred for assignment</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={contractorForm.control}
                name="assignedLocationGroupIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Location Groups</FormLabel>
                    <FormDescription>Select location groups this contractor can service</FormDescription>
                    <div className="border rounded-md p-4 space-y-3 max-h-64 overflow-y-auto bg-muted/20">
                      {locationGroups.map((lg) => {
                        const propertyCount = properties.filter(p => p.locationGroupId === lg.id).length;
                        return (
                          <div key={lg.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover-elevate">
                            <div className="flex items-center space-x-3 flex-1">
                              <Checkbox
                                checked={field.value?.includes(lg.id)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, lg.id]);
                                  } else {
                                    field.onChange(current.filter((id) => id !== lg.id));
                                  }
                                }}
                                data-testid={`checkbox-location-group-${lg.id}`}
                              />
                              <label className="text-sm font-medium cursor-pointer flex-1 text-foreground">
                                {lg.name}
                              </label>
                            </div>
                            <Badge variant="secondary" className="ml-auto shrink-0">
                              {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={contractorForm.control}
                name="assignedPropertyIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Specific Properties</FormLabel>
                    <FormDescription>Select specific properties this contractor can service</FormDescription>
                    <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                      {properties.map((property) => (
                        <div key={property.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value?.includes(property.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, property.id]);
                              } else {
                                field.onChange(current.filter((id) => id !== property.id));
                              }
                            }}
                            data-testid={`checkbox-property-${property.id}`}
                          />
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {property.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={contractorForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes about this contractor" data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddContractor(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createContractorMutation.isPending} data-testid="button-submit-contractor">
                  Add Contractor
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Contractor Dialog */}
      <Dialog open={showEditContractor} onOpenChange={setShowEditContractor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contractor</DialogTitle>
            <DialogDescription>Update contractor information and assignments</DialogDescription>
          </DialogHeader>
          <Form {...editContractorForm}>
            <form onSubmit={editContractorForm.handleSubmit((data) => {
              if (selectedContractor) {
                updateContractorMutation.mutate({ id: selectedContractor.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editContractorForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Contractor name" data-testid="input-edit-contractor-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editContractorForm.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Company name" data-testid="input-edit-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editContractorForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+1234567890" data-testid="input-edit-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContractorForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="contractor@example.com" data-testid="input-edit-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editContractorForm.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating (1-5)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="5" 
                          step="0.1"
                          {...field} 
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          data-testid="input-edit-rating" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editContractorForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority (1-10)</FormLabel>
                      <Select 
                        value={field.value?.toString() || "5"} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-contractor-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 - Very Low</SelectItem>
                          <SelectItem value="2">2 - Low</SelectItem>
                          <SelectItem value="3">3 - Low-Medium</SelectItem>
                          <SelectItem value="4">4 - Below Medium</SelectItem>
                          <SelectItem value="5">5 - Medium</SelectItem>
                          <SelectItem value="6">6 - Above Medium</SelectItem>
                          <SelectItem value="7">7 - Medium-High</SelectItem>
                          <SelectItem value="8">8 - High</SelectItem>
                          <SelectItem value="9">9 - Very High</SelectItem>
                          <SelectItem value="10">10 - Maximum</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Higher priority = preferred for assignment</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editContractorForm.control}
                name="assignedLocationGroupIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Location Groups</FormLabel>
                    <FormDescription>Select location groups this contractor can service</FormDescription>
                    <div className="border rounded-md p-4 space-y-3 max-h-64 overflow-y-auto bg-muted/20">
                      {locationGroups.map((lg) => {
                        const propertyCount = properties.filter(p => p.locationGroupId === lg.id).length;
                        return (
                          <div key={lg.id} className="flex items-center justify-between gap-3 p-2 rounded-md hover-elevate">
                            <div className="flex items-center space-x-3 flex-1">
                              <Checkbox
                                checked={field.value?.includes(lg.id)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, lg.id]);
                                  } else {
                                    field.onChange(current.filter((id) => id !== lg.id));
                                  }
                                }}
                                data-testid={`checkbox-edit-location-group-${lg.id}`}
                              />
                              <label className="text-sm font-medium cursor-pointer flex-1 text-foreground">
                                {lg.name}
                              </label>
                            </div>
                            <Badge variant="secondary" className="ml-auto shrink-0">
                              {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editContractorForm.control}
                name="assignedPropertyIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned Specific Properties</FormLabel>
                    <FormDescription>Select specific properties this contractor can service</FormDescription>
                    <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
                      {properties.map((property) => (
                        <div key={property.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value?.includes(property.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, property.id]);
                              } else {
                                field.onChange(current.filter((id) => id !== property.id));
                              }
                            }}
                            data-testid={`checkbox-edit-property-${property.id}`}
                          />
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {property.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editContractorForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes about this contractor" data-testid="input-edit-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditContractor(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateContractorMutation.isPending} data-testid="button-submit-edit-contractor">
                  Update Contractor
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Request Details Modal */}
      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-3xl" data-testid="modal-request-details">
            <DialogHeader>
              <DialogTitle>Maintenance Request Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title</Label>
                  <p className="font-medium" data-testid="detail-title">{selectedRequest.title}</p>
                </div>
                <div>
                  <Label>Property</Label>
                  <p className="font-medium" data-testid="detail-property">
                    {properties.find(p => p.id === selectedRequest.propertyId)?.name}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    <StatusBadge status={selectedRequest.status} testId="detail-status" />
                  </div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <div className="mt-1">
                    <PriorityBadge priority={selectedRequest.priority} testId="detail-priority" />
                  </div>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <p className="mt-1 text-sm" data-testid="detail-description">{selectedRequest.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estimated Cost</Label>
                  <p className="font-medium" data-testid="detail-estimated-cost">${selectedRequest.estimatedCost || "N/A"}</p>
                </div>
                <div>
                  <Label>Actual Cost</Label>
                  <p className="font-medium" data-testid="detail-actual-cost">${selectedRequest.actualCost || "N/A"}</p>
                </div>
              </div>
              {selectedRequest.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="mt-1 text-sm" data-testid="detail-notes">{selectedRequest.notes}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                {selectedRequest.status === "pending" && (
                  <Button onClick={() => {
                    setShowAssignModal(true);
                  }} data-testid="button-assign">
                    <User className="w-4 h-4 mr-2" />
                    Assign to Contractor
                  </Button>
                )}
                {(selectedRequest.status === "assigned" || selectedRequest.status === "in_progress") && (
                  <Button onClick={() => {
                    const actualCost = prompt("Enter actual cost:");
                    const notes = prompt("Enter completion notes:");
                    if (actualCost !== null) {
                      completeRequestMutation.mutate({
                        id: selectedRequest.id,
                        actualCost: parseFloat(actualCost) || undefined,
                        notes: notes || undefined,
                      });
                    }
                  }} data-testid="button-complete">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Assign Contractor Modal */}
      {showAssignModal && selectedRequest && (
        <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign to Contractor</DialogTitle>
              <DialogDescription>Select a contractor for this maintenance request</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Contractor</Label>
                <Select>
                  <SelectTrigger data-testid="select-contractor">
                    <SelectValue placeholder="Select contractor" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.filter(c => c.isActive).map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.company && `(${c.company})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Scheduled Date</Label>
                <Input type="date" data-testid="input-scheduled-date" />
              </div>
              <div>
                <Label>Estimated Cost</Label>
                <Input type="number" placeholder="0.00" data-testid="input-assign-cost" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </Button>
                <Button data-testid="button-confirm-assign">
                  Assign
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
