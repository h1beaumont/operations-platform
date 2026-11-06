import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CheckCircle2, Upload, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { phoneNumberSchema } from "@/lib/validation";

// NI Number format: XX-XX-XX-XX-X
const niNumberRegex = /^[A-Z]{2}-\d{2}-\d{2}-\d{2}-[A-Z]$/i;

const onboardingSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: phoneNumberSchema,
  niNumber: z.string().regex(niNumberRegex, "NI Number must be in format: XX-XX-XX-XX-X"),
  photoIdFile: z.any(),
  unavailableDays: z.array(z.string()).default([]),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const { token } = useParams();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: onboardingData, isLoading, error } = useQuery({
    queryKey: ["/api/onboarding", token],
    enabled: !!token,
  });

  // Generate next 7 days for availability selection
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(new Date(), i + 1); // Start from tomorrow
    return {
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "EEEE, MMM d"),
    };
  });

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      niNumber: "",
      unavailableDays: [],
    },
  });

  useEffect(() => {
    if (onboardingData?.candidate) {
      const { candidate } = onboardingData;
      form.setValue("fullName", `${candidate.firstName} ${candidate.lastName}`);
      form.setValue("email", candidate.email);
      form.setValue("phone", candidate.phone || "");
    }
  }, [onboardingData, form]);

  const submitOnboardingMutation = useMutation({
    mutationFn: async (data: { formData: OnboardingFormData; photoIdUploadId: string | null }) => {
      return apiRequest("POST", `/api/onboarding/${token}`, {
        fullName: data.formData.fullName,
        email: data.formData.email,
        phone: data.formData.phone,
        niNumber: data.formData.niNumber,
        photoIdUploadId: data.photoIdUploadId,
        unavailableDays: data.formData.unavailableDays,
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit onboarding form",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a JPEG, PNG, or PDF file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    form.setValue("photoIdFile", file);
  };

  const uploadPhotoId = async (file: File, candidateId: string): Promise<string | null> => {
    try {
      setUploadProgress(10);

      const { uploadURL, photoIdUploadId } = await apiRequest("POST", "/api/onboarding/photo-upload", {
        candidateId,
        fileName: file.name,
        mimeType: file.type,
      });

      setUploadProgress(30);

      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload photo ID");
      }

      setUploadProgress(100);
      return photoIdUploadId;
    } catch (error) {
      console.error("Photo upload error:", error);
      throw error;
    }
  };

  const onSubmit = async (data: OnboardingFormData) => {
    try {
      let photoIdUploadId: string | null = null;

      if (selectedFile && onboardingData?.candidate?.id) {
        toast({
          title: "Uploading Photo ID",
          description: "Please wait while we upload your photo ID...",
        });
        photoIdUploadId = await uploadPhotoId(selectedFile, onboardingData.candidate.id);
      }

      await submitOnboardingMutation.mutateAsync({ formData: data, photoIdUploadId });
    } catch (error) {
      console.error("Submission error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading onboarding form...</span>
        </div>
      </div>
    );
  }

  if (error || !onboardingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-destructive opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Invalid Onboarding Link</h3>
            <p className="text-sm text-muted-foreground">
              This onboarding link is invalid or has expired. Please contact Northstay if you need assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-semibold mb-2">Onboarding Complete!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Thank you for completing your onboarding form. You'll receive your trial shift schedule soon via email and SMS.
            </p>
            <Alert className="mt-4">
              <AlertDescription className="text-left text-sm">
                <strong>What happens next:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>You'll be assigned 2 trial shifts</li>
                  <li>You'll receive shift details via email/SMS</li>
                  <li>You'll work with an experienced mentor</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welcome to Northstay!</CardTitle>
            <CardDescription>
              Please complete your onboarding information below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-full-name" />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="niNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>National Insurance Number</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="XX-XX-XX-XX-X"
                          data-testid="input-ni-number"
                          onChange={(e) => {
                            let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
                            if (value.length > 2) value = value.slice(0, 2) + "-" + value.slice(2);
                            if (value.length > 5) value = value.slice(0, 5) + "-" + value.slice(5);
                            if (value.length > 8) value = value.slice(0, 8) + "-" + value.slice(8);
                            if (value.length > 11) value = value.slice(0, 11) + "-" + value.slice(11);
                            if (value.length > 13) value = value.slice(0, 13);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photoIdFile"
                  render={() => (
                    <FormItem>
                      <FormLabel>Photo ID (Passport, Driver's License, etc.)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Label
                            htmlFor="photo-upload"
                            className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover-elevate transition-colors"
                            data-testid="label-photo-upload"
                          >
                            <div className="text-center">
                              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                {selectedFile ? selectedFile.name : "Click to upload photo ID"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                JPEG, PNG, or PDF (max 10MB)
                              </p>
                            </div>
                          </Label>
                          <Input
                            id="photo-upload"
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,application/pdf"
                            className="hidden"
                            onChange={handleFileChange}
                            data-testid="input-photo-id"
                          />
                          {uploadProgress > 0 && uploadProgress < 100 && (
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unavailableDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Next 7 Days Availability</FormLabel>
                      <p className="text-sm text-muted-foreground mb-3">
                        Select any days you are <strong>NOT available</strong> to work (leave unchecked if available all days)
                      </p>
                      <div className="space-y-3">
                        {next7Days.map((day) => (
                          <div key={day.value} className="flex items-center gap-3">
                            <Checkbox
                              checked={field.value?.includes(day.value)}
                              onCheckedChange={(checked) => {
                                const currentDays = field.value || [];
                                if (checked) {
                                  field.onChange([...currentDays, day.value]);
                                } else {
                                  field.onChange(currentDays.filter((d) => d !== day.value));
                                }
                              }}
                              data-testid={`checkbox-unavailable-${day.value}`}
                            />
                            <Label className="cursor-pointer font-normal">{day.label}</Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={submitOnboardingMutation.isPending}
                  data-testid="button-submit-onboarding"
                >
                  {submitOnboardingMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Onboarding Form"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
