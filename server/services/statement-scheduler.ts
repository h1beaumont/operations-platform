import cron from 'node-cron';
import type { DatabaseStorage } from '../storage';
import { sendGenericEmail } from '../email';

/**
 * Email scheduler for landlord statements
 * Sends approved statements on their scheduled send date (7th of month)
 */
export function startStatementEmailScheduler(storage: DatabaseStorage) {
  // Run daily at 9:00 AM to check for statements scheduled to be sent today
  cron.schedule('0 9 * * *', async () => {
    try {
      console.log('[Statement Scheduler] Checking for statements to send...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Get all approved statements
      const allStatements = await storage.getStatements();
      const approvedStatements = allStatements.filter(s => 
        s.emailApproved === true && 
        s.status === 'approved' &&
        s.scheduledSendDate
      );
      
      // Filter statements scheduled for today
      const statementsToSend = approvedStatements.filter(s => {
        if (!s.scheduledSendDate) return false;
        const scheduledDate = new Date(s.scheduledSendDate);
        scheduledDate.setHours(0, 0, 0, 0);
        return scheduledDate.getTime() === today.getTime();
      });
      
      if (statementsToSend.length === 0) {
        console.log('[Statement Scheduler] No statements scheduled for today');
        return;
      }
      
      console.log(`[Statement Scheduler] Found ${statementsToSend.length} statement(s) to send`);
      
      // Send each statement
      for (const statement of statementsToSend) {
        try {
          // Get landlord details
          const landlord = await storage.getLandlordById(statement.landlordId);
          
          if (!landlord || !landlord.email) {
            console.error(`[Statement Scheduler] Landlord not found or no email for statement ${statement.id}`);
            continue;
          }
          
          if (!statement.generatedEmail || !statement.emailSubject) {
            console.error(`[Statement Scheduler] Missing email content for statement ${statement.id}`);
            continue;
          }
          
          // Send email
          const result = await sendGenericEmail(
            landlord.email,
            statement.emailSubject,
            statement.generatedEmail
          );
          
          if (result.success) {
            // Update statement status to sent
            await storage.updateStatement(statement.id, {
              status: 'sent',
              sentDate: new Date(),
            });
            
            console.log(`[Statement Scheduler] ✓ Statement ${statement.id} sent to ${landlord.email}`);
          } else {
            console.error(`[Statement Scheduler] Failed to send statement ${statement.id}: ${result.error}`);
          }
        } catch (error) {
          console.error(`[Statement Scheduler] Error processing statement ${statement.id}:`, error);
        }
      }
      
      console.log('[Statement Scheduler] Daily check complete');
    } catch (error) {
      console.error('[Statement Scheduler] Error in scheduler:', error);
    }
  });
  
  console.log('[Statement Scheduler] Started - scheduled to run daily at 9:00 AM');
}

/**
 * Manually trigger sending of all approved statements scheduled for today (for testing)
 */
export async function sendScheduledStatements(storage: DatabaseStorage): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all approved statements
    const allStatements = await storage.getStatements();
    const approvedStatements = allStatements.filter(s => 
      s.emailApproved === true && 
      s.status === 'approved' &&
      s.scheduledSendDate
    );
    
    // Filter statements scheduled for today
    const statementsToSend = approvedStatements.filter(s => {
      if (!s.scheduledSendDate) return false;
      const scheduledDate = new Date(s.scheduledSendDate);
      scheduledDate.setHours(0, 0, 0, 0);
      return scheduledDate.getTime() === today.getTime();
    });
    
    for (const statement of statementsToSend) {
      try {
        const landlord = await storage.getLandlordById(statement.landlordId);
        
        if (!landlord || !landlord.email) {
          errors.push(`Statement ${statement.id}: Landlord not found or no email`);
          failed++;
          continue;
        }
        
        if (!statement.generatedEmail || !statement.emailSubject) {
          errors.push(`Statement ${statement.id}: Missing email content`);
          failed++;
          continue;
        }
        
        const result = await sendGenericEmail(
          landlord.email,
          statement.emailSubject,
          statement.generatedEmail
        );
        
        if (result.success) {
          await storage.updateStatement(statement.id, {
            status: 'sent',
            sentDate: new Date(),
          });
          sent++;
        } else {
          errors.push(`Statement ${statement.id}: ${result.error}`);
          failed++;
        }
      } catch (error: any) {
        errors.push(`Statement ${statement.id}: ${error.message}`);
        failed++;
      }
    }
  } catch (error: any) {
    errors.push(`Scheduler error: ${error.message}`);
  }
  
  return { sent, failed, errors };
}
