import { db } from "./storage";
import * as schema from "@shared/schema";
import { eq, and, isNull, lte } from "drizzle-orm";
import { sendGenericSMS } from "./twilio";
import { sendGenericEmail } from "./email";
import { format } from "date-fns";

// Schedule task notifications to be sent daily at 7:00 AM
export function startTaskNotificationScheduler() {
  console.log("[Task Notification Scheduler] Starting automated notification scheduler for 7:00 AM daily");

  // Check every minute if it's time to send
  const checkInterval = setInterval(async () => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Send notifications at 7:00 AM
    const isScheduledTime = hour === 7 && minute === 0;

    if (isScheduledTime) {
      console.log("[Task Notification Scheduler] Sending task notifications now...");
      await sendTaskNotifications();
    }
  }, 60000); // Check every minute

  // Cleanup on process exit
  process.on('SIGTERM', () => {
    clearInterval(checkInterval);
    console.log("[Task Notification Scheduler] Stopped");
  });
}

async function sendTaskNotifications() {
  try {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    // Find all pending tasks for today that haven't been notified yet
    const pendingTasks = await db
      .select()
      .from(schema.dailyTaskInstances)
      .where(
        and(
          eq(schema.dailyTaskInstances.scheduledDate, today),
          eq(schema.dailyTaskInstances.status, "pending"),
          isNull(schema.dailyTaskInstances.notificationSentAt),
          isNull(schema.dailyTaskInstances.confirmationToken) // Only tasks without tokens need initial setup
        )
      );

    if (pendingTasks.length === 0) {
      console.log("[Task Notification Scheduler] No pending tasks requiring notifications today");
      return;
    }

    console.log(`[Task Notification Scheduler] Found ${pendingTasks.length} tasks to notify`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const task of pendingTasks) {
      try {
        // Check if this task has auto-completion configured (skip notification if so)
        if (task.weeklyRotaTaskId) {
          const [weeklyRotaTask] = await db
            .select()
            .from(schema.weeklyRotaTasks)
            .where(eq(schema.weeklyRotaTasks.id, task.weeklyRotaTaskId))
            .limit(1);
          
          if (weeklyRotaTask?.autoCompletionMethod) {
            console.log(`[Task Notification Scheduler] Skipping task "${task.name}" - has auto-completion method: ${weeklyRotaTask.autoCompletionMethod}`);
            continue; // Skip notification for auto-completed tasks
          }
        }
        
        // Get staff details
        const [staff] = await db
          .select()
          .from(schema.staff)
          .where(eq(schema.staff.id, task.assignedTo))
          .limit(1);

        if (!staff) {
          console.error(`[Task Notification Scheduler] Staff not found for task ${task.id}`);
          errors.push(`Task ${task.name}: Staff not found`);
          continue;
        }

        // Generate unique confirmation token
        const token = `${task.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Get base URL for confirmation link
        const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0]
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : 'http://localhost:5000';

        const confirmationLink = `${baseUrl}/confirm/${token}`;

        // Format the message
        const taskDate = format(new Date(task.scheduledDate), "EEEE, MMMM d");
        const messageBody = `📋 Task Reminder - ${taskDate}

Task: ${task.name}
Time: ${task.timeOfDay}
${task.description ? `\nDetails: ${task.description}` : ''}

Please complete this task and confirm using the link below:
${confirmationLink}

If you cannot complete the task, use the link to let us know why.

- Northstay`;

        let notificationMethod = null;
        let smsSuccess = false;
        let emailSuccess = false;

        // Send SMS if phone number available
        if (staff.phone) {
          try {
            const smsResult = await sendGenericSMS(staff.phone, messageBody);
            if (smsResult.success) {
              smsSuccess = true;
              notificationMethod = "sms";
              console.log(`[Task Notification Scheduler] SMS sent to ${staff.name} for task: ${task.name}`);
            } else {
              console.error(`[Task Notification Scheduler] SMS failed for ${staff.name}:`, smsResult.error);
            }
          } catch (smsError) {
            console.error(`[Task Notification Scheduler] SMS error for ${staff.name}:`, smsError);
          }
        }

        // Send email if email address available
        if (staff.email) {
          try {
            const emailSubject = `Task Reminder - ${task.name} (${taskDate})`;
            const emailResult = await sendGenericEmail(
              staff.email,
              emailSubject,
              messageBody
            );
            if (emailResult.success) {
              emailSuccess = true;
              notificationMethod = smsSuccess ? "both" : "email";
              console.log(`[Task Notification Scheduler] Email sent to ${staff.name} for task: ${task.name}`);
            } else {
              console.error(`[Task Notification Scheduler] Email failed for ${staff.name}:`, emailResult.error);
            }
          } catch (emailError) {
            console.error(`[Task Notification Scheduler] Email error for ${staff.name}:`, emailError);
          }
        }

        // Update task with confirmation token and notification timestamp if at least one method succeeded
        if (smsSuccess || emailSuccess) {
          await db
            .update(schema.dailyTaskInstances)
            .set({
              confirmationToken: token,
              notificationSentAt: new Date(),
              notificationMethod: notificationMethod,
            })
            .where(eq(schema.dailyTaskInstances.id, task.id));

          sentCount++;
        } else {
          errors.push(`${task.name}: No notification method available or all failed`);
        }
      } catch (error: any) {
        console.error(`[Task Notification Scheduler] Error processing task ${task.id}:`, error);
        errors.push(`${task.name}: ${error.message}`);
      }
    }

    console.log(`[Task Notification Scheduler] Successfully sent ${sentCount}/${pendingTasks.length} notifications`);
    if (errors.length > 0) {
      console.error("[Task Notification Scheduler] Errors:", errors);
    }
  } catch (error: any) {
    console.error("[Task Notification Scheduler] Failed to send task notifications:", error.message);
  }
}

// Export function to manually trigger notifications (for testing/debugging)
export async function triggerTaskNotifications() {
  console.log("[Task Notification Scheduler] Manually triggering task notifications...");
  await sendTaskNotifications();
}
