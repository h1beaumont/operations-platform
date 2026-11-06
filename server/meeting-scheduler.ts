import { storage } from "./storage";
import { createGroupMeetingDualCalendar } from "./calendar-dual";
import { sendMeetingInvite } from "./email";
import { sendMeetingInviteSMS } from "./twilio";
import { format, addDays, addWeeks, isWeekend } from "date-fns";
import type { Candidate } from "@shared/schema";

/**
 * Find next available weekday (Mon-Fri) at 2:00 PM
 * Skip weekends, but don't go beyond 2 weeks from now
 */
function getNextWeekdayAt2PM(): Date | null {
  const now = new Date();
  const twoWeeksFromNow = addWeeks(now, 2);
  
  let candidate = addDays(now, 1); // Start with tomorrow
  
  // Set time to 2:00 PM (14:00)
  candidate.setHours(14, 0, 0, 0);
  
  while (candidate <= twoWeeksFromNow) {
    if (!isWeekend(candidate)) {
      return candidate;
    }
    candidate = addDays(candidate, 1);
    candidate.setHours(14, 0, 0, 0);
  }
  
  return null; // No weekday found within 2 weeks
}

/**
 * Auto-schedule a candidate for a group meeting after they pass screening
 */
export async function autoScheduleCandidateForMeeting(
  candidate: Candidate
): Promise<{ success: boolean; meeting?: any; error?: string }> {
  try {
    console.log(`[Meeting Scheduler] Auto-scheduling candidate ${candidate.firstName} ${candidate.lastName} for ${candidate.roleType} meeting`);
    
    // Step 1: Find all meetings for this role type
    const allMeetings = await storage.getGroupMeetings();
    const now = new Date();
    const twoWeeksFromNow = addWeeks(now, 2);
    
    // Filter for meetings matching role type, not full, in future, within 2 weeks
    const availableMeetings = allMeetings.filter(m => 
      m.roleType === candidate.roleType &&
      m.status === "scheduled" &&
      m.candidateIds.length < m.maxCapacity &&
      new Date(m.scheduledAt) > now &&
      new Date(m.scheduledAt) <= twoWeeksFromNow
    );
    
    // Sort by scheduled date (earliest first)
    availableMeetings.sort((a, b) => 
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    );
    
    let meeting;
    
    if (availableMeetings.length > 0) {
      // Step 2a: Use existing meeting
      meeting = availableMeetings[0];
      console.log(`[Meeting Scheduler] Found existing meeting ${meeting.id} at ${meeting.scheduledAt}`);
      
      // Add candidate to meeting
      const updatedCandidateIds = [...meeting.candidateIds, candidate.id];
      meeting = await storage.updateGroupMeeting(meeting.id, {
        candidateIds: updatedCandidateIds,
        attendeeCount: updatedCandidateIds.length,
      });
    } else {
      // Step 2b: Create new meeting
      const nextMeetingTime = getNextWeekdayAt2PM();
      
      if (!nextMeetingTime) {
        return {
          success: false,
          error: "No available weekday slots within 2 weeks"
        };
      }
      
      console.log(`[Meeting Scheduler] Creating new meeting at ${nextMeetingTime}`);
      
      const endDateTime = new Date(nextMeetingTime);
      endDateTime.setHours(15, 0, 0, 0); // 1 hour meeting
      
      // Create calendar events in both calendars
      const calendarResult = await createGroupMeetingDualCalendar({
        roleType: candidate.roleType,
        startDateTime: nextMeetingTime,
        endDateTime,
        attendeeEmails: [candidate.email],
        candidateNames: [`${candidate.firstName} ${candidate.lastName}`],
      });
      
      if (!calendarResult.success) {
        console.error(`[Meeting Scheduler] Failed to create calendar events: ${calendarResult.error}`);
        // Continue even if calendar fails - we still want to create the meeting record
      }
      
      // Create meeting in database
      meeting = await storage.createGroupMeeting({
        roleType: candidate.roleType,
        scheduledAt: nextMeetingTime,
        googleCalendarEventId: calendarResult.eventId,
        googleCalendarMeetingLink: calendarResult.meetingLink,
        googleCalendarEventIdSecondary: calendarResult.eventIdSecondary,
        googleCalendarMeetingLinkSecondary: calendarResult.meetingLinkSecondary,
        candidateIds: [candidate.id],
        maxCapacity: 10,
        status: "scheduled",
      });
      
      console.log(`[Meeting Scheduler] Created meeting ${meeting.id}`);
    }
    
    // Step 3: Update candidate status
    await storage.updateCandidate(candidate.id, {
      status: "scheduled",
      meetingScheduledAt: new Date(meeting.scheduledAt),
    });
    
    // Step 4: Send confirmation email and SMS
    const meetingLink = meeting.googleCalendarMeetingLink || meeting.googleCalendarMeetingLinkSecondary || "#";
    const meetingDate = format(new Date(meeting.scheduledAt), "EEEE, MMMM d, yyyy 'at' h:mm a");
    
    // Send email
    await sendMeetingInvite(
      candidate.email,
      `${candidate.firstName} ${candidate.lastName}`,
      meetingLink,
      meetingDate
    );
    
    // Send SMS if phone available
    if (candidate.phone) {
      await sendMeetingInviteSMS(
        candidate.phone,
        `${candidate.firstName} ${candidate.lastName}`,
        meetingLink,
        meetingDate
      );
    }
    
    console.log(`[Meeting Scheduler] Successfully scheduled candidate ${candidate.id} for meeting ${meeting.id}`);
    
    return {
      success: true,
      meeting,
    };
  } catch (error) {
    console.error("[Meeting Scheduler] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
