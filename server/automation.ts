import { storage } from "./storage";
import { createGroupMeeting } from "./calendar";
import { sendMeetingInvite, sendOnboardingForm } from "./email";
import { sendMeetingReminderToAdmins } from "./twilio";
import type { Candidate } from "@shared/schema";

interface ScheduleResult {
  success: boolean;
  meeting?: {
    id: string;
    scheduledAt: Date;
    meetingLink: string;
    candidateCount: number;
  };
  error?: string;
}

// Track sent reminders to avoid duplicates
const sentMeetingReminders = new Set<string>();

function getNextTuesday10AM(): Date {
  const now = new Date();
  const nextTuesday = new Date(now);
  
  let daysUntilTuesday = (2 - now.getDay() + 7) % 7;
  
  nextTuesday.setHours(10, 0, 0, 0);
  
  if (daysUntilTuesday === 0) {
    if (now.getHours() >= 10) {
      daysUntilTuesday = 7;
    }
  }
  
  nextTuesday.setDate(now.getDate() + daysUntilTuesday);
  
  return nextTuesday;
}

export async function scheduleGroupMeetingForCandidates(
  candidateIds: string[],
  roleType: string
): Promise<ScheduleResult> {
  try {
    if (!candidateIds || candidateIds.length === 0) {
      return {
        success: false,
        error: "No candidates provided for scheduling",
      };
    }

    const candidatesData = await Promise.all(
      candidateIds.map(id => storage.getCandidate(id))
    );

    const validCandidates = candidatesData.filter(
      (c): c is Candidate => c !== undefined && c.status === "screened"
    );

    if (validCandidates.length === 0) {
      return {
        success: false,
        error: "No valid screened candidates found",
      };
    }

    const startDateTime = getNextTuesday10AM();
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    const attendeeEmails = validCandidates.map(c => c.email);
    const candidateNames = validCandidates.map(c => `${c.firstName} ${c.lastName}`);

    console.log(`Scheduling group meeting for ${validCandidates.length} ${roleType} candidates at ${startDateTime.toISOString()}`);

    const calendarResult = await createGroupMeeting({
      title: `Group Interview - ${roleType}`,
      startDateTime,
      endDateTime,
      attendeeEmails,
      candidateNames,
    });

    if (!calendarResult.success || !calendarResult.eventId || !calendarResult.meetingLink) {
      return {
        success: false,
        error: calendarResult.error || "Failed to create calendar event",
      };
    }

    const meetingLink = calendarResult.meetingLink;
    const eventId = calendarResult.eventId;

    const meeting = await storage.createGroupMeeting({
      roleType,
      scheduledAt: startDateTime,
      googleCalendarEventId: eventId,
      googleCalendarMeetingLink: meetingLink,
      candidateIds: validCandidates.map(c => c.id),
      maxCapacity: 10,
      status: "scheduled",
    });

    const settings = await storage.getSettings();
    const onboardingFormUrl = settings?.onboardingFormUrl || "https://forms.gle/8eEMsXxzv1Fb8jZN7";

    const emailResults = await Promise.allSettled(
      validCandidates.map(async (candidate) => {
        const meetingDate = startDateTime.toLocaleString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC'
        });

        const [inviteResult, formResult] = await Promise.all([
          sendMeetingInvite(
            candidate.email,
            `${candidate.firstName} ${candidate.lastName}`,
            meetingLink,
            meetingDate
          ),
          sendOnboardingForm(
            candidate.email,
            `${candidate.firstName} ${candidate.lastName}`,
            onboardingFormUrl
          ),
        ]);

        if (!inviteResult.success) {
          console.error(`Failed to send meeting invite to ${candidate.email}:`, inviteResult.error);
        }

        if (!formResult.success) {
          console.error(`Failed to send onboarding form to ${candidate.email}:`, formResult.error);
        }

        await storage.updateCandidate(candidate.id, {
          status: "scheduled",
          meetingScheduledAt: startDateTime,
        });

        return { candidate, inviteResult, formResult };
      })
    );

    const successfulEmails = emailResults.filter(r => r.status === "fulfilled").length;
    console.log(`Successfully sent emails to ${successfulEmails}/${validCandidates.length} candidates`);

    return {
      success: true,
      meeting: {
        id: meeting.id,
        scheduledAt: startDateTime,
        meetingLink: meetingLink,
        candidateCount: validCandidates.length,
      },
    };
  } catch (error) {
    console.error("Error in scheduleGroupMeetingForCandidates:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// Check for meetings starting in next 15 minutes and send admin reminders
export async function checkUpcomingMeetingsAndNotify() {
  try {
    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000);

    // Get all scheduled meetings
    const meetings = await storage.getGroupMeetings();
    
    // Filter meetings that are scheduled to start in the next 15-20 minute window
    // We use a 5-minute window to avoid sending multiple reminders for the same meeting
    const upcomingMeetings = meetings.filter(meeting => {
      if (meeting.status !== "scheduled") return false;
      
      const meetingTime = new Date(meeting.scheduledAt);
      const isInWindow = meetingTime > fifteenMinutesFromNow && meetingTime <= twentyMinutesFromNow;
      const notAlreadySent = !sentMeetingReminders.has(meeting.id);
      
      return isInWindow && notAlreadySent;
    });

    if (upcomingMeetings.length === 0) {
      return;
    }

    // Get admin phone numbers from settings
    const settings = await storage.getHiringSettings();
    if (!settings || !settings.adminPhoneNumbers || settings.adminPhoneNumbers.length === 0) {
      console.error("[Meeting Reminder] No admin phone numbers configured in settings");
      return;
    }

    // Send reminders for each upcoming meeting
    for (const meeting of upcomingMeetings) {
      // Get candidate details
      const candidates = await Promise.all(
        meeting.candidateIds.map(id => storage.getCandidate(id))
      );
      const validCandidates = candidates.filter(c => c !== undefined);
      
      if (validCandidates.length === 0) {
        continue;
      }

      const candidateInfo = validCandidates.map(c => ({
        name: `${c!.firstName} ${c!.lastName}`,
        phone: c!.phone || "No phone",
      }));

      // Generate attendance link
      const attendanceLink = meeting.attendanceToken 
        ? `https://css-operations-hub.replit.app/api/meetings/attendance-token/${meeting.attendanceToken}`
        : "No token available";

      const meetingTime = new Date(meeting.scheduledAt);
      const result = await sendMeetingReminderToAdmins({
        meetingTime: meetingTime.toLocaleString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        roleType: meeting.roleType,
        candidates: candidateInfo,
        attendanceLink,
        adminPhoneNumbers: settings.adminPhoneNumbers,
      });

      if (result.success) {
        // Mark as sent to avoid duplicates
        sentMeetingReminders.add(meeting.id);
        console.log(`[Meeting Reminder] Sent reminders for meeting ${meeting.id} to ${result.sent.length} admins`);
        
        // Clean up old entries after 2 hours
        setTimeout(() => {
          sentMeetingReminders.delete(meeting.id);
        }, 2 * 60 * 60 * 1000);
      } else {
        console.error(`[Meeting Reminder] Failed to send reminders for meeting ${meeting.id}:`, result.error);
      }
    }
  } catch (error) {
    console.error("[Meeting Reminder] Error checking upcoming meetings:", error);
  }
}

// Start the meeting reminder scheduler
export function startMeetingReminderScheduler() {
  console.log("[Meeting Reminder Scheduler] Starting automated meeting reminder system");
  
  // Check every minute for upcoming meetings
  const checkInterval = setInterval(async () => {
    await checkUpcomingMeetingsAndNotify();
  }, 60000); // Check every minute

  // Also check immediately on startup
  checkUpcomingMeetingsAndNotify();

  // Cleanup on process exit
  process.on('SIGTERM', () => {
    clearInterval(checkInterval);
    console.log("[Meeting Reminder Scheduler] Stopped");
  });

  // Cleanup on process interrupt
  process.on('SIGINT', () => {
    clearInterval(checkInterval);
    console.log("[Meeting Reminder Scheduler] Stopped");
  });
}
