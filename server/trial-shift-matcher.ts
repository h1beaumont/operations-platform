import { storage } from "./storage";
import { sendTrialShiftNotification } from "./email";
import { sendTrialShiftNotificationSMS } from "./twilio";
import { format, addDays, nextFriday, nextSunday, isFriday, isSunday } from "date-fns";
import type { Candidate } from "@shared/schema";

const MENTOR_NAMES = ["StaffD", "StaffE", "StaffF", "StaffG"];

/**
 * Find next Friday or Sunday (whichever comes first)
 */
function getNextTrialShiftDate(): Date {
  const now = new Date();
  const friday = nextFriday(now);
  const sunday = nextSunday(now);
  
  return friday < sunday ? friday : sunday;
}

/**
 * Check if a mentor is available on a specific date for full shift (10am-3pm)
 */
async function isMentorAvailableOnDate(mentorId: string, date: string): Promise<boolean> {
  try {
    // Query availability_responses for this mentor on this date
    const responses = await storage.getAvailabilityResponsesByStaffAndDate(mentorId, date);
    
    if (!responses || responses.length === 0) {
      console.log(`[Trial Shift Matcher] No availability data for mentor ${mentorId} on ${date}`);
      return false;
    }
    
    // Check if mentor is available for all required time slots (10:00-15:00)
    // Time slots: 10:00, 11:00, 12:00, 13:00, 14:00
    const requiredSlots = ["10:00", "11:00", "12:00", "13:00", "14:00"];
    const availableSlots = responses
      .filter(r => r.available)
      .map(r => r.timeSlot);
    
    const hasAllSlots = requiredSlots.every(slot => availableSlots.includes(slot));
    
    console.log(`[Trial Shift Matcher] Mentor ${mentorId} on ${date}: available slots = ${availableSlots.join(', ')}, has all required = ${hasAllSlots}`);
    
    return hasAllSlots;
  } catch (error) {
    console.error(`[Trial Shift Matcher] Error checking mentor availability:`, error);
    return false;
  }
}

/**
 * Find an available mentor for the given date
 */
async function findAvailableMentor(targetDate: Date): Promise<{ mentor: any; available: boolean }> {
  const dateStr = format(targetDate, 'yyyy-MM-dd');
  
  // Query all mentors by name
  const mentors = await Promise.all(
    MENTOR_NAMES.map(name => storage.findStaffByName(name))
  );
  
  // Filter out null results
  const validMentors = mentors.filter(m => m !== null);
  
  if (validMentors.length === 0) {
    console.error('[Trial Shift Matcher] No mentors found in staff table');
    return { mentor: null, available: false };
  }
  
  // Check availability for each mentor
  for (const mentor of validMentors) {
    const isAvailable = await isMentorAvailableOnDate(mentor!.id, dateStr);
    
    if (isAvailable) {
      console.log(`[Trial Shift Matcher] Found available mentor: ${mentor!.fullName}`);
      return { mentor, available: true };
    }
  }
  
  console.log(`[Trial Shift Matcher] No mentors available on ${dateStr}`);
  return { mentor: null, available: false };
}

/**
 * Auto-assign trial shifts to a newly hired candidate
 */
export async function autoAssignTrialShifts(
  candidate: Candidate
): Promise<{ success: boolean; shifts?: any[]; error?: string }> {
  try {
    console.log(`[Trial Shift Matcher] Auto-assigning trial shifts for ${candidate.firstName} ${candidate.lastName}`);
    
    let shift1Date = getNextTrialShiftDate();
    let shift2Date: Date;
    
    // Shift 2 should be the same day of the week but next week
    if (isFriday(shift1Date)) {
      shift2Date = addDays(shift1Date, 7); // Next Friday
    } else {
      shift2Date = addDays(shift1Date, 7); // Next Sunday
    }
    
    // Find available mentor for shift 1
    let mentorResult = await findAvailableMentor(shift1Date);
    
    // If no mentor available on first date, try next Friday/Sunday
    if (!mentorResult.available) {
      console.log(`[Trial Shift Matcher] No mentor available on ${format(shift1Date, 'yyyy-MM-dd')}, trying next date...`);
      
      shift1Date = isFriday(shift1Date) 
        ? nextSunday(shift1Date) 
        : nextFriday(addDays(shift1Date, 1));
      
      shift2Date = addDays(shift1Date, 7);
      
      mentorResult = await findAvailableMentor(shift1Date);
    }
    
    // Still no mentor available - flag for manual assignment
    if (!mentorResult.available) {
      console.log(`[Trial Shift Matcher] Still no mentor available, flagging for manual assignment`);
      
      await storage.updateCandidate(candidate.id, {
        status: "trial",
        notes: (candidate.notes || "") + 
          `\n[AUTO-ASSIGNMENT FAILED] ${new Date().toISOString()}: No mentors available for trial shifts. Requires manual scheduling.`
      });
      
      return {
        success: false,
        error: "No mentors available - flagged for manual assignment"
      };
    }
    
    const mentor = mentorResult.mentor;
    
    // Create Trial Shift 1
    const shift1 = await storage.createTrialShift({
      candidateId: candidate.id,
      mentorStaffId: mentor.id,
      shiftNumber: 1,
      scheduledAt: shift1Date,
      location: "TBD", // Location can be set manually by admin
      status: "scheduled"
    });
    
    // Create Trial Shift 2
    const shift2 = await storage.createTrialShift({
      candidateId: candidate.id,
      mentorStaffId: mentor.id,
      shiftNumber: 2,
      scheduledAt: shift2Date,
      location: "TBD",
      status: "scheduled"
    });
    
    // Update candidate status to "trial"
    await storage.updateCandidate(candidate.id, {
      status: "trial"
    });
    
    // Send notification email
    const shift1DateFormatted = format(shift1Date, "EEEE, MMMM d, yyyy 'at' 10:00 AM - 3:00 PM");
    const shift2DateFormatted = format(shift2Date, "EEEE, MMMM d, yyyy 'at' 10:00 AM - 3:00 PM");
    
    await sendTrialShiftNotification(
      candidate.email,
      `${candidate.firstName} ${candidate.lastName}`,
      shift1DateFormatted,
      shift2DateFormatted,
      mentor.fullName,
      "TBD"
    );
    
    // Send SMS if phone available
    if (candidate.phone) {
      await sendTrialShiftNotificationSMS(
        candidate.phone,
        `${candidate.firstName} ${candidate.lastName}`,
        shift1DateFormatted,
        shift2DateFormatted,
        mentor.fullName
      );
    }
    
    console.log(`[Trial Shift Matcher] Successfully assigned trial shifts to candidate ${candidate.id} with mentor ${mentor.fullName}`);
    
    return {
      success: true,
      shifts: [shift1, shift2]
    };
  } catch (error) {
    console.error("[Trial Shift Matcher] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
