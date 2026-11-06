import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Staff, Availability } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function AvailabilityMatrix() {
  const { toast } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: weekEnd });

  const { data: staff = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const { data: availability = [], isLoading: availabilityLoading } = useQuery<Availability[]>({
    queryKey: ["/api/availability", format(currentWeekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: async () => {
      const response = await fetch(
        `/api/availability?startDate=${format(currentWeekStart, "yyyy-MM-dd")}&endDate=${format(weekEnd, "yyyy-MM-dd")}`
      );
      if (!response.ok) throw new Error("Failed to fetch availability");
      return response.json();
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ staffId, date, available }: { staffId: string; date: string; available: boolean }) => {
      return apiRequest("POST", "/api/availability", { staffId, date, available });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sync/availability");
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 404 && data.error === 'SHEET_NOT_FOUND') {
          throw new Error('SHEET_NOT_FOUND');
        }
        throw new Error("Sync failed");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      toast({
        title: "Sync Complete",
        description: data.message || "Availability synced successfully",
      });
    },
    onError: (error: Error) => {
      if (error.message === 'SHEET_NOT_FOUND') {
        toast({
          title: "Availability Sheet Not Found",
          description: "The 'Availability' sheet doesn't exist in Google Sheets yet. You can manage availability manually here.",
          variant: "default",
        });
      } else {
        toast({
          title: "Sync Failed",
          description: "Failed to sync availability from Google Sheets",
          variant: "destructive",
        });
      }
    },
  });

  const getAvailabilityForStaffAndDate = (staffId: string, date: Date): boolean | undefined => {
    const record = availability.find(
      (a) => a.staffId === staffId && isSameDay(new Date(a.date), date)
    );
    return record?.available;
  };

  const handleToggle = (staffId: string, date: Date) => {
    const currentAvailability = getAvailabilityForStaffAndDate(staffId, date);
    const newAvailability = currentAvailability === undefined ? false : !currentAvailability;
    
    toggleAvailabilityMutation.mutate({
      staffId,
      date: format(date, "yyyy-MM-dd"),
      available: newAvailability,
    });
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const isLoading = staffLoading || availabilityLoading;
  const today = new Date();

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle data-testid="text-availability-title">Availability Matrix</CardTitle>
              <CardDescription>
                Manage staff availability for the week of {format(currentWeekStart, "MMM d, yyyy")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToCurrentWeek}
                data-testid="button-current-week"
              >
                <CalendarIcon className="h-4 w-4" />
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                data-testid="button-sync-availability"
              >
                <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
                Sync from Sheets
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousWeek}
              data-testid="button-previous-week"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Week
            </Button>
            <span className="text-sm font-medium" data-testid="text-week-range">
              {format(currentWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextWeek}
              data-testid="button-next-week"
            >
              Next Week
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="loading-availability">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading availability...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" data-testid="table-availability">
                <thead>
                  <tr>
                    <th className="border p-2 text-left bg-muted font-medium sticky left-0 z-10">
                      Staff Member
                    </th>
                    {weekDays.map((day) => (
                      <th
                        key={day.toISOString()}
                        className={cn(
                          "border p-2 text-center font-medium min-w-[100px]",
                          isSameDay(day, today) ? "bg-primary/10" : "bg-muted"
                        )}
                        data-testid={`header-day-${format(day, "yyyy-MM-dd")}`}
                      >
                        <div className="text-sm">{format(day, "EEE")}</div>
                        <div className="text-xs text-muted-foreground">{format(day, "MMM d")}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="border p-4 text-center text-muted-foreground">
                        No staff members found
                      </td>
                    </tr>
                  ) : (
                    staff.map((staffMember) => (
                      <tr key={staffMember.id} data-testid={`row-staff-${staffMember.id}`}>
                        <td className="border p-2 font-medium sticky left-0 bg-background z-10">
                          <div className="text-sm">{staffMember.fullName}</div>
                          <div className="text-xs text-muted-foreground">{staffMember.roleType}</div>
                        </td>
                        {weekDays.map((day) => {
                          const isAvailable = getAvailabilityForStaffAndDate(staffMember.id, day);
                          const isCurrentDay = isSameDay(day, today);
                          
                          return (
                            <td
                              key={day.toISOString()}
                              className={cn(
                                "border p-2 text-center cursor-pointer transition-colors",
                                isCurrentDay && "bg-primary/5",
                                isAvailable === true && "bg-green-100 dark:bg-green-900/30",
                                isAvailable === false && "bg-red-100 dark:bg-red-900/30",
                                isAvailable === undefined && "bg-gray-50 dark:bg-gray-800/30"
                              )}
                              onClick={() => handleToggle(staffMember.id, day)}
                              data-testid={`cell-availability-${staffMember.id}-${format(day, "yyyy-MM-dd")}`}
                            >
                              {isAvailable === true && (
                                <span className="text-green-600 dark:text-green-400 text-2xl">✓</span>
                              )}
                              {isAvailable === false && (
                                <span className="text-red-600 dark:text-red-400 text-2xl">✗</span>
                              )}
                              {isAvailable === undefined && (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 border" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 dark:bg-red-900/30 border" />
              <span>Not Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 dark:bg-gray-800/30 border" />
              <span>No Data</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
