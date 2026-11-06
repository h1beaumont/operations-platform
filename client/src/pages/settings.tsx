import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, Plus, Trash2, GripVertical, Eye, EyeOff, AlertCircle, FileText, Calendar, Clock, MapPin, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { HiringSettings, ScreeningQuestion } from "@shared/schema";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Days of the week for interview scheduling
const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

// Default communication templates
const DEFAULT_TEMPLATES = {
  screeningPassed: {
    enabled: true,
    emailSubject: "Congratulations {{firstName}}! You've Passed Our Initial Screening",
    emailBody: `Dear {{firstName}} {{lastName}},

We're pleased to inform you that you've successfully passed our initial screening for the {{roleType}} position at Northstay!

Next Steps:
1. We'll be scheduling a group interview session
2. You'll receive a calendar invitation with the date, time, and location
3. Please bring a form of identification and any questions you may have

If you have any questions in the meantime, please don't hesitate to reach out.

Best regards,
The Northstay Team`,
    smsBody: "Hi {{firstName}}, congratulations! You've passed our initial screening for the {{roleType}} position. We'll be in touch soon with interview details. - Northstay"
  },
  screeningFailed: {
    enabled: true,
    emailSubject: "Your Application with Northstay",
    emailBody: `Dear {{firstName}} {{lastName}},

Thank you for your interest in the {{roleType}} position at Northstay.

After careful review of your application, we've decided not to move forward with your candidacy at this time. This was a difficult decision as we received many qualified applications.

We encourage you to apply for future positions that match your skills and experience. We'll keep your information on file for future opportunities.

Thank you again for considering Northstay as a potential employer.

Best regards,
The Northstay Team`,
    smsBody: "Hi {{firstName}}, thank you for applying to Northstay. Unfortunately, we won't be moving forward with your application at this time. We'll keep your details for future opportunities."
  },
  hired: {
    enabled: true,
    emailSubject: "Welcome to Northstay, {{firstName}}!",
    emailBody: `Dear {{firstName}} {{lastName}},

Congratulations! We're delighted to offer you the {{roleType}} position at Northstay!

Your start date and onboarding details will be sent to you shortly. In the meantime, please complete any outstanding documentation we've requested.

We're excited to have you join our team and look forward to working with you.

Welcome aboard!

Best regards,
The Northstay Team`,
    smsBody: "Congratulations {{firstName}}! You're hired as a {{roleType}} at Northstay! Check your email for important details. Welcome to the team!"
  },
  rejected: {
    enabled: false,
    emailSubject: "Update on Your Application - Northstay",
    emailBody: `Dear {{firstName}} {{lastName}},

Thank you for taking the time to interview with us for the {{roleType}} position.

After careful consideration, we've decided to move forward with another candidate whose experience more closely matches our current needs.

We were impressed by your qualifications and encourage you to apply for future openings that align with your skills.

Thank you for your interest in Northstay.

Best regards,
The Northstay Team`,
    smsBody: "Hi {{firstName}}, thank you for interviewing with Northstay. We've decided to proceed with another candidate. We appreciate your interest and wish you the best."
  }
};

// Clickable Placeholder Component - Click to copy to clipboard
function ClickablePlaceholder({ placeholder }: { placeholder: string }) {
  const { toast } = useToast();

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(placeholder);
      toast({
        title: "Copied!",
        description: `${placeholder} copied to clipboard. Paste it into any field above.`,
        duration: 2000,
      });
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = placeholder;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      toast({
        title: "Copied!",
        description: `${placeholder} copied to clipboard. Paste it into any field above.`,
        duration: 2000,
      });
    }
  };

  return (
    <Badge
      variant="secondary"
      className="hover-elevate cursor-pointer select-none"
      onClick={handleClick}
      data-testid={`placeholder-${placeholder}`}
    >
      {placeholder}
    </Badge>
  );
}

// Helper function to check if a question has a valid correct answer
function hasValidCorrectAnswer(question: ScreeningQuestion): boolean {
  if (question.correctAnswer === undefined || question.correctAnswer === null) {
    return false;
  }
  if (typeof question.correctAnswer === 'string') {
    return question.correctAnswer.trim() !== '';
  }
  if (Array.isArray(question.correctAnswer)) {
    return question.correctAnswer.length > 0 && question.correctAnswer.some(ans => ans.trim() !== '');
  }
  return false;
}

// Sortable question item component
function SortableQuestionItem({
  question,
  index,
  onUpdate,
  onRemove,
}: {
  question: ScreeningQuestion;
  index: number;
  onUpdate: (field: keyof ScreeningQuestion, value: any) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="border rounded-md p-4 bg-card">
      <div className="flex gap-3">
        <div className="flex flex-col justify-start pt-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover-elevate active:cursor-grabbing p-1 rounded"
            data-testid={`drag-handle-question-${index}`}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <Label className="text-sm">Question Prompt</Label>
              <Input
                placeholder="Enter question"
                value={question.prompt}
                onChange={(e) => onUpdate('prompt', e.target.value)}
                data-testid={`input-question-prompt-${index}`}
              />
            </div>
            <div className="w-40">
              <Label className="text-sm">Type</Label>
              <Select
                value={question.type}
                onValueChange={(value) => onUpdate('type', value)}
              >
                <SelectTrigger data-testid={`select-question-type-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes_no">Yes/No</SelectItem>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {question.type === 'yes_no' && (
            <div>
              <Label className="text-sm">Correct Answer</Label>
              <RadioGroup
                value={question.correctAnswer as string || "Yes"}
                onValueChange={(value) => onUpdate('correctAnswer', value)}
                className="flex gap-4 mt-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Yes" id={`${question.id}-yes`} />
                  <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="No" id={`${question.id}-no`} />
                  <Label htmlFor={`${question.id}-no`}>No</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {question.type === 'multiple_choice' && (
            <div className="space-y-2">
              <Label className="text-sm">Answer Options</Label>
              {(question.options || []).map((option, optionIndex) => (
                <div key={optionIndex} className="flex gap-2">
                  <Input
                    placeholder={`Option ${optionIndex + 1}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(question.options || [])];
                      newOptions[optionIndex] = e.target.value;
                      onUpdate('options', newOptions);
                    }}
                    data-testid={`input-option-${index}-${optionIndex}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newOptions = (question.options || []).filter((_, i) => i !== optionIndex);
                      onUpdate('options', newOptions);
                    }}
                    data-testid={`button-remove-option-${index}-${optionIndex}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newOptions = [...(question.options || []), ""];
                  onUpdate('options', newOptions);
                }}
                data-testid={`button-add-option-${index}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>

              <div className="mt-2 space-y-2">
                <Label className="text-sm">Correct Answer</Label>
                <Select
                  value={question.correctAnswer as string || ""}
                  onValueChange={(value) => onUpdate('correctAnswer', value)}
                >
                  <SelectTrigger data-testid={`select-correct-answer-${index}`}>
                    <SelectValue placeholder="Select correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(question.options || []).map((option, i) => (
                      <SelectItem key={i} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!hasValidCorrectAnswer(question) && (
                  <Badge variant="secondary" className="gap-1" data-testid={`badge-manual-review-mc-${index}`}>
                    <AlertCircle className="h-3 w-3" />
                    Manual review required - will not be auto-graded
                  </Badge>
                )}
              </div>
            </div>
          )}

          {question.type === 'text' && (
            <div className="space-y-2">
              <Label className="text-sm">Expected Answer (Optional - for auto-grading)</Label>
              <Input
                placeholder="Leave blank for manual review"
                value={question.correctAnswer as string || ""}
                onChange={(e) => onUpdate('correctAnswer', e.target.value)}
                data-testid={`input-correct-answer-${index}`}
              />
              {!hasValidCorrectAnswer(question) && (
                <Badge variant="secondary" className="gap-1" data-testid={`badge-manual-review-${index}`}>
                  <AlertCircle className="h-3 w-3" />
                  Manual review required - will not be auto-graded
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`required-${question.id}`}
                checked={question.required}
                onCheckedChange={(checked) => onUpdate('required', checked)}
                data-testid={`checkbox-required-${index}`}
              />
              <Label htmlFor={`required-${question.id}`} className="text-sm cursor-pointer">
                Required
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor={`weight-${question.id}`} className="text-sm">
                Weight:
              </Label>
              <Input
                id={`weight-${question.id}`}
                type="number"
                min="0"
                step="0.5"
                value={question.weight}
                onChange={(e) => onUpdate('weight', parseFloat(e.target.value) || 1)}
                className="w-20"
                data-testid={`input-weight-${index}`}
              />
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          data-testid={`button-remove-question-${index}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Preview panel component
function QuestionsPreview({ questions }: { questions: ScreeningQuestion[] }) {
  return (
    <div className="space-y-4">
      {questions.map((q, index) => (
        <div key={q.id} className="border rounded-md p-4 bg-muted/30">
          <Label className="text-base font-medium">
            {index + 1}. {q.prompt}
            {q.required && <span className="text-destructive ml-1">*</span>}
          </Label>

          {q.type === 'yes_no' && (
            <RadioGroup className="mt-3 space-y-2" disabled>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Yes" id={`preview-${q.id}-yes`} />
                <Label htmlFor={`preview-${q.id}-yes`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="No" id={`preview-${q.id}-no`} />
                <Label htmlFor={`preview-${q.id}-no`}>No</Label>
              </div>
            </RadioGroup>
          )}

          {q.type === 'multiple_choice' && q.options && (
            <RadioGroup className="mt-3 space-y-2" disabled>
              {q.options.map((option, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`preview-${q.id}-${i}`} />
                  <Label htmlFor={`preview-${q.id}-${i}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {q.type === 'text' && (
            <Textarea
              placeholder="Candidate will type their answer here"
              className="mt-3"
              disabled
            />
          )}

          <div className="mt-2 text-xs text-muted-foreground">
            Weight: {q.weight}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [driverQuestions, setDriverQuestions] = useState<ScreeningQuestion[]>([]);
  const [nonDriverQuestions, setNonDriverQuestions] = useState<ScreeningQuestion[]>([]);
  const [onboardingUrl, setOnboardingUrl] = useState("");
  const [passingScoreDriver, setPassingScoreDriver] = useState(100);
  const [passingScoreNonDriver, setPassingScoreNonDriver] = useState(100);
  const [showPreviewDriver, setShowPreviewDriver] = useState(false);
  const [showPreviewNonDriver, setShowPreviewNonDriver] = useState(false);
  const [communicationTemplates, setCommunicationTemplates] = useState<any>({});
  const [selectedTemplate, setSelectedTemplate] = useState("screeningPassed");
  const [currentDragTarget, setCurrentDragTarget] = useState<{ field: string; templateKey: string } | null>(null);

  // Refs for drag targets
  const emailSubjectRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const emailBodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const smsBodyRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Confirmation dialog states
  const [deactivateHiringConfirm, setDeactivateHiringConfirm] = useState(false);

  // Interview scheduling state
  const [recurringMeetingEnabled, setRecurringMeetingEnabled] = useState(true);
  const [recurringMeetingDay, setRecurringMeetingDay] = useState(2); // Tuesday by default
  const [recurringMeetingTime, setRecurringMeetingTime] = useState("14:00");
  const [recurringMeetingDuration, setRecurringMeetingDuration] = useState(60);
  const [minNoticePeriodHours, setMinNoticePeriodHours] = useState(48);
  const [meetingLocation, setMeetingLocation] = useState("Google Meet - Link will be provided");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: settings, isLoading } = useQuery<HiringSettings>({
    queryKey: ["/api/settings"],
  });

  useEffect(() => {
    if (settings) {
      setDriverQuestions(settings.driverScreeningQuestions || []);
      setNonDriverQuestions(settings.nonDriverScreeningQuestions || []);
      setOnboardingUrl(settings.onboardingFormUrl || "");
      setPassingScoreDriver(settings.passingScoreDriver || 100);
      setPassingScoreNonDriver(settings.passingScoreNonDriver || 100);
      setCommunicationTemplates(settings.communicationTemplates || {});
      // Interview scheduling settings
      setRecurringMeetingEnabled(settings.recurringMeetingEnabled ?? true);
      setRecurringMeetingDay(settings.recurringMeetingDay ?? 2);
      setRecurringMeetingTime(settings.recurringMeetingTime || "14:00");
      setRecurringMeetingDuration(settings.recurringMeetingDuration || 60);
      setMinNoticePeriodHours(settings.minNoticePeriodHours || 48);
      setMeetingLocation(settings.meetingLocation || "Google Meet - Link will be provided");
    }
  }, [settings]);

  const toggleHiringMutation = useMutation({
    mutationFn: async (active: boolean) => {
      return apiRequest("PATCH", "/api/settings/hiring-active", { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setDeactivateHiringConfirm(false);
      toast({
        title: settings?.hiringActive ? "Success!" : "Success!",
        description: settings?.hiringActive
          ? "Hiring has been deactivated. No new candidates can apply until reactivated."
          : "Hiring has been activated. You can now receive new candidates.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update hiring status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleHiringToggle = (checked: boolean) => {
    // If deactivating, show confirmation
    if (!checked && settings?.hiringActive) {
      setDeactivateHiringConfirm(true);
    } else {
      // If activating, no confirmation needed
      toggleHiringMutation.mutate(checked);
    }
  };

  const updateScreeningMutation = useMutation({
    mutationFn: async ({ roleType, questions }: { roleType: "driver" | "non-driver"; questions: ScreeningQuestion[] }) => {
      return apiRequest("PATCH", "/api/settings/screening-questions", { roleType, questions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success!",
        description: "Screening questions have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save screening questions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePassingScoresMutation = useMutation({
    mutationFn: async (scores: { passingScoreDriver?: number; passingScoreNonDriver?: number }) => {
      return apiRequest("PATCH", "/api/settings/passing-scores", scores);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Passing Scores Updated",
        description: "Passing score thresholds have been saved successfully",
      });
    },
  });

  const updateOnboardingMutation = useMutation({
    mutationFn: async (url: string) => {
      return apiRequest("PATCH", "/api/settings/onboarding-form-url", { url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Onboarding form URL has been saved successfully",
      });
    },
  });

  const updateTemplatesMutation = useMutation({
    mutationFn: async (templates: any) => {
      return apiRequest("PATCH", "/api/settings/communication-templates", { templates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Templates Updated",
        description: "Communication templates have been saved successfully",
      });
    },
  });

  const updateInterviewScheduleMutation = useMutation({
    mutationFn: async (scheduleData: {
      recurringMeetingEnabled: boolean;
      recurringMeetingDay: number;
      recurringMeetingTime: string;
      recurringMeetingDuration: number;
      minNoticePeriodHours: number;
      meetingLocation: string;
    }) => {
      return apiRequest("PATCH", "/api/settings/interview-schedule", scheduleData);
    },
    onSuccess: () => {
      // Invalidate and refetch to get the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Interview Schedule Updated",
        description: "Interview scheduling settings have been saved successfully",
      });
    },
    onError: (error: any) => {
      // Revert to original settings on error
      if (settings) {
        setRecurringMeetingEnabled(settings.recurringMeetingEnabled ?? true);
        setRecurringMeetingDay(settings.recurringMeetingDay ?? 2);
        setRecurringMeetingTime(settings.recurringMeetingTime || "14:00");
        setRecurringMeetingDuration(settings.recurringMeetingDuration || 60);
        setMinNoticePeriodHours(settings.minNoticePeriodHours || 48);
        setMeetingLocation(settings.meetingLocation || "Google Meet - Link will be provided");
      }

      toast({
        title: "Error",
        description: error.message || "Failed to save interview schedule settings",
        variant: "destructive",
      });
    },
  });

  const { data: communicationLogs } = useQuery({
    queryKey: ["/api/communication-logs"],
  });

  const addQuestion = (roleType: "driver" | "non-driver") => {
    const newQuestion: ScreeningQuestion = {
      id: crypto.randomUUID(),
      prompt: "",
      type: "yes_no",
      correctAnswer: "Yes",
      required: true,
      weight: 1,
    };

    if (roleType === "driver") {
      setDriverQuestions([...driverQuestions, newQuestion]);
    } else {
      setNonDriverQuestions([...nonDriverQuestions, newQuestion]);
    }
  };

  const removeQuestion = (roleType: "driver" | "non-driver", id: string) => {
    if (roleType === "driver") {
      setDriverQuestions(driverQuestions.filter((q) => q.id !== id));
    } else {
      setNonDriverQuestions(nonDriverQuestions.filter((q) => q.id !== id));
    }
  };

  const updateQuestion = (roleType: "driver" | "non-driver", id: string, field: keyof ScreeningQuestion, value: any) => {
    const updateList = (questions: ScreeningQuestion[]) =>
      questions.map((q) => {
        if (q.id !== id) return q;

        const updated = { ...q, [field]: value };

        // Clear options and correctAnswer when switching away from multiple_choice
        if (field === 'type' && value !== 'multiple_choice') {
          delete updated.options;
          updated.correctAnswer = value === 'yes_no' ? 'Yes' : '';
        }

        // Initialize options for multiple_choice
        if (field === 'type' && value === 'multiple_choice' && !updated.options) {
          updated.options = ['', ''];
        }

        return updated;
      });

    if (roleType === "driver") {
      setDriverQuestions(updateList(driverQuestions));
    } else {
      setNonDriverQuestions(updateList(nonDriverQuestions));
    }
  };

  const handleDragEnd = (roleType: "driver" | "non-driver") => (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const questions = roleType === "driver" ? driverQuestions : nonDriverQuestions;
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);

      const reordered = arrayMove(questions, oldIndex, newIndex);

      if (roleType === "driver") {
        setDriverQuestions(reordered);
      } else {
        setNonDriverQuestions(reordered);
      }
    }
  };

  const saveScreeningQuestions = (roleType: "driver" | "non-driver") => {
    const questions = roleType === "driver" ? driverQuestions : nonDriverQuestions;
    updateScreeningMutation.mutate({ roleType, questions });
  };

  const savePassingScores = () => {
    updatePassingScoresMutation.mutate({
      passingScoreDriver,
      passingScoreNonDriver,
    });
  };

  const saveOnboardingUrl = () => {
    updateOnboardingMutation.mutate(onboardingUrl);
  };

  const updateTemplateField = (templateKey: string, field: string, value: any) => {
    setCommunicationTemplates({
      ...communicationTemplates,
      [templateKey]: {
        ...(communicationTemplates[templateKey] || {}),
        [field]: value,
      },
    });
  };

  const saveCommunicationTemplates = () => {
    updateTemplatesMutation.mutate(communicationTemplates);
  };

  const saveInterviewSchedule = () => {
    updateInterviewScheduleMutation.mutate({
      recurringMeetingEnabled,
      recurringMeetingDay,
      recurringMeetingTime,
      recurringMeetingDuration,
      minNoticePeriodHours,
      meetingLocation,
    });
  };

  const loadDefaultTemplates = () => {
    setCommunicationTemplates(DEFAULT_TEMPLATES);
    toast({
      title: "Default Templates Loaded",
      description: "The default communication templates have been loaded. Remember to save your changes.",
    });
  };

  const handlePlaceholderDrop = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !currentDragTarget) return;

    const placeholder = active.id as string;
    const { field, templateKey } = currentDragTarget;

    // Get the current value
    let currentValue = "";
    let ref: HTMLInputElement | HTMLTextAreaElement | null = null;

    if (field === "emailSubject") {
      currentValue = communicationTemplates[templateKey]?.emailSubject || "";
      ref = emailSubjectRefs.current[templateKey];
    } else if (field === "emailBody") {
      currentValue = communicationTemplates[templateKey]?.emailBody || "";
      ref = emailBodyRefs.current[templateKey];
    } else if (field === "smsBody") {
      currentValue = communicationTemplates[templateKey]?.smsBody || "";
      ref = smsBodyRefs.current[templateKey];
    }

    // Get cursor position if possible
    let insertPosition = currentValue.length;
    if (ref && ref.selectionStart !== null) {
      insertPosition = ref.selectionStart;
    }

    // Insert placeholder at cursor position
    const newValue =
      currentValue.slice(0, insertPosition) +
      placeholder +
      currentValue.slice(insertPosition);

    updateTemplateField(templateKey, field, newValue);

    // Reset drag target
    setCurrentDragTarget(null);
  };

  const calculateTotalWeight = (questions: ScreeningQuestion[]) => {
    return questions.reduce((sum, q) => sum + (q.weight || 0), 0);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-3 text-muted-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Hiring Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure screening questions, passing scores, and onboarding processes
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Hiring Mode</CardTitle>
            <CardDescription>
              Control whether new candidates can be uploaded and processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                id="hiring-toggle"
                checked={settings?.hiringActive || false}
                onCheckedChange={handleHiringToggle}
                data-testid="switch-hiring-active"
                disabled={toggleHiringMutation.isPending}
              />
              <Label htmlFor="hiring-toggle" className="text-sm font-medium cursor-pointer">
                {settings?.hiringActive ? "Hiring is Active" : "Hiring is Paused"}
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Screening Questions</CardTitle>
            <CardDescription>
              Create weighted questions with different types. Drag to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="driver" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="driver" data-testid="tab-driver-questions">
                  Driver Roles
                </TabsTrigger>
                <TabsTrigger value="non-driver" data-testid="tab-non-driver-questions">
                  Non-Driver Roles
                </TabsTrigger>
              </TabsList>

              <TabsContent value="driver" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Total Weight: {calculateTotalWeight(driverQuestions)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreviewDriver(!showPreviewDriver)}
                    data-testid="button-toggle-preview-driver"
                  >
                    {showPreviewDriver ? (
                      <><EyeOff className="h-4 w-4 mr-2" /> Hide Preview</>
                    ) : (
                      <><Eye className="h-4 w-4 mr-2" /> Show Preview</>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd("driver")}
                    >
                      <SortableContext
                        items={driverQuestions.map(q => q.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {driverQuestions.map((q, index) => (
                          <SortableQuestionItem
                            key={q.id}
                            question={q}
                            index={index}
                            onUpdate={(field, value) => updateQuestion("driver", q.id, field, value)}
                            onRemove={() => removeQuestion("driver", q.id)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>

                    <Button
                      variant="outline"
                      onClick={() => addQuestion("driver")}
                      data-testid="button-add-driver-question"
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  {showPreviewDriver && (
                    <div className="space-y-4">
                      <div className="sticky top-4">
                        <h3 className="font-medium mb-3">Preview</h3>
                        <QuestionsPreview questions={driverQuestions} />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="passing-score-driver" className="min-w-32">
                      Passing Score:
                    </Label>
                    <Input
                      id="passing-score-driver"
                      type="number"
                      min="0"
                      max="100"
                      value={passingScoreDriver}
                      onChange={(e) => setPassingScoreDriver(parseInt(e.target.value) || 0)}
                      className="w-24"
                      data-testid="input-passing-score-driver"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveScreeningQuestions("driver")}
                      disabled={updateScreeningMutation.isPending}
                      data-testid="button-save-driver-questions"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Driver Questions
                    </Button>
                    <Button
                      variant="outline"
                      onClick={savePassingScores}
                      disabled={updatePassingScoresMutation.isPending}
                      data-testid="button-save-passing-scores"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Passing Scores
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="non-driver" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Total Weight: {calculateTotalWeight(nonDriverQuestions)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreviewNonDriver(!showPreviewNonDriver)}
                    data-testid="button-toggle-preview-non-driver"
                  >
                    {showPreviewNonDriver ? (
                      <><EyeOff className="h-4 w-4 mr-2" /> Hide Preview</>
                    ) : (
                      <><Eye className="h-4 w-4 mr-2" /> Show Preview</>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd("non-driver")}
                    >
                      <SortableContext
                        items={nonDriverQuestions.map(q => q.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {nonDriverQuestions.map((q, index) => (
                          <SortableQuestionItem
                            key={q.id}
                            question={q}
                            index={index}
                            onUpdate={(field, value) => updateQuestion("non-driver", q.id, field, value)}
                            onRemove={() => removeQuestion("non-driver", q.id)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>

                    <Button
                      variant="outline"
                      onClick={() => addQuestion("non-driver")}
                      data-testid="button-add-non-driver-question"
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  {showPreviewNonDriver && (
                    <div className="space-y-4">
                      <div className="sticky top-4">
                        <h3 className="font-medium mb-3">Preview</h3>
                        <QuestionsPreview questions={nonDriverQuestions} />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Label htmlFor="passing-score-non-driver" className="min-w-32">
                      Passing Score:
                    </Label>
                    <Input
                      id="passing-score-non-driver"
                      type="number"
                      min="0"
                      max="100"
                      value={passingScoreNonDriver}
                      onChange={(e) => setPassingScoreNonDriver(parseInt(e.target.value) || 0)}
                      className="w-24"
                      data-testid="input-passing-score-non-driver"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveScreeningQuestions("non-driver")}
                      disabled={updateScreeningMutation.isPending}
                      data-testid="button-save-non-driver-questions"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Non-Driver Questions
                    </Button>
                    <Button
                      variant="outline"
                      onClick={savePassingScores}
                      disabled={updatePassingScoresMutation.isPending}
                      data-testid="button-save-passing-scores-non-driver"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Passing Scores
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Onboarding Form</CardTitle>
            <CardDescription>
              Set the Google Form URL for candidate onboarding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="onboarding-url">Form URL</Label>
                <Input
                  id="onboarding-url"
                  type="url"
                  placeholder="https://forms.gle/..."
                  value={onboardingUrl}
                  onChange={(e) => setOnboardingUrl(e.target.value)}
                  data-testid="input-onboarding-url"
                />
              </div>
              <Button
                onClick={saveOnboardingUrl}
                disabled={updateOnboardingMutation.isPending}
                data-testid="button-save-onboarding-url"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Onboarding URL
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Communication Templates</CardTitle>
            <CardDescription>
              Configure automated email and SMS messages sent to candidates at different pipeline stages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="screeningPassed" data-testid="tab-screening-passed">Screening Passed</TabsTrigger>
                <TabsTrigger value="screeningFailed" data-testid="tab-screening-failed">Screening Failed</TabsTrigger>
                <TabsTrigger value="hired" data-testid="tab-hired">Hired</TabsTrigger>
                <TabsTrigger value="rejected" data-testid="tab-rejected">Rejected</TabsTrigger>
              </TabsList>

                {["screeningPassed", "screeningFailed", "hired", "rejected"].map((templateKey) => (
                  <TabsContent key={templateKey} value={templateKey} className="space-y-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={communicationTemplates[templateKey]?.enabled || false}
                        onCheckedChange={(checked) => updateTemplateField(templateKey, "enabled", checked)}
                        data-testid={`switch-${templateKey}-enabled`}
                      />
                      <Label>Enable automatic communications for this stage</Label>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`${templateKey}-subject`}>Email Subject</Label>
                        <Input
                          ref={(el) => emailSubjectRefs.current[templateKey] = el}
                          id={`${templateKey}-subject`}
                          placeholder="Enter email subject"
                          value={communicationTemplates[templateKey]?.emailSubject || ""}
                          onChange={(e) => updateTemplateField(templateKey, "emailSubject", e.target.value)}
                          onFocus={() => setCurrentDragTarget({ field: "emailSubject", templateKey })}
                          data-testid={`input-${templateKey}-subject`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`${templateKey}-body`}>Email Body</Label>
                        <Textarea
                          ref={(el) => emailBodyRefs.current[templateKey] = el}
                          id={`${templateKey}-body`}
                          placeholder="Enter email body"
                          value={communicationTemplates[templateKey]?.emailBody || ""}
                          onChange={(e) => updateTemplateField(templateKey, "emailBody", e.target.value)}
                          onFocus={() => setCurrentDragTarget({ field: "emailBody", templateKey })}
                          rows={6}
                          data-testid={`textarea-${templateKey}-body`}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`${templateKey}-sms`}>SMS Body (optional)</Label>
                        <Textarea
                          ref={(el) => smsBodyRefs.current[templateKey] = el}
                          id={`${templateKey}-sms`}
                          placeholder="Enter SMS message (keep it short)"
                          value={communicationTemplates[templateKey]?.smsBody || ""}
                          onChange={(e) => updateTemplateField(templateKey, "smsBody", e.target.value)}
                          onFocus={() => setCurrentDragTarget({ field: "smsBody", templateKey })}
                          rows={3}
                          data-testid={`textarea-${templateKey}-sms`}
                        />
                      </div>

                      <div className="bg-muted/50 p-3 rounded-md">
                        <p className="text-sm font-medium mb-2">Available Placeholders: <span className="text-xs text-muted-foreground">(click to copy, then paste into fields above)</span></p>
                        <div className="flex flex-wrap gap-2">
                          <ClickablePlaceholder placeholder="{{firstName}}" />
                          <ClickablePlaceholder placeholder="{{lastName}}" />
                          <ClickablePlaceholder placeholder="{{email}}" />
                          <ClickablePlaceholder placeholder="{{phone}}" />
                          <ClickablePlaceholder placeholder="{{roleType}}" />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={loadDefaultTemplates}
                variant="outline"
                data-testid="button-load-defaults"
              >
                <FileText className="h-4 w-4 mr-2" />
                Load Default Templates
              </Button>
              <Button
                onClick={saveCommunicationTemplates}
                disabled={updateTemplatesMutation.isPending}
                data-testid="button-save-templates"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Templates
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interview Schedule</CardTitle>
            <CardDescription>
              Configure automatic interview scheduling for candidates who pass screening
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Switch
                  id="recurring-meeting-toggle"
                  checked={recurringMeetingEnabled}
                  onCheckedChange={setRecurringMeetingEnabled}
                  data-testid="switch-recurring-meeting"
                />
                <Label htmlFor="recurring-meeting-toggle" className="cursor-pointer">
                  Enable Automatic Interview Scheduling
                </Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p>When enabled, candidates who pass screening will be automatically scheduled for the next available interview slot based on your configured schedule.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {recurringMeetingEnabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meeting-day">Interview Day</Label>
                    <Select
                      value={String(recurringMeetingDay)}
                      onValueChange={(value) => setRecurringMeetingDay(parseInt(value))}
                    >
                      <SelectTrigger id="meeting-day" data-testid="select-meeting-day">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={String(day.value)}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meeting-time">Interview Time (24hr format)</Label>
                    <Input
                      id="meeting-time"
                      type="time"
                      value={recurringMeetingTime}
                      onChange={(e) => setRecurringMeetingTime(e.target.value)}
                      data-testid="input-meeting-time"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="meeting-duration">Duration</Label>
                    <Select
                      value={String(recurringMeetingDuration)}
                      onValueChange={(value) => setRecurringMeetingDuration(parseInt(value))}
                    >
                      <SelectTrigger id="meeting-duration" data-testid="select-meeting-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">60 minutes</SelectItem>
                        <SelectItem value="90">90 minutes</SelectItem>
                        <SelectItem value="120">120 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notice-period">Minimum Notice Period</Label>
                    <Select
                      value={String(minNoticePeriodHours)}
                      onValueChange={(value) => setMinNoticePeriodHours(parseInt(value))}
                    >
                      <SelectTrigger id="notice-period" data-testid="select-notice-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="48">48 hours</SelectItem>
                        <SelectItem value="72">72 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meeting-location">Meeting Location/Link</Label>
                  <Input
                    id="meeting-location"
                    type="text"
                    placeholder="e.g., Google Meet - Link will be provided"
                    value={meetingLocation}
                    onChange={(e) => setMeetingLocation(e.target.value)}
                    data-testid="input-meeting-location"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a Google Meet link or physical address where interviews will be conducted
                  </p>
                </div>

                {/* Display current schedule */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Current Schedule</span>
                  </div>
                  <p className="text-sm">
                    Interviews: Every <strong>{DAYS_OF_WEEK.find(d => d.value === recurringMeetingDay)?.label}</strong> at{" "}
                    <strong>
                      {new Date(`2000-01-01 ${recurringMeetingTime}`).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </strong>{" "}
                    for <strong>{recurringMeetingDuration} minutes</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Candidates must be notified at least {minNoticePeriodHours} hours in advance
                  </p>
                </div>
              </>
            )}

            <Button
              onClick={saveInterviewSchedule}
              disabled={updateInterviewScheduleMutation.isPending}
              data-testid="button-save-interview-schedule"
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Interview Schedule
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Communication Log</CardTitle>
            <CardDescription>
              View recent automated communications sent to candidates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {communicationLogs && Array.isArray(communicationLogs) && communicationLogs.length > 0 ? (
              <div className="space-y-2">
                {communicationLogs.slice(0, 10).map((log: any, index: number) => (
                  <div key={log.id || index} className="flex items-center justify-between p-3 border rounded-md" data-testid={`log-item-${index}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{log.templateKey}</span>
                        <Badge variant={log.channel === "email" ? "default" : "secondary"}>{log.channel}</Badge>
                        <Badge variant={log.status === "sent" ? "default" : "destructive"}>{log.status}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {log.recipientEmail || log.recipientPhone} - {new Date(log.sentAt).toLocaleString()}
                      </div>
                      {log.error && (
                        <div className="text-sm text-destructive mt-1">{log.error}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No communication logs yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={deactivateHiringConfirm}
        onOpenChange={setDeactivateHiringConfirm}
        title="Deactivate Hiring?"
        description="Are you sure you want to deactivate hiring? No new candidates can apply until reactivated."
        confirmText="Deactivate"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={() => toggleHiringMutation.mutate(false)}
        isLoading={toggleHiringMutation.isPending}
      />
    </div>
  );
}