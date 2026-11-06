import { Calendar, Users, MapPin, ExternalLink, CheckCircle2, Clock, X, Archive, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GroupMeeting, Candidate } from "@shared/schema";
import { format } from "date-fns";

interface MeetingCardProps {
  meeting: GroupMeeting;
  candidates: Candidate[];
  onMarkAttendance: (meetingId: string) => void;
  onCancel: (meetingId: string) => void;
  onReschedule: (meetingId: string) => void;
  onArchive?: (meetingId: string) => void;
  onDelete?: (meetingId: string) => void;
}

export function MeetingCard({ meeting, candidates, onMarkAttendance, onCancel, onReschedule, onArchive, onDelete }: MeetingCardProps) {
  const statusVariant = meeting.status === "completed" 
    ? "default" 
    : meeting.status === "cancelled" 
    ? "destructive" 
    : "secondary";

  const statusIcon = meeting.status === "completed" 
    ? CheckCircle2 
    : Clock;

  const StatusIcon = statusIcon;

  return (
    <Card data-testid={`card-meeting-${meeting.id}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-2">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base" data-testid={`text-meeting-title-${meeting.id}`}>
              {meeting.roleType === "driver" ? "Driver" : "Non-Driver"} Interview
            </CardTitle>
            <div className="mt-2">
              <p className="text-lg font-bold" data-testid={`text-meeting-date-${meeting.id}`}>
                {format(new Date(meeting.scheduledAt), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-lg font-bold text-primary" data-testid={`text-meeting-time-${meeting.id}`}>
                {format(new Date(meeting.scheduledAt), "h:mm a")}
              </p>
            </div>
          </div>
        </div>
        <Badge variant={statusVariant} className="flex items-center gap-1" data-testid={`badge-status-${meeting.id}`}>
          <StatusIcon className="h-3 w-3" />
          {meeting.status}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span data-testid={`text-candidates-count-${meeting.id}`}>
            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} scheduled
          </span>
        </div>

        {meeting.googleCalendarMeetingLink && (
          <a
            href={meeting.googleCalendarMeetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
            data-testid={`link-google-meet-${meeting.id}`}
          >
            <ExternalLink className="h-4 w-4" />
            Join Google Meet
          </a>
        )}

        {candidates.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Candidates:</p>
            <div className="flex flex-wrap gap-1">
              {candidates.map((candidate) => (
                <Badge 
                  key={candidate.id} 
                  variant="outline" 
                  className="text-xs"
                  data-testid={`badge-candidate-${candidate.id}`}
                >
                  {candidate.firstName} {candidate.lastName}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {meeting.status === "scheduled" && (
            <>
              <Button
                onClick={() => onMarkAttendance(meeting.id)}
                size="sm"
                data-testid={`button-mark-attendance-${meeting.id}`}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
              <Button
                onClick={() => onReschedule(meeting.id)}
                size="sm"
                variant="outline"
                data-testid={`button-reschedule-${meeting.id}`}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
              <Button
                onClick={() => onCancel(meeting.id)}
                size="sm"
                variant="destructive"
                data-testid={`button-cancel-${meeting.id}`}
              >
                Cancel
              </Button>
            </>
          )}
          {meeting.status !== "archived" && onArchive && (
            <Button
              onClick={() => onArchive(meeting.id)}
              size="sm"
              variant="outline"
              data-testid={`button-archive-${meeting.id}`}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
          {onDelete && (
            <Button
              onClick={() => onDelete(meeting.id)}
              size="sm"
              variant="destructive"
              data-testid={`button-delete-${meeting.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
