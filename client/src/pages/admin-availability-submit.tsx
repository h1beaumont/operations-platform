import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Calendar, Check, X, Loader2, Clock, Minus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AdminStaff, AdminAvailabilityResponse } from "@shared/schema";
import { cn } from "@/lib/utils";

const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export default function AdminAvailabilitySubmit() {
  const [, params] = useRoute("/admin-availability-submit/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  
  // Log for debugging
  useEffect(() => {
    console.log("[Admin Availability] Page loaded");
    console.log("[Admin Availability] Token from URL:", token);
    console.log("[Admin Availability] Full URL:", window.location.href);
    console.log("[Admin Availability] Route params:", params);
    
    if (!token) {
      console.error("[Admin Availability] No token found in URL!");
    }
  }, [token, params]);
  
  // Store availability per date-timeSlot combination (null = no response, true = available, false = unavailable)
  const [availabilityData, setAvailabilityData] = useState<Record<string, boolean | null>>({});
  const [touchedSlots, setTouchedSlots] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery<{ staff: AdminStaff; responses: AdminAvailabilityResponse[] }>({
    queryKey: ["/api/admin-availability-responses", token],
    queryFn: async () => {
      console.log(`[Admin Availability] Fetching data for token: ${token}`);
      try {
        const response = await fetch(`/api/admin-availability-responses/${token}`);
        
        const responseText = await response.text();
        console.log(`[Admin Availability] Response status: ${response.status}`);
        
        if (!response.ok) {
          console.error(`[Admin Availability] API Error - Status: ${response.status}, Message: ${responseText}`);
          throw new Error("Invalid or expired link");
        }
        
        const data = JSON.parse(responseText);
        console.log(`[Admin Availability] Data received:`, data);
        return data;
      } catch (err) {
        console.error("[Admin Availability] Error fetching data:", err);
        throw err;
      }
    },
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (data?.responses) {
      const initialData: Record<string, boolean | null> = {};
      data.responses.forEach((response) => {
        const key = `${response.date}-${response.timeSlot}`;
        // Convert null to true (available by default)
        initialData[key] = response.available === false ? false : true;
      });
      setAvailabilityData(initialData);
    }
  }, [data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const responses = [];
      
      // Only send touched slots to preserve null values for untouched slots
      for (const [key, available] of Object.entries(availabilityData)) {
        if (touchedSlots.has(key)) {
          const [date, timeSlot] = key.split('|');
          responses.push({ date, timeSlot, available });
        }
      }
      
      return apiRequest("POST", "/api/admin-availability-responses", { token, responses });
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your availability has been submitted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit availability. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleSlot = (date: string, timeSlot: string) => {
    const key = `${date}-${timeSlot}`;
    // Track this slot as touched
    setTouchedSlots(prev => new Set([...prev, key]));
    
    setAvailabilityData((prev) => {
      const currentValue = prev[key];
      // Simple toggle: true (available) ↔ false (unavailable)
      // Default to true if undefined
      return { ...prev, [key]: currentValue === true ? false : true };
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex items-center gap-2" data-testid="loading-admin-availability-form">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading availability form...</span>
        </div>
      </div>
    );
  }

  // Show error state if query failed
  if (error) {
    console.error("[Admin Availability] Query error:", error);
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

  // Group responses by date
  const dateGroups: Record<string, AdminAvailabilityResponse[]> = {};
  data.responses.forEach((response) => {
    if (!dateGroups[response.date]) {
      dateGroups[response.date] = [];
    }
    dateGroups[response.date].push(response);
  });

  const dates = Object.keys(dateGroups).sort();
  const allSubmitted = data.responses.some(r => r.submittedAt !== null);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <CardTitle data-testid="text-admin-availability-title">
                Admin Availability Confirmation
              </CardTitle>
            </div>
            <CardDescription data-testid="text-admin-staff-name">
              {data.staff.fullName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Flexible hourly scheduling:</strong> Toggle individual hours for each day. 
                Green = available, Red = not available. Times shown are 9am-6pm.
              </AlertDescription>
            </Alert>

            <div className="space-y-6">
              {dates.map((date) => (
                <div key={date} className="space-y-2">
                  <h3 className="font-semibold text-lg" data-testid={`text-date-${date}`}>
                    {format(parseISO(date), "EEEE, MMM d")}
                  </h3>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {TIME_SLOTS.map((timeSlot) => {
                      const key = `${date}-${timeSlot}`;
                      const value = availabilityData[key];
                      // Default to true (available) if undefined
                      const isAvailable = value !== false;
                      
                      return (
                        <Button
                          key={timeSlot}
                          variant={isAvailable ? "default" : "destructive"}
                          size="sm"
                          onClick={() => toggleSlot(date, timeSlot)}
                          className={cn(
                            "flex flex-col items-center justify-center h-16",
                            isAvailable && "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                          )}
                          data-testid={`button-slot-${date}-${timeSlot}`}
                        >
                          <span className="text-xs font-semibold">
                            {timeSlot.substring(0, 2)}
                            {parseInt(timeSlot.substring(0, 2)) >= 12 ? 'pm' : 'am'}
                          </span>
                          {isAvailable ? (
                            <Check className="h-4 w-4 mt-1" />
                          ) : (
                            <X className="h-4 w-4 mt-1" />
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-4">
              <Button
                size="lg"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="w-full"
                data-testid="button-submit-admin-availability"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {allSubmitted ? "Update Availability" : "Submit Availability"}
                  </>
                )}
              </Button>

              {allSubmitted && (
                <p className="text-sm text-muted-foreground text-center" data-testid="text-previously-submitted">
                  You have previously submitted your availability. You can update it anytime.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
