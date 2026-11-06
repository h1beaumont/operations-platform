import { storage } from "../storage";
import type { InsertDailyTaskInstance } from "@shared/schema";

/**
 * Generate cleaning supply check task for today
 * Checks which properties should have submitted orders today vs actual submissions
 */
export async function generateCleaningSupplyCheckTask(date: string): Promise<InsertDailyTaskInstance | null> {
  console.log(`[Cleaning Supply Task] Generating check task for ${date}`);
  
  try {
    // Get the day of week for the given date
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();
    
    // Get all active schedules that should have submitted today
    const allSchedules = await storage.getCleaningOrderSchedules();
    const expectedSchedules = allSchedules.filter(s => 
      s.isActive && s.scheduleDay.toLowerCase() === dayOfWeek
    );
    
    if (expectedSchedules.length === 0) {
      console.log(`[Cleaning Supply Task] No schedules expected for ${dayOfWeek}`);
      return null;
    }
    
    // Get all orders for today
    const allOrders = await storage.getCleaningOrders({});
    const todayOrders = allOrders.filter(o => o.orderDate === date);
    
    // Count submitted vs pending
    const submittedCount = todayOrders.filter(o => o.submittedAt).length;
    const pendingCount = expectedSchedules.length - submittedCount;
    
    // Find which schedules are still pending
    const submittedScheduleIds = new Set(todayOrders.map(o => o.scheduleId).filter(Boolean));
    const pendingSchedules = expectedSchedules.filter(s => !submittedScheduleIds.has(s.id));
    
    // Create task description with details
    let description = `Expected: ${expectedSchedules.length} | Submitted: ${submittedCount} | Pending: ${pendingCount}\n\n`;
    
    if (pendingSchedules.length > 0) {
      description += `Pending properties:\n`;
      pendingSchedules.forEach(s => {
        description += `- ${s.propertyName} (${s.recipientName})\n`;
      });
    } else {
      description += `✅ All cleaning supply orders submitted for today!`;
    }
    
    // Get a staff member to assign to (preferably an admin)
    const allStaff = await storage.getAllStaff();
    const adminStaff = allStaff.find(s => s.email?.includes('harry') || s.email?.includes('aras'));
    const assignedTo = adminStaff?.id || allStaff.find(s => s.status === 'active')?.id;
    
    if (!assignedTo) {
      console.log(`[Cleaning Supply Task] No staff member to assign task to`);
      return null;
    }
    
    // Create task data
    const taskData: InsertDailyTaskInstance = {
      templateId: undefined, // This is a system-generated task, not from template
      scheduledDate: date,
      name: "Review Cleaning Supply Orders",
      description,
      category: "admin",
      priority: pendingCount > 0 ? "high" : "low",
      estimatedMinutes: 10,
      timeOfDay: "morning",
      assignedTo,
      status: "pending",
      completedBy: undefined,
      completedAt: undefined,
      notes: undefined,
    };
    
    console.log(`[Cleaning Supply Task] Task generated - ${expectedSchedules.length} expected, ${submittedCount} submitted, ${pendingCount} pending`);
    return taskData;
    
  } catch (error) {
    console.error(`[Cleaning Supply Task] Error generating task for ${date}:`, error);
    return null;
  }
}
