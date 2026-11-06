import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { UserPlus, CheckCircle, Phone, Mail, Calendar, FileText, Link, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { phoneNumberSchema } from "@/lib/validation";
import logoUrl from "@assets/Northstay logo black-01 (8)_1761129570743.png";

const onboardingFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required (minimum 2 characters)"),
  phone: phoneNumberSchema,
  email: z.string().email("Please enter a valid email address"),
  niNumber: z.string().min(9, "NI number must be at least 9 characters").optional().or(z.literal("")),
  photoIdLink: z.string().url("Please enter a valid URL (e.g., https://...)").optional().or(z.literal("")),
  unavailableDays: z.array(z.string()).default([]),
});

type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export default function StaffOnboarding() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [match, params] = useRoute("/staff-onboarding/:token");
  const token = params?.token;

  // Generate next 7 days for unavailability selection
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i + 1); // Start from tomorrow (1 day forward)
    return {
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "EEEE, MMM d"),
    };
  });

  // Fetch staff member data using the token
  const { data: staffData, isLoading: isLoadingStaff, error: staffError } = useQuery({
    queryKey: ["/api/staff-onboarding", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      const response = await fetch(`/api/staff-onboarding/${token}`);
      if (!response.ok) {
        throw new Error("Invalid or expired onboarding link");
      }
      return response.json();
    },
    enabled: !!token,
  });

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      niNumber: "",
      photoIdLink: "",
      unavailableDays: [],
    },
  });

  // Pre-populate form when staff data is loaded
  useEffect(() => {
    if (staffData) {
      form.reset({
        fullName: staffData.fullName || "",
        phone: staffData.phone || "",
        email: staffData.email || "",
        niNumber: "",
        photoIdLink: "",
        unavailableDays: [],
      });
    }
  }, [staffData, form]);

  const submitMutation = useMutation({
    mutationFn: async (data: OnboardingFormValues) => {
      if (!token) throw new Error("No token provided");
      const res = await apiRequest(`/api/staff-onboarding/${token}/submit`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Onboarding Complete!",
        description: "Your information has been saved to the staff directory.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit onboarding form. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: OnboardingFormValues) => {
    submitMutation.mutate(data);
  };

  // Error state
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-xl font-bold">Invalid Link</h2>
              <p className="text-muted-foreground">
                This onboarding link is invalid. Please contact your manager for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (staffError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-xl font-bold">Link Expired or Invalid</h2>
              <p className="text-muted-foreground">
                This onboarding link has expired or is invalid. Please contact your manager for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-2xl space-y-6">
          <div className="flex justify-center mb-6">
            <img 
              src={logoUrl} 
              alt="Northstay" 
              className="h-32 w-auto"
              data-testid="img-logo"
            />
          </div>
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-green-500" data-testid="icon-success" />
              </div>
              <h2 className="text-2xl font-bold">Welcome to the Team!</h2>
              <p className="text-muted-foreground">
                Your onboarding information has been successfully submitted and saved to the staff directory.
              </p>
              <Alert data-testid="alert-success">
                <AlertDescription>
                  You'll receive further instructions from the management team soon.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoadingStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-3xl w-full">
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-3xl space-y-6">
        <div className="flex justify-center mb-6">
          <img 
            src={logoUrl} 
            alt="Northstay" 
            className="h-32 w-auto"
            data-testid="img-logo"
          />
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Staff Onboarding Form</CardTitle>
                <CardDescription>
                  Please fill in your details to join the Northstay team
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                  
                  {/* Full Name */}
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your full name"
                            data-testid="input-full-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Phone */}
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+44 7XXX XXXXXX"
                            data-testid="input-phone"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Include country code (e.g., +44 for UK)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your.email@example.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Documents Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Documents & Information</h3>
                  
                  {/* NI Number */}
                  <FormField
                    control={form.control}
                    name="niNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>National Insurance Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="QQ 12 34 56 C"
                            data-testid="input-ni-number"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Format: QQ 12 34 56 C (optional, but required for payroll)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Photo ID Link */}
                  <FormField
                    control={form.control}
                    name="photoIdLink"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Photo ID Link</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://drive.google.com/..."
                            data-testid="input-photo-id"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Upload your ID to Google Drive and share the link (passport, driver's license, etc.)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Unavailability Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Initial Unavailability</h3>
                  <p className="text-sm text-muted-foreground">
                    Select any days in the next 7 days when you are NOT available to work
                  </p>

                  <FormField
                    control={form.control}
                    name="unavailableDays"
                    render={() => (
                      <FormItem>
                        <div className="space-y-3">
                          {next7Days.map((day) => (
                            <FormField
                              key={day.value}
                              control={form.control}
                              name="unavailableDays"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={day.value}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(day.value)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, day.value])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== day.value
                                                )
                                              )
                                        }}
                                        data-testid={`checkbox-unavailable-${day.value}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="text-sm font-normal cursor-pointer">
                                      {day.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitMutation.isPending}
                    data-testid="button-submit-onboarding"
                  >
                    {submitMutation.isPending ? "Submitting..." : "Complete Onboarding"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
