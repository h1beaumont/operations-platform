import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Building2, Key, Mail, MessageSquare, Eye, X, AlertCircle, FileText, Wrench, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { InstructionPanel } from "@/components/instruction-panel";
import { landlordsInstructions } from "@/lib/page-instructions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";

const landlordFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankSortCode: z.string().optional(),
  address: z.string().optional(),
  statementDay: z.coerce.number().min(1).max(28).default(7),
  notes: z.string().optional(),
});

type LandlordFormValues = z.infer<typeof landlordFormSchema>;

interface Landlord {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankSortCode: string | null;
  address: string | null;
  statementDay: number | null;
  notes: string | null;
  createdAt: string;
}

interface Property {
  id: string;
  address: string;
  landlordId: number | null;
}

interface AstProperty {
  id: string;
  name: string;
  address: string;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  active: boolean;
}

interface MaintenanceRequest {
  id: string;
  propertyId: string | null;
  title: string;
  description: string;
  priority: string;
  status: string;
  reportedDate: string;
  completedAt: string | null;
}

interface MonthlyStatement {
  id: number;
  month: number;
  year: number;
  fileName: string;
  status: string;
  sentDate: string | null;
}

interface ManagementContract {
  id: string;
  propertyName: string;
  contractName: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

interface PortalPreviewData {
  landlord: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    address: string | null;
    statementDay: number | null;
  };
  properties: AstProperty[];
  maintenance: MaintenanceRequest[];
  statements: MonthlyStatement[];
  contracts: ManagementContract[];
}

export default function Landlords() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLandlord, setEditingLandlord] = useState<Landlord | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [landlordToDelete, setLandlordToDelete] = useState<Landlord | null>(null);
  const [viewPropertiesDialog, setViewPropertiesDialog] = useState(false);
  const [selectedLandlord, setSelectedLandlord] = useState<Landlord | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [landlordForPassword, setLandlordForPassword] = useState<Landlord | null>(null);
  const [password, setPassword] = useState("");
  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [smsLandlordId, setSmsLandlordId] = useState<number | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewLandlordId, setPreviewLandlordId] = useState<number | null>(null);

  // Fetch landlords
  const { data: landlords = [], isLoading } = useQuery<Landlord[]>({
    queryKey: ["/api/landlords"],
  });

  // Fetch all AST properties
  const { data: allProperties = [] } = useQuery<Property[]>({
    queryKey: ["/api/ast/properties"],
  });

  // Fetch properties for selected landlord
  const { data: landlordProperties = [] } = useQuery<Property[]>({
    queryKey: ["/api/landlords", selectedLandlord?.id, "properties"],
    enabled: !!selectedLandlord,
  });

  // Fetch portal preview data for selected landlord
  const { data: previewData, isLoading: previewLoading } = useQuery<PortalPreviewData>({
    queryKey: ["/api/landlords", previewLandlordId, "portal-preview"],
    enabled: !!previewLandlordId && previewDialogOpen,
  });

  const form = useForm<LandlordFormValues>({
    resolver: zodResolver(landlordFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      bankAccountName: "",
      bankAccountNumber: "",
      bankSortCode: "",
      address: "",
      statementDay: 7,
      notes: "",
    },
  });

  // Create landlord mutation
  const createLandlordMutation = useMutation({
    mutationFn: async (data: LandlordFormValues) => {
      return apiRequest("POST", "/api/landlords", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landlords"] });
      toast({
        title: "Success",
        description: "Landlord created successfully",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create landlord",
        variant: "destructive",
      });
    },
  });

  // Update landlord mutation
  const updateLandlordMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LandlordFormValues }) => {
      return apiRequest("PATCH", `/api/landlords/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landlords"] });
      toast({
        title: "Success",
        description: "Landlord updated successfully",
      });
      setDialogOpen(false);
      setEditingLandlord(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update landlord",
        variant: "destructive",
      });
    },
  });

  // Delete landlord mutation
  const deleteLandlordMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/landlords/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/landlords"] });
      toast({
        title: "Success",
        description: "Landlord deleted successfully",
      });
      setDeleteDialogOpen(false);
      setLandlordToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete landlord",
        variant: "destructive",
      });
    },
  });

  // Send SMS to landlord mutation
  const sendLandlordSmsMutation = useMutation({
    mutationFn: async ({ landlordId, message }: { landlordId: number; message: string }) => {
      return apiRequest("POST", `/api/landlords/${landlordId}/send-sms`, { message });
    },
    onSuccess: () => {
      toast({
        title: "SMS Sent",
        description: "Message sent successfully via Twilio",
      });
      setSmsDialogOpen(false);
      setSmsMessage("");
      setSmsLandlordId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send SMS",
        variant: "destructive",
      });
    },
  });

  // Set password mutation
  const setPasswordMutation = useMutation({
    mutationFn: async ({ landlordId, password }: { landlordId: number; password: string }) => {
      return apiRequest('POST', `/api/landlord-auth/set-password`, { landlordId, password });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password set successfully. Landlord can now access the portal.",
      });
      setPasswordDialogOpen(false);
      setPassword("");
      setLandlordForPassword(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set password",
        variant: "destructive",
      });
    },
  });

  // Send invitation email mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (landlordId: number) => {
      return apiRequest('POST', `/api/landlords/${landlordId}/send-invite`, {});
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "Portal invitation email sent successfully. The landlord can set their password using the link.",
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

  const handleOpenDialog = (landlord?: Landlord) => {
    if (landlord) {
      setEditingLandlord(landlord);
      form.reset({
        name: landlord.name,
        email: landlord.email,
        phone: landlord.phone || "",
        bankAccountName: landlord.bankAccountName || "",
        bankAccountNumber: landlord.bankAccountNumber || "",
        bankSortCode: landlord.bankSortCode || "",
        address: landlord.address || "",
        statementDay: landlord.statementDay || 7,
        notes: landlord.notes || "",
      });
    } else {
      setEditingLandlord(null);
      form.reset();
    }
    setDialogOpen(true);
  };

  const handleSubmit = (data: LandlordFormValues) => {
    if (editingLandlord) {
      updateLandlordMutation.mutate({ id: editingLandlord.id, data });
    } else {
      createLandlordMutation.mutate(data);
    }
  };

  const handleDelete = (landlord: Landlord) => {
    setLandlordToDelete(landlord);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (landlordToDelete) {
      deleteLandlordMutation.mutate(landlordToDelete.id);
    }
  };

  const handleViewProperties = (landlord: Landlord) => {
    setSelectedLandlord(landlord);
    setViewPropertiesDialog(true);
  };

  const getPropertiesCount = (landlordId: number) => {
    return allProperties.filter(p => p.landlordId === landlordId).length;
  };

  const handleSetPassword = (landlord: Landlord) => {
    setLandlordForPassword(landlord);
    setPassword("");
    setPasswordDialogOpen(true);
  };

  const handlePasswordSubmit = () => {
    if (!landlordForPassword) return;
    if (password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }
    setPasswordMutation.mutate({ landlordId: landlordForPassword.id, password });
  };

  // Helper functions for preview dialog
  function getPriorityBadge(priority: string) {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      critical: "destructive",
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    return <Badge variant={variants[priority] || "default"}>{priority}</Badge>;
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      pending: "secondary",
      assigned: "default",
      in_progress: "default",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.replace('_', ' ')}</Badge>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-2xl font-bold">Landlord Management</CardTitle>
            <CardDescription>Manage landlord profiles and property assignments</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <InstructionPanel {...landlordsInstructions} />
            <Button
              onClick={() => handleOpenDialog()}
              data-testid="button-add-landlord"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Landlord
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading landlords...</div>
          ) : landlords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No landlords found. Click "Add Landlord" to create one.
            </div>
          ) : (
            <Table data-testid="table-landlords">
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
                {landlords.map((landlord) => (
                  <TableRow key={landlord.id} data-testid={`row-landlord-${landlord.id}`}>
                    <TableCell className="font-medium" data-testid={`text-landlord-name-${landlord.id}`}>
                      {landlord.name}
                    </TableCell>
                    <TableCell data-testid={`text-landlord-email-${landlord.id}`}>
                      {landlord.email}
                    </TableCell>
                    <TableCell data-testid={`text-landlord-phone-${landlord.id}`}>
                      {landlord.phone || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewProperties(landlord)}
                        data-testid={`button-view-properties-${landlord.id}`}
                      >
                        <Building2 className="w-4 h-4 mr-1" />
                        {getPropertiesCount(landlord.id)}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" data-testid={`badge-statement-day-${landlord.id}`}>
                        {landlord.statementDay || 7}th
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setPreviewLandlordId(landlord.id);
                                setPreviewDialogOpen(true);
                              }}
                              data-testid={`button-preview-portal-${landlord.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Preview Portal</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSmsLandlordId(landlord.id);
                                setSmsDialogOpen(true);
                              }}
                              disabled={!landlord.phone}
                              data-testid={`button-sms-landlord-${landlord.id}`}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Send SMS</TooltipContent>
                        </Tooltip>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(landlord)}
                          data-testid={`button-edit-landlord-${landlord.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => sendInviteMutation.mutate(landlord.id)}
                          disabled={sendInviteMutation.isPending}
                          data-testid={`button-send-invite-${landlord.id}`}
                          title="Send Portal Invitation"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetPassword(landlord)}
                          data-testid={`button-set-password-${landlord.id}`}
                          title="Set Portal Password"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(landlord)}
                          data-testid={`button-delete-landlord-${landlord.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add/Edit Landlord Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-landlord-form">
          <DialogHeader>
            <DialogTitle>
              {editingLandlord ? "Edit Landlord" : "Add New Landlord"}
            </DialogTitle>
            <DialogDescription>
              {editingLandlord
                ? "Update landlord information"
                : "Enter the details for the new landlord"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-landlord-name" />
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
                        <Input type="email" {...field} data-testid="input-landlord-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-landlord-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="statementDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Statement Day (1-28)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="28" {...field} data-testid="input-statement-day" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} data-testid="input-landlord-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="bankAccountName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Account Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-bank-account-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bankAccountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-bank-account-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bankSortCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="XX-XX-XX" data-testid="input-bank-sort-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="input-landlord-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-landlord"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createLandlordMutation.isPending || updateLandlordMutation.isPending}
                  data-testid="button-save-landlord"
                >
                  {editingLandlord ? "Update" : "Create"} Landlord
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {landlordToDelete?.name} and cannot be undone.
              Properties assigned to this landlord will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Properties Dialog */}
      <Dialog open={viewPropertiesDialog} onOpenChange={setViewPropertiesDialog}>
        <DialogContent data-testid="dialog-view-properties">
          <DialogHeader>
            <DialogTitle>Properties for {selectedLandlord?.name}</DialogTitle>
            <DialogDescription>
              Viewing all properties assigned to this landlord
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {landlordProperties.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No properties assigned to this landlord
              </p>
            ) : (
              landlordProperties.map((property) => (
                <Card key={property.id} className="p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span data-testid={`text-property-${property.id}`}>{property.address}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Set Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent data-testid="dialog-set-password">
          <DialogHeader>
            <DialogTitle>Set Landlord Portal Password</DialogTitle>
            <DialogDescription>
              Set a password for {landlordForPassword?.name} to access the landlord portal.
              Password must be at least 8 characters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="password" className="text-sm font-medium">
                New Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 8 characters)"
                data-testid="input-password"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              data-testid="button-cancel-password"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={setPasswordMutation.isPending}
              data-testid="button-confirm-password"
            >
              {setPasswordMutation.isPending ? "Setting..." : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent data-testid="dialog-sms-landlord">
          <DialogHeader>
            <DialogTitle>Send SMS to Landlord</DialogTitle>
            <DialogDescription>
              Message will be sent via Twilio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Landlord</label>
              <p className="text-sm text-muted-foreground">
                {smsLandlordId && landlords.find(l => l.id === smsLandlordId)?.name}
              </p>
            </div>
            <div>
              <label htmlFor="sms-message-landlord" className="text-sm font-medium">
                Message
              </label>
              <Textarea
                id="sms-message-landlord"
                placeholder="Type your message here..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                className="mt-1.5"
                rows={4}
                data-testid="textarea-sms-message-landlord"
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
              data-testid="button-cancel-sms-landlord"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (smsLandlordId && smsMessage.trim()) {
                  sendLandlordSmsMutation.mutate({ landlordId: smsLandlordId, message: smsMessage });
                }
              }}
              disabled={!smsMessage.trim() || sendLandlordSmsMutation.isPending}
              data-testid="button-send-sms-landlord"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              {sendLandlordSmsMutation.isPending ? "Sending..." : "Send SMS"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Portal Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-portal-preview">
          {previewLoading ? (
            <div className="space-y-4 p-8">
              <Skeleton className="h-12 w-64" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : previewData ? (
            <>
              <DialogHeader className="border-b pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-6 w-6 text-primary" />
                    <div>
                      <div className="flex items-center gap-2">
                        <DialogTitle className="text-2xl">
                          Previewing: {previewData.landlord.name}
                        </DialogTitle>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                          PREVIEW MODE
                        </Badge>
                      </div>
                      <DialogDescription className="mt-1">
                        This is a preview of what {previewData.landlord.name} sees in their portal
                      </DialogDescription>
                      <p className="text-sm text-muted-foreground mt-1">{previewData.landlord.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewDialogOpen(false)}
                    data-testid="button-close-preview"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="py-4">
                <Tabs defaultValue="properties" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="properties" data-testid="tab-preview-properties">
                      <Building2 className="h-4 w-4 mr-2" />
                      Properties
                    </TabsTrigger>
                    <TabsTrigger value="maintenance" data-testid="tab-preview-maintenance">
                      <Wrench className="h-4 w-4 mr-2" />
                      Maintenance
                    </TabsTrigger>
                    <TabsTrigger value="statements" data-testid="tab-preview-statements">
                      <FileText className="h-4 w-4 mr-2" />
                      Statements
                    </TabsTrigger>
                    <TabsTrigger value="contracts" data-testid="tab-preview-contracts">
                      <File className="h-4 w-4 mr-2" />
                      Contracts
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="properties" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Properties</CardTitle>
                        <CardDescription>
                          View all rental properties
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {previewData.properties.length === 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              No properties found. Contact support to add properties to this account.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-4">
                            {previewData.properties.map((property) => (
                              <Card key={property.id} data-testid={`card-preview-property-${property.id}`}>
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <CardTitle className="text-lg">{property.name}</CardTitle>
                                      <CardDescription>{property.address}</CardDescription>
                                    </div>
                                    <Badge variant={property.active ? "default" : "secondary"}>
                                      {property.active ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                {(property.bedrooms || property.bathrooms || property.propertyType) && (
                                  <CardContent>
                                    <div className="flex gap-4 text-sm text-muted-foreground">
                                      {property.propertyType && <span>{property.propertyType}</span>}
                                      {property.bedrooms && <span>{property.bedrooms} bed</span>}
                                      {property.bathrooms && <span>{property.bathrooms} bath</span>}
                                    </div>
                                  </CardContent>
                                )}
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="maintenance" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Maintenance Requests</CardTitle>
                        <CardDescription>
                          View and track maintenance requests
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {previewData.maintenance.length === 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              No maintenance requests found.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-4">
                            {previewData.maintenance.map((request) => (
                              <Card key={request.id} data-testid={`card-preview-maintenance-${request.id}`}>
                                <CardHeader>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                      <CardTitle className="text-lg">{request.title}</CardTitle>
                                      <CardDescription className="mt-1">
                                        {request.description}
                                      </CardDescription>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      {getPriorityBadge(request.priority)}
                                      {getStatusBadge(request.status)}
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-sm text-muted-foreground space-y-1">
                                    <div>Reported: {format(new Date(request.reportedDate), "PPP")}</div>
                                    {request.completedAt && (
                                      <div>Completed: {format(new Date(request.completedAt), "PPP")}</div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="statements" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Financial Statements</CardTitle>
                        <CardDescription>
                          View monthly financial statements
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {previewData.statements.length === 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              No financial statements available yet.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-4">
                            {previewData.statements.map((statement) => (
                              <Card key={statement.id} data-testid={`card-preview-statement-${statement.id}`}>
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <CardTitle className="text-lg">
                                        {new Date(statement.year, statement.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                      </CardTitle>
                                      <CardDescription>{statement.fileName}</CardDescription>
                                    </div>
                                    <Badge variant={statement.status === "sent" ? "default" : "secondary"}>
                                      {statement.status}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                {statement.sentDate && (
                                  <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                      Sent: {format(new Date(statement.sentDate), "PPP")}
                                    </p>
                                  </CardContent>
                                )}
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="contracts" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Management Contracts</CardTitle>
                        <CardDescription>
                          View property management contracts
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {previewData.contracts.length === 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              No management contracts found.
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="space-y-4">
                            {previewData.contracts.map((contract) => (
                              <Card key={contract.id} data-testid={`card-preview-contract-${contract.id}`}>
                                <CardHeader>
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <CardTitle className="text-lg">{contract.contractName}</CardTitle>
                                      <CardDescription>{contract.propertyName}</CardDescription>
                                    </div>
                                    <Badge variant={contract.status === "active" ? "default" : "secondary"}>
                                      {contract.status}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                {(contract.startDate || contract.endDate) && (
                                  <CardContent>
                                    <div className="text-sm text-muted-foreground space-y-1">
                                      {contract.startDate && (
                                        <div>Start: {format(new Date(contract.startDate), "PPP")}</div>
                                      )}
                                      {contract.endDate && (
                                        <div>End: {format(new Date(contract.endDate), "PPP")}</div>
                                      )}
                                    </div>
                                  </CardContent>
                                )}
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
