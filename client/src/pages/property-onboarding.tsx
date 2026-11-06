import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, CheckCircle2, Save, Upload, Sparkles, FileText } from "lucide-react";
import { useLocation } from "wouter";
import type { PropertyOnboardingSession, PropertyOnboardingResponse } from "@shared/schema";

const TOTAL_STEPS = 8; // Updated to include Step 0 (Quick Import)

// Step 0: Quick Import schema
const step0Schema = z.object({
  listingDescription: z.string().optional(),
  airbnbLink: z.string().optional(),
  bookingComLink: z.string().optional(),
  directBookingLink: z.string().optional(),
  otherPlatformLinks: z.string().optional(),
});

// Form schemas for each step
const step1Schema = z.object({
  propertyName: z.string().min(1, "Property name is required"),
  address: z.string().min(1, "Address is required"),
  propertyType: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
});

const step2Schema = z.object({
  ownerName: z.string().min(1, "Owner name is required"),
  ownerEmail: z.string().email("Valid email is required"),
  ownerPhone: z.string().min(1, "Owner phone is required"),
  ownerAddress: z.string().optional(),
  preferredContactMethod: z.string().optional(),
});

const step3Schema = z.object({
  lockboxLocation: z.string().optional(),
  lockboxCode: z.string().optional(),
  keyLocationDetails: z.string().optional(),
  entryInstructions: z.string().optional(),
  gateAccessCodes: z.string().optional(),
});

const step4Schema = z.object({
  wifiName: z.string().optional(),
  wifiPassword: z.string().optional(),
  electricMeterLocation: z.string().optional(),
  gasMeterLocation: z.string().optional(),
  waterStopcockLocation: z.string().optional(),
  fuseboxLocation: z.string().optional(),
  binCollectionDay: z.string().optional(),
  binStorageLocation: z.string().optional(),
});

const step5Schema = z.object({
  uplistingLink: z.string().optional(),
  airbnbLink: z.string().optional(),
  otherPlatformLinks: z.string().optional(),
  managementPortalLinks: z.string().optional(),
});

const step6Schema = z.object({
  maintenancePreference: z.string().optional(),
  approvalLimitAmount: z.string().optional(),
  preferredContractors: z.string().optional(),
  emergencyContact: z.string().optional(),
  maintenanceNotes: z.string().optional(),
});

const step7Schema = z.object({
  cleaningInstructions: z.string().optional(),
  guestWelcomeInfo: z.string().optional(),
  houseRules: z.string().optional(),
  specialRequirements: z.string().optional(),
  notes: z.string().optional(),
});

interface PropertyExtractionResult {
  propertyName: string | null;
  address: string | null;
  propertyType: string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  lockboxLocation: string | null;
  lockboxCode: string | null;
  keyLocationDetails: string | null;
  entryInstructions: string | null;
  gateAccessCodes: string | null;
  wifiName: string | null;
  wifiPassword: string | null;
  fuseboxLocation: string | null;
  waterStopcockLocation: string | null;
  electricMeterLocation: string | null;
  gasMeterLocation: string | null;
  binCollectionDay: string | null;
  binStorageLocation: string | null;
  parkingDetails: string | null;
  cleaningInstructions: string | null;
  houseRules: string | null;
  specialRequirements: string | null;
  notes: string | null;
  amenities: string | null;
  extractionConfidence: 'high' | 'medium' | 'low';
  extractionSummary: string;
}

export default function PropertyOnboarding() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0); // Start at Step 0 (Quick Import)
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [extractedData, setExtractedData] = useState<PropertyExtractionResult | null>(null);
  const [showExtractionResults, setShowExtractionResults] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Forms for each step (0-7)
  const form0 = useForm({ resolver: zodResolver(step0Schema), defaultValues: {} });
  const form1 = useForm({ resolver: zodResolver(step1Schema), defaultValues: {} });
  const form2 = useForm({ resolver: zodResolver(step2Schema), defaultValues: {} });
  const form3 = useForm({ resolver: zodResolver(step3Schema), defaultValues: {} });
  const form4 = useForm({ resolver: zodResolver(step4Schema), defaultValues: {} });
  const form5 = useForm({ resolver: zodResolver(step5Schema), defaultValues: {} });
  const form6 = useForm({ resolver: zodResolver(step6Schema), defaultValues: {} });
  const form7 = useForm({ resolver: zodResolver(step7Schema), defaultValues: {} });

  const forms = [form0, form1, form2, form3, form4, form5, form6, form7];
  const currentForm = forms[currentStep];

  // Fetch session if exists
  const { data: session } = useQuery<PropertyOnboardingSession>({
    queryKey: ['/api/property-onboarding/session', sessionId],
    enabled: !!sessionId,
  });

  // Fetch responses for the session
  const { data: responses = [] } = useQuery<PropertyOnboardingResponse[]>({
    queryKey: ['/api/property-onboarding/responses', sessionId],
    enabled: !!sessionId,
  });

  // Load saved responses into forms
  useEffect(() => {
    if (responses.length > 0) {
      responses.forEach((response) => {
        // Skip step 0 (Quick Import) as it's not saved
        const form = forms[response.step];
        if (form) {
          form.setValue(response.questionKey as any, response.answer || "");
        }
      });
    }
  }, [responses]);

  // AI Extraction mutation
  const extractionMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/property-onboarding/extract', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Extraction failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data.extractedData);
      setShowExtractionResults(true);
      toast({
        title: "Extraction Complete!",
        description: "AI has successfully extracted property information",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract property data",
        variant: "destructive",
      });
    },
  });

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: { propertyName: string; address: string }) => {
      return await apiRequest('/api/property-onboarding/session', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: async (response) => {
      const data = await response.json();
      setSessionId(data.id);
      queryClient.invalidateQueries({ queryKey: ['/api/property-onboarding/sessions'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create onboarding session",
        variant: "destructive",
      });
    },
  });

  // Save response mutation
  const saveResponseMutation = useMutation({
    mutationFn: async (data: {
      sessionId: string;
      step: number;
      questionKey: string;
      questionText: string;
      answer: string;
      answerType: string;
    }) => {
      return await apiRequest('/api/property-onboarding/response', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/property-onboarding/responses', sessionId] });
    },
  });

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async (data: { currentStep: number }) => {
      return await apiRequest(`/api/property-onboarding/session/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  });

  // Complete session mutation
  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/property-onboarding/complete/${sessionId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/property-onboarding/sessions'] });
      toast({
        title: "Success!",
        description: "Property onboarding completed successfully",
      });
      setLocation('/properties');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete onboarding",
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: "File Selected",
        description: `${file.name} ready for extraction`,
      });
    }
  };

  // Handle AI extraction
  const handleExtractData = async () => {
    const values = form0.getValues();
    
    // Validate that at least listing description OR file is provided
    if (!values.listingDescription && !uploadedFile) {
      toast({
        title: "Missing Information",
        description: "Please provide either a listing description or upload a check-in details file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    
    if (values.listingDescription) {
      formData.append('listingDescription', values.listingDescription);
    }
    if (values.airbnbLink) {
      formData.append('airbnbLink', values.airbnbLink);
    }
    if (values.bookingComLink) {
      formData.append('bookingComLink', values.bookingComLink);
    }
    if (values.otherPlatformLinks) {
      formData.append('otherPlatformLinks', values.otherPlatformLinks);
    }
    if (uploadedFile) {
      formData.append('checkInDetailsFile', uploadedFile);
    }

    extractionMutation.mutate(formData);
  };

  // Auto-fill forms with extracted data
  const autoFillForms = (data: PropertyExtractionResult) => {
    // Step 1: Basic Information
    if (data.propertyName) form1.setValue('propertyName', data.propertyName);
    if (data.address) form1.setValue('address', data.address);
    if (data.propertyType) form1.setValue('propertyType', data.propertyType);
    if (data.bedrooms) form1.setValue('bedrooms', data.bedrooms);
    if (data.bathrooms) form1.setValue('bathrooms', data.bathrooms);

    // Step 2: Owner Details
    if (data.ownerName) form2.setValue('ownerName', data.ownerName);
    if (data.ownerEmail) form2.setValue('ownerEmail', data.ownerEmail);
    if (data.ownerPhone) form2.setValue('ownerPhone', data.ownerPhone);

    // Step 3: Property Access
    if (data.lockboxLocation) form3.setValue('lockboxLocation', data.lockboxLocation);
    if (data.lockboxCode) form3.setValue('lockboxCode', data.lockboxCode);
    if (data.keyLocationDetails) form3.setValue('keyLocationDetails', data.keyLocationDetails);
    if (data.entryInstructions) form3.setValue('entryInstructions', data.entryInstructions);
    if (data.gateAccessCodes) form3.setValue('gateAccessCodes', data.gateAccessCodes);

    // Step 4: Utilities & Services
    if (data.wifiName) form4.setValue('wifiName', data.wifiName);
    if (data.wifiPassword) form4.setValue('wifiPassword', data.wifiPassword);
    if (data.fuseboxLocation) form4.setValue('fuseboxLocation', data.fuseboxLocation);
    if (data.waterStopcockLocation) form4.setValue('waterStopcockLocation', data.waterStopcockLocation);
    if (data.electricMeterLocation) form4.setValue('electricMeterLocation', data.electricMeterLocation);
    if (data.gasMeterLocation) form4.setValue('gasMeterLocation', data.gasMeterLocation);
    if (data.binCollectionDay) form4.setValue('binCollectionDay', data.binCollectionDay);
    if (data.binStorageLocation) form4.setValue('binStorageLocation', data.binStorageLocation);

    // Step 5: Property Links - Use links from Quick Import form
    const quickImportValues = form0.getValues();
    if (quickImportValues.airbnbLink) form5.setValue('airbnbLink', quickImportValues.airbnbLink);
    if (quickImportValues.bookingComLink) {
      const existingOtherLinks = form5.getValues('otherPlatformLinks') || '';
      const newLink = `Booking.com: ${quickImportValues.bookingComLink}`;
      form5.setValue('otherPlatformLinks', existingOtherLinks ? `${existingOtherLinks}\n${newLink}` : newLink);
    }
    if (quickImportValues.otherPlatformLinks) {
      const existingOtherLinks = form5.getValues('otherPlatformLinks') || '';
      form5.setValue('otherPlatformLinks', existingOtherLinks ? `${existingOtherLinks}\n${quickImportValues.otherPlatformLinks}` : quickImportValues.otherPlatformLinks);
    }

    // Step 7: Additional Information - Append all relevant extracted data
    const notesArray: string[] = [];
    if (data.parkingDetails) notesArray.push(`Parking: ${data.parkingDetails}`);
    if (data.amenities) notesArray.push(`Amenities: ${data.amenities}`);
    if (data.notes) notesArray.push(data.notes);
    
    if (data.cleaningInstructions) form7.setValue('cleaningInstructions', data.cleaningInstructions);
    if (data.houseRules) form7.setValue('houseRules', data.houseRules);
    if (data.specialRequirements) form7.setValue('specialRequirements', data.specialRequirements);
    if (notesArray.length > 0) {
      const existingNotes = form7.getValues('notes') || '';
      const combinedNotes = existingNotes ? `${existingNotes}\n\n${notesArray.join('\n')}` : notesArray.join('\n');
      form7.setValue('notes', combinedNotes);
    }
  };

  // Handle confirm extraction and continue
  const handleConfirmExtraction = () => {
    if (extractedData) {
      autoFillForms(extractedData);
      setShowExtractionResults(false);
      setCurrentStep(1); // Move to Step 1
      toast({
        title: "Forms Pre-filled",
        description: "All forms have been auto-filled with extracted data. Please review and complete.",
      });
    }
  };

  // Handle edit manually
  const handleEditManually = () => {
    if (extractedData) {
      autoFillForms(extractedData);
    }
    setShowExtractionResults(false);
    setCurrentStep(1); // Move to Step 1
  };

  // Handle skip Quick Import
  const handleSkipQuickImport = () => {
    setCurrentStep(1);
  };

  // Save current step data
  const saveStepData = async () => {
    if (!sessionId || currentStep === 0) return; // Skip Step 0 (Quick Import)

    const formData = currentForm.getValues();
    const stepQuestions = getStepQuestions(currentStep);

    for (const [key, value] of Object.entries(formData)) {
      if (value) {
        const question = stepQuestions.find(q => q.key === key);
        if (question) {
          await saveResponseMutation.mutateAsync({
            sessionId,
            step: currentStep,
            questionKey: key,
            questionText: question.label,
            answer: String(value),
            answerType: question.type || 'text',
          });
        }
      }
    }

    await updateSessionMutation.mutateAsync({ currentStep });
  };

  // Handle next step
  const handleNext = async () => {
    // Skip validation for Step 0 (Quick Import)
    if (currentStep > 0) {
      const isValid = await currentForm.trigger();
      if (!isValid) return;

      // Create session on Step 1 if not exists
      if (currentStep === 1 && !sessionId) {
        const values = form1.getValues();
        await createSessionMutation.mutateAsync({
          propertyName: values.propertyName,
          address: values.address,
        });
      }

      await saveStepData();
    }

    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleting(true);
    }
  };

  // Handle previous step
  const handlePrevious = async () => {
    if (currentStep > 0) {
      if (currentStep > 0) {
        await saveStepData();
      }
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle complete
  const handleComplete = async () => {
    await saveStepData();
    await completeSessionMutation.mutateAsync();
  };

  // Get step title
  const getStepTitle = (step: number) => {
    const titles = [
      "Quick Import",
      "Basic Information",
      "Owner Details",
      "Property Access",
      "Utilities & Services",
      "Property Links & References",
      "Maintenance Preferences",
      "Additional Information",
    ];
    return titles[step] || "";
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Property Onboarding Wizard</CardTitle>
          <CardDescription>
            <span data-testid="text-current-step">
              {currentStep === 0 ? "Quick Import" : `Step ${currentStep} of ${TOTAL_STEPS - 1}`}
            </span>
          </CardDescription>
          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2 mt-4">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(currentStep / (TOTAL_STEPS - 1)) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          {showExtractionResults && extractedData ? (
            <ExtractionResults
              data={extractedData}
              onConfirm={handleConfirmExtraction}
              onEditManually={handleEditManually}
            />
          ) : !isCompleting ? (
            <>
              {currentStep === 0 && (
                <Step0Form
                  form={form0}
                  onExtract={handleExtractData}
                  onSkip={handleSkipQuickImport}
                  uploadedFile={uploadedFile}
                  onFileUpload={handleFileUpload}
                  fileInputRef={fileInputRef}
                  isExtracting={extractionMutation.isPending}
                />
              )}
              {currentStep === 1 && <Step1Form form={form1} />}
              {currentStep === 2 && <Step2Form form={form2} />}
              {currentStep === 3 && <Step3Form form={form3} />}
              {currentStep === 4 && <Step4Form form={form4} />}
              {currentStep === 5 && <Step5Form form={form5} />}
              {currentStep === 6 && <Step6Form form={form6} />}
              {currentStep === 7 && <Step7Form form={form7} />}

              {currentStep > 0 && (
                <div className="flex justify-between mt-8">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                    data-testid="button-previous-step"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={createSessionMutation.isPending || saveResponseMutation.isPending}
                    data-testid="button-next-step"
                  >
                    {currentStep === TOTAL_STEPS - 1 ? "Review & Complete" : "Next"}
                    {currentStep < TOTAL_STEPS - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <CompletionSummary
              responses={responses}
              onComplete={handleComplete}
              onBack={() => setIsCompleting(false)}
              isLoading={completeSessionMutation.isPending}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Step 0: Quick Import Form
function Step0Form({ 
  form, 
  onExtract, 
  onSkip, 
  uploadedFile, 
  onFileUpload, 
  fileInputRef,
  isExtracting 
}: { 
  form: any; 
  onExtract: () => void; 
  onSkip: () => void; 
  uploadedFile: File | null; 
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  fileInputRef: React.RefObject<HTMLInputElement>;
  isExtracting: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">AI-Powered Quick Import</h3>
        <p className="text-muted-foreground">
          Paste your listing description or upload check-in details, and let AI extract the property information automatically
        </p>
      </div>

      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="listingDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Listing Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Paste your Airbnb or Booking.com listing description here..."
                    rows={8}
                    data-testid="textarea-listing-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">Booking Platform Links (Optional)</h4>
            <FormField
              control={form.control}
              name="airbnbLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Airbnb Link</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://airbnb.com/..." data-testid="input-airbnb-link" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bookingComLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking.com Link</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://booking.com/..." data-testid="input-booking-com-link" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="directBookingLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direct Booking Link</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." data-testid="input-direct-booking-link" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="otherPlatformLinks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Other Platform Links</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="VRBO, Expedia, etc..." rows={2} data-testid="input-other-platform-links" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Upload Check-in Details (Optional)</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upload a PDF, text file, or image containing property check-in instructions
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={onFileUpload}
              accept=".pdf,.txt,.doc,.docx,image/*"
              className="hidden"
            />
            
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-check-in-details"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadedFile ? 'Change File' : 'Upload File'}
            </Button>
            
            {uploadedFile && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">{uploadedFile.name}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onExtract}
              disabled={isExtracting}
              className="flex-1"
              data-testid="button-extract-data"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isExtracting ? "Extracting..." : "Extract Data with AI"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onSkip}
              disabled={isExtracting}
              data-testid="button-skip-quick-import"
            >
              Skip Quick Import
            </Button>
          </div>
        </div>
      </Form>
    </div>
  );
}

// Extraction Results Display
function ExtractionResults({ 
  data, 
  onConfirm, 
  onEditManually 
}: { 
  data: PropertyExtractionResult; 
  onConfirm: () => void; 
  onEditManually: () => void; 
}) {
  const confidenceBadgeVariant = {
    high: "default",
    medium: "secondary",
    low: "destructive",
  }[data.extractionConfidence] as "default" | "secondary" | "destructive";

  const extractedFields = Object.entries(data)
    .filter(([key, value]) => 
      value !== null && 
      value !== '' && 
      key !== 'extractionConfidence' && 
      key !== 'extractionSummary'
    )
    .map(([key, value]) => ({
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      value: String(value),
    }));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Extraction Complete!</h3>
        
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-sm text-muted-foreground">Confidence:</span>
          <Badge variant={confidenceBadgeVariant} data-testid="badge-extraction-confidence">
            {data.extractionConfidence.toUpperCase()}
          </Badge>
        </div>
        
        <p className="text-muted-foreground mt-3" data-testid="text-extraction-summary">
          {data.extractionSummary}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Extracted Information</CardTitle>
          <CardDescription>
            {extractedFields.length} fields extracted from your listing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {extractedFields.map((field) => (
              <div key={field.key} className="flex justify-between gap-4 py-2 border-b last:border-0">
                <span className="text-sm font-medium text-muted-foreground min-w-[180px]">
                  {field.label}:
                </span>
                <span className="text-sm flex-1 text-right">
                  {field.value.length > 100 ? `${field.value.substring(0, 100)}...` : field.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          onClick={onConfirm}
          className="flex-1"
          data-testid="button-confirm-extraction"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Confirm & Continue
        </Button>
        <Button
          variant="outline"
          onClick={onEditManually}
          className="flex-1"
          data-testid="button-edit-manually"
        >
          Edit Manually
        </Button>
      </div>
    </div>
  );
}

// Step 1: Basic Information
function Step1Form({ form }: { form: any }) {
  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="propertyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Manor House Apartment 1" data-testid="input-property-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Address *</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Full property address" data-testid="textarea-property-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="propertyType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-property-type">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="House">House</SelectItem>
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="Studio">Studio</SelectItem>
                  <SelectItem value="Condo">Condo</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="bedrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrooms</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="0" data-testid="input-bedrooms" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bathrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bathrooms</FormLabel>
                <FormControl>
                  <Input {...field} type="number" placeholder="0" data-testid="input-bathrooms" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );
}

// Step 2: Owner Details
function Step2Form({ form }: { form: any }) {
  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="ownerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Full Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="John Smith" data-testid="input-owner-name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ownerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Email *</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="owner@example.com" data-testid="input-owner-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ownerPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Phone *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="+44 7123 456789" data-testid="input-owner-phone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ownerAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Address</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Owner's contact address" data-testid="textarea-owner-address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preferredContactMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Contact Method</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-contact-method">
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Phone">Phone</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}

// Step 3: Property Access
function Step3Form({ form }: { form: any }) {
  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="lockboxLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lockbox Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., On the front gate" data-testid="input-lockbox-location" />
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
                <Input {...field} placeholder="e.g., 1234" data-testid="input-lockbox-code" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="keyLocationDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key Location Details</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Where keys are stored and how to access them" data-testid="textarea-key-location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="entryInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry Instructions</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Step-by-step instructions for entering the property" data-testid="textarea-entry-instructions" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gateAccessCodes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gate/Building Access Codes</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Any access codes needed for gates or building entry" data-testid="textarea-gate-codes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}

// Step 4: Utilities & Services
function Step4Form({ form }: { form: any }) {
  return (
    <Form {...form}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="wifiName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WiFi Network Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Network SSID" data-testid="input-wifi-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="wifiPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WiFi Password</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Password" data-testid="input-wifi-password" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="electricMeterLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Electric Meter Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Under the stairs" data-testid="input-electric-meter" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="gasMeterLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gas Meter Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Outside by the front door" data-testid="input-gas-meter" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="waterStopcockLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Water Stopcock Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Kitchen cupboard under sink" data-testid="input-water-stopcock" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fuseboxLocation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fusebox Location</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Hallway cupboard" data-testid="input-fusebox" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="binCollectionDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bin Collection Day</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-bin-day">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Monday">Monday</SelectItem>
                    <SelectItem value="Tuesday">Tuesday</SelectItem>
                    <SelectItem value="Wednesday">Wednesday</SelectItem>
                    <SelectItem value="Thursday">Thursday</SelectItem>
                    <SelectItem value="Friday">Friday</SelectItem>
                    <SelectItem value="Saturday">Saturday</SelectItem>
                    <SelectItem value="Sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="binStorageLocation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bin Storage Location</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Side of house" data-testid="input-bin-storage" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  );
}

// Step 5: Property Links & References
function Step5Form({ form }: { form: any }) {
  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="uplistingLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Uplisting Property Link</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://..." data-testid="input-uplisting-link" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="airbnbLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Airbnb Listing Link</FormLabel>
              <FormControl>
                <Input {...field} placeholder="https://airbnb.com/..." data-testid="input-airbnb-listing-link" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="otherPlatformLinks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Other Booking Platform Links</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Booking.com, VRBO, Expedia, etc..." data-testid="textarea-other-platforms" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="managementPortalLinks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Property Management Portal Links</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Links to property management systems" data-testid="textarea-portal-links" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}

// Step 6: Maintenance Preferences
function Step6Form({ form }: { form: any }) {
  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="maintenancePreference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Maintenance Preference</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-maintenance-preference">
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Handle all maintenance">Handle all maintenance</SelectItem>
                  <SelectItem value="Approve before work">Approve before work</SelectItem>
                  <SelectItem value="Emergency only">Emergency only</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="approvalLimitAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Approval Limit Amount (£)</FormLabel>
              <FormControl>
                <Input {...field} type="number" placeholder="200" data-testid="input-approval-limit" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="preferredContractors"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preferred Contractors</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="List any preferred contractors or service providers" data-testid="textarea-contractors" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emergencyContact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Name and phone number" data-testid="input-emergency-contact" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="maintenanceNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Maintenance Notes</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Any special maintenance requirements or notes" data-testid="textarea-maintenance-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}

// Step 7: Additional Information
function Step7Form({ form }: { form: any }) {
  return (
    <Form {...form}>
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="cleaningInstructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cleaning Instructions</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Special cleaning requirements or instructions" data-testid="textarea-cleaning" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="guestWelcomeInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Guest Welcome Information</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Information for guest welcome guide" data-testid="textarea-welcome" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="houseRules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>House Rules</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="House rules for guests" data-testid="textarea-house-rules" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="specialRequirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Special Requirements</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Any special requirements or considerations" data-testid="textarea-special-requirements" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Any other important information" data-testid="textarea-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </Form>
  );
}

// Completion Summary Component
function CompletionSummary({
  responses,
  onComplete,
  onBack,
  isLoading,
}: {
  responses: PropertyOnboardingResponse[];
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
}) {
  const responsesByStep = responses.reduce((acc, response) => {
    if (!acc[response.step]) {
      acc[response.step] = [];
    }
    acc[response.step].push(response);
    return acc;
  }, {} as Record<number, PropertyOnboardingResponse[]>);

  const stepTitles = [
    "Quick Import", // Step 0 - not shown in completion
    "Basic Information",
    "Owner Details",
    "Property Access",
    "Utilities & Services",
    "Property Links & References",
    "Maintenance Preferences",
    "Additional Information",
  ];

  return (
    <div className="space-y-6" data-testid="dialog-summary">
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Review Your Submission</h2>
        <p className="text-muted-foreground mt-2">
          Please review all the information before completing the onboarding
        </p>
      </div>

      <div className="space-y-4">
        {Object.entries(responsesByStep).map(([step, stepResponses]) => (
          <Card key={step}>
            <CardHeader>
              <CardTitle className="text-lg">
                Step {step}: {stepTitles[parseInt(step)]}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stepResponses.map((response) => (
                <div key={response.id} className="flex justify-between">
                  <span className="text-sm font-medium">{response.questionText}:</span>
                  <span className="text-sm text-muted-foreground">{response.answer || "Not provided"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading} data-testid="button-edit-summary">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Edit
        </Button>
        <Button onClick={onComplete} disabled={isLoading} data-testid="button-submit-onboarding">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {isLoading ? "Completing..." : "Complete Onboarding"}
        </Button>
      </div>
    </div>
  );
}

// Helper function to get step questions
function getStepQuestions(step: number) {
  const questions = [
    // Step 0: Quick Import - not saved
    [],
    [
      { key: "propertyName", label: "Property Name", type: "text" },
      { key: "address", label: "Full Address", type: "textarea" },
      { key: "propertyType", label: "Property Type", type: "text" },
      { key: "bedrooms", label: "Number of Bedrooms", type: "number" },
      { key: "bathrooms", label: "Number of Bathrooms", type: "number" },
    ],
    [
      { key: "ownerName", label: "Owner Full Name", type: "text" },
      { key: "ownerEmail", label: "Owner Email", type: "text" },
      { key: "ownerPhone", label: "Owner Phone", type: "text" },
      { key: "ownerAddress", label: "Owner Address", type: "textarea" },
      { key: "preferredContactMethod", label: "Preferred Contact Method", type: "text" },
    ],
    [
      { key: "lockboxLocation", label: "Lockbox Location", type: "text" },
      { key: "lockboxCode", label: "Lockbox Code", type: "text" },
      { key: "keyLocationDetails", label: "Key Location Details", type: "textarea" },
      { key: "entryInstructions", label: "Entry Instructions", type: "textarea" },
      { key: "gateAccessCodes", label: "Gate/Building Access Codes", type: "textarea" },
    ],
    [
      { key: "wifiName", label: "WiFi Network Name", type: "text" },
      { key: "wifiPassword", label: "WiFi Password", type: "text" },
      { key: "electricMeterLocation", label: "Electric Meter Location", type: "text" },
      { key: "gasMeterLocation", label: "Gas Meter Location", type: "text" },
      { key: "waterStopcockLocation", label: "Water Stopcock Location", type: "text" },
      { key: "fuseboxLocation", label: "Fusebox Location", type: "text" },
      { key: "binCollectionDay", label: "Bin Collection Day", type: "text" },
      { key: "binStorageLocation", label: "Bin Storage Location", type: "text" },
    ],
    [
      { key: "uplistingLink", label: "Uplisting Property Link", type: "url" },
      { key: "airbnbLink", label: "Airbnb Listing Link", type: "url" },
      { key: "otherPlatformLinks", label: "Other Booking Platform Links", type: "textarea" },
      { key: "managementPortalLinks", label: "Property Management Portal Links", type: "textarea" },
    ],
    [
      { key: "maintenancePreference", label: "Owner Maintenance Preference", type: "text" },
      { key: "approvalLimitAmount", label: "Approval Limit Amount (£)", type: "number" },
      { key: "preferredContractors", label: "Preferred Contractors", type: "textarea" },
      { key: "emergencyContact", label: "Emergency Contact", type: "text" },
      { key: "maintenanceNotes", label: "Special Maintenance Notes", type: "textarea" },
    ],
    [
      { key: "cleaningInstructions", label: "Cleaning Instructions", type: "textarea" },
      { key: "guestWelcomeInfo", label: "Guest Welcome Information", type: "textarea" },
      { key: "houseRules", label: "House Rules", type: "textarea" },
      { key: "specialRequirements", label: "Special Requirements", type: "textarea" },
      { key: "notes", label: "Additional Notes", type: "textarea" },
    ],
  ];

  return questions[step] || [];
}
