import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Flame, Plus, AlertCircle, CheckCircle, Clock, XCircle, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formSchema = z.object({
  propertyAddress: z.string().min(1, "Property address is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientContact: z.string().min(1, "Contact information is required"),
  serviceDescription: z.string().min(10, "Please provide a detailed description"),
  availabilityDate: z.string().optional(),
  lockboxCode: z.string().optional(),
  contractorName: z.string().optional(),
  contractorPhone: z.string().optional(),
  contractorEmail: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface OvenCleaningRequest {
  id: string;
  propertyAddress: string;
  clientName: string;
  clientContact: string;
  serviceDescription: string;
  aiSummary: string | null;
  status: string;
  availabilityDate: string | null;
  lockboxCode: string | null;
  contractorName: string | null;
  contractorPhone: string | null;
  contractorEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function OvenCleaning() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const { data: requests = [], isLoading } = useQuery<OvenCleaningRequest[]>({
    queryKey: ['/api/specialized-services/oven-cleaning', selectedStatus],
    queryFn: async () => {
      const url = selectedStatus === 'all' ? '/api/specialized-services/oven-cleaning' : `/api/specialized-services/oven-cleaning?status=${selectedStatus}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch requests');
      return response.json();
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      propertyAddress: "",
      clientName: "",
      clientContact: "",
      serviceDescription: "",
      availabilityDate: "",
      lockboxCode: "",
      contractorName: "",
      contractorPhone: "",
      contractorEmail: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      return await apiRequest('/api/specialized-services/oven-cleaning', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/specialized-services/oven-cleaning'] });
      toast({
        title: "Request Created",
        description: "Oven cleaning request submitted. Notifications sent to team.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await apiRequest(`/api/specialized-services/oven-cleaning/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/specialized-services/oven-cleaning'] });
      toast({
        title: "Status Updated",
        description: "Request status has been updated successfully.",
      });
    },
  });

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'scheduled':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-oven-cleaning">
            <Flame className="h-8 w-8" />
            Oven Cleaning Requests
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-oven-cleaning-description">
            Book oven cleaning services with AI-powered summaries
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Form */}
        <Card data-testid="card-oven-form">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Request
            </CardTitle>
            <CardDescription>
              Submit a new oven cleaning request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="propertyAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Address</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123 Main Street, City" 
                          {...field} 
                          data-testid="input-property-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Doe" 
                          {...field} 
                          data-testid="input-client-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Information</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Phone or email" 
                          {...field} 
                          data-testid="input-client-contact"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Oven Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the oven cleaning needs: oven type (gas/electric), size, condition, level of soiling, last cleaned, etc." 
                          className="min-h-[100px]"
                          {...field} 
                          data-testid="textarea-service-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="availabilityDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Date (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-availability-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lockboxCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lockbox Code (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="1234" 
                          {...field} 
                          data-testid="input-lockbox-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">Contractor Information (Optional)</h3>
                  <FormField
                    control={form.control}
                    name="contractorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contractor Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ABC Cleaning Services" 
                            {...field} 
                            data-testid="input-contractor-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contractorPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contractor Phone</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="+44 1234 567890" 
                            {...field} 
                            data-testid="input-contractor-phone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contractorEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contractor Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="contractor@example.com" 
                            {...field} 
                            data-testid="input-contractor-email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={createMutation.isPending}
                  data-testid="button-submit-request"
                >
                  {createMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Requests List */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'scheduled', 'completed', 'cancelled'].map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? "default" : "outline"}
                    onClick={() => setSelectedStatus(status)}
                    size="sm"
                    data-testid={`button-filter-${status}`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">Loading requests...</p>
              </CardContent>
            </Card>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">No requests found</p>
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id} data-testid={`card-request-${request.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{request.propertyAddress}</CardTitle>
                      <CardDescription>
                        {request.clientName} • {request.clientContact}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(request.status)} data-testid={`badge-status-${request.status}`}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(request.status)}
                        {request.status}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Oven Details:</h4>
                    <p className="text-sm text-muted-foreground">{request.serviceDescription}</p>
                  </div>

                  {request.aiSummary && (
                    <div className="bg-primary/5 border border-primary/10 rounded-md p-3">
                      <h4 className="font-semibold text-sm mb-1 flex items-center gap-1">
                        <Sparkles className="h-4 w-4" />
                        AI Summary:
                      </h4>
                      <p className="text-sm">{request.aiSummary}</p>
                    </div>
                  )}

                  {request.availabilityDate && (
                    <div>
                      <h4 className="font-semibold text-sm">Preferred Date:</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.availabilityDate), 'PPP')}
                      </p>
                    </div>
                  )}

                  {request.lockboxCode && (
                    <div>
                      <h4 className="font-semibold text-sm">Lockbox Code:</h4>
                      <p className="text-sm text-muted-foreground">{request.lockboxCode}</p>
                    </div>
                  )}

                  {request.contractorName && (
                    <div>
                      <h4 className="font-semibold text-sm">Contractor:</h4>
                      <p className="text-sm text-muted-foreground">
                        {request.contractorName}
                        {request.contractorPhone && ` • ${request.contractorPhone}`}
                        {request.contractorEmail && ` • ${request.contractorEmail}`}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {request.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'scheduled' })}
                        data-testid="button-mark-scheduled"
                      >
                        Mark as Scheduled
                      </Button>
                    )}
                    {request.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'completed' })}
                        data-testid="button-mark-completed"
                      >
                        Mark as Completed
                      </Button>
                    )}
                    {(request.status === 'pending' || request.status === 'scheduled') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'cancelled' })}
                        data-testid="button-mark-cancelled"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Created: {format(new Date(request.createdAt), 'PPP p')}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
