import { storage, db } from "../storage";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import type { TaskTemplate, InsertDailyTaskInstance } from "@shared/schema";
import { generateCleaningSupplyCheckTask } from "./cleaning-supply-daily-task";
import crypto from "crypto";

/**
 * Generate daily tasks for a specific date based on active task templates
 * @param date - Date string in YYYY-MM-DD format
 * @returns Number of tasks created
 */
export async function generateDailyTasks(date: string): Promise<number> {
  console.log(`[Task Generator] Generating tasks for ${date}`);
  
  try {
    // Get all active task templates
    const templates = await storage.getTaskTemplates();
    const activeTemplates = templates.filter((t) => t.isActive);
    
    console.log(`[Task Generator] Found ${activeTemplates.length} active templates`);
    
    // Get the day of week for the given date (0 = Sunday, 6 = Saturday)
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    
    // Get all staff for assignment
    const allStaff = await storage.getAllStaff();
    
    let tasksCreated = 0;
    
    for (const template of activeTemplates) {
      // Check if this template should run on this date
      let shouldRun = false;
      
      switch (template.recurrenceType) {
        case "daily":
          shouldRun = true;
          break;
          
        case "specific_days":
          if (template.daysOfWeek && template.daysOfWeek.length > 0) {
            shouldRun = template.daysOfWeek.includes(dayOfWeek);
          }
          break;
          
        case "one_time":
          // One-time tasks should be created manually, not by auto-generation
          shouldRun = false;
          break;
      }
      
      if (!shouldRun) {
        continue;
      }
      
      // ISSUE 2 FIX: Check if task already exists for this template and date
      const existingInstances = await storage.getDailyTaskInstances(date, undefined);
      const alreadyExists = existingInstances.some(task => task.templateId === template.id);
      if (alreadyExists) {
        console.log(`[Task Generator] Skipping template "${template.name}" - instance already exists for ${date}`);
        continue;
      }
      
      // Determine who to assign the task to
      let assignedTo: string | null = null;
      
      if (template.assignedToStaffId) {
        // Specific staff member assigned
        assignedTo = template.assignedToStaffId;
      } else if (template.assignedToRole) {
        // ISSUE 1 FIX: Filter staff by role before assigning
        const activeStaff = allStaff.filter((s) => s.status === "active");
        
        // Filter by roleType if the assignedToRole matches (driver/non-driver)
        // Staff table has roleType field which can be "driver" or "non-driver"
        const staffByRole = activeStaff.filter(
          (s) => s.roleType === template.assignedToRole
        );
        
        if (staffByRole.length > 0) {
          // Use round-robin assignment among staff with matching role
          const index = Math.abs(hashCode(template.id)) % staffByRole.length;
          assignedTo = staffByRole[index].id;
        } else {
          // Fallback: if no role match found, use any active staff
          console.log(`[Task Generator] Warning: No staff found with role "${template.assignedToRole}" for template "${template.name}", using fallback`);
          if (activeStaff.length > 0) {
            const index = Math.abs(hashCode(template.id)) % activeStaff.length;
            assignedTo = activeStaff[index].id;
          }
        }
      }
      
      if (!assignedTo) {
        console.log(`[Task Generator] Skipping template "${template.name}" - no staff to assign`);
        continue;
      }
      
      // Create the daily task instance
      const taskData: InsertDailyTaskInstance = {
        templateId: template.id,
        scheduledDate: date,
        name: template.name,
        description: template.description || undefined,
        category: template.category,
        priority: template.priority,
        estimatedMinutes: template.estimatedMinutes || 15,
        timeOfDay: template.timeOfDay || "morning",
        assignedTo,
        status: "pending",
        completedBy: undefined,
        completedAt: undefined,
        notes: undefined,
      };
      
      try {
        await storage.createDailyTaskInstance(taskData);
        tasksCreated++;
        console.log(`[Task Generator] Created task "${template.name}" for ${assignedTo}`);
      } catch (error) {
        console.error(`[Task Generator] Error creating task from template "${template.name}":`, error);
      }
    }
    
    // Add cleaning supply check task
    try {
      const cleaningSupplyTask = await generateCleaningSupplyCheckTask(date);
      if (cleaningSupplyTask) {
        // Check if this task already exists
        const existingInstances = await storage.getDailyTaskInstances(date, undefined);
        const supplyTaskExists = existingInstances.some(task => task.name === "Review Cleaning Supply Orders");
        
        if (!supplyTaskExists) {
          await storage.createDailyTaskInstance(cleaningSupplyTask);
          tasksCreated++;
          console.log(`[Task Generator] Created cleaning supply check task`);
        }
      }
    } catch (error) {
      console.error(`[Task Generator] Error creating cleaning supply check task:`, error);
    }
    
    // Generate tasks from weekly rota templates
    try {
      const weeklyRotaTasksCreated = await generateWeeklyRotaTasks(date);
      tasksCreated += weeklyRotaTasksCreated;
    } catch (error) {
      console.error(`[Task Generator] Error generating weekly rota tasks:`, error);
    }
    
    console.log(`[Task Generator] Successfully created ${tasksCreated} tasks for ${date}`);
    return tasksCreated;
    
  } catch (error) {
    console.error(`[Task Generator] Error generating tasks for ${date}:`, error);
    throw error;
  }
}

/**
 * Generate daily task instances from weekly rota templates
 * @param date - Date string in YYYY-MM-DD format
 * @returns Number of tasks created
 */
async function generateWeeklyRotaTasks(date: string): Promise<number> {
  console.log(`[Weekly Rota Generator] Generating weekly rota tasks for ${date}`);
  
  try {
    // Get the day of week for the given date
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Map day of week number to day name
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];
    
    console.log(`[Weekly Rota Generator] Looking for tasks scheduled for ${dayName}`);
    
    // Get all active weekly rota tasks for this day
    const weeklyRotaTasks = await db
      .select()
      .from(schema.weeklyRotaTasks)
      .where(eq(schema.weeklyRotaTasks.day, dayName))
      .execute();
    
    const activeTasks = weeklyRotaTasks.filter(t => t.isActive);
    console.log(`[Weekly Rota Generator] Found ${activeTasks.length} active weekly rota tasks for ${dayName}`);
    
    if (activeTasks.length === 0) {
      return 0;
    }
    
    // Get all staff for name matching
    const allStaff = await storage.getAllStaff();
    
    let tasksCreated = 0;
    
    for (const rotaTask of activeTasks) {
      // Check if this task already exists for this date
      const existingInstances = await storage.getDailyTaskInstances(date, undefined);
      const alreadyExists = existingInstances.some(task => task.weeklyRotaTaskId === rotaTask.id);
      if (alreadyExists) {
        console.log(`[Weekly Rota Generator] Skipping task "${rotaTask.task}" - instance already exists for ${date}`);
        continue;
      }
      
      // Find staff member by name match (check both fullName and partial match)
      const staffMember = allStaff.find(s => {
        const fullName = s.fullName?.toLowerCase() || '';
        const responsibleName = rotaTask.responsible?.toLowerCase() || '';
        
        // Exact match with fullName
        if (fullName === responsibleName) return true;
        
        // Partial match - check if responsible name matches start of fullName (first name)
        if (fullName.startsWith(responsibleName + ' ')) return true;
        
        // Check if responsible is just the first name
        const firstName = fullName.split(' ')[0];
        if (firstName === responsibleName) return true;
        
        return false;
      });
      
      if (!staffMember) {
        console.log(`[Weekly Rota Generator] Warning: Could not find staff member "${rotaTask.responsible}" for task "${rotaTask.task}"`);
        continue;
      }
      
      // Create the daily task instance from weekly rota template
      const taskData: InsertDailyTaskInstance = {
        weeklyRotaTaskId: rotaTask.id, // Link to weekly rota template
        templateId: undefined, // Not from task template
        scheduledDate: date,
        name: rotaTask.task,
        description: rotaTask.checkMethod, // Use check method as description
        category: "weekly_rota", // Categorize as weekly rota task
        priority: "medium",
        estimatedMinutes: 30,
        timeOfDay: rotaTask.time.toLowerCase(),
        assignedTo: staffMember.id,
        status: "pending",
        completedBy: undefined,
        completedAt: undefined,
        notes: undefined,
        autoCompletedBy: undefined, // Will be set when task is auto-completed
        confirmationToken: null, // Will be set by notification scheduler (if needed)
        notificationSentAt: undefined,
        notificationMethod: undefined,
        notCompletedReason: undefined,
        notCompletedDetails: undefined,
      };
      
      try {
        await storage.createDailyTaskInstance(taskData);
        tasksCreated++;
        console.log(`[Weekly Rota Generator] Created task "${rotaTask.task}" for ${staffMember.fullName} (${rotaTask.time})`);
      } catch (error) {
        console.error(`[Weekly Rota Generator] Error creating task "${rotaTask.task}":`, error);
      }
    }
    
    console.log(`[Weekly Rota Generator] Created ${tasksCreated} weekly rota tasks for ${date}`);
    return tasksCreated;
    
  } catch (error) {
    console.error(`[Weekly Rota Generator] Error generating weekly rota tasks:`, error);
    throw error;
  }
}

/**
 * Simple hash function to generate a number from a string
 * Used for round-robin staff assignment
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

/**
 * Generate tasks for today
 */
export async function generateTasksForToday(): Promise<number> {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  return await generateDailyTasks(dateStr);
}

/**
 * Generate tasks for tomorrow (useful for pre-planning)
 */
export async function generateTasksForTomorrow(): Promise<number> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  return await generateDailyTasks(dateStr);
}
