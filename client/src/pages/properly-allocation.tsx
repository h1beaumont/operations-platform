import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  UserCheck, 
  Calendar, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  FileUp,
  Sparkles,
  Clock,
  Users
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ProperlyAllocation() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null);
  const { toast } = useToast();

  // Query for uploads
  const { data: uploads, isLoading: uploadsLoading } = useQuery({
    queryKey: ['/api/properly/uploads'],
  });

  // Query for selected upload details
  const { data: selectedUpload } = useQuery({
    queryKey: ['/api/properly/uploads', selectedUploadId],
    enabled: !!selectedUploadId,
  });

  // Query for allocations
  const { data: allocations } = useQuery({
    queryKey: ['/api/properly/uploads', selectedUploadId, 'allocations'],
    enabled: !!selectedUploadId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: { fileName: string; csvContent: string }) => {
      return await apiRequest('/api/properly/upload', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data) => {
      toast({
        title: "CSV Uploaded Successfully",
        description: `${data.totalTasks} tasks parsed and ready for allocation`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properly/uploads'] });
      setSelectedUploadId(data.uploadId);
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

  // Allocate mutation
  const allocateMutation = useMutation({
    mutationFn: async (uploadId: string) => {
      return await apiRequest(`/api/properly/uploads/${uploadId}/allocate`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Allocation Complete",
        description: `${data.totalAllocations} cleaners assigned successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properly/uploads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properly/uploads', selectedUploadId] });
      queryClient.invalidateQueries({ queryKey: ['/api/properly/uploads', selectedUploadId, 'allocations'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Allocation Failed",
        description: error.message || "Failed to allocate cleaners",
      });
    },
  });

  // Confirm allocation mutation
  const confirmMutation = useMutation({
    mutationFn: async (allocationId: string) => {
      return await apiRequest(`/api/properly/allocations/${allocationId}/confirm`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Allocation Confirmed",
        description: "Cleaner assignment has been confirmed",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properly/uploads', selectedUploadId, 'allocations'] });
    },
  });

  // Update allocation mutation
  const updateAllocationMutation = useMutation({
    mutationFn: async ({ allocationId, updates }: { allocationId: string; updates: any }) => {
      return await apiRequest(`/api/properly/allocations/${allocationId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      toast({
        title: "Allocation Updated",
        description: "Cleaner assignment has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/properly/uploads', selectedUploadId, 'allocations'] });
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
    if (!selectedUploadId) return;
    allocateMutation.mutate(selectedUploadId);
  };

  const getBuildingColor = (building: string) => {
    switch (building) {
      case 'Building A': return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'Building B': return 'bg-purple-500/10 text-purple-700 dark:text-purple-300';
      case 'Building C': return 'bg-green-500/10 text-green-700 dark:text-green-300';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
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

  // Group allocations by date and building
  const groupedAllocations = allocations?.reduce((acc: any, allocation: any) => {
    const key = `${allocation.cleaningDate}-${allocation.building}`;
    if (!acc[key]) {
      acc[key] = {
        date: allocation.cleaningDate,
        building: allocation.building,
        allocations: [],
      };
    }
    acc[key].allocations.push(allocation);
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properly Cleaner Allocation</h1>
          <p className="text-muted-foreground mt-1">
            Upload cleaning schedules and automatically assign cleaners
          </p>
        </div>
      </div>

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload" data-testid="tab-upload">
            <FileUp className="w-4 h-4 mr-2" />
            Upload & Process
          </TabsTrigger>
          <TabsTrigger value="allocations" data-testid="tab-allocations">
            <Users className="w-4 h-4 mr-2" />
            Allocations
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Clock className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload CSV Schedule
                </CardTitle>
                <CardDescription>
                  Upload a Properly cleaning schedule export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    data-testid="input-csv-file"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  className="w-full"
                  data-testid="button-upload-csv"
                >
                  {uploadMutation.isPending ? "Uploading..." : "Upload & Parse CSV"}
                </Button>
              </CardFooter>
            </Card>

            {/* Recent Uploads */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
                <CardDescription>Previously uploaded schedules</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {uploadsLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
                  {uploads && uploads.length === 0 && (
                    <p className="text-sm text-muted-foreground">No uploads yet</p>
                  )}
                  <div className="space-y-2">
                    {uploads?.map((upload: any) => (
                      <div
                        key={upload.id}
                        onClick={() => setSelectedUploadId(upload.id)}
                        className={`p-3 rounded-lg border cursor-pointer hover-elevate ${
                          selectedUploadId === upload.id ? 'border-primary' : ''
                        }`}
                        data-testid={`upload-item-${upload.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{upload.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {upload.totalTasks} tasks •{' '}
                              {format(new Date(upload.uploadedAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                          <Badge className={getStatusColor(upload.status)}>
                            {upload.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Selected Upload Details */}
          {selectedUpload && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedUpload.fileName}</CardTitle>
                    <CardDescription>
                      {selectedUpload.totalTasks} tasks • Uploaded{' '}
                      {format(new Date(selectedUpload.uploadedAt), 'MMMM d, yyyy')}
                    </CardDescription>
                  </div>
                  {selectedUpload.status === 'pending' && (
                    <Button
                      onClick={handleAllocate}
                      disabled={allocateMutation.isPending}
                      data-testid="button-run-allocation"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      {allocateMutation.isPending ? "Allocating..." : "Run Auto-Allocation"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Calendar className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Tasks</p>
                        <p className="text-2xl font-bold">{selectedUpload.totalTasks}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Building2 className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Buildings</p>
                        <p className="text-2xl font-bold">
                          {new Set(selectedUpload.tasks?.map((t: any) => t.building)).size || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <UserCheck className="w-8 h-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-lg font-semibold capitalize">{selectedUpload.status}</p>
                      </div>
                    </div>
                  </div>

                  {selectedUpload.tasks && selectedUpload.tasks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-3">Tasks Preview</h3>
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Building</TableHead>
                              <TableHead>Room/Unit</TableHead>
                              <TableHead>Property</TableHead>
                              <TableHead>Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedUpload.tasks.slice(0, 10).map((task: any) => (
                              <TableRow key={task.id}>
                                <TableCell>{task.cleaningDate}</TableCell>
                                <TableCell>
                                  <Badge className={getBuildingColor(task.building)}>
                                    {task.building}
                                  </Badge>
                                </TableCell>
                                <TableCell>{task.roomUnit}</TableCell>
                                <TableCell className="max-w-[200px] truncate">
                                  {task.propertyName}
                                </TableCell>
                                <TableCell>{task.estimatedDuration}min</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {selectedUpload.tasks.length > 10 && (
                          <div className="p-3 text-center text-sm text-muted-foreground border-t">
                            Showing 10 of {selectedUpload.tasks.length} tasks
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Allocations Tab */}
        <TabsContent value="allocations" className="space-y-4">
          {!selectedUploadId && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select an upload from the Upload & Process tab to view allocations
              </AlertDescription>
            </Alert>
          )}

          {selectedUploadId && !allocations && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No allocations found. Run auto-allocation first.
              </AlertDescription>
            </Alert>
          )}

          {selectedUploadId && allocations && allocations.length > 0 && (
            <div className="space-y-6">
              {Object.values(groupedAllocations || {}).map((group: any) => (
                <Card key={`${group.date}-${group.building}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          {format(new Date(group.date), 'MMMM d, yyyy')}
                        </CardTitle>
                        <CardDescription>
                          <Badge className={getBuildingColor(group.building)}>
                            {group.building}
                          </Badge>
                          <span className="ml-2">{group.allocations.length} allocations</span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cleaner</TableHead>
                            <TableHead>Room/Unit</TableHead>
                            <TableHead>Property</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.allocations.map((allocation: any) => (
                            <TableRow key={allocation.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">
                                    {allocation.cleaner?.name || 'Unknown'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{allocation.task?.roomUnit}</TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {allocation.task?.propertyName}
                              </TableCell>
                              <TableCell>{allocation.task?.estimatedDuration}min</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(allocation.status)}>
                                  {allocation.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {!allocation.confirmed && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => confirmMutation.mutate(allocation.id)}
                                    disabled={confirmMutation.isPending}
                                    data-testid={`button-confirm-${allocation.id}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Confirm
                                  </Button>
                                )}
                                {allocation.confirmed && (
                                  <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Confirmed
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Allocation History</CardTitle>
              <CardDescription>
                View past allocations and performance data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  History tracking will be available once allocations are completed and logged.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
