import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit, Building2, Search, Download, FileDown, Upload, AlertCircle, CheckCircle, MapPin } from "lucide-react";
import { InstructionPanel } from "@/components/instruction-panel";
import { propertiesInstructions } from "@/lib/page-instructions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BackToTop } from "@/components/back-to-top";
import Papa from "papaparse";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Property = {
  id: string;
  name: string;
  address: string;
  uplistingId: string | null;
  locationGroupId: string | null;
  active: boolean;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  cleaningFrequency?: string | null;
  specialInstructions?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type LocationGroup = {
  id: string;
  slug: string;
  displayName: string;
};

export default function PropertiesPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLocationGroup, setFilterLocationGroup] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteProperty, setDeleteProperty] = useState<Property | null>(null);
  const [newProperty, setNewProperty] = useState({
    name: "",
    address: "",
    uplistingId: "",
    locationGroupId: "",
    propertyType: "",
    bedrooms: undefined as number | undefined,
    bathrooms: undefined as number | undefined,
    cleaningFrequency: "",
    specialInstructions: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Array<any>>([]);
  const [importValidation, setImportValidation] = useState<Array<{ row: number; errors: string[] }>>([]);
  const [isImporting, setIsImporting] = useState(false);

  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: locationGroups = [] } = useQuery<LocationGroup[]>({
    queryKey: ["/api/location-groups"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newProperty) => {
      return await apiRequest("POST", "/api/properties", {
        ...data,
        active: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setIsAddDialogOpen(false);
      setNewProperty({ 
        name: "", 
        address: "", 
        uplistingId: "", 
        locationGroupId: "",
        propertyType: "",
        bedrooms: undefined,
        bathrooms: undefined,
        cleaningFrequency: "",
        specialInstructions: "",
        latitude: undefined,
        longitude: undefined,
      });
      toast({
        title: "Success!",
        description: "Property has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<Property> }) => {
      return await apiRequest("PUT", `/api/properties/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setEditingProperty(null);
      toast({
        title: "Success!",
        description: "Property has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setDeleteProperty(null);
      toast({
        title: "Success!",
        description: "Property has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const propertyCSVSchema = z.object({
    name: z.string().min(1, "Name is required").max(200),
    address: z.string().min(1, "Address is required").max(500),
    uplistingId: z.string().optional().transform(v => v === "" ? undefined : v),
    locationGroup: z.string().optional().transform(v => v === "" ? undefined : v),
    
    active: z.string()
      .optional()
      .transform(v => {
        if (!v || v === "") return true;
        return v === "true" || v === "1";
      }),
    
    defaultCleanDuration: z.string()
      .optional()
      .transform(v => v === "" || v == null ? undefined : Number(v))
      .pipe(z.number().positive().optional()),
    
    priorityRank: z.string()
      .optional()
      .transform(v => v === "" || v == null ? undefined : Number(v))
      .pipe(z.number().optional()),
    
    propertyType: z.string()
      .optional()
      .transform(v => v === "" ? undefined : v)
      .pipe(z.enum(["Studio", "1-Bed", "2-Bed", "3-Bed", "4-Bed+", "House"]).optional()),
    
    bedrooms: z.string()
      .optional()
      .transform(v => v === "" || v == null ? undefined : Number(v))
      .pipe(z.number().min(0).optional()),
    
    bathrooms: z.string()
      .optional()
      .transform(v => v === "" || v == null ? undefined : Number(v))
      .pipe(z.number().positive().optional()),
    
    cleaningFrequency: z.string()
      .optional()
      .transform(v => v === "" ? undefined : v)
      .pipe(z.enum(["After Each Booking", "Weekly", "Bi-Weekly", "Monthly"]).optional()),
    
    specialInstructions: z.string().optional().transform(v => v === "" ? undefined : v),
    
    latitude: z.string()
      .optional()
      .transform(v => v === "" || v == null ? undefined : Number(v))
      .pipe(z.number().min(-90).max(90).optional()),
    
    longitude: z.string()
      .optional()
      .transform(v => v === "" || v == null ? undefined : Number(v))
      .pipe(z.number().min(-180).max(180).optional()),
    
    notes: z.string().optional().transform(v => v === "" ? undefined : v),
    
    preferredStaffIds: z.string()
      .optional()
      .transform(v => {
        if (!v || v === "") return [];
        return v.split(",").map(id => id.trim()).filter(id => id !== "");
      }),
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/properties/export", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `properties-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Successful",
        description: `Downloaded ${filename}`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/properties/template", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Template download failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "properties-template.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template Downloaded",
        description: "Use this template to bulk import properties",
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Map Uplisting CSV columns to our internal format
  const mapUplistingRow = (row: any): any => {
    // Check if this is an Uplisting CSV (has "Property Title" column)
    if (row["Property Title"]) {
      const city = row["City"] || "";
      const address = row["Address"] || "";
      const fullAddress = city ? `${address}, ${city}` : address;
      
      // Map Uplisting property type to our enum values
      const mapPropertyType = (type: string): string => {
        if (!type) return "";
        const lower = type.toLowerCase();
        const bedrooms = parseInt(row["Bedrooms"] || "0");
        
        if (lower === "house") return "House";
        if (lower.includes("studio")) return "Studio";
        
        // Map based on bedroom count
        if (bedrooms === 0) return "Studio";
        if (bedrooms === 1) return "1-Bed";
        if (bedrooms === 2) return "2-Bed";
        if (bedrooms === 3) return "3-Bed";
        if (bedrooms >= 4) return "4-Bed+";
        
        // Default for apartments without clear bedroom info
        return "";
      };
      
      return {
        name: row["Property Title"] || "",
        address: fullAddress,
        uplistingId: "", // Not in Uplisting CSV
        locationGroup: "", // Not in Uplisting CSV
        active: "true",
        defaultCleanDuration: row["Scheduled Duration (mins)"] || "",
        priorityRank: "",
        propertyType: mapPropertyType(row["Property Type"] || ""),
        bedrooms: row["Bedrooms"] || "",
        bathrooms: row["Bathrooms"] || "",
        cleaningFrequency: "",
        specialInstructions: "",
        latitude: "",
        longitude: "",
        notes: "",
        preferredStaffIds: "",
      };
    }
    // If not Uplisting format, return as-is
    return row;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as Array<any>;
        
        // Map Uplisting format to internal format
        const mappedRows = rows.map(mapUplistingRow);
        setImportPreview(mappedRows);
        
        const validationErrors: Array<{ row: number; errors: string[] }> = [];
        
        mappedRows.forEach((row, idx) => {
          const result = propertyCSVSchema.safeParse(row);
          if (!result.success) {
            validationErrors.push({
              row: idx + 2,
              errors: result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`),
            });
          }
        });
        
        setImportValidation(validationErrors);
      },
      error: (error) => {
        toast({
          title: "Parse Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleExecuteImport = async () => {
    if (!importPreview.length) return;
    
    setIsImporting(true);
    
    try {
      const validRows = importPreview.map((row, idx) => ({
        row: idx + 2,
        data: propertyCSVSchema.parse(row),
      }));
      
      const response = await fetch("/api/properties/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ properties: validRows }),
      });
      
      if (!response.ok) {
        throw new Error("Import failed");
      }
      
      const result = await response.json();
      
      toast({
        title: "Import Complete",
        description: `Created: ${result.created}, Updated: ${result.updated}, Failed: ${result.failed}`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      
      setShowImportDialog(false);
      setImportFile(null);
      setImportPreview([]);
      setImportValidation([]);
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup =
      filterLocationGroup === "all" || property.locationGroupId === filterLocationGroup;
    return matchesSearch && matchesGroup;
  });

  const getLocationGroupName = (id: string | null) => {
    if (!id) return "No Group";
    const group = locationGroups.find((g) => g.id === id);
    return group?.displayName || "Unknown";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Properties</h1>
              <p className="text-sm text-muted-foreground">
                Manage your property portfolio
              </p>
            </div>
            <InstructionPanel {...propertiesInstructions} />
          </div>
          <div className="flex items-center gap-2">
            <Link href="/properties/manage">
              <Button 
                variant="outline"
                data-testid="button-manage-groups"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Manage Groups
              </Button>
            </Link>
            
            <Button 
              variant="outline"
              onClick={handleDownloadTemplate}
              data-testid="button-download-template"
            >
              <FileDown className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleExport}
              disabled={isExporting}
              data-testid="button-export-properties"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setShowImportDialog(true)}
              data-testid="button-import-properties"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-property" aria-label="Add new property">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </DialogTrigger>
            <DialogContent data-testid="dialog-add-property" className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="add-property-description">
              <DialogHeader>
                <DialogTitle>Add New Property</DialogTitle>
                <DialogDescription id="add-property-description">
                  Add a new property to your portfolio
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Property Name</Label>
                  <Input
                    id="name"
                    data-testid="input-property-name"
                    value={newProperty.name}
                    onChange={(e) =>
                      setNewProperty({ ...newProperty, name: e.target.value })
                    }
                    placeholder="e.g., Building A-35"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    data-testid="input-property-address"
                    value={newProperty.address}
                    onChange={(e) =>
                      setNewProperty({ ...newProperty, address: e.target.value })
                    }
                    placeholder="e.g., 2 Example Road, Nottingham"
                  />
                </div>
                <div>
                  <Label htmlFor="uplistingId">Uplisting ID</Label>
                  <Input
                    id="uplistingId"
                    data-testid="input-uplisting-id"
                    value={newProperty.uplistingId}
                    onChange={(e) =>
                      setNewProperty({ ...newProperty, uplistingId: e.target.value })
                    }
                    placeholder="e.g., Building A-35"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="locationGroup">Location Group</Label>
                  <Select
                    value={newProperty.locationGroupId}
                    onValueChange={(value) =>
                      setNewProperty({ ...newProperty, locationGroupId: value })
                    }
                  >
                    <SelectTrigger id="locationGroup" data-testid="select-location-group">
                      <SelectValue placeholder="Select a location group" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Property Type */}
                <div>
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select
                    value={newProperty.propertyType}
                    onValueChange={(value) =>
                      setNewProperty({ ...newProperty, propertyType: value })
                    }
                  >
                    <SelectTrigger id="propertyType" data-testid="select-property-type">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Studio">Studio</SelectItem>
                      <SelectItem value="1-Bed">1-Bed</SelectItem>
                      <SelectItem value="2-Bed">2-Bed</SelectItem>
                      <SelectItem value="3-Bed">3-Bed</SelectItem>
                      <SelectItem value="4-Bed+">4-Bed+</SelectItem>
                      <SelectItem value="House">House</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bedrooms & Bathrooms */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      data-testid="input-bedrooms"
                      value={newProperty.bedrooms ?? ""}
                      onChange={(e) =>
                        setNewProperty({ 
                          ...newProperty, 
                          bedrooms: e.target.value ? Number(e.target.value) : undefined 
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      data-testid="input-bathrooms"
                      value={newProperty.bathrooms ?? ""}
                      onChange={(e) =>
                        setNewProperty({ 
                          ...newProperty, 
                          bathrooms: e.target.value ? Number(e.target.value) : undefined 
                        })
                      }
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* Cleaning Frequency */}
                <div>
                  <Label htmlFor="cleaningFrequency">Cleaning Frequency</Label>
                  <Select
                    value={newProperty.cleaningFrequency}
                    onValueChange={(value) =>
                      setNewProperty({ ...newProperty, cleaningFrequency: value })
                    }
                  >
                    <SelectTrigger id="cleaningFrequency" data-testid="select-cleaning-frequency">
                      <SelectValue placeholder="Select frequency..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="After Each Booking">After Each Booking</SelectItem>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Special Instructions */}
                <div>
                  <Label htmlFor="specialInstructions">Special Instructions</Label>
                  <Textarea
                    id="specialInstructions"
                    data-testid="textarea-special-instructions"
                    value={newProperty.specialInstructions}
                    onChange={(e) =>
                      setNewProperty({ ...newProperty, specialInstructions: e.target.value })
                    }
                    placeholder="Enter any special cleaning instructions..."
                    className="min-h-[100px]"
                  />
                </div>

                {/* Coordinates */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Coordinates</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!newProperty.address) {
                          toast({
                            title: "Address Required",
                            description: "Please enter an address first",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        try {
                          // Use Nominatim API (OpenStreetMap) for geocoding
                          const response = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newProperty.address)}&limit=1`
                          );
                          const data = await response.json();
                          
                          if (data && data.length > 0) {
                            setNewProperty({
                              ...newProperty,
                              latitude: parseFloat(data[0].lat),
                              longitude: parseFloat(data[0].lon),
                            });
                            toast({
                              title: "Coordinates Set",
                              description: "Latitude and longitude auto-filled from address",
                            });
                          } else {
                            toast({
                              title: "Address Not Found",
                              description: "Could not find coordinates for this address",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Failed to fetch coordinates",
                            variant: "destructive",
                          });
                        }
                      }}
                      data-testid="button-get-coordinates"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Auto-Fill from Address
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        data-testid="input-latitude"
                        value={newProperty.latitude ?? ""}
                        onChange={(e) =>
                          setNewProperty({ 
                            ...newProperty, 
                            latitude: e.target.value ? Number(e.target.value) : undefined 
                          })
                        }
                        placeholder="53.9591"
                      />
                    </div>
                    <div>
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        data-testid="input-longitude"
                        value={newProperty.longitude ?? ""}
                        onChange={(e) =>
                          setNewProperty({ 
                            ...newProperty, 
                            longitude: e.target.value ? Number(e.target.value) : undefined 
                          })
                        }
                        placeholder="-1.0815"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    For map view and travel times
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Validate all required fields
                    if (!newProperty.name || !newProperty.address || !newProperty.uplistingId || 
                        !newProperty.locationGroupId || !newProperty.propertyType || 
                        newProperty.bedrooms === undefined || newProperty.bathrooms === undefined ||
                        !newProperty.cleaningFrequency || newProperty.latitude === undefined || 
                        newProperty.longitude === undefined) {
                      toast({
                        title: "Missing Required Fields",
                        description: "Please fill in all required fields including coordinates",
                        variant: "destructive",
                      });
                      return;
                    }
                    createMutation.mutate(newProperty);
                  }}
                  disabled={createMutation.isPending}
                  data-testid="button-submit-add"
                >
                  {createMutation.isPending ? "Adding..." : "Add Property"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search properties..."
              data-testid="input-search-properties"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label="Search properties"
            />
          </div>
          <Select value={filterLocationGroup} onValueChange={setFilterLocationGroup}>
            <SelectTrigger className="w-full sm:w-[250px]" data-testid="select-filter-group" aria-label="Filter by location group">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {locationGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {loadingProperties ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading properties...</p>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No properties found</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background border-b">
                  <TableRow>
                    <TableHead scope="col" className="sticky left-0 bg-background z-20">Property Name</TableHead>
                    <TableHead scope="col">Address</TableHead>
                    <TableHead scope="col">Location Group</TableHead>
                    <TableHead scope="col">Uplisting ID</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col" className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProperties.map((property) => (
                    <TableRow key={property.id} data-testid={`row-property-${property.id}`}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        <Link href={`/properties/${property.id}`}>
                          <div className="flex items-center gap-2 flex-wrap hover:underline cursor-pointer">
                            <span data-testid={`text-property-name-${property.id}`}>{property.name}</span>
                            {property.propertyType && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-property-type-${property.id}`}>
                                {property.propertyType}
                              </Badge>
                            )}
                            {property.bedrooms != null && (
                              <Badge variant="outline" className="text-xs" data-testid={`badge-bedrooms-${property.id}`}>
                                {property.bedrooms} bed
                              </Badge>
                            )}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span data-testid={`text-property-address-${property.id}`}>{property.address}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-location-group-${property.id}`}>
                          {getLocationGroupName(property.locationGroupId)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <span data-testid={`text-uplisting-id-${property.id}`}>{property.uplistingId || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={property.active ? "default" : "secondary"} data-testid={`badge-status-${property.id}`}>
                          {property.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingProperty(property)}
                                data-testid={`button-edit-${property.id}`}
                                aria-label={`Edit ${property.name}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit property</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteProperty(property)}
                                data-testid={`button-delete-${property.id}`}
                                aria-label={`Delete ${property.name}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete property</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {editingProperty && (
        <Dialog open={!!editingProperty} onOpenChange={() => setEditingProperty(null)}>
          <DialogContent data-testid="dialog-edit-property" className="sm:max-w-md" aria-describedby="edit-property-description">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
              <DialogDescription id="edit-property-description">Update property details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Property Name</Label>
                <Input
                  id="edit-name"
                  data-testid="input-edit-name"
                  value={editingProperty.name}
                  onChange={(e) =>
                    setEditingProperty({ ...editingProperty, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  data-testid="input-edit-address"
                  value={editingProperty.address}
                  onChange={(e) =>
                    setEditingProperty({ ...editingProperty, address: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-uplistingId">Uplisting ID</Label>
                <Input
                  id="edit-uplistingId"
                  data-testid="input-edit-uplisting-id"
                  value={editingProperty.uplistingId || ""}
                  onChange={(e) =>
                    setEditingProperty({ ...editingProperty, uplistingId: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-locationGroup">Location Group</Label>
                <Select
                  value={editingProperty.locationGroupId || ""}
                  onValueChange={(value) =>
                    setEditingProperty({ ...editingProperty, locationGroupId: value })
                  }
                >
                  <SelectTrigger id="edit-locationGroup" data-testid="select-edit-location-group">
                    <SelectValue placeholder="Select a location group" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditingProperty(null)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  updateMutation.mutate({
                    id: editingProperty.id,
                    updates: {
                      name: editingProperty.name,
                      address: editingProperty.address,
                      uplistingId: editingProperty.uplistingId,
                      locationGroupId: editingProperty.locationGroupId,
                    },
                  })
                }
                disabled={updateMutation.isPending}
                data-testid="button-submit-edit"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <ConfirmDialog
        open={!!deleteProperty}
        onOpenChange={(open) => !open && setDeleteProperty(null)}
        title="Delete Property?"
        description={`Are you sure you want to delete "${deleteProperty?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => deleteProperty && deleteMutation.mutate(deleteProperty.id)}
        isLoading={deleteMutation.isPending}
      />

      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open);
        if (!open) {
          // Clear import state when dialog closes
          setImportFile(null);
          setImportPreview([]);
          setImportValidation([]);
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Properties from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk import or update properties
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="csv-file-input"
                data-testid="input-csv-file"
              />
              <label htmlFor="csv-file-input">
                <Button variant="outline" className="w-full" asChild>
                  <span className="cursor-pointer" data-testid="button-select-csv">
                    <Upload className="h-4 w-4 mr-2" />
                    {importFile ? importFile.name : "Select CSV File"}
                  </span>
                </Button>
              </label>
            </div>
            
            {importPreview.length > 0 && (
              <Alert>
                <AlertDescription className="flex items-center gap-2">
                  {importValidation.length === 0 ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>All {importPreview.length} rows are valid</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span>{importValidation.length} rows have validation errors</span>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            {importValidation.length > 0 && (
              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                <h4 className="font-medium mb-2">Validation Errors:</h4>
                <div className="space-y-2">
                  {importValidation.map((error) => (
                    <div key={error.row} className="text-sm text-destructive">
                      <span className="font-medium">Row {error.row}:</span>
                      <ul className="ml-4 list-disc">
                        {error.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {importPreview.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">
                  Preview ({Math.min(5, importPreview.length)} of {importPreview.length} rows):
                </h4>
                <div className="border rounded-lg overflow-auto max-h-60">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">Name</th>
                        <th className="p-2 text-left">Address</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Bedrooms</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.address}</td>
                          <td className="p-2">{row.propertyType || "-"}</td>
                          <td className="p-2">{row.bedrooms || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowImportDialog(false)}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExecuteImport}
              disabled={!importPreview.length || importValidation.length > 0 || isImporting}
              data-testid="button-execute-import"
            >
              {isImporting ? "Importing..." : `Import ${importPreview.length} Properties`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BackToTop />
    </div>
  );
}
