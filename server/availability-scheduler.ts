import { storage } from "./storage";
import { sendAvailabilitySMS } from "./twilio";

// Schedule availability SMS for Wed/Sun at 4:30pm
export function startAvailabilityScheduler() {
  console.log("[Availability Scheduler] Starting automated SMS scheduler for Wed/Sun 4:30pm");

  // Check every minute if it's time to send
  const checkInterval = setInterval(async () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 3 = Wednesday
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Check if it's Wed (3) or Sun (0) at 16:30 (4:30pm)
    const isWednesday = dayOfWeek === 3;
    const isSunday = dayOfWeek === 0;
    const isScheduledTime = hour === 16 && minute === 30;

    if ((isWednesday || isSunday) && isScheduledTime) {
      console.log("[Availability Scheduler] Sending SMS requests now...");
      await sendAvailabilityRequests();
    }
  }, 60000); // Check every minute

  // Cleanup on process exit
  process.on('SIGTERM', () => {
    clearInterval(checkInterval);
    console.log("[Availability Scheduler] Stopped");
  });
}

async function sendAvailabilityRequests() {
  try {
    // Calculate period (next 7 days)
    const today = new Date();
    const periodStart = new Date(today);
    periodStart.setDate(today.getDate() + 1);
    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 6);

    // Get all active staff with phone numbers
    const allStaff = await storage.getAllStaff();
    const activeStaff = allStaff.filter(s => s.status === "active" && s.phone);

    if (activeStaff.length === 0) {
      console.log("[Availability Scheduler] No active staff with phone numbers found");
      return;
    }

    // Create request record with 24-hour deadline
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 24);
    
    const request = await storage.createAvailabilityRequest({
      periodStart: periodStart.toISOString().split("T")[0],
      periodEnd: periodEnd.toISOString().split("T")[0],
      deadline: deadline,
      staffIds: activeStaff.map(s => s.id),
      status: "pending",
    });

    let sentCount = 0;
    const errors: string[] = [];

    // Send SMS to each staff member
    for (const staff of activeStaff) {
      const token = `${staff.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      // Use production URL from environment or fallback to localhost
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';
      
      const responseLink = `${baseUrl}/availability-submit/${token}`;

      const result = await sendAvailabilitySMS(staff.phone!, responseLink);

      if (result.success) {
        sentCount++;

        // Pre-create response records for each day/timeslot
        const days = [];
        for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
          days.push(new Date(d).toISOString().split("T")[0]);
        }

        const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];

        for (const day of days) {
          for (const slot of timeSlots) {
            await storage.createAvailabilityResponse({
              requestId: request.id,
              staffId: staff.id,
              responseToken: token,
              date: day,
              timeSlot: slot,
              available: undefined,
              submittedAt: undefined,
            });
          }
        }
      } else {
        errors.push(`${staff.fullName}: ${result.error}`);
      }
    }

    // Update request status
    await storage.updateAvailabilityRequest(request.id, {
      sentCount,
      status: sentCount > 0 ? (errors.length > 0 ? "partial" : "sent") : "failed",
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
    });

    console.log(`[Availability Scheduler] Sent to ${sentCount}/${activeStaff.length} staff members`);
    if (errors.length > 0) {
      console.error("[Availability Scheduler] Errors:", errors);
    }
  } catch (error: any) {
    console.error("[Availability Scheduler] Failed to send availability requests:", error.message);
  }
}
