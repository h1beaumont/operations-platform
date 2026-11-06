import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Calendar, Check, X, Loader2, Clock, AlertCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff, AvailabilityResponse } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function AvailabilitySubmit() {
  const [, params] = useRoute("/availability-submit/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  
  // Log for debugging
  useEffect(() => {
    console.log("[Availability] Page loaded");
    console.log("[Availability] Token from URL:", token);
    console.log("[Availability] Full URL:", window.location.href);
    console.log("[Availability] Route params:", params);
    
    if (!token) {
      console.error("[Availability] No token found in URL!");
    }
  }, [token, params]);
  
  // Store one availability value per day (null=grey/not set, true=green/available, false=red/not available)
  const [availabilityData, setAvailabilityData] = useState<Record<string, boolean | null>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery<{ staff: Staff; responses: AvailabilityResponse[] }>({
    queryKey: ["/api/availability-responses", token],
    queryFn: async () => {
      console.log(`[Availability] Fetching data for token: ${token}`);
      try {
        const response = await fetch(`/api/availability-responses/${token}`);
        
        const responseText = await response.text();
        console.log(`[Availability] Response status: ${response.status}`);
        
        if (!response.ok) {
          console.error(`[Availability] API Error - Status: ${response.status}, Message: ${responseText}`);
          throw new Error("Invalid or expired link");
        }
        
        const data = JSON.parse(responseText);
        console.log(`[Availability] Data received:`, data);
        return data;
      } catch (err) {
        console.error("[Availability] Error fetching data:", err);
        throw err;
      }
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (data?.responses) {
      const initialData: Record<string, boolean | null> = {};
      // Group by date and check if ANY slot is available (if all are the same, use that value)
      const byDate: Record<string, (boolean | null)[]> = {};
      data.responses.forEach((response) => {
        if (!byDate[response.date]) {
          byDate[response.date] = [];
        }
        byDate[response.date].push(response.available);
      });
      
      // For each date, use the first slot's value (they should all be the same)
      Object.entries(byDate).forEach(([date, values]) => {
        initialData[date] = values[0] ?? null;
      });
      
      setAvailabilityData(initialData);
    }
  }, [data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const responses = [];
      const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
      
      // For each date, set ALL time slots to the same availability value (only if not null)
      for (const [date, available] of Object.entries(availabilityData)) {
        if (available !== null) {
          for (const timeSlot of timeSlots) {
            responses.push({ date, timeSlot, available });
          }
        }
      }
      
      return apiRequest("POST", "/api/availability-responses", { token, responses });
    },
    onSuccess: () => {
      // Invalidate cache to ensure locked state shows immediately on re-entry
      queryClient.invalidateQueries({ queryKey: ["/api/availability-responses", token] });
      setIsSubmitted(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit availability. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleDay = (date: string) => {
    setAvailabilityData((prev) => {
      const current = prev[date];
      // Cycle through: null (grey) → true (green) → false (red) → null
      let next: boolean | null;
      if (current === null) {
        next = true;
      } else if (current === true) {
        next = false;
      } else {
        next = null;
      }
      return { ...prev, [date]: next };
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex items-center gap-2" data-testid="loading-availability-form">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading availability form...</span>
        </div>
      </div>
    );
  }

  // Show error state if query failed
  if (error) {
    console.error("[Availability] Query error:", error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle data-testid="text-error-title">Error Loading Form</CardTitle>
            </div>
            <CardDescription data-testid="text-error-message">
              {error instanceof Error ? error.message : "This availability submission link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                If this problem persists, please contact us on WhatsApp for assistance.
                <br />
                <span className="text-xs mt-2 block">Token: {token ? token.substring(0, 8) + "..." : "No token found"}</span>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle data-testid="text-invalid-link">No Data Available</CardTitle>
            <CardDescription>
              Unable to load availability data. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const dates = Object.keys(availabilityData).sort();
  const allSubmitted = data.responses.some(r => r.submittedAt !== null);

  // Success screen after submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md" data-testid="card-submission-success">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle data-testid="text-success-title">Thank You!</CardTitle>
            </div>
            <CardDescription data-testid="text-success-message">
              Your availability has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Screenshot Prompt */}
            <Alert className="border-primary/50 bg-primary/5" data-testid="alert-screenshot-prompt">
              <Camera className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold" data-testid="text-screenshot-title">Take a Screenshot for Your Records</p>
                  <p className="text-sm" data-testid="text-screenshot-description">
                    Please screenshot this confirmation so you can remember which days you're available.
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Availability Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm" data-testid="text-summary-title">
                  Your Availability for Week Starting {dates.length > 0 ? format(parseISO(dates[0]), "MMM d, yyyy") : ""}
                </h3>
              </div>
              <div className="space-y-2 p-4 bg-muted rounded-lg" data-testid="container-availability-summary">
                {dates.map((date) => {
                  const availability = availabilityData[date];
                  const isAvailable = availability === true;
                  const isNotAvailable = availability === false;
                  
                  return (
                    <div key={date} className="flex items-center justify-between py-2 border-b last:border-b-0 border-border/50" data-testid={`summary-day-${date}`}>
                      <span className="text-sm font-medium">
                        {format(parseISO(date), "EEEE, MMM d")}
                      </span>
                      {isAvailable && (
                        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                          <Check className="h-4 w-4" />
                          <span className="text-sm font-semibold">Available</span>
                        </div>
                      )}
                      {isNotAvailable && (
                        <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                          <X className="h-4 w-4" />
                          <span className="text-sm font-semibold">Not Available</span>
                        </div>
                      )}
                      {!isAvailable && !isNotAvailable && (
                        <span className="text-sm text-muted-foreground">Not Set</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Final Notice */}
            <Alert data-testid="alert-final-notice">
              <AlertDescription className="text-sm">
                Your availability is now <strong>final</strong>. If you need to make changes, please contact us on WhatsApp.
              </AlertDescription>
            </Alert>

            <p className="text-xs text-muted-foreground text-center pt-2" data-testid="text-next-request-info">
              You'll receive another availability request on <strong>Wednesday or Sunday at 4:30pm</strong> for the following week.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already submitted - show locked state
  if (allSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md" data-testid="card-already-submitted">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Check className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle data-testid="text-already-submitted-title">Already Submitted</CardTitle>
            </div>
            <CardDescription data-testid="text-already-submitted-subtitle">
              {data.staff.fullName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <strong>Your availability has already been submitted and is now final.</strong>
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold text-sm">Your Submitted Availability:</h3>
              {dates.map((date) => {
                const availability = availabilityData[date];
                return (
                  <div key={date} className="flex items-center justify-between text-sm py-1">
                    <span>{format(parseISO(date), "EEE, MMM d")}</span>
                    <span className={cn(
                      "font-medium",
                      availability === true && "text-green-600 dark:text-green-400",
                      availability === false && "text-red-600 dark:text-red-400",
                      availability === null && "text-gray-500"
                    )}>
                      {availability === true && "✓ Available"}
                      {availability === false && "✗ Not Available"}
                      {availability === null && "— Not Set"}
                    </span>
                  </div>
                );
              })}
            </div>

            <Alert>
              <AlertDescription className="text-sm">
                If you need to change your availability, please contact us on <strong>WhatsApp</strong>.
              </AlertDescription>
            </Alert>

            <p className="text-xs text-muted-foreground text-center pt-2">
              You'll receive your next availability request on <strong>Wednesday or Sunday at 4:30pm</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle data-testid="text-availability-title">
                Availability Confirmation
              </CardTitle>
            </div>
            <CardDescription data-testid="text-staff-name">
              {data.staff.fullName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> You must be available for the <strong>FULL 10am-3pm shift</strong>. 
                If you can't work the entire 5-hour shift on any day, mark that day as "Not Available".
              </AlertDescription>
            </Alert>

            <p className="text-sm text-muted-foreground">
              Tap each day to cycle: Grey (not set) → Green (available) → Red (not available)
            </p>

            <div className="space-y-2">
              {dates.map((date) => {
                const availability = availabilityData[date];
                return (
                  <Button
                    key={date}
                    variant="outline"
                    size="lg"
                    onClick={() => toggleDay(date)}
                    className={cn(
                      "w-full justify-between h-auto py-4",
                      availability === true && "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white border-green-600",
                      availability === false && "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white border-red-600",
                      availability === null && "bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700"
                    )}
                    data-testid={`button-day-${date}`}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-semibold">
                        {format(parseISO(date), "EEEE, MMM d")}
                      </span>
                      <span className="text-xs opacity-90">
                        {availability === true && "Available 10am-3pm"}
                        {availability === false && "Not Available"}
                        {availability === null && "Not Set"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {availability === true && <Check className="h-6 w-6" />}
                      {availability === false && <X className="h-6 w-6" />}
                      {availability === null && <span className="text-2xl">—</span>}
                    </div>
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Button
                size="lg"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="w-full"
                data-testid="button-submit-availability"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : allSubmitted ? (
                  "Update Availability"
                ) : (
                  "Submit Availability"
                )}
              </Button>
              {allSubmitted && (
                <p className="text-sm text-center text-muted-foreground">
                  Your availability has been submitted. You can update it anytime.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
