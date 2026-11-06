import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Wrench, Plus, Star, Phone, Mail, Building2, MapPin, 
  Edit, Eye, Search, Filter, Users, TrendingUp, Award, Briefcase, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContractorSchema } from "@shared/schema";
import type { Contractor, LocationGroup, Property } from "@shared/schema";
import { z } from "zod";

// Specialty options
const SPECIALTIES = [
  "General",
  "Plumbing",
  "Electrical",
];

// Specialty colors for badges
const SPECIALTY_COLORS: Record<string, string> = {
  "General": "bg-gray-100 text-gray-800 border-gray-200",
  "Plumbing": "bg-blue-100 text-blue-800 border-blue-200",
  "Electrical": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "HVAC": "bg-purple-100 text-purple-800 border-purple-200",
  "Locksmith": "bg-orange-100 text-orange-800 border-orange-200",
  "Pest Control": "bg-green-100 text-green-800 border-green-200",
  "Painting": "bg-pink-100 text-pink-800 border-pink-200",
  "Gas Safety": "bg-red-100 text-red-800 border-red-200",
  "Carpet Cleaning": "bg-cyan-100 text-cyan-800 border-cyan-200",
  "Waste Disposal": "bg-amber-100 text-amber-800 border-amber-200",
  "Other": "bg-slate-100 text-slate-800 border-slate-200"
};

// Form schema
const contractorFormSchema = insertContractorSchema.extend({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email"),
  rating: z.coerce.number().min(1).max(5).optional(),
  priority: z.coerce.number().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

type ContractorFormData = z.infer<typeof contractorFormSchema>;

// Star rating display component
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3 h-3 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-1 text-sm text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

// Analytics card component
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  testId 
}: { 
  title: string; 
  value: string | number; 
  icon: any; 
  testId: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold" data-testid={testId}>{value}</div>
      </CardContent>
    </Card>
  );
}

// Contractor Details Dialog
function ContractorDetailsDialog({
  contractor,
  performanceData,
  onEdit,
}: {
  contractor: Contractor;
  performanceData: any;
  onEdit: () => void;
}) {
  const performance = performanceData?.find((p: any) => p.contractorId === contractor.id);
  const completionRate = performance 
    ? ((performance.completedJobs / performance.totalJobs) * 100).toFixed(1)
    : "0.0";

  return (
    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Contractor Details</DialogTitle>
        <DialogDescription>
          View detailed information and performance metrics
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Name</Label>
              <p className="font-medium">{contractor.name}</p>
            </div>
            {contractor.company && (
              <div>
                <Label className="text-muted-foreground">Company</Label>
                <p className="font-medium">{contractor.company}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p className="font-medium">{contractor.phone}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{contractor.email}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Rating</Label>
              <StarRating rating={contractor.rating || 5} />
            </div>
            <div>
              <Label className="text-muted-foreground">Priority</Label>
              <p className="font-medium">{contractor.priority || "Not set"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <Badge variant={contractor.isActive ? "default" : "secondary"}>
                {contractor.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Specialties</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {contractor.specialties.map((specialty) => (
                  <Badge 
                    key={specialty} 
                    variant="outline"
                    className={SPECIALTY_COLORS[specialty] || SPECIALTY_COLORS["Other"]}
                  >
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          {contractor.notes && (
            <div className="mt-4">
              <Label className="text-muted-foreground">Notes</Label>
              <p className="mt-1 text-sm">{contractor.notes}</p>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Jobs</div>
                <div className="text-2xl font-bold" data-testid="metric-contractor-total-jobs">
                  {performance?.totalJobs || 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Completion Rate</div>
                <div className="text-2xl font-bold" data-testid="metric-contractor-completion-rate">
                  {completionRate}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
                <div className="text-2xl font-bold" data-testid="metric-contractor-response-time">
                  {performance?.avgResponseTime?.toFixed(1) || "0.0"}h
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Avg Completion Time</div>
                <div className="text-2xl font-bold" data-testid="metric-contractor-completion-time">
                  {performance?.avgCompletionTime?.toFixed(1) || "0.0"}h
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="text-2xl font-bold" data-testid="metric-contractor-total-cost">
                  £{performance?.totalCost?.toFixed(2) || "0.00"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">Avg Cost per Job</div>
                <div className="text-2xl font-bold" data-testid="metric-contractor-avg-cost">
                  £{performance?.avgCost?.toFixed(2) || "0.00"}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2">
          <Button 
            onClick={onEdit} 
            data-testid="button-edit-contractor-details"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Contractor
          </Button>
        </div>
      </div>
    </DialogContent>
  );
}

// Add/Edit Contractor Dialog
function ContractorFormDialog({
  contractor,
  open,
  onOpenChange,
  locationGroups,
  properties,
}: {
  contractor?: Contractor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationGroups: LocationGroup[];
  properties: Property[];
}) {
  const { toast } = useToast();
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedLocationGroups, setSelectedLocationGroups] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  const form = useForm<ContractorFormData>({
    resolver: zodResolver(contractorFormSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      email: "",
      specialties: [],
      rating: 5,
      priority: 5,
      assignedLocationGroupIds: [],
      assignedPropertyIds: [],
      notes: "",
      isActive: true,
    },
  });

  // Reset form when contractor or open state changes
  useEffect(() => {
    if (open && contractor) {
      // Reset form with contractor data
      form.reset({
        name: contractor.name,
        company: contractor.company || "",
        phone: contractor.phone,
        email: contractor.email,
        rating: contractor.rating || 5,
        priority: contractor.priority || 5,
        notes: contractor.notes || "",
        isActive: contractor.isActive,
        specialties: [],
        assignedLocationGroupIds: [],
        assignedPropertyIds: [],
      });
      
      // Set specialty checkboxes
      setSelectedSpecialties(contractor.specialties || []);
      
      // Set location group checkboxes
      setSelectedLocationGroups(contractor.assignedLocationGroupIds || []);
      
      // Set property checkboxes
      setSelectedProperties(contractor.assignedPropertyIds || []);
    } else if (open && !contractor) {
      // Reset to empty for new contractor
      form.reset({
        name: "",
        company: "",
        phone: "",
        email: "",
        rating: 5,
        priority: 5,
        notes: "",
        isActive: true,
        specialties: [],
        assignedLocationGroupIds: [],
        assignedPropertyIds: [],
      });
      setSelectedSpecialties([]);
      setSelectedLocationGroups([]);
      setSelectedProperties([]);
    }
  }, [open, contractor, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ContractorFormData) => {
      return await apiRequest("POST", "/api/maintenance/contractors", {
        ...data,
        specialties: selectedSpecialties,
        assignedLocationGroupIds: selectedLocationGroups,
        assignedPropertyIds: selectedProperties,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/contractors"] });
      toast({ title: "Contractor created successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create contractor", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ContractorFormData) => {
      return await apiRequest("PATCH", `/api/maintenance/contractors/${contractor!.id}`, {
        ...data,
        specialties: selectedSpecialties,
        assignedLocationGroupIds: selectedLocationGroups,
        assignedPropertyIds: selectedProperties,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/contractors"] });
      toast({ title: "Contractor updated successfully" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to update contractor", variant: "destructive" });
    },
  });

  const onSubmit = (data: ContractorFormData) => {
    if (contractor) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    );
  };

  const toggleLocationGroup = (groupId: string) => {
    setSelectedLocationGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleProperty = (propertyId: string) => {
    setSelectedProperties((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contractor ? "Edit Contractor" : "Add Contractor"}</DialogTitle>
          <DialogDescription>
            {contractor ? "Update contractor information" : "Add a new contractor to your database"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-contractor-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-contractor-company" />
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
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-contractor-phone" />
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
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid="input-contractor-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Specialties */}
            <div>
              <Label>Specialties</Label>
              <div className="grid grid-cols-3 gap-2 mt-2" data-testid="select-contractor-specialties">
                {SPECIALTIES.map((specialty) => (
                  <div key={specialty} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedSpecialties.includes(specialty)}
                      onCheckedChange={() => toggleSpecialty(specialty)}
                    />
                    <Label className="text-sm font-normal cursor-pointer">
                      {specialty}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Rating and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (1-5)</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(value) => field.onChange(Number(value))}
                      >
                        <SelectTrigger data-testid="select-contractor-rating">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <SelectItem key={rating} value={rating.toString()}>
                              {rating} Star{rating > 1 ? "s" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority: {field.value || 5}</FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={10}
                        step={1}
                        value={[field.value || 5]}
                        onValueChange={(value) => field.onChange(value[0])}
                        data-testid="slider-contractor-priority"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location Groups */}
            <div>
              <Label>Assigned Location Groups</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2" data-testid="select-location-groups">
                {locationGroups.length === 0 ? (
                  <div className="col-span-2 text-sm text-muted-foreground text-center py-4">
                    No location groups available
                  </div>
                ) : (
                  locationGroups.map((group) => (
                    <label key={group.id} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={selectedLocationGroups.includes(group.id)}
                        onCheckedChange={() => toggleLocationGroup(group.id)}
                        data-testid={`checkbox-location-${group.id}`}
                      />
                      <span className="text-sm font-normal" data-testid={`label-location-${group.id}`}>
                        {group.displayName || group.slug || "Unnamed Location"}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Properties */}
            <div>
              <Label>Assigned Properties</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-md p-2" data-testid="select-properties">
                {properties.length === 0 ? (
                  <div className="col-span-2 text-sm text-muted-foreground text-center py-4">
                    No properties available
                  </div>
                ) : (
                  properties.map((property) => (
                    <label key={property.id} className="flex items-center space-x-2 cursor-pointer">
                      <Checkbox
                        checked={selectedProperties.includes(property.id)}
                        onCheckedChange={() => toggleProperty(property.id)}
                        data-testid={`checkbox-property-${property.id}`}
                      />
                      <span className="text-sm font-normal" data-testid={`label-property-${property.id}`}>
                        {property.name || "Unnamed Property"}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} data-testid="textarea-contractor-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Active Status</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Set contractor as active or inactive
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="toggle-contractor-active"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-contractor"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : contractor
                  ? "Update Contractor"
                  : "Add Contractor"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Main Contractors Page
export default function Contractors() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [detailsContractor, setDetailsContractor] = useState<Contractor | null>(null);
  const [deleteContractor, setDeleteContractor] = useState<Contractor | null>(null);

  // Fetch contractors
  const { data: contractors, isLoading: contractorsLoading } = useQuery<Contractor[]>({
    queryKey: ["/api/maintenance/contractors"],
  });

  // Fetch stats for performance data
  const { data: stats } = useQuery<{ contractorPerformance: any[] }>({
    queryKey: ["/api/maintenance/stats"],
  });

  // Fetch location groups
  const { data: locationGroups = [] } = useQuery<LocationGroup[]>({
    queryKey: ["/api/location-groups"],
  });

  // Fetch properties
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/maintenance/contractors/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Contractor deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/contractors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/stats"] });
      setDeleteContractor(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete contractor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter contractors
  const filteredContractors = contractors?.filter((contractor) => {
    const matchesSearch =
      contractor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contractor.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSpecialty =
      specialtyFilter === "all" || contractor.specialties.includes(specialtyFilter);

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && contractor.isActive) ||
      (statusFilter === "inactive" && !contractor.isActive);

    const matchesLocation =
      locationFilter === "all" ||
      contractor.assignedLocationGroupIds.includes(locationFilter);

    return matchesSearch && matchesSpecialty && matchesStatus && matchesLocation;
  }) || [];

  // Calculate analytics
  const totalContractors = contractors?.length || 0;
  const activeContractors = contractors?.filter((c) => c.isActive).length || 0;
  const avgRating = contractors?.length
    ? (contractors.reduce((sum, c) => sum + (c.rating || 5), 0) / contractors.length).toFixed(1)
    : "0.0";
  const totalJobs = stats?.contractorPerformance?.reduce((sum, p) => sum + p.totalJobs, 0) || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-contractors">Contractors</h1>
          <p className="text-muted-foreground" data-testid="text-contractors-description">
            Manage contractors and view performance analytics
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-contractor">
          <Plus className="w-4 h-4 mr-2" />
          Add Contractor
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Contractors"
          value={totalContractors}
          icon={Users}
          testId="metric-total-contractors"
        />
        <MetricCard
          title="Active Contractors"
          value={activeContractors}
          icon={Briefcase}
          testId="metric-active-contractors"
        />
        <MetricCard
          title="Average Rating"
          value={avgRating}
          icon={Award}
          testId="metric-avg-rating"
        />
        <MetricCard
          title="Total Jobs This Month"
          value={totalJobs}
          icon={TrendingUp}
          testId="metric-total-jobs"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search contractors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-contractors"
              />
            </div>

            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger data-testid="select-specialty-filter">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {SPECIALTIES.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger data-testid="select-location-filter">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locationGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Contractors Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Contractors ({filteredContractors.length} of {totalContractors})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contractorsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredContractors.length === 0 ? (
            <div className="text-center py-12">
              <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No contractors found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Specialties</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Locations</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContractors.map((contractor) => (
                    <TableRow key={contractor.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`text-contractor-name-${contractor.id}`}>
                            {contractor.name}
                          </div>
                          {contractor.company && (
                            <div className="text-sm text-muted-foreground">
                              {contractor.company}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3" />
                            {contractor.phone}
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="w-3 h-3" />
                            {contractor.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contractor.specialties.slice(0, 2).map((specialty) => (
                            <Badge
                              key={specialty}
                              variant="outline"
                              className={SPECIALTY_COLORS[specialty] || SPECIALTY_COLORS["Other"]}
                              data-testid={`badge-specialty-${specialty}-${contractor.id}`}
                            >
                              {specialty}
                            </Badge>
                          ))}
                          {contractor.specialties.length > 2 && (
                            <Badge variant="outline">
                              +{contractor.specialties.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div data-testid={`text-rating-${contractor.id}`}>
                          <StarRating rating={contractor.rating || 5} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={contractor.isActive ? "default" : "secondary"}
                          data-testid={`badge-status-${contractor.id}`}
                        >
                          {contractor.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span data-testid={`text-priority-${contractor.id}`}>
                          {contractor.priority || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span data-testid={`text-locations-count-${contractor.id}`}>
                            {contractor.assignedLocationGroupIds.length + 
                             contractor.assignedPropertyIds.length}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingContractor(contractor)}
                            data-testid={`button-edit-${contractor.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailsContractor(contractor)}
                            data-testid={`button-details-${contractor.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteContractor(contractor)}
                            data-testid={`button-delete-${contractor.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
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

      {/* Add Contractor Dialog */}
      <ContractorFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        locationGroups={locationGroups}
        properties={properties}
      />

      {/* Edit Contractor Dialog */}
      {editingContractor && (
        <ContractorFormDialog
          contractor={editingContractor}
          open={true}
          onOpenChange={(open) => !open && setEditingContractor(null)}
          locationGroups={locationGroups}
          properties={properties}
        />
      )}

      {/* Details Dialog */}
      {detailsContractor && (
        <Dialog open={true} onOpenChange={(open) => !open && setDetailsContractor(null)}>
          <ContractorDetailsDialog
            contractor={detailsContractor}
            performanceData={stats?.contractorPerformance || []}
            onEdit={() => {
              setEditingContractor(detailsContractor);
              setDetailsContractor(null);
            }}
          />
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteContractor && (
        <AlertDialog open={true} onOpenChange={(open) => !open && setDeleteContractor(null)}>
          <AlertDialogContent data-testid="dialog-delete-contractor">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contractor</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {deleteContractor.name}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteContractor.id)}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
