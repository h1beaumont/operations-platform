import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Package, Plus, Trash2, CheckCircle2, AlertCircle, Upload, Loader2, MessageSquare, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SpecialRequest } from "@shared/schema";
import { insertSpecialRequestSchema } from "@shared/schema";
import { z } from "zod";

const formSchema = insertSpecialRequestSchema.extend({
  propertyId: z.string().min(1, "Property selection is required"),
  requestType: z.string().default("linen"),
  description: z.string().default("Linen special request"),
  dateRequired: z.string().min(1, "Date required is required").transform(val => new Date(val)),
  dateFinished: z.string().transform(val => val === "" ? undefined : new Date(val)).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

type StaffMember = {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  role: string;
};

export default function LinenAdminPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCleaner, setSelectedCleaner] = useState<string>("all");
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyId: "",
      propertyName: "",
      requestType: "linen",
      description: "Linen special request",
      itemRequested: "",
      quantity: 1,
      dateRequired: new Date().toISOString().slice(0, 10),
      dateFinished: "",
      status: "active",
      notes: "",
    },
  });

  // Fetch all special requests
  const { data: specialRequests = [], isLoading } = useQuery<SpecialRequest[]>({
    queryKey: ['/api/special-requests'],
  });

  // Fetch active staff (cleaners)
  const { data: staff = [] } = useQuery<StaffMember[]>({
    queryKey: ['/api/staff'],
    select: (data: any) => data.filter((s: any) => s.status === 'active' && s.role === 'cleaner'),
  });

  // Fetch properties for dropdown
  const { data: properties = [] } = useQuery<Array<{ id: string; name: string; address: string }>>({
    queryKey: ["/api/properties"],
  });

  // Import CSV mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", '/api/linen-packing/import-csv');
    },
    onSuccess: (data: any) => {
      toast({
        title: "Import Successful",
        description: `Imported ${data.imported} items for ${data.properties} properties`,
      });
    },
    onError: () => {
      toast({
        title: "Import Failed",
        description: "Failed to import linen packing data",
        variant: "destructive",
      });
    },
  });

  // Create special request mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", '/api/special-requests', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-requests'] });
      toast({
        title: "Request Created",
        description: "Special request has been created successfully",
      });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  // Delete special request mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/special-requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-requests'] });
      toast({
        title: "Request Deleted",
        description: "Special request has been deleted",
      });
    },
  });

  // Send chatbot link via SMS
  const sendChatbotLinkMutation = useMutation({
    mutationFn: async (staffId: string) => {
      return await apiRequest("POST", '/api/linen-packing/send-chatbot-link', { staffId });
    },
    onSuccess: (data: any) => {
      toast({
        title: "SMS Sent",
        description: data.message || "Chatbot link sent successfully",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Send",
        description: "Could not send chatbot link via SMS",
        variant: "destructive",
      });
    },
  });

  const handleSendChatbotLink = () => {
    if (selectedCleaner === "all") {
      // Send to all cleaners
      staff.forEach((cleaner) => {
        if (cleaner.phone) {
          sendChatbotLinkMutation.mutate(cleaner.id);
        }
      });
      toast({
        title: "Sending to All",
        description: `Sending chatbot link to ${staff.filter(s => s.phone).length} cleaners`,
      });
    } else {
      // Send to selected cleaner
      sendChatbotLinkMutation.mutate(selectedCleaner);
    }
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const activeRequests = specialRequests.filter(r => r.status === 'active');
  const completedRequests = specialRequests.filter(r => r.status === 'completed');

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Linen Packing Management</h1>
          <p className="text-muted-foreground">
            Manage special requests and linen packing data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending}
            data-testid="button-import-csv"
          >
            {importMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Import Linen Data
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-request">
                <Plus className="w-4 h-4 mr-2" />
                Add Special Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Special Request</DialogTitle>
                <DialogDescription>
                  Add items that need to be packed in addition to the standard list
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property</FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={(propertyId) => {
                            const selectedProperty = properties.find(p => p.id === propertyId);
                            field.onChange(propertyId);
                            form.setValue("propertyName", selectedProperty?.name || "");
                          }}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-property">
                              <SelectValue placeholder="Select property" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {properties.map(property => (
                              <SelectItem key={property.id} value={property.id} data-testid={`option-property-${property.id}`}>
                                {property.name} - {property.address}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the property for this special request
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="itemRequested"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item Requested</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Wine Glass" {...field} data-testid="input-item-requested" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dateRequired"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Required (Check-in)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-date-required" />
                          </FormControl>
                          <FormDescription>
                            When should this item be packed by?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateFinished"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date Finished (Check-out)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-date-finished" />
                          </FormControl>
                          <FormDescription>
                            Optional: Guest check-out date
                          </FormDescription>
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
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional details or context..." 
                            {...field}
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending}
                      data-testid="button-submit-request"
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Create Request
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Chatbot Link Sender */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Send Chatbot Link
          </CardTitle>
          <CardDescription>
            Send the linen packing chatbot link via SMS to cleaners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Cleaner</label>
              <Select value={selectedCleaner} onValueChange={setSelectedCleaner}>
                <SelectTrigger data-testid="select-cleaner">
                  <SelectValue placeholder="Choose a cleaner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="option-all-cleaners">
                    All Cleaners ({staff.filter(s => s.phone).length} with phone numbers)
                  </SelectItem>
                  {staff.map((cleaner) => (
                    <SelectItem 
                      key={cleaner.id} 
                      value={cleaner.id}
                      disabled={!cleaner.phone}
                      data-testid={`option-cleaner-${cleaner.id}`}
                    >
                      {cleaner.name} {!cleaner.phone && '(No phone)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleSendChatbotLink}
              disabled={sendChatbotLinkMutation.isPending || (selectedCleaner !== 'all' && !staff.find(s => s.id === selectedCleaner)?.phone)}
              data-testid="button-send-sms"
            >
              {sendChatbotLinkMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send SMS
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            SMS will include a direct link to the Linen Packing Assistant chatbot
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              Active Requests ({activeRequests.length})
            </CardTitle>
            <CardDescription>
              Special items that need to be packed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeRequests.length > 0 ? (
              <div className="space-y-3">
                {activeRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg border bg-card hover-elevate"
                    data-testid={`active-request-${request.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{request.itemRequested}</h4>
                          <Badge variant="secondary">×{request.quantity}</Badge>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{request.propertyName}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(request.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${request.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    {request.notes && (
                      <p className="text-sm text-muted-foreground mb-2">{request.notes}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {request.dateRequired && <span>Required: {new Date(request.dateRequired).toLocaleDateString()}</span>}
                      {request.dateFinished && (
                        <span>Until: {new Date(request.dateFinished).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No active requests
              </p>
            )}
          </CardContent>
        </Card>

        {/* Completed Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Completed Requests ({completedRequests.length})
            </CardTitle>
            <CardDescription>
              Recently completed special requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : completedRequests.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {completedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 rounded-lg border bg-muted/50"
                    data-testid={`completed-request-${request.id}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{request.itemRequested}</h4>
                          <Badge variant="outline">×{request.quantity}</Badge>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">{request.propertyName}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(request.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-completed-${request.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    {request.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Completed: {new Date(request.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No completed requests
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
