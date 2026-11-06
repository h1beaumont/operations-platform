import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  MessageSquare,
  FileText,
  User,
  Building2,
  Award,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Staff, ComplianceEvent } from "@shared/schema";

// Compliance weights for calculating points
const COMPLIANCE_WEIGHTS: Record<string, number> = {
  "Arrived on time": 1.5,
  "Signed into property on time": 1.0,
  "Taken all photos and completed all tasks on Properly": 2.0,
  "Ensured all damage is reported on time": 2.0,
  "Used correct staff entrance at Head Office (not front reception doors)": 0.5,
  "Signed in a trolley at start and signed out a trolley at end of shift": 1.0,
  "Signed in cleaning caddy with all items; signed cleaning caddy back in and returned all items": 1.0,
  "Used the chatbot every time linen was packed": 1.5,
  "Did not miss any special requests in the chatbot": 1.5,
  "Placed used linen in the linen hampers (not left in pillowcases/on the floor)": 1.0,
  "Finished cleans on time; if they overran, they told us": 2.0,
  "Submitted availability on time": 1.0,
};

// Question mapping
const QUESTION_MAP: Record<string, string> = {
  q1: "Arrived on time",
  q2: "Signed into property on time",
  q3: "Taken all photos and completed all tasks on Properly",
  q4: "Ensured all damage is reported on time",
  q5: "Used correct staff entrance at Head Office (not front reception doors)",
  q6: "Signed in a trolley at start and signed out a trolley at end of shift",
  q7: "Signed in cleaning caddy with all items; signed cleaning caddy back in and returned all items",
  q8: "Used the chatbot every time linen was packed",
  q9: "Did not miss any special requests in the chatbot",
  q10: "Placed used linen in the linen hampers (not left in pillowcases/on the floor)",
  q11: "Finished cleans on time; if they overran, they told us",
};

// Automated questions (q6, q7, q8, q9)
const AUTOMATED_QUESTIONS = new Set(["q6", "q7", "q8", "q9"]);

interface EnrichedComplianceEvent extends ComplianceEvent {
  staffName: string;
}

export default function ComplianceHistory() {
  console.log("🔍 ComplianceHistory component rendering");
  
  const [staffFilter, setStaffFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<EnrichedComplianceEvent | null>(null);

  // Fetch staff
  const { data: staff = [], isLoading: loadingStaff } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  // Create filters object for queryKey
  const filters = {
    staffId: staffFilter,
    startDate: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
    endDate: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
  };

  // Fetch compliance events with custom queryFn to properly send filters
  const {
    data: events = [],
    isLoading: loadingEvents,
    refetch,
  } = useQuery<EnrichedComplianceEvent[]>({
    queryKey: ["/api/compliance/events", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.staffId) params.append("staffId", filters.staffId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      
      const url = `/api/compliance/events?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch compliance events");
      return response.json();
    },
  });

  const handleClearFilters = () => {
    setStaffFilter("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const getScoreColor = (points: number, maxPoints: number = 15.0) => {
    const percentage = (points / maxPoints) * 100;
    if (percentage >= 86.7) return "text-green-600 dark:text-green-400"; // 13-15
    if (percentage >= 66.7) return "text-yellow-600 dark:text-yellow-400"; // 10-12.9
    return "text-red-600 dark:text-red-400"; // <10
  };

  const getScoreBadgeVariant = (points: number, maxPoints: number = 15.0) => {
    const percentage = (points / maxPoints) * 100;
    if (percentage >= 86.7) return "default"; // Success
    if (percentage >= 66.7) return "secondary"; // Warning
    return "destructive"; // Low
  };

  const calculateAutomatedPoints = (event: ComplianceEvent) => {
    const rawPayload = event.rawPayload as any;
    if (!rawPayload?.checks) return 0;
    
    let automatedPoints = 0;
    AUTOMATED_QUESTIONS.forEach((q) => {
      if (rawPayload.checks[q] === "yes") {
        const questionText = QUESTION_MAP[q];
        automatedPoints += COMPLIANCE_WEIGHTS[questionText] || 0;
      }
    });
    
    return automatedPoints;
  };

  console.log("📊 ComplianceHistory - loadingStaff:", loadingStaff, "staff count:", staff.length);
  
  if (loadingStaff) {
    console.log("⏳ ComplianceHistory showing loading skeletons");
    return (
      <div className="space-y-6" data-testid="compliance-history-loading">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  console.log("✅ ComplianceHistory rendering main content");

  return (
    <div className="space-y-6" data-testid="compliance-history-content">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Compliance Audit Log
        </h1>
        <p className="text-muted-foreground mt-2" data-testid="text-page-description">
          Complete audit trail of all compliance submissions with detailed evidence and automated checks
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter compliance events by staff member and date range
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Staff Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Staff Member</label>
              <Select value={staffFilter || "all"} onValueChange={(v) => setStaffFilter(v === "all" ? "" : v)}>
                <SelectTrigger data-testid="select-staff-filter">
                  <SelectValue placeholder="All staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All staff</SelectItem>
                  {staff
                    .filter((s) => s.status === "active")
                    .sort((a, b) => a.fullName.localeCompare(b.fullName))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    data-testid="button-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex gap-2">
            <Button onClick={() => refetch()} data-testid="button-apply-filters">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>
            <Button
              variant="outline"
              onClick={handleClearFilters}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Compliance Events</CardTitle>
              <CardDescription>
                {loadingEvents ? "Loading..." : `${events.length} events found`}
              </CardDescription>
            </div>
            <Button variant="outline" disabled>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingEvents ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No compliance events found</p>
              <p className="text-muted-foreground text-sm">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Auto Points</TableHead>
                    <TableHead>Manual Points</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const autoPoints = calculateAutomatedPoints(event);
                    const manualPoints = event.points - autoPoints;
                    
                    return (
                      <TableRow key={event.eventId} data-testid={`row-event-${event.eventId}`}>
                        <TableCell className="font-medium">
                          {format(new Date(event.eventDate), "PPP")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {event.staffName}
                          </div>
                        </TableCell>
                        <TableCell>
                          {event.property ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {event.property}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getScoreBadgeVariant(event.points, event.maxPoints)}>
                            {event.points.toFixed(1)} / {event.maxPoints.toFixed(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {autoPoints.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {manualPoints.toFixed(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(event.createdAt), "PPp")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedEvent(event)}
                                data-testid={`button-view-details-${event.eventId}`}
                              >
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Compliance Event Details</DialogTitle>
                                <DialogDescription>
                                  Complete breakdown of compliance submission
                                </DialogDescription>
                              </DialogHeader>
                              {selectedEvent && (
                                <ComplianceEventDetails event={selectedEvent} />
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceEventDetails({ event }: { event: EnrichedComplianceEvent }) {
  const rawPayload = event.rawPayload as any;
  const checks = rawPayload?.checks || {};
  const automationSummary = rawPayload?.automationSummary;
  const notes = rawPayload?.notes;
  const auditor = rawPayload?.auditor;

  const autoPoints = Object.keys(checks)
    .filter((q) => AUTOMATED_QUESTIONS.has(q) && checks[q] === "yes")
    .reduce((sum, q) => sum + (COMPLIANCE_WEIGHTS[QUESTION_MAP[q]] || 0), 0);

  const manualPoints = event.points - autoPoints;

  return (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="space-y-6">
        {/* Event Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Staff Member</p>
            <p className="text-base font-medium">{event.staffName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Event Date</p>
            <p className="text-base font-medium">{format(new Date(event.eventDate), "PPP")}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Property</p>
            <p className="text-base font-medium">{event.property || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Score</p>
            <p className="text-lg font-bold">{event.points.toFixed(1)} / {event.maxPoints.toFixed(1)}</p>
          </div>
        </div>

        <Separator />

        {/* Points Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Automated Points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {autoPoints.toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                From equipment tracking & chatbot
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Manual Points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {manualPoints.toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                From supervisor verification
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Automated Checks Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Automated Checks
            <Badge variant="secondary">Auto-calculated</Badge>
          </h3>
          <div className="space-y-3">
            {/* Trolley */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Trolley Sign-in/out</span>
                  {checks.q6 === "yes" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Status: </span>
                  {checks.q6 === "yes" ? (
                    <span className="text-green-600">Compliant (+{COMPLIANCE_WEIGHTS[QUESTION_MAP.q6]} pts)</span>
                  ) : (
                    <span className="text-red-600">Non-compliant (0 pts)</span>
                  )}
                </div>
                {automationSummary?.trolley && (
                  <div className="text-sm space-y-1 bg-muted p-3 rounded">
                    <p><span className="font-medium">Sign-in:</span> {automationSummary.trolley.signInTime || "N/A"}</p>
                    <p><span className="font-medium">Sign-out:</span> {automationSummary.trolley.signOutTime || "N/A"}</p>
                    <p><span className="font-medium">Equipment:</span> {automationSummary.trolley.equipmentNumber || "N/A"}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Caddy */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Cleaning Caddy</span>
                  {checks.q7 === "yes" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Status: </span>
                  {checks.q7 === "yes" ? (
                    <span className="text-green-600">Compliant (+{COMPLIANCE_WEIGHTS[QUESTION_MAP.q7]} pts)</span>
                  ) : (
                    <span className="text-red-600">Non-compliant (0 pts)</span>
                  )}
                </div>
                {automationSummary?.caddy && (
                  <div className="text-sm space-y-1 bg-muted p-3 rounded">
                    <p><span className="font-medium">Sign-in:</span> {automationSummary.caddy.signInTime || "N/A"}</p>
                    <p><span className="font-medium">Sign-out:</span> {automationSummary.caddy.signOutTime || "N/A"}</p>
                    <p><span className="font-medium">Equipment:</span> {automationSummary.caddy.equipmentNumber || "N/A"}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chatbot */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Chatbot Usage (Linen Packing)</span>
                  {checks.q8 === "yes" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Status: </span>
                  {checks.q8 === "yes" ? (
                    <span className="text-green-600">Compliant (+{COMPLIANCE_WEIGHTS[QUESTION_MAP.q8]} pts)</span>
                  ) : (
                    <span className="text-red-600">Non-compliant (0 pts)</span>
                  )}
                </div>
                {automationSummary?.chatbot && (
                  <div className="text-sm space-y-1 bg-muted p-3 rounded">
                    <p><span className="font-medium">Sessions:</span> {automationSummary.chatbot.sessionCount || 0}</p>
                    {automationSummary.chatbot.propertiesViewed && (
                      <p><span className="font-medium">Properties:</span> {automationSummary.chatbot.propertiesViewed.join(", ")}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Special Requests */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Special Requests Completion</span>
                  {checks.q9 === "yes" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Status: </span>
                  {checks.q9 === "yes" ? (
                    <span className="text-green-600">Compliant (+{COMPLIANCE_WEIGHTS[QUESTION_MAP.q9]} pts)</span>
                  ) : (
                    <span className="text-red-600">Non-compliant (0 pts)</span>
                  )}
                </div>
                {automationSummary?.specialRequests && (
                  <div className="text-sm space-y-1 bg-muted p-3 rounded">
                    <p><span className="font-medium">Completed:</span> {automationSummary.specialRequests.completedCount || 0}</p>
                    {automationSummary.specialRequests.missingRequests && automationSummary.specialRequests.missingRequests.length > 0 && (
                      <div>
                        <p className="font-medium text-red-600">Missing Requests:</p>
                        <ul className="list-disc list-inside ml-2">
                          {automationSummary.specialRequests.missingRequests.map((req: string, idx: number) => (
                            <li key={idx}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Manual Checks Section */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Manual Checks
          </h3>
          <div className="space-y-2">
            {Object.entries(QUESTION_MAP)
              .filter(([q]) => !AUTOMATED_QUESTIONS.has(q))
              .map(([questionId, questionText]) => (
                <div
                  key={questionId}
                  className="flex items-center justify-between p-3 bg-muted rounded"
                >
                  <div className="flex items-center gap-2">
                    {checks[questionId] === "yes" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">{questionText}</span>
                  </div>
                  <Badge variant={checks[questionId] === "yes" ? "default" : "destructive"}>
                    {checks[questionId] === "yes"
                      ? `+${COMPLIANCE_WEIGHTS[questionText]} pts`
                      : "0 pts"}
                  </Badge>
                </div>
              ))}
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div>
            <h3 className="text-lg font-semibold mb-2">Notes</h3>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-wrap">{notes}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Auditor */}
        {auditor && (
          <div>
            <p className="text-sm text-muted-foreground">
              Submitted by: <span className="font-medium">{auditor}</span>
            </p>
          </div>
        )}

        {/* Raw Payload (Collapsible) */}
        <Accordion type="single" collapsible>
          <AccordionItem value="raw-payload">
            <AccordionTrigger>
              <span className="text-sm font-medium">Raw Payload (Admin Only)</span>
            </AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                {JSON.stringify(rawPayload, null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  );
}
