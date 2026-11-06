import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const complaintFormSchema = z.object({
  guestName: z.string().min(1, "Guest name is required"),
  guestEmail: z.string().email("Valid email is required"),
  guestPhone: z.string()
    .transform(val => {
      if (!val) return '';
      const cleaned = val.replace(/[\s\-().]/g, '');
      return cleaned.startsWith("'") ? cleaned.substring(1) : cleaned;
    })
    .pipe(
      z.string()
        .refine(
          val => !val || /^\+?\d{10,15}$/.test(val),
          "Phone must be 10-15 digits with optional + prefix"
        )
        .optional()
        .or(z.literal(""))
    ),
  cleaningIssues: z.string().optional(),
  maintenanceIssues: z.string().optional(),
  customerServiceIssues: z.string().optional(),
  linenIssues: z.string().optional(),
  compensationOffered: z.string().optional(),
  fullDescription: z.string().min(10, "Please provide at least 10 characters"),
});

type ComplaintFormData = z.infer<typeof complaintFormSchema>;

export default function ComplaintForm() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  // Fetch form configuration
  const { data: formConfig, isLoading, error } = useQuery<{
    propertyName: string;
    guestName?: string;
  }>({
    queryKey: ["/api/public/complaints", token],
    enabled: !!token,
  });

  const form = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintFormSchema),
    defaultValues: {
      guestName: formConfig?.guestName || "",
      guestEmail: "",
      cleaningIssues: "",
      maintenanceIssues: "",
      customerServiceIssues: "",
      linenIssues: "",
      compensationOffered: "",
      fullDescription: "",
    },
  });

  // Update form when config loads
  if (formConfig?.guestName && !form.getValues().guestName) {
    form.setValue("guestName", formConfig.guestName);
  }

  const submitComplaintMutation = useMutation({
    mutationFn: async (data: ComplaintFormData) => {
      return apiRequest("POST", `/api/public/complaints/${token}`, data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Complaint Submitted",
        description: "Thank you for your feedback. We will review this promptly.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit complaint. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ComplaintFormData) => {
    submitComplaintMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-complaint-form">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="error-complaint-form">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Link Invalid or Expired</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This complaint submission link is no longer valid. It may have expired or already been used.
              Please contact the property directly if you need to submit feedback.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="success-complaint-form">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <CardTitle>Thank You for Your Feedback</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Your complaint has been submitted successfully. We take all feedback seriously and will review your concerns promptly.
            </p>
            <p className="text-sm text-muted-foreground">
              A member of our team will be in touch soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" data-testid="complaint-form-page">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Share Your Feedback</CardTitle>
            <CardDescription>
              {formConfig?.propertyName && `Regarding your stay at ${formConfig.propertyName}`}
            </CardDescription>
            <p className="text-sm text-muted-foreground mt-2">
              We value your feedback and take all concerns seriously. Please provide as much detail as possible to help us address your concerns.
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="guestName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter your name"
                          data-testid="input-guest-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guestEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Email *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="your.email@example.com"
                          data-testid="input-guest-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guestPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          placeholder="+44 7xxx xxxxxx"
                          data-testid="input-guest-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <h3 className="font-medium text-sm">Specific Issues (Optional)</h3>
                  <p className="text-sm text-muted-foreground">
                    Please provide details about any specific issues you experienced:
                  </p>

                  <FormField
                    control={form.control}
                    name="cleaningIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-cleaning-issues">Cleaning Issues</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe any cleanliness concerns..."
                            rows={3}
                            data-testid="textarea-cleaning-issues"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-cleaning-issues" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maintenanceIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-maintenance-issues">Maintenance Issues</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe any maintenance concerns (broken items, plumbing, heating, etc.)..."
                            rows={3}
                            data-testid="textarea-maintenance-issues"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-maintenance-issues" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customerServiceIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-customer-service-issues">Customer Service Issues</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe any customer service concerns..."
                            rows={3}
                            data-testid="textarea-customer-service-issues"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-customer-service-issues" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linenIssues"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="label-linen-issues">Linen Quality Issues</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Describe any concerns with bedding, towels, etc..."
                            rows={3}
                            data-testid="textarea-linen-issues"
                          />
                        </FormControl>
                        <FormMessage data-testid="error-linen-issues" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="compensationOffered"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compensation Already Offered</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="If any compensation was already offered, please describe it here..."
                            data-testid="input-compensation-offered"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="fullDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Description *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Please provide a complete description of your concerns..."
                          rows={6}
                          data-testid="textarea-full-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitComplaintMutation.isPending}
                  data-testid="button-submit-complaint"
                >
                  {submitComplaintMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Submit Feedback
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
