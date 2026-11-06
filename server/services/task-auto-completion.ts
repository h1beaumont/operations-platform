import { storage, db } from "../storage";
import * as schema from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Auto-complete daily tasks based on linen stock count submission
 * @param locationCode - Location where stock count was performed
 * @param countDate - Date when the count was performed (YYYY-MM-DD)
 * @returns Number of tasks auto-completed
 */
export async function autoCompleteLinenCountTasks(
  locationCode: string,
  countDate: string
): Promise<number> {
  console.log(`[Task Auto-Completion] Checking for linen count tasks at ${locationCode} on ${countDate}`);
  
  try {
    // Find all pending daily tasks for this date that are linked to weekly rota tasks
    const dailyTasks = await db
      .select()
      .from(schema.dailyTaskInstances)
      .where(
        and(
          eq(schema.dailyTaskInstances.scheduledDate, countDate),
          eq(schema.dailyTaskInstances.status, "pending")
        )
      )
      .execute();
    
    if (dailyTasks.length === 0) {
      console.log(`[Task Auto-Completion] No pending tasks found for ${countDate}`);
      return 0;
    }
    
    // Filter for tasks that have a weeklyRotaTaskId
    const rotaTasksToCheck = dailyTasks.filter(task => task.weeklyRotaTaskId);
    
    if (rotaTasksToCheck.length === 0) {
      console.log(`[Task Auto-Completion] No weekly rota tasks found for ${countDate}`);
      return 0;
    }
    
    // Get the weekly rota task templates to check auto-completion settings
    const weeklyRotaTaskIds = rotaTasksToCheck.map(t => t.weeklyRotaTaskId!);
    const weeklyRotaTasks = await db
      .select()
      .from(schema.weeklyRotaTasks)
      .execute();
    
    const weeklyRotaTasksMap = new Map(weeklyRotaTasks.map(t => [t.id, t]));
    
    let completedCount = 0;
    
    for (const dailyTask of rotaTasksToCheck) {
      const weeklyRotaTask = weeklyRotaTasksMap.get(dailyTask.weeklyRotaTaskId!);
      
      if (!weeklyRotaTask) {
        console.log(`[Task Auto-Completion] Weekly rota task not found for daily task ${dailyTask.id}`);
        continue;
      }
      
      // Check if this task should be auto-completed based on linen count
      if (weeklyRotaTask.autoCompletionMethod === "linen_count") {
        const config = weeklyRotaTask.autoCompletionConfig as { locationCode?: string } | null;
        
        // Check if location matches (case-insensitive)
        if (config?.locationCode && 
            config.locationCode.toLowerCase() === locationCode.toLowerCase()) {
          
          // Auto-complete the task
          await db
            .update(schema.dailyTaskInstances)
            .set({
              status: "completed",
              completedAt: new Date(),
              autoCompletedBy: "linen_count_system",
              notes: `Automatically completed - linen count submitted for ${locationCode}`,
            })
            .where(eq(schema.dailyTaskInstances.id, dailyTask.id))
            .execute();
          
          completedCount++;
          console.log(`[Task Auto-Completion] Auto-completed task: ${dailyTask.name} for ${locationCode}`);
        }
      }
    }
    
    console.log(`[Task Auto-Completion] Auto-completed ${completedCount} tasks for ${locationCode} on ${countDate}`);
    return completedCount;
    
  } catch (error) {
    console.error(`[Task Auto-Completion] Error auto-completing tasks:`, error);
    return 0;
  }
}

/**
 * Check if a task should be auto-completed (used by notification scheduler)
 * @param taskId - Daily task instance ID
 * @returns true if task has auto-completion method configured
 */
export async function shouldSkipNotification(taskId: string): Promise<boolean> {
  try {
    // Get the daily task
    const dailyTask = await db
      .select()
      .from(schema.dailyTaskInstances)
      .where(eq(schema.dailyTaskInstances.id, taskId))
      .limit(1)
      .execute();
    
    if (dailyTask.length === 0 || !dailyTask[0].weeklyRotaTaskId) {
      return false;
    }
    
    // Get the weekly rota task template
    const weeklyRotaTask = await db
      .select()
      .from(schema.weeklyRotaTasks)
      .where(eq(schema.weeklyRotaTasks.id, dailyTask[0].weeklyRotaTaskId))
      .limit(1)
      .execute();
    
    if (weeklyRotaTask.length === 0) {
      return false;
    }
    
    // Skip notification if auto-completion method is set
    return weeklyRotaTask[0].autoCompletionMethod !== null;
    
  } catch (error) {
    console.error(`[Task Auto-Completion] Error checking if task should skip notification:`, error);
    return false;
  }
}
