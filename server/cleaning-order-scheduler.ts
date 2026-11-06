import { storage } from "./storage";
import { sendAvailabilitySMS } from "./twilio";
import crypto from "crypto";

// Check every minute if it's time to send cleaning supply reminders
export function startCleaningOrderScheduler() {
  console.log("[Cleaning Order Scheduler] Starting automated SMS scheduler (checks every minute)");

  // Check every minute if it's time to send
  const checkInterval = setInterval(async () => {
    const now = new Date();
    const currentDay = getDayName(now.getDay());
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`[Cleaning Order Scheduler] Checking for scheduled reminders at ${currentDay} ${currentHour}:${String(currentMinute).padStart(2, '0')}`);
    await processScheduledReminders(currentDay, currentHour, currentMinute);
  }, 60000); // Check every minute

  // Cleanup on process exit
  process.on('SIGTERM', () => {
    clearInterval(checkInterval);
    console.log("[Cleaning Order Scheduler] Stopped");
  });
}

function getDayName(dayNumber: number): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[dayNumber];
}

async function processScheduledReminders(currentDay: string, currentHour: number, currentMinute: number) {
  try {
    // Get all active schedules
    const schedules = await storage.getCleaningOrderSchedules();
    const activeSchedules = schedules.filter(s => s.isActive);

    if (activeSchedules.length === 0) {
      return;
    }

    // Get today's date in YYYY-MM-DD format for duplicate prevention
    const today = new Date().toISOString().split('T')[0];

    // Process each schedule
    for (const schedule of activeSchedules) {
      // Parse schedule time (format: "HH:MM")
      const [scheduleHour, scheduleMinute] = schedule.scheduleTime.split(":").map(Number);

      // Check if current day and time match the schedule
      const dayMatches = schedule.scheduleDay === currentDay;
      const hourMatches = scheduleHour === currentHour;
      const minuteMatches = scheduleMinute === currentMinute;
      
      // Check if we already sent today
      const alreadySentToday = schedule.lastSentDate === today;

      // Only send if: day matches, time matches exactly, and NOT already sent today
      if (dayMatches && hourMatches && minuteMatches && !alreadySentToday) {
        console.log(`[Cleaning Order Scheduler] Sending reminder for ${schedule.propertyName} (${schedule.scheduleDay} ${schedule.scheduleTime})`);
        await sendCleaningOrderReminder(schedule, today);
      }
    }
  } catch (error) {
    console.error("[Cleaning Order Scheduler] Error processing reminders:", error);
  }
}

async function sendCleaningOrderReminder(schedule: any, today: string) {
  try {
    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create pending order
    const order = await storage.createCleaningOrder({
      token,
      scheduleId: schedule.id,
      propertyName: schedule.propertyName,
      orderDate: new Date(),
      cleaningDate: new Date(),
      cleaningType: "scheduled",
      status: "pending",
    } as any);

    // Generate SMS link
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    const orderLink = `${baseUrl}/cleaning-order/${token}`;
    
    // Send SMS
    const message = `Hi ${schedule.recipientName}, This is an automated reminder to complete the Cleaning Item ordering for ${schedule.propertyName}. ${orderLink} This will be delivered on ${schedule.deliveryDay}. Thanks, Northstay`;
    
    const smsResult = await sendAvailabilitySMS(schedule.recipientPhone, message);

    // Log the reminder
    await storage.createCleaningOrderReminderLog({
      scheduleId: schedule.id,
      orderId: order.id,
      reminderType: "scheduled",
      sendMethod: "sms",
      recipient: schedule.recipientPhone,
      status: smsResult.success ? "sent" : "failed",
    });

    // Update lastSentDate to prevent duplicate sends
    await storage.updateCleaningOrderSchedule(schedule.id, {
      lastSentDate: today,
    });

    console.log(`[Cleaning Order Scheduler] SMS ${smsResult.success ? "sent" : "failed"} for ${schedule.propertyName}, lastSentDate updated to ${today}`);
  } catch (error) {
    console.error(`[Cleaning Order Scheduler] Error sending reminder for ${schedule.propertyName}:`, error);
  }
}
