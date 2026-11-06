import { useState } from "react";
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Home, Upload, FileText, Calendar, Users, DollarSign, Building2, DoorOpen, Trash, Edit, Download, ChevronDown, ChevronUp, ArrowRight, Pencil, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { fadeIn, staggerContainer, staggerItem } from "@/lib/animations";
import { InstructionPanel } from "@/components/instruction-panel";
import { astPropertiesInstructions } from "@/lib/page-instructions";
import { phoneNumberSchema, currencyAmountSchema } from "@/lib/validation";

const propertySchema = z.object({
  landlordId: z.coerce.number().optional(),
  name: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  bedrooms: z.coerce.number().int().min(0).optional(),
  bathrooms: z.coerce.number().int().min(0).optional(),
  propertyType: z.string().optional(),
  notes: z.string().optional(),
});

const buildingSchema = z.object({
  landlordId: z.coerce.number().optional(),
  name: z.string().min(1, "Building name is required"),
  address: z.string().min(1, "Address is required"),
  notes: z.string().optional(),
});

const apartmentSchema = z.object({
  buildingId: z.string().min(1, "Building is required"),
  name: z.string().min(1, "Apartment name is required"),
  bedrooms: z.coerce.number().int().min(1, "At least 1 bedroom required"),
  notes: z.string().optional(),
});

const tenancySchema = z.object({
  astPropertyId: z.string().optional(),
  astApartmentId: z.string().optional(),
  roomNumber: z.string().optional(),
  tenantName: z.string().min(1, "Tenant name is required"),
  tenantEmail: z.string().email().optional().or(z.literal("")),
  tenantPhone: phoneNumberSchema,
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  rentAmount: z.coerce.number().min(0, "Rent amount must be positive"),
  rentFrequency: z.string(),
  depositAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
}).refine(data => data.astPropertyId || data.astApartmentId, {
  message: "Must select either a property or an apartment",
  path: ["astPropertyId"],
}).refine(data => {
  // If apartment is selected, room number must be provided
  if (data.astApartmentId && !data.roomNumber) {
    return false;
  }
  return true;
}, {
  message: "Room number is required for apartment tenancies",
  path: ["roomNumber"],
});

type Property = {
  id: string;
  name: string;
  address: string;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  notes?: string;
  active: boolean;
};

type Building = {
  id: string;
  name: string;
  address: string;
  notes?: string;
  active: boolean;
};

type Apartment = {
  id: string;
  buildingId: string;
  name: string;
  bedrooms: number;
  notes?: string;
  active: boolean;
};

type Tenancy = {
  id: string;
  astPropertyId?: string;
  astApartmentId?: string;
  roomNumber?: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  startDate: string;
  endDate?: string;
  rentAmount: number;
  rentFrequency: string;
  depositAmount?: number;
  status: string;
  notes?: string;
};

type TenancyWithProperty = Tenancy & {
  property: Property;
};

type TenancyWithDetails = Tenancy & {
  property?: Property;
  building?: Building;
  apartment?: Apartment;
};

type Contract = {
  id: string;
  tenancyId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  documentType: string;
  uploadedAt: string;
};

function TenancyContractRow({ 
  tenancy, 
  onSmsClick 
}: { 
  tenancy: TenancyWithDetails;
  onSmsClick: (tenancyId: string) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/ast/contracts", tenancy.id],
    queryFn: async () => {
      const response = await fetch(`/api/ast/contracts/${tenancy.id}`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  const uploadContractMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`/api/ast/contracts/${tenancy.id}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/contracts", tenancy.id] });
      toast({ title: "Success", description: "Contract uploaded successfully" });
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast({ 
        title: "Error", 
        description: "Only PDF, DOC, and DOCX files are allowed", 
        variant: "destructive" 
      });
      event.target.value = "";
      return;
    }
    
    setIsUploading(true);
    uploadContractMutation.mutate(file);
  };

  const handleDownload = (contract: Contract) => {
    const link = document.createElement('a');
    link.href = contract.fileUrl;
    link.download = contract.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 border rounded-lg bg-muted/50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-medium text-sm">{tenancy.tenantName}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(tenancy.startDate), "dd/MM/yyyy")} - {tenancy.endDate ? format(new Date(tenancy.endDate), "dd/MM/yyyy") : "Ongoing"}
            {tenancy.roomNumber && ` • Room: ${tenancy.roomNumber}`}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onSmsClick(tenancy.id)}
                disabled={!tenancy.tenantPhone}
                data-testid={`button-sms-tenant-${tenancy.id}`}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send SMS</TooltipContent>
          </Tooltip>
          <Badge variant={tenancy.status === "active" ? "default" : "outline"} className="text-xs ml-2">
            {tenancy.status}
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground">Loading contracts...</div>
      ) : contracts.length > 0 ? (
        <div className="space-y-2">
          {contracts.map((contract) => (
            <Button
              key={contract.id}
              variant="outline"
              size="sm"
              className="w-full justify-between text-xs"
              onClick={() => handleDownload(contract)}
              data-testid={`button-download-contract-${contract.id}`}
            >
              <span className="flex items-center gap-2 truncate">
                <FileText className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{contract.fileName}</span>
              </span>
              <Download className="h-3 w-3 flex-shrink-0 ml-2" />
            </Button>
          ))}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            data-testid={`button-upload-contract-${tenancy.id}`}
          >
            <Upload className="h-3 w-3 mr-2" />
            {isUploading ? "Uploading..." : "Upload Another"}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground italic">No contract uploaded</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            data-testid={`button-upload-contract-${tenancy.id}`}
          >
            <Upload className="h-3 w-3 mr-2" />
            {isUploading ? "Uploading..." : "Upload Contract"}
          </Button>
        </div>
      )}
    </div>
  );
}

function EditTenancyDialog({ 
  tenancy, 
  open, 
  onOpenChange 
}: { 
  tenancy: TenancyWithDetails; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  
  const editTenancyForm = useForm<z.infer<typeof tenancySchema>>({
    resolver: zodResolver(tenancySchema),
    defaultValues: {
      astPropertyId: tenancy.astPropertyId || "",
      astApartmentId: tenancy.astApartmentId || "",
      roomNumber: tenancy.roomNumber || "",
      tenantName: tenancy.tenantName,
      tenantEmail: tenancy.tenantEmail || "",
      tenantPhone: tenancy.tenantPhone || "",
      startDate: tenancy.startDate,
      endDate: tenancy.endDate || "",
      rentAmount: tenancy.rentAmount,
      rentFrequency: tenancy.rentFrequency,
      depositAmount: tenancy.depositAmount || 0,
      notes: tenancy.notes || "",
    },
  });

  const updateTenancyMutation = useMutation({
    mutationFn: async (data: Partial<z.infer<typeof tenancySchema>>) => {
      return await apiRequest(`/api/ast/tenancies/${tenancy.id}`, { 
        method: "PATCH", 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/tenancies/with-properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ast/tenancies/with-details"] });
      toast({ title: "Success", description: "Tenancy updated successfully" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update tenancy", variant: "destructive" });
    },
  });

  const onSubmit = (data: z.infer<typeof tenancySchema>) => {
    updateTenancyMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0" data-testid={`dialog-edit-tenancy-${tenancy.id}`}>
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle>Edit Tenancy</DialogTitle>
                <DialogDescription>Update tenancy details for {tenancy.tenantName}</DialogDescription>
              </div>
              <Button 
                onClick={editTenancyForm.handleSubmit(onSubmit)} 
                disabled={updateTenancyMutation.isPending}
                data-testid={`button-update-tenancy-header-${tenancy.id}`}
                className="shrink-0"
              >
                {updateTenancyMutation.isPending ? "Updating..." : "Update Tenancy"}
              </Button>
            </div>
          </DialogHeader>
        </div>
        <Form {...editTenancyForm}>
          <form onSubmit={editTenancyForm.handleSubmit(onSubmit)} className="overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={editTenancyForm.control}
                name="tenantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={`input-edit-tenant-name-${tenancy.id}`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTenancyForm.control}
                name="tenantEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" data-testid={`input-edit-tenant-email-${tenancy.id}`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTenancyForm.control}
                name="tenantPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={`input-edit-tenant-phone-${tenancy.id}`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTenancyForm.control}
                name="roomNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Number (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid={`input-edit-room-number-${tenancy.id}`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTenancyForm.control}
                name="rentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rent Amount (£)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid={`input-edit-rent-amount-${tenancy.id}`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTenancyForm.control}
                name="rentFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rent Frequency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid={`select-edit-rent-frequency-${tenancy.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTenancyForm.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deposit Amount (£)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} data-testid={`input-edit-deposit-amount-${tenancy.id}`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTenancyForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid={`input-edit-start-date-${tenancy.id}`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTenancyForm.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" data-testid={`input-edit-end-date-${tenancy.id}`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editTenancyForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid={`input-edit-notes-${tenancy.id}`} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function ASTPropertiesPage() {
  const { toast } = useToast();
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [tenancyDialogOpen, setTenancyDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("properties");
  const [uploadedPdfFile, setUploadedPdfFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [showExtractedData, setShowExtractedData] = useState(false);
  const [extractionSucceeded, setExtractionSucceeded] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [buildingDialogOpen, setBuildingDialogOpen] = useState(false);
  const [apartmentDialogOpen, setApartmentDialogOpen] = useState(false);
  const [roomTenancyDialogOpen, setRoomTenancyDialogOpen] = useState(false);
  const [moveTenancyDialogOpen, setMoveTenancyDialogOpen] = useState(false);
  const [tenancyToMove, setTenancyToMove] = useState<TenancyWithDetails | null>(null);
  const [moveToType, setMoveToType] = useState<"property" | "apartment">("property");
  const [movePropertyId, setMovePropertyId] = useState<string>("");
  const [moveBuildingId, setMoveBuildingId] = useState<string>("");
  const [moveApartmentId, setMoveApartmentId] = useState<string>("");
  const [moveRoomNumber, setMoveRoomNumber] = useState<string>("");
  const [expandedPropertyContracts, setExpandedPropertyContracts] = useState<Set<string>>(new Set());
  const [editTenancyDialogOpen, setEditTenancyDialogOpen] = useState(false);
  const [tenancyToEdit, setTenancyToEdit] = useState<TenancyWithDetails | null>(null);
  const [editPropertyDialogOpen, setEditPropertyDialogOpen] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<Property | null>(null);
  const [editBuildingDialogOpen, setEditBuildingDialogOpen] = useState(false);
  const [buildingToEdit, setBuildingToEdit] = useState<Building | null>(null);
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsTenancyId, setSmsTenancyId] = useState<string | null>(null);
  const [smsMessage, setSmsMessage] = useState("");

  const { data: properties = [], isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ["/api/ast/properties"],
  });

  const { data: tenanciesWithProperties = [], isLoading: tenanciesLoading } = useQuery<TenancyWithProperty[]>({
    queryKey: ["/api/ast/tenancies/with-properties"],
  });

  const { data: buildings = [], isLoading: buildingsLoading } = useQuery<Building[]>({
    queryKey: ["/api/ast/buildings"],
  });

  const { data: apartments = [], isLoading: apartmentsLoading } = useQuery<Apartment[]>({
    queryKey: ["/api/ast/apartments/building", selectedBuilding],
    enabled: !!selectedBuilding,
  });

  const { data: tenanciesWithDetails = [], isLoading: detailsLoading } = useQuery<TenancyWithDetails[]>({
    queryKey: ["/api/ast/tenancies/with-details"],
  });

  const { data: moveApartments = [] } = useQuery<Apartment[]>({
    queryKey: ["/api/ast/apartments/building", moveBuildingId],
    enabled: !!moveBuildingId && moveTenancyDialogOpen,
  });

  // Fetch landlords list for property/building assignment
  const { data: landlords = [] } = useQuery<Array<{ id: number; name: string; email: string }>>({
    queryKey: ["/api/landlords"],
  });

  const propertyForm = useForm<z.infer<typeof propertySchema>>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      landlordId: undefined,
      name: "",
      address: "",
      bedrooms: 0,
      bathrooms: 0,
      propertyType: "Flat",
      notes: "",
    },
  });

  const tenancyForm = useForm<z.infer<typeof tenancySchema>>({
    resolver: zodResolver(tenancySchema),
    defaultValues: {
      astPropertyId: "",
      astApartmentId: "",
      roomNumber: "",
      tenantName: "",
      tenantEmail: "",
      tenantPhone: "",
      startDate: "",
      endDate: "",
      rentAmount: 0,
      rentFrequency: "monthly",
      depositAmount: 0,
      notes: "",
    },
  });

  const buildingForm = useForm<z.infer<typeof buildingSchema>>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      landlordId: undefined,
      name: "",
      address: "",
      notes: "",
    },
  });

  const apartmentForm = useForm<z.infer<typeof apartmentSchema>>({
    resolver: zodResolver(apartmentSchema),
    defaultValues: {
      buildingId: "",
      name: "",
      bedrooms: 1,
      notes: "",
    },
  });

  const createPropertyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof propertySchema>) => {
      return await apiRequest("/api/ast/properties", { 
        method: "POST", 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/properties"] });
      toast({ title: "Success", description: "Property created successfully" });
      setPropertyDialogOpen(false);
      propertyForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create property", variant: "destructive" });
    },
  });

  const createTenancyMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tenancySchema>) => {
      return await apiRequest("/api/ast/tenancies", { 
        method: "POST", 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: async (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/tenancies/with-properties"] });
      
      // If we have a PDF file waiting, upload it now with the new tenancy ID
      if (uploadedPdfFile && response.id) {
        try {
          await uploadPdfMutation.mutateAsync({ file: uploadedPdfFile, tenancyId: response.id });
          toast({ title: "Success", description: "Tenancy and contract created successfully" });
        } catch (error) {
          toast({ title: "Warning", description: "Tenancy created but contract upload failed", variant: "destructive" });
        }
      } else {
        toast({ title: "Success", description: "Tenancy created successfully" });
      }
      
      setTenancyDialogOpen(false);
      tenancyForm.reset();
      setUploadedPdfFile(null);
      setExtractedData(null);
      setShowExtractedData(false);
      setExtractionSucceeded(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create tenancy", variant: "destructive" });
    },
  });

  const uploadPdfMutation = useMutation({
    mutationFn: async ({ file, tenancyId }: { file: File; tenancyId: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenancyId", tenancyId);
      
      const response = await fetch("/api/ast/contracts/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload PDF");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: "Contract uploaded and data extracted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/ast/contracts"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createBuildingMutation = useMutation({
    mutationFn: async (data: z.infer<typeof buildingSchema>) => {
      return await apiRequest("/api/ast/buildings", { 
        method: "POST", 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/buildings"] });
      toast({ title: "Success", description: "Building created successfully" });
      setBuildingDialogOpen(false);
      buildingForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create building", variant: "destructive" });
    },
  });

  const createApartmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof apartmentSchema>) => {
      return await apiRequest("/api/ast/apartments", { 
        method: "POST", 
        body: JSON.stringify(data) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/apartments/building", selectedBuilding] });
      toast({ title: "Success", description: "Apartment created successfully" });
      setApartmentDialogOpen(false);
      apartmentForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create apartment", variant: "destructive" });
    },
  });

  const deleteApartmentMutation = useMutation({
    mutationFn: async (apartmentId: string) => {
      return await apiRequest(`/api/ast/apartments/${apartmentId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/apartments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ast/apartments/building", selectedBuilding] });
      queryClient.invalidateQueries({ queryKey: ["/api/ast/tenancies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ast/tenancies/with-details"] });
      toast({ title: "Success", description: "Apartment deleted successfully" });
    },
    onError: (error: any) => {
      const message = error.message || "Failed to delete apartment";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const deleteTenancyMutation = useMutation({
    mutationFn: async (tenancyId: string) => {
      return await apiRequest(`/api/ast/tenancies/${tenancyId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/tenancies/with-properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ast/tenancies/with-details"] });
      toast({ title: "Success", description: "Tenancy deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete tenancy", variant: "destructive" });
    },
  });

  const updateTenancyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return await apiRequest(`/api/ast/tenancies/${id}`, { 
        method: "PATCH", 
        body: JSON.stringify(updates) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/tenancies/with-properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ast/tenancies/with-details"] });
      toast({ title: "Success", description: "Tenancy moved successfully" });
      setMoveTenancyDialogOpen(false);
      setTenancyToMove(null);
      setMovePropertyId("");
      setMoveBuildingId("");
      setMoveApartmentId("");
      setMoveRoomNumber("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to move tenancy", variant: "destructive" });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return await apiRequest(`/api/ast/properties/${id}`, { 
        method: "PATCH", 
        body: JSON.stringify(updates) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/properties"] });
      toast({ title: "Success", description: "Property updated successfully" });
      setEditPropertyDialogOpen(false);
      setPropertyToEdit(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update property", variant: "destructive" });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return await apiRequest(`/api/ast/properties/${propertyId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/properties"] });
      toast({ title: "Success", description: "Property deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete property", variant: "destructive" });
    },
  });

  const updateBuildingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return await apiRequest(`/api/ast/buildings/${id}`, { 
        method: "PATCH", 
        body: JSON.stringify(updates) 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ast/buildings"] });
      toast({ title: "Success", description: "Building updated successfully" });
      setEditBuildingDialogOpen(false);
      setBuildingToEdit(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update building", variant: "destructive" });
    },
  });

  // Send SMS to tenant mutation
  const sendTenantSmsMutation = useMutation({
    mutationFn: async ({ tenancyId, message }: { tenancyId: string; message: string }) => {
      return apiRequest(`/api/ast/tenancies/${tenancyId}/send-sms`, { 
        method: "POST", 
        body: JSON.stringify({ message }) 
      });
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "Message sent successfully via Twilio",
      });
      setSmsDialogOpen(false);
      setSmsMessage("");
      setSmsTenancyId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    },
  });

  const onPropertySubmit = (data: z.infer<typeof propertySchema>) => {
    createPropertyMutation.mutate(data);
  };

  const onBuildingSubmit = (data: z.infer<typeof buildingSchema>) => {
    createBuildingMutation.mutate(data);
  };

  const onApartmentSubmit = (data: z.infer<typeof apartmentSchema>) => {
    createApartmentMutation.mutate(data);
  };

  const handleMoveTenancy = () => {
    if (!tenancyToMove) return;

    const updates: any = {};

    if (moveToType === "property") {
      if (!movePropertyId) {
        toast({ title: "Error", description: "Please select a property", variant: "destructive" });
        return;
      }
      updates.astPropertyId = movePropertyId;
      updates.astApartmentId = null;
      updates.roomNumber = null;
    } else {
      if (!moveApartmentId) {
        toast({ title: "Error", description: "Please select a building and apartment", variant: "destructive" });
        return;
      }
      if (!moveRoomNumber) {
        toast({ title: "Error", description: "Room number is required for apartment tenancies", variant: "destructive" });
        return;
      }
      updates.astPropertyId = null;
      updates.astApartmentId = moveApartmentId;
      updates.roomNumber = moveRoomNumber;
    }

    updateTenancyMutation.mutate({ id: tenancyToMove.id, updates });
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      toast({ title: "Error", description: "Please upload a PDF file", variant: "destructive" });
      return;
    }
    
    setUploadedPdfFile(file);
    setIsExtracting(true);
    
    try {
      // Extract data without saving to database
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/ast/contracts/extract", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to extract contract data");
      }
      
      const result = await response.json();
      setExtractedData(result.extractedData);
      setShowExtractedData(true);
      
      // Auto-populate form with extracted data
      if (result.extractedData) {
        if (result.extractedData.tenantName) {
          tenancyForm.setValue("tenantName", result.extractedData.tenantName);
        }
        if (result.extractedData.rentAmount) {
          tenancyForm.setValue("rentAmount", result.extractedData.rentAmount);
        }
        if (result.extractedData.rentFrequency) {
          tenancyForm.setValue("rentFrequency", result.extractedData.rentFrequency);
        }
        if (result.extractedData.depositAmount) {
          tenancyForm.setValue("depositAmount", result.extractedData.depositAmount);
        }
        if (result.extractedData.startDate) {
          tenancyForm.setValue("startDate", result.extractedData.startDate);
        }
        if (result.extractedData.endDate) {
          tenancyForm.setValue("endDate", result.extractedData.endDate);
        }
        if (result.extractedData.tenantEmail) {
          tenancyForm.setValue("tenantEmail", result.extractedData.tenantEmail);
        }
        if (result.extractedData.tenantPhone) {
          tenancyForm.setValue("tenantPhone", result.extractedData.tenantPhone);
        }
      }
      
      // Mark extraction as successful
      setExtractionSucceeded(true);
      
      toast({ 
        title: "Success", 
        description: "Contract data extracted successfully. Please review and submit." 
      });
    } catch (error) {
      console.error("Error extracting contract data:", error);
      
      // Clear state on extraction failure - user must retry with valid contract
      setUploadedPdfFile(null);
      setExtractionSucceeded(false);
      setExtractedData(null);
      setShowExtractedData(false);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      toast({ 
        title: "Extraction Failed", 
        description: errorMessage || "Unable to extract data from PDF. Please ensure it's a valid tenancy agreement and try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const onTenancySubmit = (data: z.infer<typeof tenancySchema>) => {
    createTenancyMutation.mutate(data);
  };

  const activeTenancies = tenanciesWithDetails.filter((t) => t.status === "active");
  const expiredTenancies = tenanciesWithDetails.filter((t) => t.status === "expired" || t.status === "terminated");

  return (
    <div className="h-full overflow-auto p-6">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="max-w-7xl mx-auto space-y-6"
      >
        <motion.div variants={staggerItem}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">AST Lettings</h1>
              <p className="text-muted-foreground">Manage long-term rental properties and tenancies</p>
            </div>
            <div className="flex gap-2">
              <InstructionPanel {...astPropertiesInstructions} />
              <Dialog open={propertyDialogOpen} onOpenChange={setPropertyDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-property">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Property
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add AST Property</DialogTitle>
                    <DialogDescription>Create a new long-term rental property</DialogDescription>
                  </DialogHeader>
                  <Form {...propertyForm}>
                    <form onSubmit={propertyForm.handleSubmit(onPropertySubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={propertyForm.control}
                          name="landlordId"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Landlord (Optional)</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} 
                                value={field.value?.toString() || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-landlord">
                                    <SelectValue placeholder="Select a landlord..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {landlords.map((landlord) => (
                                    <SelectItem key={landlord.id} value={landlord.id.toString()}>
                                      {landlord.name} ({landlord.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Link this property to a landlord from the client database
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={propertyForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Property Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Flat 1, York House" data-testid="input-property-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={propertyForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Full address" data-testid="input-property-address" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={propertyForm.control}
                          name="propertyType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Property Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-property-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Flat">Flat</SelectItem>
                                  <SelectItem value="House">House</SelectItem>
                                  <SelectItem value="Studio">Studio</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={propertyForm.control}
                            name="bedrooms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bedrooms</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} data-testid="input-bedrooms" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={propertyForm.control}
                            name="bathrooms"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Bathrooms</FormLabel>
                                <FormControl>
                                  <Input type="number" {...field} data-testid="input-bathrooms" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={propertyForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Additional property notes" data-testid="input-property-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <DialogFooter>
                        <Button type="submit" disabled={createPropertyMutation.isPending} data-testid="button-submit-property">
                          {createPropertyMutation.isPending ? "Creating..." : "Create Property"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

              <Dialog open={tenancyDialogOpen} onOpenChange={(open) => {
                setTenancyDialogOpen(open);
                // Reset state when dialog is closed
                if (!open) {
                  setUploadedPdfFile(null);
                  setExtractionSucceeded(false);
                  setExtractedData(null);
                  setShowExtractedData(false);
                  setIsExtracting(false);
                  tenancyForm.reset();
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" data-testid="button-add-tenancy">
                    <Users className="h-4 w-4 mr-2" />
                    Add Tenancy
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
                  <div className="px-6 pt-6 pb-4 border-b shrink-0">
                    <DialogHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <DialogTitle>Add Tenancy Agreement</DialogTitle>
                          <DialogDescription>Upload a PDF contract to auto-fill details, or enter information manually below</DialogDescription>
                        </div>
                        <Button 
                          onClick={tenancyForm.handleSubmit(onTenancySubmit)} 
                          disabled={createTenancyMutation.isPending}
                          data-testid="button-submit-tenancy-header"
                          className="shrink-0"
                        >
                          {createTenancyMutation.isPending ? "Creating..." : "Create Tenancy"}
                        </Button>
                      </div>
                    </DialogHeader>
                  </div>
                  <Form {...tenancyForm}>
                    <form onSubmit={tenancyForm.handleSubmit(onTenancySubmit)} className="overflow-y-auto px-6 py-4 space-y-4">
                      {/* PDF Upload Section - Always Visible */}
                      <div className="space-y-4">
                        <div className="p-4 border rounded-md bg-muted/50">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Upload PDF Contract
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Upload the tenancy agreement PDF to automatically extract all contract details
                          </p>
                          <div className="flex items-center gap-3">
                            <Input
                              type="file"
                              accept=".pdf"
                              onChange={handlePdfUpload}
                              disabled={isExtracting || !!uploadedPdfFile}
                              className="cursor-pointer"
                              data-testid="input-pdf-upload"
                            />
                            {isExtracting && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                Extracting data...
                              </div>
                            )}
                          </div>
                          {extractionSucceeded && !isExtracting && (
                            <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                              ✓ {uploadedPdfFile?.name} uploaded - data extracted successfully
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Separator */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            {extractionSucceeded ? "Review & Edit Extracted Data" : "Or enter details manually"}
                          </span>
                        </div>
                      </div>

                      {/* Form Fields - Always Show */}
                      <>
                        {extractionSucceeded && !isExtracting && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                            <p className="text-sm text-blue-900 dark:text-blue-100">
                              <strong>Review Extracted Data:</strong> Please verify the information below and make any necessary corrections before submitting.
                            </p>
                          </div>
                        )}

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={tenancyForm.control}
                              name="astPropertyId"
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel>Property</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-tenancy-property">
                                        <SelectValue placeholder="Select a property" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent data-testid="select-content-properties">
                                      {properties.map((property, index) => (
                                        <SelectItem 
                                          key={property.id} 
                                          value={property.id}
                                          data-testid={`select-option-property-${index}`}
                                        >
                                          {property.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {/* Room Number field - show for property (optional for HMO) */}
                            {tenancyForm.watch("astPropertyId") && (
                              <FormField
                                control={tenancyForm.control}
                                name="roomNumber"
                                render={({ field }) => (
                                  <FormItem className="col-span-2">
                                    <FormLabel>Room Number / Name (Optional)</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Optional: e.g., Room 1, Room 2 (for HMO properties)"
                                        data-testid="input-room-number"
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Optional: For HMO properties, specify the room (e.g., 'Room 1', 'Room 2')
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            <FormField
                              control={tenancyForm.control}
                              name="tenantName"
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel>Tenant Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="John Smith" data-testid="input-tenant-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={tenancyForm.control}
                              name="tenantEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tenant Email</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="email" placeholder="tenant@example.com" data-testid="input-tenant-email" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={tenancyForm.control}
                              name="tenantPhone"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Tenant Phone</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="+44 7XXX XXXXXX" data-testid="input-tenant-phone" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={tenancyForm.control}
                              name="startDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Date</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="date" data-testid="input-start-date" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={tenancyForm.control}
                              name="endDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Date (Optional)</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="date" data-testid="input-end-date" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={tenancyForm.control}
                              name="rentAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Rent Amount (£)</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" {...field} placeholder="1200.00" data-testid="input-rent-amount" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={tenancyForm.control}
                              name="rentFrequency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Rent Frequency</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-rent-frequency">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="weekly">Weekly</SelectItem>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                      <SelectItem value="quarterly">Quarterly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={tenancyForm.control}
                              name="depositAmount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Deposit Amount (£)</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" {...field} placeholder="1200.00" data-testid="input-deposit-amount" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={tenancyForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem className="col-span-2">
                                  <FormLabel>Notes</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} placeholder="Additional notes" data-testid="input-tenancy-notes" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="properties" data-testid="tab-properties">
                <Home className="w-4 h-4 mr-2" />
                Properties
              </TabsTrigger>
              <TabsTrigger value="buildings" data-testid="tab-buildings">
                <Building2 className="w-4 h-4 mr-2" />
                Buildings
              </TabsTrigger>
              <TabsTrigger value="active" data-testid="tab-active">
                <Users className="w-4 h-4 mr-2" />
                Active
              </TabsTrigger>
              <TabsTrigger value="past" data-testid="tab-past">
                <Calendar className="w-4 h-4 mr-2" />
                Past
              </TabsTrigger>
            </TabsList>

            <TabsContent value="properties" className="space-y-4 mt-6">
              {propertiesLoading ? (
                <Card>
                  <CardContent className="p-6">Loading properties...</CardContent>
                </Card>
              ) : properties.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Properties Yet</h3>
                    <p className="text-muted-foreground mb-4">Get started by adding your first AST property</p>
                    <Button onClick={() => setPropertyDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Property
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {properties.map((property) => {
                    const propertyTenancies = tenanciesWithDetails.filter(t => t.astPropertyId === property.id);
                    const isExpanded = expandedPropertyContracts.has(property.id);
                    
                    return (
                      <motion.div key={property.id} variants={fadeIn}>
                        <Card data-testid={`card-property-${property.id}`}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="flex items-center gap-2">
                                  <Home className="h-5 w-5" />
                                  <span data-testid={`text-property-name-${property.id}`}>{property.name}</span>
                                </CardTitle>
                                <CardDescription className="mt-2">
                                  <span data-testid={`text-property-address-${property.id}`}>{property.address}</span>
                                </CardDescription>
                              </div>
                              <div className="flex items-start gap-2">
                                {property.propertyType && (
                                  <Badge variant="outline" data-testid={`badge-property-type-${property.id}`}>{property.propertyType}</Badge>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setPropertyToEdit(property);
                                    setEditPropertyDialogOpen(true);
                                  }}
                                  data-testid={`button-edit-property-${property.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this property?")) {
                                      deletePropertyMutation.mutate(property.id);
                                    }
                                  }}
                                  data-testid={`button-delete-property-${property.id}`}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              {property.bedrooms !== undefined && (
                                <div className="flex items-center gap-1" data-testid={`text-bedrooms-${property.id}`}>
                                  <span className="font-medium">{property.bedrooms}</span> beds
                                </div>
                              )}
                              {property.bathrooms !== undefined && (
                                <div className="flex items-center gap-1" data-testid={`text-bathrooms-${property.id}`}>
                                  <span className="font-medium">{property.bathrooms}</span> baths
                                </div>
                              )}
                            </div>
                            {property.notes && (
                              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{property.notes}</p>
                            )}

                            {propertyTenancies.length > 0 && (
                              <div className="mt-4 border-t pt-4">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newExpanded = new Set(expandedPropertyContracts);
                                    if (isExpanded) {
                                      newExpanded.delete(property.id);
                                    } else {
                                      newExpanded.add(property.id);
                                    }
                                    setExpandedPropertyContracts(newExpanded);
                                  }}
                                  className="w-full justify-between"
                                  data-testid={`button-toggle-contracts-${property.id}`}
                                >
                                  <span className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Tenancy Agreements ({propertyTenancies.length})
                                  </span>
                                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>

                                {isExpanded && (
                                  <div className="mt-3 space-y-3">
                                    {propertyTenancies.map((tenancy) => (
                                      <TenancyContractRow 
                                        key={tenancy.id} 
                                        tenancy={tenancy}
                                        onSmsClick={(tenancyId) => {
                                          setSmsTenancyId(tenancyId);
                                          setSmsDialogOpen(true);
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="buildings" className="space-y-4 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Cluster Buildings & Apartments</h3>
                <Dialog open={buildingDialogOpen} onOpenChange={setBuildingDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-building">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Building
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-building">
                    <DialogHeader>
                      <DialogTitle>Create New Building</DialogTitle>
                      <DialogDescription>Add a new cluster building for managing multiple apartments</DialogDescription>
                    </DialogHeader>
                    <Form {...buildingForm}>
                      <form onSubmit={buildingForm.handleSubmit(onBuildingSubmit)} className="space-y-4">
                        <FormField
                          control={buildingForm.control}
                          name="landlordId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Landlord (Optional)</FormLabel>
                              <Select 
                                onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} 
                                value={field.value?.toString() || "none"}
                              >
                                <FormControl>
                                  <SelectTrigger data-testid="select-building-landlord">
                                    <SelectValue placeholder="Select a landlord..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="none">None</SelectItem>
                                  {landlords.map((landlord) => (
                                    <SelectItem key={landlord.id} value={landlord.id.toString()}>
                                      {landlord.name} ({landlord.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Link this building to a landlord from the client database
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={buildingForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Building Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Albion Street" data-testid="input-building-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={buildingForm.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Full address" data-testid="input-building-address" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={buildingForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Additional notes" data-testid="input-building-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createBuildingMutation.isPending} data-testid="button-submit-building">
                            {createBuildingMutation.isPending ? "Creating..." : "Create Building"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>

              {buildingsLoading ? (
                <Card>
                  <CardContent className="p-6">Loading buildings...</CardContent>
                </Card>
              ) : buildings.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Buildings Yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first cluster building to manage multiple apartments</p>
                    <Button onClick={() => setBuildingDialogOpen(true)} data-testid="button-add-first-building">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Building
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {buildings.map((building) => (
                    <Card key={building.id} className="hover-elevate" data-testid={`card-building-${building.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <Building2 className="h-5 w-5" />
                              <span data-testid={`text-building-name-${building.id}`}>{building.name}</span>
                            </CardTitle>
                            <CardDescription className="mt-2">
                              <span data-testid={`text-building-address-${building.id}`}>{building.address}</span>
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setBuildingToEdit(building);
                                setEditBuildingDialogOpen(true);
                              }}
                              data-testid={`button-edit-building-${building.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Dialog open={apartmentDialogOpen && selectedBuilding === building.id} onOpenChange={(open) => {
                              setApartmentDialogOpen(open);
                              if (open) {
                                setSelectedBuilding(building.id);
                                apartmentForm.setValue("buildingId", building.id);
                              }
                            }}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" data-testid={`button-add-apartment-${building.id}`}>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Apartment
                                </Button>
                              </DialogTrigger>
                              <DialogContent data-testid="dialog-apartment">
                                <DialogHeader>
                                  <DialogTitle>Create Apartment</DialogTitle>
                                  <DialogDescription>Add a new apartment to {building.name}</DialogDescription>
                                </DialogHeader>
                                <Form {...apartmentForm}>
                                  <form onSubmit={apartmentForm.handleSubmit(onApartmentSubmit)} className="space-y-4">
                                    <FormField
                                      control={apartmentForm.control}
                                      name="name"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Apartment Name</FormLabel>
                                          <FormControl>
                                            <Input {...field} placeholder="Apartment 1" data-testid="input-apartment-name" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={apartmentForm.control}
                                      name="bedrooms"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Number of Bedrooms</FormLabel>
                                          <FormControl>
                                            <Input type="number" {...field} placeholder="4" data-testid="input-apartment-bedrooms" />
                                          </FormControl>
                                          <FormDescription>This determines how many room tenancies can be created</FormDescription>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={apartmentForm.control}
                                      name="notes"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Notes</FormLabel>
                                          <FormControl>
                                            <Textarea {...field} placeholder="Additional notes" data-testid="input-apartment-notes" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <DialogFooter>
                                      <Button type="submit" disabled={createApartmentMutation.isPending} data-testid="button-submit-apartment">
                                        {createApartmentMutation.isPending ? "Creating..." : "Create Apartment"}
                                      </Button>
                                    </DialogFooter>
                                  </form>
                                </Form>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setSelectedBuilding(selectedBuilding === building.id ? null : building.id)}
                              data-testid={`button-view-apartments-${building.id}`}
                            >
                              <DoorOpen className="h-4 w-4 mr-1" />
                              {selectedBuilding === building.id ? "Hide" : "View"} Apartments
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {selectedBuilding === building.id && (
                        <CardContent className="border-t">
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <DoorOpen className="h-4 w-4" />
                            Apartments in {building.name}
                          </h4>
                          {apartmentsLoading ? (
                            <p className="text-sm text-muted-foreground">Loading apartments...</p>
                          ) : apartments.length === 0 ? (
                            <div className="text-center p-6 border rounded-md">
                              <p className="text-sm text-muted-foreground mb-3">No apartments yet</p>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setApartmentDialogOpen(true);
                                  apartmentForm.setValue("buildingId", building.id);
                                }}
                                data-testid={`button-add-first-apartment-${building.id}`}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add First Apartment
                              </Button>
                            </div>
                          ) : (
                            <div className="grid gap-3">
                              {apartments.map((apartment) => {
                                const apartmentTenancies = tenanciesWithDetails.filter(t => t.astApartmentId === apartment.id);
                                const activeTenanciesCount = apartmentTenancies.filter(t => t.status === 'active').length;
                                
                                return (
                                  <Card key={apartment.id} className="hover-elevate" data-testid={`card-apartment-${apartment.id}`}>
                                    <CardHeader className="py-3">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <CardTitle className="text-base flex items-center gap-2">
                                            <span data-testid={`text-apartment-name-${apartment.id}`}>{apartment.name}</span>
                                          </CardTitle>
                                          <CardDescription className="text-sm">
                                            <span data-testid={`text-apartment-bedrooms-${apartment.id}`}>{apartment.bedrooms} bedrooms</span> · <span data-testid={`text-apartment-occupancy-${apartment.id}`}>{activeTenanciesCount}/{apartment.bedrooms} rooms occupied</span>
                                          </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setRoomTenancyDialogOpen(true);
                                              tenancyForm.setValue("astApartmentId", apartment.id);
                                              tenancyForm.setValue("astPropertyId", "");
                                            }}
                                            data-testid={`button-add-room-tenancy-${apartment.id}`}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Room Tenancy
                                          </Button>
                                          {activeTenanciesCount > 0 ? (
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <span>
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled
                                                    data-testid={`button-delete-apartment-${apartment.id}`}
                                                  >
                                                    <Trash className="h-4 w-4" />
                                                  </Button>
                                                </span>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                Cannot delete apartment with active tenancies
                                              </TooltipContent>
                                            </Tooltip>
                                          ) : (
                                            <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  data-testid={`button-delete-apartment-${apartment.id}`}
                                                >
                                                  <Trash className="h-4 w-4" />
                                                </Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader>
                                                  <AlertDialogTitle>Delete Apartment</AlertDialogTitle>
                                                  <AlertDialogDescription>
                                                    Are you sure you want to delete {apartment.name}? This action cannot be undone. All associated data will be removed.
                                                  </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                  <AlertDialogCancel data-testid={`button-cancel-delete-apartment-${apartment.id}`}>
                                                    Cancel
                                                  </AlertDialogCancel>
                                                  <AlertDialogAction
                                                    onClick={() => deleteApartmentMutation.mutate(apartment.id)}
                                                    data-testid={`button-confirm-delete-apartment-${apartment.id}`}
                                                  >
                                                    Delete
                                                  </AlertDialogAction>
                                                </AlertDialogFooter>
                                              </AlertDialogContent>
                                            </AlertDialog>
                                          )}
                                        </div>
                                      </div>
                                    </CardHeader>
                                    {apartmentTenancies.length > 0 && (
                                      <CardContent className="py-2 border-t">
                                        <div className="space-y-1 text-sm">
                                          {apartmentTenancies.map((t) => (
                                            <div key={t.id} className="flex justify-between items-center" data-testid={`tenancy-${t.id}`}>
                                              <span className="text-muted-foreground">
                                                <span data-testid={`text-room-number-${t.id}`}>Room {t.roomNumber}</span>: <span data-testid={`text-tenant-name-${t.id}`}>{t.tenantName}</span>
                                              </span>
                                              <Badge variant={t.status === 'active' ? 'default' : 'secondary'} className="text-xs" data-testid={`badge-tenancy-status-${t.id}`}>
                                                {t.status}
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </CardContent>
                                    )}
                                  </Card>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              <Dialog open={roomTenancyDialogOpen} onOpenChange={setRoomTenancyDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-room-tenancy">
                  <DialogHeader>
                    <DialogTitle>Create Room Tenancy</DialogTitle>
                    <DialogDescription>Upload a PDF contract to auto-fill details, or enter information manually below</DialogDescription>
                  </DialogHeader>
                  <Form {...tenancyForm}>
                    <form onSubmit={tenancyForm.handleSubmit((data) => {
                      createTenancyMutation.mutate(data);
                      setRoomTenancyDialogOpen(false);
                    })} className="space-y-4">
                      {/* PDF Upload Section */}
                      <div className="space-y-4">
                        <div className="p-4 border rounded-md bg-muted/50">
                          <h4 className="font-semibold mb-2 flex items-center gap-2">
                            <Upload className="h-4 w-4" />
                            Upload PDF Contract
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Upload the tenancy agreement PDF to automatically extract all contract details
                          </p>
                          <div className="flex items-center gap-3">
                            <Input
                              type="file"
                              accept=".pdf"
                              onChange={handlePdfUpload}
                              disabled={isExtracting || !!uploadedPdfFile}
                              className="cursor-pointer"
                              data-testid="input-room-pdf-upload"
                            />
                            {isExtracting && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                Extracting data...
                              </div>
                            )}
                          </div>
                          {extractionSucceeded && !isExtracting && (
                            <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                              ✓ {uploadedPdfFile?.name} uploaded - data extracted successfully
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Separator */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            {extractionSucceeded ? "Review & Edit Extracted Data" : "Or enter details manually"}
                          </span>
                        </div>
                      </div>

                      {extractionSucceeded && !isExtracting && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                          <p className="text-sm text-blue-900 dark:text-blue-100">
                            <strong>Review Extracted Data:</strong> Please verify the information below and make any necessary corrections before submitting.
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={tenancyForm.control}
                          name="roomNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Room Number / Name *</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="e.g., Room 1, Bedroom A"
                                  data-testid="input-room-number"
                                  required
                                />
                              </FormControl>
                              <FormDescription>
                                Required: Specify which room this tenancy is for (e.g., "Room 1", "Bedroom A")
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tenancyForm.control}
                          name="tenantName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tenant Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="John Smith" data-testid="input-room-tenant-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tenancyForm.control}
                          name="tenantEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tenant Email (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" placeholder="john@example.com" data-testid="input-room-tenant-email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tenancyForm.control}
                          name="tenantPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tenant Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="07123 456789" data-testid="input-room-tenant-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tenancyForm.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Start Date</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" data-testid="input-room-start-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tenancyForm.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>End Date (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} type="date" data-testid="input-room-end-date" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tenancyForm.control}
                          name="rentAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rent Amount (£)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} placeholder="450.00" data-testid="input-room-rent-amount" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tenancyForm.control}
                          name="rentFrequency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rent Frequency</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-room-rent-frequency">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="quarterly">Quarterly</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tenancyForm.control}
                          name="depositAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Deposit Amount (£)</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" {...field} placeholder="450.00" data-testid="input-room-deposit-amount" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={tenancyForm.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Notes</FormLabel>
                              <FormControl>
                                <Textarea {...field} placeholder="Additional notes" data-testid="input-room-notes" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={createTenancyMutation.isPending} data-testid="button-submit-room-tenancy">
                          {createTenancyMutation.isPending ? "Creating..." : "Create Room Tenancy"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="active" className="space-y-4 mt-6">
              {tenanciesLoading ? (
                <Card>
                  <CardContent className="p-6">Loading tenancies...</CardContent>
                </Card>
              ) : activeTenancies.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Active Tenancies</h3>
                    <p className="text-muted-foreground mb-4">Add a tenancy to get started</p>
                    <Button onClick={() => setTenancyDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tenancy
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {activeTenancies.map((tenancy) => (
                    <motion.div key={tenancy.id} variants={fadeIn}>
                      <Card data-testid={`card-tenancy-${tenancy.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                <span data-testid={`text-active-tenant-name-${tenancy.id}`}>{tenancy.tenantName}</span>
                              </CardTitle>
                              <CardDescription className="mt-2">
                                {tenancy.property ? (
                                  <span className="flex items-center gap-1">
                                    <Home className="h-3 w-3" />
                                    Property: <span data-testid={`text-active-property-name-${tenancy.id}`}>{tenancy.property.name}</span>
                                    {tenancy.roomNumber && <span data-testid={`text-active-room-number-${tenancy.id}`}> → Room: {tenancy.roomNumber}</span>}
                                  </span>
                                ) : tenancy.building && tenancy.apartment ? (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {tenancy.building.name} → {tenancy.apartment.name} → Room {tenancy.roomNumber}
                                  </span>
                                ) : (
                                  <span>No property linked</span>
                                )}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge data-testid={`badge-active-tenancy-status-${tenancy.id}`}>{tenancy.status}</Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setTenancyToEdit(tenancy);
                                  setEditTenancyDialogOpen(true);
                                }}
                                data-testid={`button-edit-tenancy-${tenancy.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setTenancyToMove(tenancy);
                                  setMoveToType(tenancy.property ? "property" : "apartment");
                                  setMoveTenancyDialogOpen(true);
                                }}
                                data-testid={`button-move-tenancy-${tenancy.id}`}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete the tenancy for ${tenancy.tenantName}?`)) {
                                    deleteTenancyMutation.mutate(tenancy.id);
                                  }
                                }}
                                disabled={deleteTenancyMutation.isPending}
                                data-testid={`button-delete-tenancy-${tenancy.id}`}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Rent Amount</div>
                              <div className="font-semibold flex items-center gap-1" data-testid={`text-active-rent-amount-${tenancy.id}`}>
                                <DollarSign className="h-4 w-4" />
                                £{tenancy.rentAmount.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Frequency</div>
                              <div className="font-semibold capitalize" data-testid={`text-active-rent-frequency-${tenancy.id}`}>{tenancy.rentFrequency}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Start Date</div>
                              <div className="font-semibold flex items-center gap-1" data-testid={`text-active-start-date-${tenancy.id}`}>
                                <Calendar className="h-4 w-4" />
                                {format(new Date(tenancy.startDate), "dd/MM/yyyy")}
                              </div>
                            </div>
                            {tenancy.endDate && (
                              <div>
                                <div className="text-muted-foreground">End Date</div>
                                <div className="font-semibold" data-testid={`text-active-end-date-${tenancy.id}`}>{format(new Date(tenancy.endDate), "dd/MM/yyyy")}</div>
                              </div>
                            )}
                          </div>
                          {tenancy.tenantEmail && (
                            <div className="mt-4 text-sm text-muted-foreground" data-testid={`text-active-tenant-email-${tenancy.id}`}>
                              Email: {tenancy.tenantEmail}
                            </div>
                          )}
                          {tenancy.tenantPhone && (
                            <div className="text-sm text-muted-foreground" data-testid={`text-active-tenant-phone-${tenancy.id}`}>
                              Phone: {tenancy.tenantPhone}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4 mt-6">
              {tenanciesLoading ? (
                <Card>
                  <CardContent className="p-6">Loading tenancies...</CardContent>
                </Card>
              ) : expiredTenancies.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Past Tenancies</h3>
                    <p className="text-muted-foreground">Expired and terminated tenancies will appear here</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {expiredTenancies.map((tenancy) => (
                    <motion.div key={tenancy.id} variants={fadeIn}>
                      <Card>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle>{tenancy.tenantName}</CardTitle>
                              <CardDescription className="mt-2">
                                {tenancy.property ? (
                                  <span className="flex items-center gap-1">
                                    <Home className="h-3 w-3" />
                                    Property: {tenancy.property.name}
                                    {tenancy.roomNumber && ` → Room: ${tenancy.roomNumber}`}
                                  </span>
                                ) : tenancy.building && tenancy.apartment ? (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {tenancy.building.name} → {tenancy.apartment.name} → Room {tenancy.roomNumber}
                                  </span>
                                ) : (
                                  <span>No property linked</span>
                                )}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{tenancy.status}</Badge>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setTenancyToEdit(tenancy);
                                  setEditTenancyDialogOpen(true);
                                }}
                                data-testid={`button-edit-tenancy-${tenancy.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setTenancyToMove(tenancy);
                                  setMoveToType(tenancy.property ? "property" : "apartment");
                                  setMoveTenancyDialogOpen(true);
                                }}
                                data-testid={`button-move-past-tenancy-${tenancy.id}`}
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete the tenancy for ${tenancy.tenantName}?`)) {
                                    deleteTenancyMutation.mutate(tenancy.id);
                                  }
                                }}
                                disabled={deleteTenancyMutation.isPending}
                                data-testid={`button-delete-past-tenancy-${tenancy.id}`}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Duration</div>
                              <div className="font-semibold">
                                {format(new Date(tenancy.startDate), "dd/MM/yyyy")} -{" "}
                                {tenancy.endDate ? format(new Date(tenancy.endDate), "dd/MM/yyyy") : "Ongoing"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Rent Amount</div>
                              <div className="font-semibold">£{tenancy.rentAmount.toFixed(2)} ({tenancy.rentFrequency})</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </motion.div>

      <Dialog open={moveTenancyDialogOpen} onOpenChange={setMoveTenancyDialogOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-move-tenancy">
          <DialogHeader>
            <DialogTitle>Move Tenancy</DialogTitle>
            <DialogDescription>
              Move "{tenancyToMove?.tenantName}" to a different property or building
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Move To</label>
              <Select value={moveToType} onValueChange={(value: "property" | "apartment") => {
                setMoveToType(value);
                setMovePropertyId("");
                setMoveBuildingId("");
                setMoveApartmentId("");
                setMoveRoomNumber("");
              }}>
                <SelectTrigger data-testid="select-move-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="property">Standalone Property</SelectItem>
                  <SelectItem value="apartment">Building → Apartment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {moveToType === "property" ? (
              <div>
                <label className="text-sm font-medium">Select Property</label>
                <Select value={movePropertyId} onValueChange={setMovePropertyId}>
                  <SelectTrigger data-testid="select-move-property">
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">Select Building</label>
                  <Select value={moveBuildingId} onValueChange={(value) => {
                    setMoveBuildingId(value);
                    setMoveApartmentId("");
                  }}>
                    <SelectTrigger data-testid="select-move-building">
                      <SelectValue placeholder="Select a building" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {moveBuildingId && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Select Apartment</label>
                      <Select value={moveApartmentId} onValueChange={setMoveApartmentId}>
                        <SelectTrigger data-testid="select-move-apartment">
                          <SelectValue placeholder="Select an apartment" />
                        </SelectTrigger>
                        <SelectContent>
                          {moveApartments.map((apartment) => (
                            <SelectItem key={apartment.id} value={apartment.id}>
                              {apartment.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Room Number *</label>
                      <Input
                        value={moveRoomNumber}
                        onChange={(e) => setMoveRoomNumber(e.target.value)}
                        placeholder="e.g., Room 1, Bedroom A"
                        data-testid="input-move-room-number"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Required: Specify which room this tenancy is for
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMoveTenancyDialogOpen(false);
                setTenancyToMove(null);
                setMovePropertyId("");
                setMoveBuildingId("");
                setMoveApartmentId("");
                setMoveRoomNumber("");
              }}
              data-testid="button-cancel-move"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMoveTenancy}
              disabled={updateTenancyMutation.isPending}
              data-testid="button-confirm-move"
            >
              {updateTenancyMutation.isPending ? "Moving..." : "Move Tenancy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {tenancyToEdit && (
        <EditTenancyDialog
          tenancy={tenancyToEdit}
          open={editTenancyDialogOpen}
          onOpenChange={setEditTenancyDialogOpen}
        />
      )}

      {propertyToEdit && (
        <Dialog open={editPropertyDialogOpen} onOpenChange={setEditPropertyDialogOpen}>
          <DialogContent className="max-w-2xl" data-testid={`dialog-edit-property-${propertyToEdit.id}`}>
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
              <DialogDescription>Update property details</DialogDescription>
            </DialogHeader>
            <Form {...propertyForm}>
              <form onSubmit={propertyForm.handleSubmit((data) => {
                updatePropertyMutation.mutate({ id: propertyToEdit.id, updates: data });
              })} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={propertyForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Property Name</FormLabel>
                        <FormControl>
                          <Input {...field} defaultValue={propertyToEdit.name} placeholder="Flat 1, York House" data-testid="input-edit-property-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={propertyForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} defaultValue={propertyToEdit.address} placeholder="Full address" data-testid="input-edit-property-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={propertyForm.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={propertyToEdit.propertyType || "Flat"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-property-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Flat">Flat</SelectItem>
                            <SelectItem value="House">House</SelectItem>
                            <SelectItem value="Studio">Studio</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={propertyForm.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} defaultValue={propertyToEdit.bedrooms} data-testid="input-edit-bedrooms" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={propertyForm.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bathrooms</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} defaultValue={propertyToEdit.bathrooms} data-testid="input-edit-bathrooms" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={propertyForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} defaultValue={propertyToEdit.notes || ""} placeholder="Additional property notes" data-testid="input-edit-property-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={updatePropertyMutation.isPending} data-testid="button-submit-edit-property">
                    {updatePropertyMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {buildingToEdit && (
        <Dialog open={editBuildingDialogOpen} onOpenChange={setEditBuildingDialogOpen}>
          <DialogContent data-testid={`dialog-edit-building-${buildingToEdit.id}`}>
            <DialogHeader>
              <DialogTitle>Edit Building</DialogTitle>
              <DialogDescription>Update building details</DialogDescription>
            </DialogHeader>
            <Form {...buildingForm}>
              <form onSubmit={buildingForm.handleSubmit((data) => {
                updateBuildingMutation.mutate({ id: buildingToEdit.id, updates: data });
              })} className="space-y-4">
                <FormField
                  control={buildingForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Building Name</FormLabel>
                      <FormControl>
                        <Input {...field} defaultValue={buildingToEdit.name} placeholder="Albion Street" data-testid="input-edit-building-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={buildingForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} defaultValue={buildingToEdit.address} placeholder="Full address" data-testid="input-edit-building-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={buildingForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} defaultValue={buildingToEdit.notes || ""} placeholder="Additional notes" data-testid="input-edit-building-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={updateBuildingMutation.isPending} data-testid="button-submit-edit-building">
                    {updateBuildingMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent data-testid="dialog-sms-tenant">
          <DialogHeader>
            <DialogTitle>Send SMS to Tenant</DialogTitle>
            <DialogDescription>
              Message will be sent via Twilio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tenant</label>
              <p className="text-sm text-muted-foreground">
                {smsTenancyId && tenanciesWithDetails.find(t => t.id === smsTenancyId)?.tenantName}
              </p>
            </div>
            <div>
              <label htmlFor="sms-message-tenant" className="text-sm font-medium">
                Message
              </label>
              <Textarea
                id="sms-message-tenant"
                placeholder="Type your message here..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="mt-1.5"
                rows={4}
                data-testid="textarea-sms-message-tenant"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {smsMessage.length} / 160 characters
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setSmsDialogOpen(false)}
              data-testid="button-cancel-sms-tenant"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (smsTenancyId && smsMessage.trim()) {
                  sendTenantSmsMutation.mutate({ tenancyId: smsTenancyId, message: smsMessage });
                }
              }}
              disabled={!smsMessage.trim() || sendTenantSmsMutation.isPending}
              data-testid="button-send-sms-tenant"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {sendTenantSmsMutation.isPending ? "Sending..." : "Send SMS"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
