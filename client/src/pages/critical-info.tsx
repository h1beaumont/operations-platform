import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Search, Pencil, Trash2, Loader2, KeyRound, Wifi, Lock, Phone, Info, PoundSterling, Upload, X, Link as LinkIcon, DollarSign } from "lucide-react";
import type { CriticalInfo, CleaningRate, CleaningCost } from "@shared/schema";
import { PageTransition } from "@/lib/animations";
import { format } from "date-fns";

const categories = [
  "Lockbox Code",
  "WiFi Password",
  "Property Link",
  "Other"
];

const categoryIcons: Record<string, any> = {
  "Lockbox Code": KeyRound,
  "WiFi Password": Wifi,
  "Property Link": LinkIcon,
  "Other": Info,
};

const categoryColors: Record<string, string> = {
  "Lockbox Code": "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "WiFi Password": "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  "Property Link": "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  "Other": "bg-gray-500/10 text-gray-700 dark:text-gray-300",
};

const propertyTypes = ["Studio", "1-Bed", "2-Bed", "3-Bed", "4-Bed+", "House"];
const currencies = ["GBP", "USD", "EUR"];

export default function CriticalInfo() {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState("critical-info");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState<CriticalInfo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<CleaningRate | null>(null);
  
  const [formData, setFormData] = useState({
    category: "Lockbox Code",
    propertyId: "",
    propertyName: "",
    title: "",
    value: "",
    notes: "",
    updatedBy: "",
  });

  const [rateFormData, setRateFormData] = useState({
    name: "",
    propertyType: "",
    amount: "",
    currency: "GBP",
    description: "",
    active: true,
  });

  // Bulk upload state
  const [bulkInputText, setBulkInputText] = useState("");
  const [extractedItems, setExtractedItems] = useState<Array<{
    category: string;
    propertyId?: string;
    propertyName: string;
    title: string;
    value: string;
    notes?: string;
  }>>([]);
  const [showReviewInterface, setShowReviewInterface] = useState(false);

  const { data: criticalInfoList = [], isLoading } = useQuery<CriticalInfo[]>({
    queryKey: ["/api/critical-info", searchTerm],
    queryFn: async () => {
      const url = searchTerm 
        ? `/api/critical-info?search=${encodeURIComponent(searchTerm)}`
        : "/api/critical-info";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch");
      return response.json();
    },
  });

  const { data: cleaningRates = [], isLoading: isLoadingRates } = useQuery<CleaningRate[]>({
    queryKey: ["/api/cleaning-rates"],
  });

  const { data: cleaningCosts = [], isLoading: isLoadingCosts } = useQuery<CleaningCost[]>({
    queryKey: ["/api/cleaning-costs"],
  });

  // Fetch properties for dropdown
  const { data: properties = [] } = useQuery<Array<{ id: string; name: string; address: string }>>({
    queryKey: ["/api/properties"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/critical-info", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/critical-info"] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Created Successfully",
        description: "Critical information has been added.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return apiRequest("PATCH", `/api/critical-info/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/critical-info"] });
      setIsDialogOpen(false);
      setEditingInfo(null);
      resetForm();
      toast({
        title: "Updated Successfully",
        description: "Critical information has been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/critical-info/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/critical-info"] });
      toast({
        title: "Deleted Successfully",
        description: "Critical information has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      });
    },
  });

  const createRateMutation = useMutation({
    mutationFn: async (data: typeof rateFormData) => {
      return apiRequest("POST", "/api/cleaning-rates", {
        ...data,
        amount: parseFloat(data.amount),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-rates"] });
      setIsRateDialogOpen(false);
      resetRateForm();
      toast({
        title: "Rate Created",
        description: "Cleaning rate has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create rate",
        variant: "destructive",
      });
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof rateFormData> }) => {
      return apiRequest("PATCH", `/api/cleaning-rates/${id}`, {
        ...data,
        amount: data.amount ? parseFloat(data.amount) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-rates"] });
      setIsRateDialogOpen(false);
      setEditingRate(null);
      resetRateForm();
      toast({
        title: "Rate Updated",
        description: "Cleaning rate has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rate",
        variant: "destructive",
      });
    },
  });

  const deleteRateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/cleaning-rates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-rates"] });
      toast({
        title: "Rate Deleted",
        description: "Cleaning rate has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rate",
        variant: "destructive",
      });
    },
  });

  // Bulk upload mutations
  const extractMutation = useMutation({
    mutationFn: async (inputText: string) => {
      return apiRequest("POST", "/api/critical-info/bulk-extract", { inputText });
    },
    onSuccess: (data: any) => {
      setExtractedItems(data);
      setShowReviewInterface(true);
      toast({
        title: "Extraction Complete",
        description: `Successfully extracted ${data.length} items.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract critical information",
        variant: "destructive",
      });
    },
  });

  const bulkSaveMutation = useMutation({
    mutationFn: async (items: typeof extractedItems) => {
      // Validate all items have propertyId
      const missingPropertyId = items.some(item => !item.propertyId);
      if (missingPropertyId) {
        throw new Error("All items must have a property selected");
      }
      return apiRequest("POST", "/api/critical-info/bulk", { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/critical-info"] });
      setExtractedItems([]);
      setShowReviewInterface(false);
      setBulkInputText("");
      toast({
        title: "Saved Successfully",
        description: "All critical information has been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save critical information",
        variant: "destructive",
      });
    },
  });

  const importPropertyLinksMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/critical-info/import-property-links", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/critical-info"] });
      
      let description = `Imported ${data.imported} new property links`;
      if (data.skipped > 0) {
        description += `, ${data.skipped} already existed`;
      }
      description += ` (${data.total} total on website)`;
      
      toast({
        title: "Import Complete",
        description,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import property links. Please try again.",
        variant: "destructive",
      });
    },
  });

  const importLockboxCodesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/critical-info/import-lockbox-codes", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/critical-info"] });
      
      let description = `Imported ${data.imported} new lockbox codes`;
      if (data.skipped > 0) {
        description += `, ${data.skipped} already existed`;
      }
      description += ` (${data.total} total from document)`;
      
      toast({
        title: "Lockbox Codes Imported",
        description,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import lockbox codes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const importCleaningCostsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/cleaning-costs/import-csv", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-costs"] });
      
      toast({
        title: "Import Successful",
        description: `Imported ${data.imported} cleaning cost records`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import cleaning costs. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      category: "Lockbox Code",
      propertyId: "",
      propertyName: "",
      title: "",
      value: "",
      notes: "",
      updatedBy: "",
    });
  };

  const resetRateForm = () => {
    setRateFormData({
      name: "",
      propertyType: "",
      amount: "",
      currency: "GBP",
      description: "",
      active: true,
    });
  };

  const handleOpenDialog = (info?: CriticalInfo) => {
    if (info) {
      setEditingInfo(info);
      setFormData({
        category: info.category,
        propertyId: (info as any).propertyId || "",
        propertyName: info.propertyName,
        title: info.title,
        value: info.value,
        notes: info.notes || "",
        updatedBy: info.updatedBy,
      });
    } else {
      setEditingInfo(null);
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleOpenRateDialog = (rate?: CleaningRate) => {
    if (rate) {
      setEditingRate(rate);
      setRateFormData({
        name: rate.name,
        propertyType: rate.propertyType || "",
        amount: rate.amount.toString(),
        currency: rate.currency,
        description: rate.description || "",
        active: rate.active,
      });
    } else {
      setEditingRate(null);
      resetRateForm();
    }
    setIsRateDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.category || !formData.propertyId || !formData.propertyName || !formData.title || !formData.value) {
      toast({
        title: "Validation Error",
        description: "Please select a property and fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingInfo) {
      updateMutation.mutate({ id: editingInfo.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSubmitRate = () => {
    if (!rateFormData.name || !rateFormData.amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name and Amount)",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(parseFloat(rateFormData.amount)) || parseFloat(rateFormData.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Amount must be a valid positive number",
        variant: "destructive",
      });
      return;
    }

    if (editingRate) {
      updateRateMutation.mutate({ id: editingRate.id, data: rateFormData });
    } else {
      createRateMutation.mutate(rateFormData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this information?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteRate = (id: string) => {
    if (confirm("Are you sure you want to delete this cleaning rate?")) {
      deleteRateMutation.mutate(id);
    }
  };

  const handleFieldChange = (index: number, field: string, value: string) => {
    setExtractedItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteItem = (index: number) => {
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  };

  const filteredList = selectedCategory === "all" 
    ? criticalInfoList 
    : criticalInfoList.filter(info => info.category === selectedCategory);

  const groupedByCategory = categories.reduce((acc, category) => {
    acc[category] = filteredList.filter(info => info.category === category);
    return acc;
  }, {} as Record<string, CriticalInfo[]>);

  return (
    <PageTransition>
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Critical Information & Rates</h1>
            <p className="text-muted-foreground">
              Manage property information and cleaning rates
            </p>
          </div>
        </div>

        <Tabs value={mainTab} onValueChange={setMainTab} data-testid="tabs-main">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="critical-info" data-testid="tab-critical-info">
              <KeyRound className="h-4 w-4 mr-2" />
              Critical Information
            </TabsTrigger>
            <TabsTrigger value="bulk-upload" data-testid="tab-bulk-upload">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </TabsTrigger>
            <TabsTrigger value="cleaning-rates" data-testid="tab-cleaning-rates">
              <PoundSterling className="h-4 w-4 mr-2" />
              Cleaning Rates
            </TabsTrigger>
            <TabsTrigger value="cleaning-costs" data-testid="tab-cleaning-costs">
              <DollarSign className="h-4 w-4 mr-2" />
              Turnover Costs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="critical-info" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Manage lockbox codes, WiFi passwords, and gate codes
              </p>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={() => importLockboxCodesMutation.mutate()}
                  disabled={importLockboxCodesMutation.isPending}
                  data-testid="button-import-lockbox-codes"
                >
                  {importLockboxCodesMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4 mr-2" />
                      Import Lockbox Codes
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => importPropertyLinksMutation.mutate()}
                  disabled={importPropertyLinksMutation.isPending}
                  data-testid="button-import-property-links"
                >
                  {importPropertyLinksMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Property Links
                    </>
                  )}
                </Button>
                <Button onClick={() => handleOpenDialog()} data-testid="button-add-info">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by property, category, title, code, or notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </CardContent>
            </Card>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} data-testid="tabs-category">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                {categories.map(category => (
                  <TabsTrigger key={category} value={category} data-testid={`tab-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={selectedCategory} className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : selectedCategory === "all" ? (
                  <div className="space-y-6">
                    {categories.map(category => {
                      const items = groupedByCategory[category];
                      if (!items || items.length === 0) return null;

                      return (
                        <Card key={category}>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              {(() => {
                                const Icon = categoryIcons[category];
                                return <Icon className="h-5 w-5" />;
                              })()}
                              {category}
                              <Badge variant="secondary" className="ml-2">
                                {items.length}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Property</TableHead>
                                  <TableHead>Title</TableHead>
                                  <TableHead>Value</TableHead>
                                  <TableHead>Notes</TableHead>
                                  <TableHead>Last Updated</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.map((info) => (
                                  <TableRow key={info.id} data-testid={`row-info-${info.id}`}>
                                    <TableCell className="font-medium">{info.propertyName}</TableCell>
                                    <TableCell>{info.title}</TableCell>
                                    <TableCell>
                                      <code className="rounded bg-muted px-2 py-1 text-sm">
                                        {info.value}
                                      </code>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{info.notes || "-"}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {format(new Date(info.lastUpdated), "MMM d, yyyy 'at' h:mm a")}
                                      <br />
                                      <span className="text-xs">by {info.updatedBy}</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleOpenDialog(info)}
                                          data-testid={`button-edit-${info.id}`}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDelete(info.id)}
                                          data-testid={`button-delete-${info.id}`}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      );
                    })}
                    {filteredList.length === 0 && (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                          <KeyRound className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-lg font-semibold">No critical information found</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {searchTerm ? "Try adjusting your search" : "Get started by adding your first entry"}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-0">
                      {filteredList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                          {(() => {
                            const Icon = categoryIcons[selectedCategory];
                            return <Icon className="h-12 w-12 text-muted-foreground mb-4" />;
                          })()}
                          <p className="text-lg font-semibold">No {selectedCategory.toLowerCase()} entries</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {searchTerm ? "Try adjusting your search" : "Add a new entry to get started"}
                          </p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Property</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Value</TableHead>
                              <TableHead>Notes</TableHead>
                              <TableHead>Last Updated</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredList.map((info) => (
                              <TableRow key={info.id} data-testid={`row-info-${info.id}`}>
                                <TableCell className="font-medium">{info.propertyName}</TableCell>
                                <TableCell>{info.title}</TableCell>
                                <TableCell>
                                  <code className="rounded bg-muted px-2 py-1 text-sm">
                                    {info.value}
                                  </code>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">{info.notes || "-"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {format(new Date(info.lastUpdated), "MMM d, yyyy 'at' h:mm a")}
                                  <br />
                                  <span className="text-xs">by {info.updatedBy}</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenDialog(info)}
                                      data-testid={`button-edit-${info.id}`}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(info.id)}
                                      data-testid={`button-delete-${info.id}`}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
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
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="bulk-upload" className="space-y-6">
            {!showReviewInterface ? (
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Upload Critical Information</CardTitle>
                  <CardDescription>
                    Paste property information from spreadsheets, emails, or documents. AI will automatically extract and organize lockbox codes, WiFi passwords, property links, and more.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-input" data-testid="label-bulk-input">
                      Paste your property information below
                    </Label>
                    <Textarea
                      id="bulk-input"
                      data-testid="textarea-bulk-input"
                      placeholder="Example:&#10;&#10;Riverside Apartments - Unit 12&#10;Building Lockbox Code: 1234&#10;Property Lockbox Code: 5678&#10;WiFi: RiversideGuest, Password: Welcome2024&#10;Booking.com: https://booking.com/property123&#10;Airbnb Link: https://airbnb.com/rooms/456&#10;&#10;Downtown Studio&#10;Entrance lockbox: 9876&#10;WiFi Network: Studio5G, Pass: SecureNet99&#10;Direct Booking: https://comfort-stays.com/downtown-studio"
                      value={bulkInputText}
                      onChange={(e) => setBulkInputText(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-md space-y-2">
                    <p className="text-sm font-medium">Tips for best results:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Include property names or addresses</li>
                      <li>Clearly label information types (lockbox codes, WiFi, property links, etc.)</li>
                      <li>For multiple lockbox codes, specify each (building, property, etc.)</li>
                      <li>You can paste from CSV, emails, or formatted text</li>
                      <li>AI will organize and categorize everything for you</li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => extractMutation.mutate(bulkInputText)}
                      disabled={!bulkInputText.trim() || extractMutation.isPending}
                      data-testid="button-process-ai"
                    >
                      {extractMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing with AI...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Process with AI
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Review Extracted Items</h3>
                    <p className="text-sm text-muted-foreground">
                      {extractedItems.length} items extracted. Review and edit before saving.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowReviewInterface(false);
                        setExtractedItems([]);
                      }}
                      data-testid="button-cancel-review"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => bulkSaveMutation.mutate(extractedItems)}
                      disabled={extractedItems.length === 0 || bulkSaveMutation.isPending}
                      data-testid="button-save-all"
                    >
                      {bulkSaveMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Save All ({extractedItems.length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <Card>
                  <CardContent className="p-0">
                    {extractedItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 text-center">
                        <Info className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-semibold">No items to review</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Go back and process some text with AI
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Property Name</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Notes</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {extractedItems.map((item, index) => (
                            <TableRow key={index} data-testid={`row-extracted-${index}`}>
                              <TableCell>
                                <Select
                                  value={item.category}
                                  onValueChange={(value) => handleFieldChange(index, 'category', value)}
                                >
                                  <SelectTrigger data-testid={`select-category-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map((cat) => (
                                      <SelectItem key={cat} value={cat}>
                                        {cat}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.propertyId || ""}
                                  onValueChange={(propertyId) => {
                                    const selectedProperty = properties.find(p => p.id === propertyId);
                                    handleFieldChange(index, 'propertyId', propertyId);
                                    if (selectedProperty) {
                                      handleFieldChange(index, 'propertyName', selectedProperty.name);
                                    }
                                  }}
                                >
                                  <SelectTrigger data-testid={`select-property-${index}`}>
                                    <SelectValue placeholder="Select property">
                                      {item.propertyId && (() => {
                                        const selectedProperty = properties.find(p => p.id === item.propertyId);
                                        return selectedProperty ? `${selectedProperty.name}` : item.propertyName;
                                      })()}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {properties.map(property => (
                                      <SelectItem key={property.id} value={property.id} data-testid={`option-property-${property.id}-${index}`}>
                                        {property.name} - {property.address}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {!item.propertyId && (
                                  <p className="text-xs text-destructive mt-1">Property required</p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.title}
                                  onChange={(e) => handleFieldChange(index, 'title', e.target.value)}
                                  data-testid={`input-title-${index}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.value}
                                  onChange={(e) => handleFieldChange(index, 'value', e.target.value)}
                                  data-testid={`input-value-${index}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.notes || ""}
                                  onChange={(e) => handleFieldChange(index, 'notes', e.target.value)}
                                  placeholder="Optional notes"
                                  data-testid={`input-notes-${index}`}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteItem(index)}
                                  data-testid={`button-delete-${index}`}
                                >
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cleaning-costs" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                View turnover cost breakdown for each property - displayed to cleaners in the Linen Packing Assistant
              </p>
              <Button
                variant="outline"
                onClick={() => importCleaningCostsMutation.mutate()}
                disabled={importCleaningCostsMutation.isPending}
                data-testid="button-import-cleaning-costs"
              >
                {importCleaningCostsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Turnover Costs CSV
                  </>
                )}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Turnover Cost Breakdown</CardTitle>
                <CardDescription>
                  Cost data from the CSV that shows labour costs and breakdown for each property
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCosts ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : cleaningCosts.length > 0 ? (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property Name</TableHead>
                          <TableHead className="text-right">Cleaning Fee</TableHead>
                          <TableHead className="text-right">Linen Cost</TableHead>
                          <TableHead className="text-right">Disposables</TableHead>
                          <TableHead className="text-right">Products</TableHead>
                          <TableHead className="text-right">Labour Cost</TableHead>
                          <TableHead className="text-right">Net Profit</TableHead>
                          <TableHead className="text-right">Margin</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cleaningCosts.map((cost) => (
                          <TableRow key={cost.propertyName} data-testid={`cost-row-${cost.propertyName}`}>
                            <TableCell className="font-medium">{cost.propertyName}</TableCell>
                            <TableCell className="text-right">£{cost.cleaningFee}</TableCell>
                            <TableCell className="text-right">£{cost.linenCost}</TableCell>
                            <TableCell className="text-right">£{cost.disposableCost}</TableCell>
                            <TableCell className="text-right">£{cost.cleaningProductCost}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                              £{cost.labourCost}
                            </TableCell>
                            <TableCell className="text-right">£{cost.netProfit}</TableCell>
                            <TableCell className="text-right">{cost.profitMargin}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No turnover cost data imported yet
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => importCleaningCostsMutation.mutate()}
                      disabled={importCleaningCostsMutation.isPending}
                      data-testid="button-import-costs-empty"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Import Turnover Costs CSV
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cleaning-rates" className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Set cleaning rates for different property types
              </p>
              <Button onClick={() => handleOpenRateDialog()} data-testid="button-add-rate">
                <Plus className="h-4 w-4 mr-2" />
                Add Rate
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoadingRates ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : cleaningRates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <PoundSterling className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-semibold">No cleaning rates found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add your first cleaning rate to get started
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Property Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cleaningRates.map((rate) => (
                        <TableRow key={rate.id} data-testid={`row-rate-${rate.id}`}>
                          <TableCell className="font-medium">{rate.name}</TableCell>
                          <TableCell>
                            {rate.propertyType ? (
                              <Badge variant="outline">{rate.propertyType}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">
                              {rate.currency === "GBP" && "£"}
                              {rate.currency === "USD" && "$"}
                              {rate.currency === "EUR" && "€"}
                              {Number(rate.amount).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>{rate.currency}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {rate.description || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={rate.active ? "default" : "secondary"}>
                              {rate.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenRateDialog(rate)}
                                data-testid={`button-edit-rate-${rate.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteRate(rate.id)}
                                data-testid={`button-delete-rate-${rate.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
          </TabsContent>
        </Tabs>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-edit">
            <DialogHeader>
              <DialogTitle>
                {editingInfo ? "Edit Critical Information" : "Add Critical Information"}
              </DialogTitle>
              <DialogDescription>
                {editingInfo 
                  ? "Update the information below" 
                  : "Add important property information that staff need to access"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category" data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category} data-testid={`option-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="propertyName">Property *</Label>
                <Select
                  value={formData.propertyId}
                  onValueChange={(propertyId) => {
                    const selectedProperty = properties.find(p => p.id === propertyId);
                    setFormData({ 
                      ...formData, 
                      propertyId, 
                      propertyName: selectedProperty?.name || "" 
                    });
                  }}
                >
                  <SelectTrigger id="propertyName" data-testid="select-property-name">
                    <SelectValue placeholder="Select property">
                      {formData.propertyId && (() => {
                        const selectedProperty = properties.find(p => p.id === formData.propertyId);
                        return selectedProperty ? `${selectedProperty.name} - ${selectedProperty.address}` : formData.propertyName;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map(property => (
                      <SelectItem key={property.id} value={property.id} data-testid={`option-property-${property.id}`}>
                        {property.name} - {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.propertyId && formData.propertyName && (
                  <p className="text-xs text-muted-foreground">
                    Legacy entry: "{formData.propertyName}" - Please select a property from the list
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="title">Title/Description *</Label>
                {formData.category === "Lockbox Code" && (
                  <p className="text-xs text-muted-foreground mb-1">
                    For properties with multiple codes, add separate entries (e.g., "Building Code", "Property Code")
                  </p>
                )}
                {formData.category === "Property Link" && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Specify the platform (e.g., "Booking.com Link", "Airbnb Link", "Direct Booking Link")
                  </p>
                )}
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder={
                    formData.category === "Lockbox Code" 
                      ? "e.g., Building Code, Main Door Code, Property Code"
                      : formData.category === "Property Link"
                      ? "e.g., Booking.com Link, Airbnb Link, Direct Booking Link"
                      : "e.g., Main Entrance Lockbox"
                  }
                  data-testid="input-title"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="value">Value/Code *</Label>
                <Input
                  id="value"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="e.g., 1234 or password123"
                  className="font-mono"
                  data-testid="input-value"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information..."
                  rows={3}
                  data-testid="textarea-notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingInfo ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]" data-testid="dialog-add-edit-rate">
            <DialogHeader>
              <DialogTitle>
                {editingRate ? "Edit Cleaning Rate" : "Add Cleaning Rate"}
              </DialogTitle>
              <DialogDescription>
                {editingRate 
                  ? "Update the cleaning rate information below" 
                  : "Add a new cleaning rate for your properties"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="rate-name">Name *</Label>
                <Input
                  id="rate-name"
                  value={rateFormData.name}
                  onChange={(e) => setRateFormData({ ...rateFormData, name: e.target.value })}
                  placeholder="e.g., Studio Clean, 1 Bed Clean"
                  data-testid="input-rate-name"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="property-type">Property Type (Optional)</Label>
                <Select
                  value={rateFormData.propertyType}
                  onValueChange={(value) => setRateFormData({ ...rateFormData, propertyType: value })}
                >
                  <SelectTrigger id="property-type" data-testid="select-property-type">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map(type => (
                      <SelectItem key={type} value={type} data-testid={`option-${type.toLowerCase()}`}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={rateFormData.amount}
                    onChange={(e) => setRateFormData({ ...rateFormData, amount: e.target.value })}
                    placeholder="0.00"
                    data-testid="input-amount"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={rateFormData.currency}
                    onValueChange={(value) => setRateFormData({ ...rateFormData, currency: value })}
                  >
                    <SelectTrigger id="currency" data-testid="select-currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(currency => (
                        <SelectItem key={currency} value={currency} data-testid={`option-${currency.toLowerCase()}`}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={rateFormData.description}
                  onChange={(e) => setRateFormData({ ...rateFormData, description: e.target.value })}
                  placeholder="Additional details about this rate..."
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="active">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this rate available for use
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={rateFormData.active}
                  onCheckedChange={(checked) => setRateFormData({ ...rateFormData, active: checked })}
                  data-testid="switch-active"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRateDialogOpen(false)}
                data-testid="button-cancel-rate"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitRate}
                disabled={createRateMutation.isPending || updateRateMutation.isPending}
                data-testid="button-submit-rate"
              >
                {(createRateMutation.isPending || updateRateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingRate ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
