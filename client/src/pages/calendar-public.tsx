import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, addWeeks, startOfWeek } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Loader2, AlertCircle, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface Assignment {
  id: string;
  date: string;
  slotStart: string;
  slotEnd: string;
  status: string;
  propertyName: string;
  propertyAddress: string;
  estimatedDuration?: number;
  notes?: string;
}

interface CalendarData {
  staffId: string;
  weekStart: string;
  assignments: Assignment[];
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  assigned: { label: "Assigned", variant: "default" },
  confirmed: { label: "Confirmed", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function CalendarPublic() {
  const [, params] = useRoute("/calendar/:token");
  const token = params?.token || "";
  
  // Calculate current week's Monday
  const getCurrentMonday = () => {
    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    return format(monday, "yyyy-MM-dd");
  };
  
  const [weekStart, setWeekStart] = useState(getCurrentMonday());

  // Reset to current week when token changes
  useEffect(() => {
    if (token) {
      setWeekStart(getCurrentMonday());
    }
  }, [token]);

  const { data, isLoading, error } = useQuery<CalendarData>({
    queryKey: ["/api/calendar", token, weekStart],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/${token}?weekStart=${weekStart}`);
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid or expired token");
        }
        throw new Error("Failed to fetch calendar");
      }
      return response.json();
    },
    enabled: !!token,
  });

  const goToPreviousWeek = () => {
    const currentWeek = parseISO(weekStart);
    const previousWeek = addWeeks(currentWeek, -1);
    setWeekStart(format(previousWeek, "yyyy-MM-dd"));
  };

  const goToNextWeek = () => {
    const currentWeek = parseISO(weekStart);
    const nextWeek = addWeeks(currentWeek, 1);
    setWeekStart(format(nextWeek, "yyyy-MM-dd"));
  };

  const goToCurrentWeek = () => {
    setWeekStart(getCurrentMonday());
  };

  // Generate 7 days from weekStart
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);
    return format(date, "yyyy-MM-dd");
  });

  // Group assignments by date
  const assignmentsByDate: Record<string, Assignment[]> = {};
  if (data?.assignments) {
    data.assignments.forEach((assignment) => {
      if (!assignmentsByDate[assignment.date]) {
        assignmentsByDate[assignment.date] = [];
      }
      assignmentsByDate[assignment.date].push(assignment);
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex items-center gap-2" data-testid="loading-calendar">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading calendar...</span>
        </div>
      </div>
    );
  }

  // Error state (invalid token)
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle data-testid="text-invalid-token">Invalid Link</CardTitle>
            </div>
            <CardDescription>
              This calendar link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {error instanceof Error ? error.message : "Unable to load calendar"}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header with week navigation */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle data-testid="text-calendar-title">My Cleaning Schedule</CardTitle>
                  <CardDescription data-testid="calendar-week-display">
                    Week of {format(parseISO(weekStart), "MMM d, yyyy")}
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousWeek}
                  data-testid="button-prev-week"
                  title="Previous week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToCurrentWeek}
                  data-testid="button-current-week"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextWeek}
                  data-testid="button-next-week"
                  title="Next week"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Calendar grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {weekDays.map((date) => {
            const dayAssignments = assignmentsByDate[date] || [];
            const isToday = date === format(new Date(), "yyyy-MM-dd");
            
            return (
              <Card
                key={date}
                className={cn(
                  "flex flex-col",
                  isToday && "ring-2 ring-primary"
                )}
                data-testid={`day-card-${date}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold" data-testid={`text-day-${date}`}>
                        {format(parseISO(date), "EEE")}
                      </div>
                      <div className={cn(
                        "text-2xl font-bold",
                        isToday && "text-primary"
                      )}>
                        {format(parseISO(date), "d")}
                      </div>
                    </div>
                    {dayAssignments.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {dayAssignments.length}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 space-y-2">
                  {dayAssignments.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No assignments
                    </div>
                  ) : (
                    dayAssignments.map((assignment) => {
                      const statusInfo = statusConfig[assignment.status] || statusConfig.assigned;
                      
                      return (
                        <Card
                          key={assignment.id}
                          className="p-3 space-y-2 hover-elevate"
                          data-testid={`card-assignment-${assignment.id}`}
                        >
                          <div className="space-y-1">
                            <div className="font-semibold text-sm leading-tight">
                              {assignment.propertyName}
                            </div>
                            <div className="flex items-start gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{assignment.propertyAddress}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            <span className="font-medium">
                              {assignment.slotStart} - {assignment.slotEnd}
                            </span>
                            {assignment.estimatedDuration && (
                              <span className="text-muted-foreground">
                                ({assignment.estimatedDuration}min)
                              </span>
                            )}
                          </div>
                          
                          <Badge
                            variant={statusInfo.variant}
                            className="text-xs"
                          >
                            {statusInfo.label}
                          </Badge>
                          
                          {assignment.notes && (
                            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                              {assignment.notes}
                            </div>
                          )}
                        </Card>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty state */}
        {data.assignments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Assignments This Week</h3>
              <p className="text-sm text-muted-foreground">
                You don't have any cleaning assignments scheduled for this week.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
