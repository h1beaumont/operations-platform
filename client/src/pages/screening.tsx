import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import type { ScreeningLink, ScreeningQuestion } from "@shared/schema";

export default function Screening() {
  const { token } = useParams<{ token: string }>();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [passed, setPassed] = useState<boolean | null>(null);
  const [score, setScore] = useState<number | null>(null);

  const { data: screeningLink, isLoading, error } = useQuery<ScreeningLink>({
    queryKey: ["/api/screening/links", token],
    enabled: !!token,
  });

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const submitMutation = useMutation({
    mutationFn: async (responses: Array<{ questionId: string; questionText: string; answer: string; isCorrect: boolean }>) => {
      return apiRequest("POST", "/api/screening/submit", {
        token,
        responses,
      });
    },
    onSuccess: (data: any) => {
      setSubmitted(true);
      setPassed(data.passed);
      setScore(data.score);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading screening form...</p>
        </div>
      </div>
    );
  }

  if (error || !screeningLink) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This screening link is invalid or has expired. Please contact the hiring team if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screeningLink.expiresAt && new Date(screeningLink.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Link Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This screening link has expired. Please contact the hiring team for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (screeningLink.completedAt) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-chart-2" />
              Already Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You have already completed this screening questionnaire. Thank you!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions: ScreeningQuestion[] = screeningLink.roleType === "driver"
    ? settings?.driverScreeningQuestions || []
    : settings?.nonDriverScreeningQuestions || [];

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${passed ? 'text-chart-2' : 'text-muted-foreground'}`}>
              {passed ? (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  You Passed!
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5" />
                  Screening Complete
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {passed ? (
              <>
                <p className="text-sm">
                  Congratulations! You scored {score}% and meet our requirements.
                </p>
                <p className="text-sm font-medium text-primary">
                  You'll receive a meeting invite soon via email.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Thank you for your time. You scored {score}%, but unfortunately you don't meet the requirements for this position at the moment.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const checkAnswer = (question: ScreeningQuestion, userAnswer: string): boolean => {
    if (!question.correctAnswer || !userAnswer) return false;
    
    const normalize = (s: string) => s.trim().toLowerCase();
    const normalizedUserAnswer = normalize(userAnswer);
    
    if (typeof question.correctAnswer === 'string') {
      return normalizedUserAnswer === normalize(question.correctAnswer);
    }
    
    // Array of correct answers (for multiple correct options)
    return question.correctAnswer.some(ca => normalize(ca) === normalizedUserAnswer);
  };

  const handleSubmit = () => {
    // Only include auto-graded questions (those with correctAnswer defined)
    // Questions without correctAnswer are for manual review and don't affect pass/fail
    const autoGradedQuestions = questions.filter(q => {
      if (q.correctAnswer === undefined || q.correctAnswer === null) {
        return false;
      }
      // Handle string correctAnswer
      if (typeof q.correctAnswer === 'string') {
        return q.correctAnswer.trim() !== '';
      }
      // Handle array correctAnswer
      if (Array.isArray(q.correctAnswer)) {
        return q.correctAnswer.length > 0 && q.correctAnswer.some(ans => ans.trim() !== '');
      }
      return false;
    });
    
    const responses = autoGradedQuestions.map((q) => {
      const userAnswer = answers[q.id] || "";
      const isCorrect = checkAnswer(q, userAnswer);
      
      return {
        questionId: q.id,
        questionText: q.prompt,
        answer: userAnswer,
        isCorrect,
      };
    });

    submitMutation.mutate(responses);
  };

  // Check if all required questions are answered
  const requiredQuestions = questions.filter(q => q.required);
  const allRequiredAnswered = requiredQuestions.every(q => answers[q.id] && answers[q.id].trim() !== "");

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-screening-title">
              Application Screening
            </CardTitle>
            <CardDescription>
              {screeningLink.roleType.charAt(0).toUpperCase() + screeningLink.roleType.slice(1).replace('-', ' ')} Cleaner Position
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm font-medium">
                Please answer all required questions marked with <span className="text-destructive">*</span>
              </p>
            </div>

            <div className="space-y-6">
              {questions.map((q, index) => (
                <div key={q.id} className="space-y-3 pb-4 border-b last:border-0">
                  <Label className="text-base font-medium" data-testid={`text-question-${index}`}>
                    {index + 1}. {q.prompt}
                    {q.required && <span className="text-destructive ml-1">*</span>}
                  </Label>

                  {q.type === 'yes_no' && (
                    <RadioGroup
                      value={answers[q.id] || ""}
                      onValueChange={(value) => setAnswers({ ...answers, [q.id]: value })}
                      className="flex flex-col gap-3"
                      data-testid={`radiogroup-question-${index}`}
                    >
                      <div className="flex items-center space-x-3 border rounded-md p-4 hover-elevate">
                        <RadioGroupItem value="Yes" id={`q${q.id}-yes`} data-testid={`radio-question-${index}-yes`} />
                        <Label htmlFor={`q${q.id}-yes`} className="flex-1 cursor-pointer text-base">
                          Yes
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 border rounded-md p-4 hover-elevate">
                        <RadioGroupItem value="No" id={`q${q.id}-no`} data-testid={`radio-question-${index}-no`} />
                        <Label htmlFor={`q${q.id}-no`} className="flex-1 cursor-pointer text-base">
                          No
                        </Label>
                      </div>
                    </RadioGroup>
                  )}

                  {q.type === 'multiple_choice' && q.options && (
                    <RadioGroup
                      value={answers[q.id] || ""}
                      onValueChange={(value) => setAnswers({ ...answers, [q.id]: value })}
                      className="flex flex-col gap-3"
                      data-testid={`radiogroup-question-${index}`}
                    >
                      {q.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center space-x-3 border rounded-md p-4 hover-elevate">
                          <RadioGroupItem 
                            value={option} 
                            id={`q${q.id}-option${optionIndex}`}
                            data-testid={`radio-question-${index}-option-${optionIndex}`}
                          />
                          <Label htmlFor={`q${q.id}-option${optionIndex}`} className="flex-1 cursor-pointer text-base">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {q.type === 'text' && (
                    <Textarea
                      placeholder="Enter your answer here..."
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      rows={4}
                      data-testid={`textarea-question-${index}`}
                    />
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!allRequiredAnswered || submitMutation.isPending}
              className="w-full"
              size="lg"
              data-testid="button-submit-screening"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Screening"
              )}
            </Button>

            {!allRequiredAnswered && (
              <p className="text-sm text-muted-foreground text-center">
                Please answer all required questions to submit
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
