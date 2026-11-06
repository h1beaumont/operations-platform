import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Calendar as CalendarIcon, 
  CheckCircle, 
  Clock, 
  CheckSquare, 
  Package, 
  FileText, 
  Target,
  HelpCircle,
  Building2 
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff, Property } from "@shared/schema";
import { cn } from "@/lib/utils";

const complianceCategories = [
  {
    id: "timing",
    label: "Timing & Punctuality",
    icon: Clock,
    questions: [
      { id: "q1", text: "Arrived on time", points: 1.5, tooltip: "Arrived at the scheduled start time" },
      { id: "q2", text: "Signed into property on time", points: 1.0, tooltip: "Signed in within 5 minutes of arrival" },
      { id: "q11", text: "Finished cleans on time; if they overran, they told us", points: 2.0, tooltip: "Completed within scheduled time or notified manager" },
    ]
  },
  {
    id: "tasks",
    label: "Task Completion",
    icon: CheckSquare,
    questions: [
      { id: "q3", text: "Taken all photos and completed all tasks on Properly", points: 2.0, tooltip: "All required photos uploaded and tasks marked complete" },
      { id: "q4", text: "Ensured all damage is reported on time", points: 2.0, tooltip: "Reported any damage within 1 hour of discovery" },
    ]
  },
  {
    id: "equipment",
    label: "Equipment & Supplies",
    icon: Package,
    questions: [
      { id: "q5", text: "Used correct staff entrance at Head Office (not front reception doors)", points: 0.5, tooltip: "Enter through staff door, not guest entrance" },
      { id: "q6", text: "Signed in a trolley at start and signed out a trolley at end of shift", points: 1.0, tooltip: "Trolley check-in/out recorded in log book" },
      { id: "q7", text: "Signed in cleaning caddy with all items; signed cleaning caddy back in and returned all items", points: 1.0, tooltip: "Caddy inventory verified before and after shift" },
    ]
  },
  {
    id: "procedures",
    label: "Procedures & Protocols",
    icon: FileText,
    questions: [
      { id: "q8", text: "Used the chatbot every time linen was packed", points: 1.5, tooltip: "Chatbot notification sent for each linen pack" },
      { id: "q9", text: "Did not miss any special requests in the chatbot", points: 1.5, tooltip: "All special requests completed and documented" },
      { id: "q10", text: "Placed used linen in the linen hampers (not left in pillowcases/on the floor)", points: 1.0, tooltip: "Used linen properly disposed in designated hampers" },
    ]
  },
];

const complianceFormSchema = z.object({
  property: z.string().min(1, "Property is required"),
  staffId: z.string().min(1, "Staff member is required"),
  date: z.date({ required_error: "Date is required" }),
  q1: z.enum(["yes", "no"], { required_error: "This question is required" }),
  q2: z.enum(["yes", "no"], { required_error: "This question is required" }),
  q3: z.enum(["yes", "no"], { required_error: "This question is required" }),
  q4: z.enum(["yes", "no"], { required_error: "This question is required" }),
  q5: z.enum(["yes", "no"], { required_error: "This question is required" }),
  q6: z.enum(["yes", "no"], { required_error: "This question is required" }),
  q7: z.enum(["yes", "no"], { required_error: "This question is required" }),
  q8: z.enum(["yes", "no"], { required_error: "This question is required" }),
  q9: z.enum(["yes", "no"], { required_error: "This question is required" }),
  q10: z.enum(["yes", "no"], { required_error: "This question is required" }),
  q11: z.enum(["yes", "no"], { required_error: "This question is required" }),
  auditor: z.string().optional(),
  notes: z.string().optional(),
});

type ComplianceFormValues = z.infer<typeof complianceFormSchema>;

const DRAFT_KEY = 'compliance-draft';

export default function SubmitCompliance() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showScore, setShowScore] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<number>(0);
  const [showRestoreDraft, setShowRestoreDraft] = useState(false);
  const [savedDraft, setSavedDraft] = useState<ComplianceFormValues | null>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

  const { data: staff = [], isLoading: loadingStaff } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: properties = [], isLoading: loadingProperties } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const activeStaff = staff.filter(s => s.status === "active");
  const activeProperties = properties.filter(p => p.active);

  const form = useForm<ComplianceFormValues>({
    resolver: zodResolver(complianceFormSchema),
    defaultValues: {
      property: "1 Example Street",
      staffId: "",
      date: new Date(),
      auditor: "Admin",
      notes: "",
      q1: undefined,
      q2: undefined,
      q3: undefined,
      q4: undefined,
      q5: undefined,
      q6: undefined,
      q7: undefined,
      q8: undefined,
      q9: undefined,
      q10: undefined,
      q11: undefined,
    },
  });

  // Watch staffId and date to trigger automation data query
  const formStaffId = form.watch("staffId");
  const formDate = form.watch("date");

  // Format date for API query
  const formattedDate = formDate ? 
    `${formDate.getFullYear()}-${String(formDate.getMonth() + 1).padStart(2, '0')}-${String(formDate.getDate()).padStart(2, '0')}` 
    : null;

  // Watch property for special requests check
  const formProperty = form.watch("property");

  // Fetch compliance automation data when staffId and date are selected
  const { data: automationData } = useQuery<{
    trolleySignedInOut: { compliant: boolean; points: number; evidence: string[] };
    caddySignedInOut: { compliant: boolean; points: number; evidence: string[] };
    usedChatbot: { compliant: boolean; points: number; evidence: string[] };
    missedSpecialRequests: { compliant: boolean; points: number; evidence: string[] };
  }>({
    queryKey: ['/api/compliance/automation-data', formStaffId, formattedDate, formProperty],
    enabled: !!formStaffId && !!formattedDate,
    queryFn: async () => {
      const url = formProperty 
        ? `/api/compliance/automation-data?staffId=${formStaffId}&date=${formattedDate}&property=${encodeURIComponent(formProperty)}`
        : `/api/compliance/automation-data?staffId=${formStaffId}&date=${formattedDate}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch automation data');
      return res.json();
    },
  });

  // Auto-populate form fields when automation data loads
  useEffect(() => {
    if (automationData) {
      const fieldsToUpdate = new Set<string>();

      // Only auto-fill if field is currently undefined (not already answered)
      if (form.getValues("q6") === undefined) {
        form.setValue("q6", automationData.trolleySignedInOut.compliant ? "yes" : "no");
        fieldsToUpdate.add("q6");
      }

      if (form.getValues("q7") === undefined) {
        form.setValue("q7", automationData.caddySignedInOut.compliant ? "yes" : "no");
        fieldsToUpdate.add("q7");
      }

      if (form.getValues("q8") === undefined) {
        form.setValue("q8", automationData.usedChatbot.compliant ? "yes" : "no");
        fieldsToUpdate.add("q8");
      }

      if (form.getValues("q9") === undefined) {
        form.setValue("q9", automationData.missedSpecialRequests.compliant ? "yes" : "no");
        fieldsToUpdate.add("q9");
      }

      if (fieldsToUpdate.size > 0) {
        setAutoFilledFields(fieldsToUpdate);
        toast({
          title: "Auto-filled Questions",
          description: `${fieldsToUpdate.size} question(s) auto-filled based on tracked data`,
        });
      }
    }
  }, [automationData, form, toast]);

  // Check for saved draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        // Convert date string back to Date object
        if (parsedDraft.date) {
          parsedDraft.date = new Date(parsedDraft.date);
        }
        setSavedDraft(parsedDraft);
        setShowRestoreDraft(true);
      } catch (e) {
        // Invalid draft, ignore
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  // Save draft to localStorage whenever form changes
  useEffect(() => {
    const subscription = form.watch((value) => {
      // Only save if at least one question is answered
      const hasAnswers = Object.keys(value).some(key => 
        key.startsWith('q') && value[key as keyof typeof value]
      );
      if (hasAnswers || value.property || value.staffId) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(value));
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Restore draft
  const handleRestoreDraft = () => {
    if (savedDraft) {
      form.reset(savedDraft);
      setShowRestoreDraft(false);
      toast({
        title: "Draft Restored",
        description: "Your previous draft has been restored.",
      });
    }
  };

  // Discard draft
  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setShowRestoreDraft(false);
    setSavedDraft(null);
  };

  // Watch form values for live score calculation
  const watchedValues = form.watch();

  // Calculate current score
  const currentScore = useMemo(() => {
    let score = 0;
    complianceCategories.forEach(category => {
      category.questions.forEach(q => {
        if (watchedValues[q.id as keyof ComplianceFormValues] === "yes") {
          score += q.points;
        }
      });
    });
    return score;
  }, [watchedValues]);

  // Calculate progress
  const answeredCount = useMemo(() => {
    return complianceCategories.reduce((acc, cat) => {
      return acc + cat.questions.filter(q => watchedValues[q.id as keyof ComplianceFormValues]).length;
    }, 0);
  }, [watchedValues]);

  const totalQuestions = useMemo(() => {
    return complianceCategories.reduce((acc, cat) => acc + cat.questions.length, 0);
  }, []);

  const submitComplianceMutation = useMutation({
    mutationFn: async (data: ComplianceFormValues) => {
      const checks: Record<string, string> = {};
      complianceCategories.forEach((category) => {
        category.questions.forEach((q) => {
          checks[q.text] = data[q.id as keyof ComplianceFormValues] as string;
        });
      });

      // Include automation metadata for audit trail
      const payload: any = {
        staffId: data.staffId,
        date: format(data.date, "yyyy-MM-dd"),
        property: data.property,
        checks,
        notes: data.notes || "",
        auditor: data.auditor || "Admin",
      };

      // Add automation metadata if available
      if (automationData) {
        payload.automationMetadata = {
          trolleySignedInOut: {
            autoCalculated: autoFilledFields.has("q6"),
            ...automationData.trolleySignedInOut,
          },
          caddySignedInOut: {
            autoCalculated: autoFilledFields.has("q7"),
            ...automationData.caddySignedInOut,
          },
          usedChatbot: {
            autoCalculated: autoFilledFields.has("q8"),
            ...automationData.usedChatbot,
          },
          missedSpecialRequests: {
            autoCalculated: autoFilledFields.has("q9"),
            ...automationData.missedSpecialRequests,
          },
        };
      }

      return apiRequest("POST", "/api/compliance", payload);
    },
    onSuccess: (response: any) => {
      const score = response.points ?? 0;
      setSubmittedScore(score);
      setShowScore(true);
      // Clear draft from localStorage after successful submission
      localStorage.removeItem(DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ["/api/staff/leaderboard"] });
      toast({
        title: "Compliance Submitted",
        description: `Score: ${score.toFixed(1)}/15.0`,
      });
      setTimeout(() => {
        navigate("/staff");
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit compliance check",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ComplianceFormValues) => {
    submitComplianceMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Restore Draft Dialog */}
      <AlertDialog open={showRestoreDraft} onOpenChange={setShowRestoreDraft}>
        <AlertDialogContent data-testid="dialog-restore-draft">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have a saved draft from a previous session. Would you like to continue where you left off?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft} data-testid="button-discard-draft">
              Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDraft} data-testid="button-restore-draft">
              Restore Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle data-testid="text-page-title">Submit Daily Compliance Check</CardTitle>
          <CardDescription>
            Record compliance checks for staff members. All questions are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showScore ? (
            <div className="text-center py-12" data-testid="div-score-display">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
              <h3 className="text-2xl font-bold mb-2">Compliance Submitted!</h3>
              <p className="text-xl text-muted-foreground mb-4">
                Score: <span className="font-bold" data-testid="text-score">{submittedScore.toFixed(1)}/15.0</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Redirecting to leaderboard...
              </p>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Live Score Preview - Sticky Card */}
                <Card className="sticky top-4 z-10 border-primary" data-testid="card-score-preview">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="font-medium text-sm sm:text-base">Current Score:</span>
                      </div>
                      <div className="text-2xl font-bold text-primary" data-testid="text-current-score">
                        {currentScore.toFixed(1)} / 15.0
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Indicator */}
                <div className="space-y-2" data-testid="div-progress">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progress</span>
                    <span data-testid="text-progress">
                      {answeredCount} / {totalQuestions} questions answered
                    </span>
                  </div>
                  <Progress 
                    value={(answeredCount / totalQuestions) * 100} 
                    className="h-2"
                    data-testid="progress-bar"
                  />
                </div>

                {/* Property - Fixed to 1 Example Street */}
                <div className="space-y-2">
                  <FormLabel>Property *</FormLabel>
                  <div className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm">
                    <span data-testid="text-property">1 Example Street</span>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input type="hidden" {...form.register("property")} value="1 Example Street" />
                </div>

                {/* Staff Selection */}
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Member *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={loadingStaff}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-staff">
                            <SelectValue placeholder="Select a staff member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeStaff.map((s) => (
                            <SelectItem
                              key={s.id}
                              value={s.id}
                              data-testid={`option-staff-${s.id}`}
                            >
                              {s.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date Selection */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Shift *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-date-picker"
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            data-testid="calendar-date"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Categorized Questions with Accordion */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold mb-4">Compliance Questions</h3>
                  <Accordion 
                    type="multiple" 
                    defaultValue={complianceCategories.map(c => c.id)} 
                    className="w-full"
                    data-testid="accordion-questions"
                  >
                    {complianceCategories.map((category) => {
                      const CategoryIcon = category.icon;
                      return (
                        <AccordionItem 
                          key={category.id} 
                          value={category.id}
                          data-testid={`accordion-item-${category.id}`}
                        >
                          <AccordionTrigger 
                            className="hover:no-underline"
                            data-testid={`accordion-trigger-${category.id}`}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <CategoryIcon className="h-4 w-4" />
                              <span>{category.label}</span>
                              <Badge variant="secondary" className="ml-2">
                                {category.questions.length} items
                              </Badge>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pt-4">
                            {category.questions.map((q) => (
                              <FormField
                                key={q.id}
                                control={form.control}
                                name={q.id as any}
                                render={({ field }) => (
                                  <FormItem className="space-y-2">
                                    <div className="flex items-start gap-2">
                                      <FormLabel className="flex-1 text-sm">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span>{q.text}</span>
                                          <span className="text-xs text-muted-foreground">
                                            ({q.points} pts)
                                          </span>
                                          {autoFilledFields.has(q.id) && (
                                            <Badge 
                                              variant="outline" 
                                              className="text-xs bg-primary/10 text-primary border-primary/20"
                                              data-testid={`badge-auto-${q.id}`}
                                            >
                                              ✓ Auto-calculated
                                            </Badge>
                                          )}
                                        </div>
                                      </FormLabel>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <HelpCircle 
                                            className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0 mt-0.5" 
                                            data-testid={`tooltip-trigger-${q.id}`}
                                          />
                                        </TooltipTrigger>
                                        <TooltipContent 
                                          className="max-w-xs" 
                                          data-testid={`tooltip-content-${q.id}`}
                                        >
                                          <div className="space-y-2">
                                            <p className="font-medium">{q.tooltip}</p>
                                            {autoFilledFields.has(q.id) && automationData && (
                                              <div className="pt-2 border-t text-xs">
                                                <p className="font-semibold mb-1">Evidence:</p>
                                                <ul className="list-disc pl-4 space-y-0.5">
                                                  {q.id === "q6" && automationData.trolleySignedInOut.evidence.map((e, i) => (
                                                    <li key={i}>{e}</li>
                                                  ))}
                                                  {q.id === "q7" && automationData.caddySignedInOut.evidence.map((e, i) => (
                                                    <li key={i}>{e}</li>
                                                  ))}
                                                  {q.id === "q8" && automationData.usedChatbot.evidence.map((e, i) => (
                                                    <li key={i}>{e}</li>
                                                  ))}
                                                  {q.id === "q9" && automationData.missedSpecialRequests.evidence.map((e, i) => (
                                                    <li key={i}>{e}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                    <FormControl>
                                      <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="flex gap-4"
                                        data-testid={`radio-${q.id}`}
                                      >
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem
                                            value="yes"
                                            id={`${q.id}-yes`}
                                            data-testid={`radio-${q.id}-yes`}
                                            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                          />
                                          <Label 
                                            htmlFor={`${q.id}-yes`}
                                            className="cursor-pointer min-h-[44px] flex items-center"
                                          >
                                            Yes
                                          </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <RadioGroupItem
                                            value="no"
                                            id={`${q.id}-no`}
                                            data-testid={`radio-${q.id}-no`}
                                            className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                                          />
                                          <Label 
                                            htmlFor={`${q.id}-no`}
                                            className="cursor-pointer min-h-[44px] flex items-center"
                                          >
                                            No
                                          </Label>
                                        </div>
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>

                {/* Auditor Field */}
                <FormField
                  control={form.control}
                  name="auditor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auditor (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Admin"
                          data-testid="input-auditor"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes Field */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional notes..."
                          className="resize-none"
                          rows={3}
                          data-testid="textarea-notes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    data-testid="button-cancel"
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitComplianceMutation.isPending}
                    data-testid="button-submit"
                    className="w-full sm:w-auto"
                  >
                    {submitComplianceMutation.isPending ? "Submitting..." : "Submit Compliance Check"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
