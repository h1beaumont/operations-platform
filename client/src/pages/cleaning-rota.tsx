import { createContext, useContext, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  Upload, FileText, Calendar, Trash2, Loader2, UserCheck, 
  Building2, AlertCircle, CheckCircle2, FileUp, Sparkles,
  Clock, Users, Edit2, Plus, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Shared context for cross-tab state
interface CleaningRotaContextType {
  selectedUplistingUploadId: string | null;
  setSelectedUplistingUploadId: (id: string | null) => void;
  selectedProperlyUploadId: string | null;
  setSelectedProperlyUploadId: (id: string | null) => void;
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
}

const CleaningRotaContext = createContext<CleaningRotaContextType | null>(null);

const useCleaningRotaContext = () => {
  const context = useContext(CleaningRotaContext);
  if (!context) {
    throw new Error("useCleaningRotaContext must be used within CleaningRotaProvider");
  }
  return context;
};

// ===== TAB 1: UPLISTING UPLOAD =====
function UplistingTab() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { selectedUplistingUploadId, setSelectedUplistingUploadId } = useCleaningRotaContext();

  const { data: uploads = [] } = useQuery({
    queryKey: ["/api/uplisting/uploads"],
  });

  const { data: schedule = [] } = useQuery({
    queryKey: ["/api/uplisting/uploads", selectedUplistingUploadId, "schedule"],
    queryFn: async () => {
      if (!selectedUplistingUploadId) return [];
      const response = await fetch(`/api/uplisting/uploads/${selectedUplistingUploadId}/schedule`);
      if (!response.ok) throw new Error("Failed to fetch schedule");
      return response.json();
    },
    enabled: !!selectedUplistingUploadId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      return apiRequest("POST", "/api/uplisting/upload", {
        fileName: file.name,
        csvContent: text,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `Processed ${data.totalBookings} bookings`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/uplisting/uploads"] });
      setSelectedFile(null);
      setSelectedUplistingUploadId(data.uploadId);
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to process CSV file",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      return apiRequest("DELETE", `/api/uplisting/uploads/${uploadId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Upload removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/uplisting/uploads"] });
      setSelectedUplistingUploadId(null);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const scheduleByDate = schedule.reduce((acc: any, item: any) => {
    if (!acc[item.checkoutDate]) {
      acc[item.checkoutDate] = [];
    }
    acc[item.checkoutDate].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(scheduleByDate).sort();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle data-testid="text-uplisting-title">Uplisting Booking Reports</CardTitle>
          <CardDescription>
            Upload Uplisting booking reports to extract checkout schedules for management properties
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6">
            <div className="flex flex-col items-center gap-4">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Upload Uplisting Booking Report (CSV)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  System will extract only checkout dates and property addresses
                </p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="uplisting-csv-upload"
                data-testid="input-uplisting-csv"
              />
              <label htmlFor="uplisting-csv-upload">
                <Button variant="outline" asChild data-testid="button-select-uplisting-file">
                  <span>
                    <FileText className="h-4 w-4 mr-2" />
                    Select CSV File
                  </span>
                </Button>
              </label>
              {selectedFile && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" data-testid="badge-selected-uplisting-file">
                    {selectedFile.name}
                  </Badge>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    data-testid="button-upload-uplisting-csv"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload & Process
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Recent Uploads</h3>
            <Table data-testid="table-uplisting-uploads">
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No uploads yet
                    </TableCell>
                  </TableRow>
                ) : (
                  uploads.map((upload: any) => (
                    <TableRow
                      key={upload.id}
                      className={selectedUplistingUploadId === upload.id ? "bg-muted" : ""}
                      data-testid={`row-uplisting-upload-${upload.id}`}
                    >
                      <TableCell>{upload.fileName}</TableCell>
                      <TableCell>
                        {upload.periodStart && upload.periodEnd
                          ? `${format(new Date(upload.periodStart), "MMM d")} - ${format(new Date(upload.periodEnd), "MMM d, yyyy")}`
                          : "N/A"}
                      </TableCell>
                      <TableCell>{upload.totalBookings}</TableCell>
                      <TableCell>
                        {format(new Date(upload.uploadedAt), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUplistingUploadId(upload.id)}
                            data-testid={`button-view-uplisting-${upload.id}`}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            View Schedule
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(upload.id)}
                            data-testid={`button-delete-uplisting-${upload.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedUplistingUploadId && schedule.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Checkout Schedule</CardTitle>
            <CardDescription>Properties requiring cleaning on checkout dates</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {sortedDates.map((date) => (
                  <div key={date} className="space-y-2">
                    <div className="flex items-center gap-2 sticky top-0 bg-background py-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-semibold">{format(new Date(date), "EEEE, MMMM d, yyyy")}</h4>
                      <Badge variant="secondary">{scheduleByDate[date].length} properties</Badge>
                    </div>
                    <div className="grid gap-2">
                      {scheduleByDate[date].map((item: any, idx: number) => (
                        <Card key={idx}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{item.propertyAddress}</p>
                                <p className="text-sm text-muted-foreground">
                                  {item.guestName} - Checkout {format(new Date(item.checkoutDate), "h:mm a")}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ===== TAB 2: PROPERLY UPLOAD =====
function ProperlyTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { selectedProperlyUploadId, setSelectedProperlyUploadId } = useCleaningRotaContext();
  const { toast } = useToast();

  const { data: uploads } = useQuery({
    queryKey: ['/api/properly/uploads'],
  });

  const { data: selectedUpload } = useQuery({
    queryKey: ['/api/properly/uploads', selectedProperlyUploadId],
    enabled: !!selectedProperlyUploadId,
  });

  const { data: allocations } = useQuery({
    queryKey: ['/api/properly/uploads', selectedProperlyUploadId, 'allocations'],
    enabled: !!selectedProperlyUploadId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: { fileName: string; csvContent: string }) => {
      return await apiRequest("POST", '/api/properly/upload', data);
    },
    onSuccess: (data) => {
      toast({
        title: "CSV Uploaded Successfully",
        description: `${data.totalTasks} tasks parsed and ready for allocation`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properly/uploads'] });
      setSelectedProperlyUploadId(data.uploadId);
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Failed to upload CSV",
      });
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      return await apiRequest("POST", `/api/properly/uploads/${uploadId}/allocate`, {});
    },
    onSuccess: (data) => {
      toast({
        title: "Allocation Complete",
        description: `${data.totalAllocations} cleaners assigned successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properly/uploads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properly/uploads', selectedProperlyUploadId] });
      queryClient.invalidateQueries({ queryKey: ['/api/properly/uploads', selectedProperlyUploadId, 'allocations'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Allocation Failed",
        description: error.message || "Failed to allocate cleaners",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select a CSV file",
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvContent = e.target?.result as string;
      uploadMutation.mutate({
        fileName: selectedFile.name,
        csvContent,
      });
    };
    reader.readAsText(selectedFile);
  };

  const handleAllocate = () => {
    if (!selectedProperlyUploadId) return;
    allocateMutation.mutate(selectedProperlyUploadId);
  };

  const getBuildingColor = (building: string) => {
    // Hash-based color assignment for dynamic buildings
    const colors = [
      'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      'bg-green-500/10 text-green-700 dark:text-green-300',
      'bg-orange-500/10 text-orange-700 dark:text-orange-300',
      'bg-pink-500/10 text-pink-700 dark:text-pink-300',
      'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    ];
    const hash = building.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
      case 'allocated': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'confirmed': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'completed': return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  // Calculate capacity usage per cleaner per building
  const getCapacityUsage = () => {
    if (!allocations) return {};
    
    const capacityMap: Record<string, Record<string, number>> = {};
    
    allocations.forEach((allocation: any) => {
      const key = `${allocation.cleanerId}-${allocation.building}`;
      if (!capacityMap[key]) {
        capacityMap[key] = {
          count: 0,
          maxCapacity: 4, // Default capacity - will be learned from historical data
          cleanerName: allocation.cleanerName,
          building: allocation.building,
        };
      }
      capacityMap[key].count += 1;
    });
    
    return capacityMap;
  };

  const capacityUsage = getCapacityUsage();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Properly Cleaning Schedule</CardTitle>
          <CardDescription>
            Upload Properly cleaning schedules for your building clusters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6">
            <div className="flex flex-col items-center gap-4">
              <FileUp className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Upload Properly CSV</p>
                <p className="text-xs text-muted-foreground mt-1">
                  System will parse tasks and assign cleaners based on preferences
                </p>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                id="properly-csv-upload"
                data-testid="input-properly-csv"
              />
              <label htmlFor="properly-csv-upload">
                <Button variant="outline" asChild data-testid="button-select-properly-file">
                  <span>
                    <FileText className="h-4 w-4 mr-2" />
                    Select CSV File
                  </span>
                </Button>
              </label>
              {selectedFile && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" data-testid="badge-selected-properly-file">
                    {selectedFile.name}
                  </Badge>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    data-testid="button-upload-properly-csv"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload & Process
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Recent Uploads</h3>
            <Table data-testid="table-properly-uploads">
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!uploads || uploads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No uploads yet
                    </TableCell>
                  </TableRow>
                ) : (
                  uploads.map((upload: any) => (
                    <TableRow
                      key={upload.id}
                      className={selectedProperlyUploadId === upload.id ? "bg-muted" : ""}
                      data-testid={`row-properly-upload-${upload.id}`}
                    >
                      <TableCell>{upload.fileName}</TableCell>
                      <TableCell>{upload.totalTasks}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(upload.status)}>
                          {upload.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(upload.uploadedAt), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedProperlyUploadId(upload.id)}
                          data-testid={`button-view-properly-${upload.id}`}
                        >
                          <Users className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedUpload && selectedUpload.status === 'uploaded' && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            This upload is ready for automatic allocation.
            <Button
              onClick={handleAllocate}
              disabled={allocateMutation.isPending}
              className="ml-4"
              size="sm"
              data-testid="button-allocate-cleaners"
            >
              {allocateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Allocating...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Allocate Cleaners
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {allocations && allocations.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Capacity Usage</CardTitle>
              <CardDescription>
                Default: 4 rooms max per cleaner per building (adjusts based on historical data)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {Object.values(capacityUsage).map((usage: any, idx) => {
                  const colors = [
                    'rgb(59 130 246)', 'rgb(168 85 247)', 'rgb(34 197 94)',
                    'rgb(249 115 22)', 'rgb(236 72 153)', 'rgb(99 102 241)',
                  ];
                  const hash = usage.building.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                  const borderColor = colors[hash % colors.length];
                  
                  return (
                  <Card key={idx} className="border-l-4" style={{
                    borderLeftColor: borderColor
                  }}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{usage.cleanerName}</p>
                          <Badge className={getBuildingColor(usage.building)} variant="secondary">
                            {usage.building}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">
                            {usage.count}/{usage.maxCapacity}
                          </p>
                          <p className="text-xs text-muted-foreground">rooms</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cleaner Allocations</CardTitle>
              <CardDescription>View and manage cleaner assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table data-testid="table-allocations">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cleaner</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((allocation: any) => (
                    <TableRow key={allocation.id} data-testid={`row-allocation-${allocation.id}`}>
                      <TableCell>{allocation.cleanerName}</TableCell>
                      <TableCell>
                        <Badge className={getBuildingColor(allocation.building)} variant="secondary">
                          {allocation.building}
                        </Badge>
                      </TableCell>
                      <TableCell>{allocation.propertyName}</TableCell>
                      <TableCell>{allocation.roomNumber}</TableCell>
                      <TableCell>{format(new Date(allocation.cleaningDate), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(allocation.status)}>
                          {allocation.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ===== TAB 3: BUILDING PREFERENCES =====
function BuildingPreferencesTab() {
  const { toast } = useToast();

  const { data: preferences = [], isLoading } = useQuery({
    queryKey: ['/api/cleaner-preferences'],
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff'],
  });

  const { data: buildingsData = [], isLoading: buildingsLoading } = useQuery({
    queryKey: ['/api/ast/buildings'],
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async ({ staffId, building, preferenceLevel }: { staffId: string; building: string; preferenceLevel: number }) => {
      return await apiRequest("PATCH", `/api/cleaner-preferences/${staffId}/${building}`, { preferenceLevel });
    },
    onSuccess: () => {
      toast({
        title: "Preference Updated",
        description: "Cleaner building preference has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cleaner-preferences'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update preference",
      });
    },
  });

  const buildings = buildingsData.map((b: any) => b.name);
  
  // Group preferences by cleaner
  const preferencesByStaff = preferences.reduce((acc: any, pref: any) => {
    if (!acc[pref.staffId]) {
      acc[pref.staffId] = {
        staffId: pref.staffId,
        fullName: pref.fullName || 'Unknown',
        preferences: {},
      };
    }
    acc[pref.staffId].preferences[pref.building] = pref.preferenceLevel;
    return acc;
  }, {});

  const getPreferenceBadgeColor = (level: number | undefined) => {
    if (!level) return "bg-gray-500/10 text-gray-700 dark:text-gray-300";
    switch (level) {
      case 1: return "bg-green-500/10 text-green-700 dark:text-green-300";
      case 2: return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
      case 3: return "bg-orange-500/10 text-orange-700 dark:text-orange-300";
      default: return "bg-gray-500/10 text-gray-700 dark:text-gray-300";
    }
  };

  const getPreferenceLabel = (level: number | undefined) => {
    if (!level) return "Not Set";
    switch (level) {
      case 1: return "Preferred";
      case 2: return "Can Do";
      case 3: return "If Needed";
      default: return "Not Set";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cleaner Building Preferences</CardTitle>
          <CardDescription>
            Manage cleaner preferences for each building (1=Preferred, 2=Can Do, 3=If Needed)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || buildingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : buildings.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No buildings found. Please add buildings in the AST Properties section first.
              </AlertDescription>
            </Alert>
          ) : (
            <Table data-testid="table-building-preferences">
              <TableHeader>
                <TableRow>
                  <TableHead>Cleaner</TableHead>
                  {buildings.map((building: string) => (
                    <TableHead key={building}>{building}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(preferencesByStaff).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={buildings.length + 1} className="text-center text-muted-foreground">
                      No preferences set yet
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.values(preferencesByStaff).map((staffPref: any) => (
                    <TableRow key={staffPref.staffId} data-testid={`row-preference-${staffPref.staffId}`}>
                      <TableCell className="font-medium">{staffPref.fullName}</TableCell>
                      {buildings.map((building) => (
                        <TableCell key={building}>
                          <Select
                            value={staffPref.preferences[building]?.toString() || "0"}
                            onValueChange={(value) => {
                              if (value !== "0") {
                                updatePreferenceMutation.mutate({
                                  staffId: staffPref.staffId,
                                  building,
                                  preferenceLevel: parseInt(value),
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-preference-${staffPref.staffId}-${building}`}>
                              <SelectValue>
                                <Badge className={getPreferenceBadgeColor(staffPref.preferences[building])}>
                                  {getPreferenceLabel(staffPref.preferences[building])}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Not Set</SelectItem>
                              <SelectItem value="1">1 - Preferred</SelectItem>
                              <SelectItem value="2">2 - Can Do</SelectItem>
                              <SelectItem value="3">3 - If Needed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertDescription>
          <strong>Preference Levels:</strong> Level 1 cleaners are prioritized first during allocation, 
          followed by level 2, then level 3. This ensures optimal cleaner-building matching.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// ===== TAB 4: MANUAL ADJUSTMENTS =====
function ManualAdjustmentsTab() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'add',
    building: '',
    propertyName: '',
    roomNumber: '',
    cleanerId: '',
    reason: '',
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ['/api/manual-adjustments', selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams({ adjustmentDate: selectedDate });
      const response = await fetch(`/api/manual-adjustments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch adjustments");
      return response.json();
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['/api/staff'],
  });

  const { data: buildingsData = [] } = useQuery({
    queryKey: ['/api/ast/buildings'],
  });

  const createAdjustmentMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", '/api/manual-adjustments', data);
    },
    onSuccess: () => {
      toast({
        title: "Adjustment Created",
        description: "Manual cleaning adjustment has been added",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/manual-adjustments'] });
      setShowForm(false);
      setFormData({
        type: 'add',
        building: '',
        propertyName: '',
        roomNumber: '',
        cleanerId: '',
        reason: '',
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Failed to create adjustment",
      });
    },
  });

  const deleteAdjustmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/manual-adjustments/${id}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Adjustment Deleted",
        description: "Manual adjustment has been removed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/manual-adjustments'] });
    },
  });

  const updateAdjustmentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest("PATCH", `/api/manual-adjustments/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Adjustment status has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/manual-adjustments'] });
    },
  });

  const handleSubmit = () => {
    if (!formData.building || !formData.cleanerId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields",
      });
      return;
    }

    createAdjustmentMutation.mutate({
      ...formData,
      adjustmentDate: selectedDate,
      status: 'pending',
    });
  };

  const getBuildingColor = (building: string) => {
    // Hash-based color assignment for dynamic buildings
    const colors = [
      'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      'bg-green-500/10 text-green-700 dark:text-green-300',
      'bg-orange-500/10 text-orange-700 dark:text-orange-300',
      'bg-pink-500/10 text-pink-700 dark:text-pink-300',
      'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
    ];
    const hash = building.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
      case 'approved': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'rejected': return 'bg-red-500/10 text-red-700 dark:text-red-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Manual Cleaning Adjustments</CardTitle>
          <CardDescription>
            Add, remove, or reassign cleaning tasks for last-minute changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="adjustment-date">Select Date</Label>
              <Input
                id="adjustment-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                data-testid="input-adjustment-date"
              />
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              data-testid="button-toggle-adjustment-form"
            >
              {showForm ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  New Adjustment
                </>
              )}
            </Button>
          </div>

          {showForm && (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Create Manual Adjustment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="adj-type">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger id="adj-type" data-testid="select-adjustment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add Task</SelectItem>
                        <SelectItem value="remove">Remove Task</SelectItem>
                        <SelectItem value="reassign">Reassign Task</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="adj-building">Building *</Label>
                    <Select
                      value={formData.building}
                      onValueChange={(value) => setFormData({ ...formData, building: value })}
                    >
                      <SelectTrigger id="adj-building" data-testid="select-adjustment-building">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildingsData.map((building: any) => (
                          <SelectItem key={building.id} value={building.name}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="adj-property">Property Name</Label>
                    <Input
                      id="adj-property"
                      value={formData.propertyName}
                      onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                      placeholder="e.g., Building B Flat 12"
                      data-testid="input-adjustment-property"
                    />
                  </div>

                  <div>
                    <Label htmlFor="adj-room">Room Number</Label>
                    <Input
                      id="adj-room"
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                      placeholder="e.g., 12"
                      data-testid="input-adjustment-room"
                    />
                  </div>

                  <div>
                    <Label htmlFor="adj-cleaner">Cleaner *</Label>
                    <Select
                      value={formData.cleanerId}
                      onValueChange={(value) => setFormData({ ...formData, cleanerId: value })}
                    >
                      <SelectTrigger id="adj-cleaner" data-testid="select-adjustment-cleaner">
                        <SelectValue placeholder="Select cleaner" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="adj-reason">Reason</Label>
                    <Textarea
                      id="adj-reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Brief reason for this manual adjustment"
                      data-testid="input-adjustment-reason"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleSubmit}
                  disabled={createAdjustmentMutation.isPending}
                  data-testid="button-submit-adjustment"
                >
                  {createAdjustmentMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Create Adjustment
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Adjustments for {format(new Date(selectedDate), "MMMM d, yyyy")}
            </h3>
            <Table data-testid="table-manual-adjustments">
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Cleaner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No manual adjustments for this date
                    </TableCell>
                  </TableRow>
                ) : (
                  adjustments.map((adj: any) => (
                    <TableRow key={adj.id} data-testid={`row-adjustment-${adj.id}`}>
                      <TableCell>
                        <Badge variant="secondary">{adj.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getBuildingColor(adj.building)} variant="secondary">
                          {adj.building}
                        </Badge>
                      </TableCell>
                      <TableCell>{adj.propertyName || '-'}</TableCell>
                      <TableCell>{adj.roomNumber || '-'}</TableCell>
                      <TableCell>{adj.cleanerName || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(adj.status)}>
                          {adj.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {adj.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateAdjustmentMutation.mutate({ id: adj.id, status: 'approved' })}
                                data-testid={`button-approve-${adj.id}`}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteAdjustmentMutation.mutate(adj.id)}
                                data-testid={`button-delete-${adj.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== MAIN PAGE COMPONENT =====
export default function CleaningRota() {
  const [selectedUplistingUploadId, setSelectedUplistingUploadId] = useState<string | null>(null);
  const [selectedProperlyUploadId, setSelectedProperlyUploadId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const contextValue: CleaningRotaContextType = {
    selectedUplistingUploadId,
    setSelectedUplistingUploadId,
    selectedProperlyUploadId,
    setSelectedProperlyUploadId,
    selectedDate,
    setSelectedDate,
  };

  return (
    <CleaningRotaContext.Provider value={contextValue}>
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-cleaning-rota-title">
            Cleaning Rota Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive cleaning schedule management for all properties
          </p>
        </div>

        <Tabs defaultValue="uplisting" className="space-y-4" data-testid="tabs-cleaning-rota">
          <TabsList className="grid w-full grid-cols-4" data-testid="tabs-list">
            <TabsTrigger value="uplisting" data-testid="tab-uplisting">
              <Calendar className="w-4 h-4 mr-2" />
              Uplisting
            </TabsTrigger>
            <TabsTrigger value="properly" data-testid="tab-properly">
              <Building2 className="w-4 h-4 mr-2" />
              Properly
            </TabsTrigger>
            <TabsTrigger value="preferences" data-testid="tab-preferences">
              <UserCheck className="w-4 h-4 mr-2" />
              Preferences
            </TabsTrigger>
            <TabsTrigger value="adjustments" data-testid="tab-adjustments">
              <Edit2 className="w-4 h-4 mr-2" />
              Adjustments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="uplisting" className="space-y-4">
            <UplistingTab />
          </TabsContent>

          <TabsContent value="properly" className="space-y-4">
            <ProperlyTab />
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4">
            <BuildingPreferencesTab />
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-4">
            <ManualAdjustmentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </CleaningRotaContext.Provider>
  );
}
