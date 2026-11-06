import { storage } from "./storage";
import { sendAvailabilitySMS } from "./twilio";
import crypto from "crypto";

export function startLinenOrderScheduler() {
  console.log("[Linen Order Scheduler] Starting automated SMS scheduler (checks every minute)");

  const checkInterval = setInterval(async () => {
    const now = new Date();
    const currentDay = getDayName(now.getDay());
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`[Linen Order Scheduler] Checking for scheduled reminders at ${currentDay} ${currentHour}:${String(currentMinute).padStart(2, '0')}`);
    await processScheduledReminders(currentDay, currentHour, currentMinute);
  }, 60000);

  process.on('SIGTERM', () => {
    clearInterval(checkInterval);
    console.log("[Linen Order Scheduler] Stopped");
  });
}

function getDayName(dayNumber: number): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[dayNumber];
}

async function processScheduledReminders(currentDay: string, currentHour: number, currentMinute: number) {
  try {
    const schedules = await storage.getLinenOrderSchedules();
    const activeSchedules = schedules.filter(s => s.isActive);

    if (activeSchedules.length === 0) {
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    for (const schedule of activeSchedules) {
      const [scheduleHour, scheduleMinute] = schedule.scheduleTime.split(":").map(Number);

      const dayMatches = schedule.scheduleDay === currentDay;
      const hourMatches = scheduleHour === currentHour;
      const minuteMatches = scheduleMinute === currentMinute;
      const alreadySentToday = schedule.lastSentDate === today;

      if (dayMatches && hourMatches && minuteMatches && !alreadySentToday) {
        console.log(`[Linen Order Scheduler] Sending reminder to ${schedule.recipientName} (${schedule.scheduleDay} ${schedule.scheduleTime})`);
        await sendLinenOrderReminder(schedule, today);
      }
    }
  } catch (error) {
    console.error("[Linen Order Scheduler] Error processing reminders:", error);
  }
}

async function sendLinenOrderReminder(schedule: any, today: string) {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    
    const orderNumber = `LO-${Date.now()}`;
    const order = await storage.createDwellLinenOrder({
      token,
      scheduleId: schedule.id,
      orderNumber,
      orderDate: new Date(),
      orderDetails: {
        building: "dwell",
        cagesToCollect: 0,
        pillowcases: 0,
        singleSheets: 0,
        singleDuvets: 0,
        superkingSheets: 0,
        superkingDuvets: 0,
        bathTowels: 0,
        handTowels: 0,
        bathMats: 0,
        teaTowels: 0,
      } as any,
      status: "pending",
    } as any);

    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'http://localhost:5000';
    const orderLink = `${baseUrl}/linen-order/${token}`;
    
    const message = `Hi ${schedule.recipientName}, Please submit your weekly linen order by clicking this link: ${orderLink} - Northstay`;
    
    const smsResult = await sendAvailabilitySMS(schedule.recipientPhone, message);

    await storage.updateLinenOrderSchedule(schedule.id, {
      lastSentDate: today,
    });

    console.log(`[Linen Order Scheduler] SMS ${smsResult.success ? "sent" : "failed"} to ${schedule.recipientName}, lastSentDate updated to ${today}`);
  } catch (error) {
    console.error(`[Linen Order Scheduler] Error sending reminder to ${schedule.recipientName}:`, error);
  }
}
