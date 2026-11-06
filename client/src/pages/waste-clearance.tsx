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
import { Trash2, Plus, AlertCircle, CheckCircle, Clock, XCircle, Sparkles } from "lucide-react";
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

interface WasteClearanceRequest {
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

export default function WasteClearance() {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const { data: requests = [], isLoading } = useQuery<WasteClearanceRequest[]>({
    queryKey: ['/api/waste-clearance', selectedStatus],
    queryFn: async () => {
      const url = selectedStatus === 'all' ? '/api/waste-clearance' : `/api/waste-clearance?status=${selectedStatus}`;
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
      return await apiRequest('/api/waste-clearance', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/waste-clearance'] });
      toast({
        title: "Request Created",
        description: "Waste clearance request submitted. Notifications sent to team.",
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
      return await apiRequest(`/api/waste-clearance/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/waste-clearance'] });
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
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-waste-clearance">
            <Trash2 className="h-8 w-8" />
            Waste Clearance Requests
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-waste-clearance-description">
            Book waste clearance services with AI-powered summaries
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Request Form */}
        <Card data-testid="card-waste-form">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              New Request
            </CardTitle>
            <CardDescription>Submit a waste clearance booking request</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="propertyAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="123 Main Street, City" {...field} data-testid="input-property-address" />
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
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} data-testid="input-client-name" />
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
                      <FormLabel>Contact Information *</FormLabel>
                      <FormControl>
                        <Input placeholder="phone@example.com or phone number" {...field} data-testid="input-client-contact" />
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
                      <FormLabel className="flex items-center gap-2">
                        Waste Description * <Sparkles className="h-3 w-3 text-purple-500" />
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the waste to be removed (AI will generate a summary)..." 
                          className="min-h-[100px]"
                          {...field} 
                          data-testid="textarea-waste-description"
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
                      <FormLabel>Availability Date/Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} data-testid="input-availability-date" />
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
                      <FormLabel>Lockbox Code</FormLabel>
                      <FormControl>
                        <Input placeholder="1234" {...field} data-testid="input-lockbox-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Contractor Information (Optional)</h4>
                  
                  <FormField
                    control={form.control}
                    name="contractorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contractor Name</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Waste Services" {...field} data-testid="input-contractor-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contractorPhone"
                    render={({ field}) => (
                      <FormItem>
                        <FormLabel>Contractor Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+44 7XXX XXXXXX" {...field} data-testid="input-contractor-phone" />
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
                          <Input type="email" placeholder="contractor@example.com" {...field} data-testid="input-contractor-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-request">
                  {createMutation.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Requests List */}
        <Card data-testid="card-requests-list">
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>
              <div className="flex gap-2 mt-2">
                {['all', 'pending', 'scheduled', 'completed'].map((status) => (
                  <Badge
                    key={status}
                    variant={selectedStatus === status ? 'default' : 'outline'}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedStatus(status)}
                    data-testid={`badge-filter-${status}`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                ))}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-muted-foreground">No requests found</p>
            ) : (
              requests.map((request) => (
                <Card key={request.id} className="hover-elevate" data-testid={`card-request-${request.id}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold">{request.propertyAddress}</h4>
                        <p className="text-sm text-muted-foreground">Client: {request.clientName}</p>
                      </div>
                      <Badge className={getStatusColor(request.status)} data-testid={`badge-status-${request.id}`}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {request.status}
                        </div>
                      </Badge>
                    </div>

                    {request.aiSummary && (
                      <div className="bg-purple-500/5 border border-purple-500/20 rounded-md p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <span className="text-xs font-medium text-purple-500">AI Summary</span>
                        </div>
                        <p className="text-sm">{request.aiSummary}</p>
                      </div>
                    )}

                    <p className="text-sm line-clamp-2">{request.serviceDescription}</p>

                    {request.availabilityDate && (
                      <p className="text-xs text-muted-foreground">
                        Available: {format(new Date(request.availabilityDate), 'PPp')}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'scheduled' })}
                            data-testid={`button-schedule-${request.id}`}
                          >
                            Mark Scheduled
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'cancelled' })}
                            data-testid={`button-cancel-${request.id}`}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {request.status === 'scheduled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'completed' })}
                          data-testid={`button-complete-${request.id}`}
                        >
                          Mark Completed
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
