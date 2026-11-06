import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Upload, Plus, Pencil, Trash2, Building2, Mail, Phone, MapPin, FileText, Loader2, Search, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertLandlordSchema, type landlords, astProperties } from "@shared/schema";
import { z } from "zod";

type Landlord = typeof landlords.$inferSelect;
type AstProperty = typeof astProperties.$inferSelect;
type LandlordFormData = z.infer<typeof insertLandlordSchema>;

export default function Clients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Landlord | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [duplicateEmailError, setDuplicateEmailError] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const { toast } = useToast();

  // Add client form
  const addForm = useForm<LandlordFormData>({
    resolver: zodResolver(insertLandlordSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      statementDay: 7,
    },
    mode: "onBlur", // Validate on blur for better UX
  });

  // Edit client form
  const editForm = useForm<LandlordFormData>({
    resolver: zodResolver(insertLandlordSchema),
    mode: "onBlur",
  });

  // Fetch clients (landlords)
  const { data: clients = [], isLoading } = useQuery<Landlord[]>({
    queryKey: ['/api/landlords'],
  });

  // Fetch properties for selected client
  const { data: clientProperties = [] } = useQuery<AstProperty[]>({
    queryKey: [`/api/landlords/${selectedClient?.id}/properties`, selectedClient?.id],
    enabled: !!selectedClient,
  });

  // Import Excel mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/landlords/import-excel', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Import failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/landlords'] });
      setIsImportDialogOpen(false);
      setImportFile(null);
      toast({
        title: "Import Successful",
        description: `Created ${data.landlordsCreated} clients, updated ${data.landlordsUpdated}, created ${data.propertiesCreated} properties. Skipped ${data.landlordsSkipped} invalid rows.`,
      });
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Failed to import clients from Excel file",
        variant: "destructive",
      });
    },
  });

  // Duplicate email checking function
  const checkDuplicateEmail = async (email: string): Promise<boolean> => {
    if (!email) return false;
    
    try {
      setIsCheckingDuplicate(true);
      const response = await fetch('/api/landlords/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (data.isDuplicate) {
        setDuplicateEmailError(data.message || "A client with this email already exists");
        return true;
      }
      
      setDuplicateEmailError(null);
      return false;
    } catch (error) {
      console.error("Error checking duplicate:", error);
      return false;
    } finally {
      setIsCheckingDuplicate(false);
    }
  };

  // Create client mutation
  const createMutation = useMutation({
    mutationFn: async (data: LandlordFormData) => {
      const res = await apiRequest('/api/landlords', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/landlords'] });
      setIsAddDialogOpen(false);
      addForm.reset();
      setDuplicateEmailError(null);
      toast({
        title: "Client Created",
        description: "Client has been added successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to create client";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Update client mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LandlordFormData }) => {
      const res = await apiRequest(`/api/landlords/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/landlords'] });
      setIsEditDialogOpen(false);
      setSelectedClient(null);
      editForm.reset();
      setDuplicateEmailError(null);
      toast({
        title: "Client Updated",
        description: "Client information has been updated successfully",
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to update client";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete client mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/landlords/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/landlords'] });
      toast({
        title: "Client Deleted",
        description: "Client has been removed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive",
      });
    },
  });

  // Send invitation email mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (landlordId: number) => {
      const res = await apiRequest(`/api/landlords/${landlordId}/send-invite`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "Portal invitation email sent successfully. The client can set their password using the link.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!importFile) {
      toast({
        title: "No File Selected",
        description: "Please select an Excel file to import",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(importFile);
  };

  const handleAddClient = async (data: LandlordFormData) => {
    // Final duplicate check before submission
    const isDuplicate = await checkDuplicateEmail(data.email);
    if (isDuplicate) {
      toast({
        title: "Duplicate Email",
        description: duplicateEmailError || "A client with this email already exists",
        variant: "destructive",
      });
      return;
    }
    
    createMutation.mutate(data);
  };

  const handleEditClient = async (data: LandlordFormData) => {
    if (!selectedClient) return;
    
    // Check duplicate only if email changed
    if (data.email !== selectedClient.email) {
      const isDuplicate = await checkDuplicateEmail(data.email);
      if (isDuplicate) {
        toast({
          title: "Duplicate Email",
          description: duplicateEmailError || "A client with this email already exists",
          variant: "destructive",
        });
        return;
      }
    }
    
    updateMutation.mutate({
      id: selectedClient.id,
      data,
    });
  };

  // Reset form and error state when dialogs close
  const handleAddDialogChange = (open: boolean) => {
    setIsAddDialogOpen(open);
    if (!open) {
      addForm.reset();
      setDuplicateEmailError(null);
    }
  };

  const handleEditDialogChange = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setSelectedClient(null);
      editForm.reset();
      setDuplicateEmailError(null);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-muted-foreground">Manage your landlord clients and their properties</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-import-clients">
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Clients from Excel</DialogTitle>
                <DialogDescription>
                  Upload an Excel file containing client information to automatically create client records and link properties
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="excel-file">Excel File</Label>
                  <Input
                    id="excel-file"
                    data-testid="input-excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    File should contain columns: client name, email, property address
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleImport}
                  data-testid="button-confirm-import"
                  disabled={!importFile || importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={handleAddDialogChange}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-client">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>Create a new client record with contact and property information</DialogDescription>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit(handleAddClient)} className="space-y-4">
                  {duplicateEmailError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{duplicateEmailError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={addForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-client-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="email" 
                              data-testid="input-client-email"
                              onBlur={(e) => {
                                field.onBlur();
                                checkDuplicateEmail(e.target.value);
                              }}
                            />
                          </FormControl>
                          {isCheckingDuplicate && (
                            <FormDescription className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Checking for duplicates...
                            </FormDescription>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-client-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="statementDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Statement Day (1-28)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" max="28" data-testid="input-statement-day" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-client-address" rows={2} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={addForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-client-notes" rows={3} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      data-testid="button-save-client" 
                      disabled={!addForm.formState.isValid || createMutation.isPending || !!duplicateEmailError}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Client"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Clients ({filteredClients.length})
              </CardTitle>
              <CardDescription>Search and manage your client database</CardDescription>
            </div>
            <div className="w-64">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  data-testid="input-search-clients"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No clients found</p>
              <p className="text-sm">Add a new client or import from Excel to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Properties</TableHead>
                    <TableHead>Statement Day</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} data-testid={`row-client-${client.id}`}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {client.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {client.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedClient(client)}
                          data-testid={`button-view-properties-${client.id}`}
                        >
                          <Building2 className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Day {client.statementDay}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-edit-client-${client.id}`}
                            onClick={() => {
                              setSelectedClient(client);
                              editForm.reset({
                                name: client.name,
                                email: client.email,
                                phone: client.phone || "",
                                address: client.address || "",
                                notes: client.notes || "",
                                statementDay: client.statementDay || 7,
                              });
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => sendInviteMutation.mutate(client.id)}
                            disabled={sendInviteMutation.isPending}
                            data-testid={`button-send-invite-${client.id}`}
                            title="Send Portal Invitation"
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-client-${client.id}`}
                            onClick={() => {
                              if (confirm(`Delete client "${client.name}"?`)) {
                                deleteMutation.mutate(client.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information and contact details</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleEditClient)} className="space-y-4">
                {duplicateEmailError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{duplicateEmailError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-client-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email" 
                            data-testid="input-edit-client-email"
                            onBlur={(e) => {
                              field.onBlur();
                              if (e.target.value !== selectedClient.email) {
                                checkDuplicateEmail(e.target.value);
                              }
                            }}
                          />
                        </FormControl>
                        {isCheckingDuplicate && (
                          <FormDescription className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Checking for duplicates...
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-client-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="statementDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statement Day (1-28)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="1" max="28" data-testid="input-edit-statement-day" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-edit-client-address" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-edit-client-notes" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <DialogFooter>
                  <Button 
                    type="submit" 
                    data-testid="button-update-client" 
                    disabled={!editForm.formState.isValid || updateMutation.isPending || !!duplicateEmailError}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Client"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* Properties Dialog */}
      <Dialog open={!!selectedClient && !isEditDialogOpen} onOpenChange={(open) => {
        if (!open) setSelectedClient(null);
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedClient?.name} - Properties</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Mail className="w-4 h-4" />
                {selectedClient?.email}
                {selectedClient?.phone && (
                  <>
                    <span className="mx-2">•</span>
                    <Phone className="w-4 h-4" />
                    {selectedClient.phone}
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {clientProperties.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No properties linked to this client</p>
              </div>
            ) : (
              clientProperties.map((property) => (
                <Card key={property.id} data-testid={`property-${property.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{property.name}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {property.address}
                        </p>
                        {property.propertyType && (
                          <Badge variant="outline" className="mt-2">{property.propertyType}</Badge>
                        )}
                        {property.notes && (
                          <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1">
                            <FileText className="w-3 h-3 mt-0.5" />
                            {property.notes}
                          </p>
                        )}
                      </div>
                      <Badge variant={property.active ? "default" : "secondary"}>
                        {property.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
