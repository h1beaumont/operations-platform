import cron from "node-cron";
import { storage } from "../storage";
import { sendGenericEmail } from "../email";
import { sendGenericSMS } from "../twilio";
import { differenceInDays, format } from "date-fns";

export function startRentPaymentChecker() {
  // Run daily at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("[RENT-CHECKER] Running daily rent payment check...");
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get all pending rent payments where due date is before today
      const overduePayments = await storage.getOverdueRentPayments();
      
      console.log(`[RENT-CHECKER] Found ${overduePayments.length} overdue payments`);
      
      for (const payment of overduePayments) {
        try {
          // Update payment status to overdue
          await storage.updateAstRentPayment(payment.id, { status: "overdue" });
          
          // Get tenancy details
          const tenancy = await storage.getAstTenancy(payment.tenancyId);
          if (!tenancy) {
            console.error(`[RENT-CHECKER] Tenancy not found for payment ${payment.id}`);
            continue;
          }
          
          // Get property details
          const property = await storage.getAstProperty(tenancy.astPropertyId);
          if (!property) {
            console.error(`[RENT-CHECKER] Property not found for tenancy ${payment.tenancyId}`);
            continue;
          }
          
          // Calculate days overdue
          const daysOverdue = differenceInDays(today, new Date(payment.dueDate));
          
          // Prepare notification message
          const message = `RENT OVERDUE NOTICE\n\nTenant: ${tenancy.tenantName}\nProperty: ${property.address}\nAmount Due: £${payment.amount}\nDue Date: ${format(new Date(payment.dueDate), "dd MMM yyyy")}\nDays Overdue: ${daysOverdue}\n\nPlease contact the tenant immediately.`;
          
          const emailSubject = `Rent Payment Overdue - ${property.name}`;
          const emailBody = `
            <h2>Rent Payment Overdue</h2>
            <p><strong>Tenant:</strong> ${tenancy.tenantName}</p>
            <p><strong>Property:</strong> ${property.name}<br>${property.address}</p>
            <p><strong>Amount Due:</strong> £${payment.amount}</p>
            <p><strong>Due Date:</strong> ${format(new Date(payment.dueDate), "dd MMM yyyy")}</p>
            <p><strong>Days Overdue:</strong> ${daysOverdue} days</p>
            ${tenancy.tenantEmail ? `<p><strong>Tenant Email:</strong> ${tenancy.tenantEmail}</p>` : ""}
            ${tenancy.tenantPhone ? `<p><strong>Tenant Phone:</strong> ${tenancy.tenantPhone}</p>` : ""}
            <p>Please contact the tenant regarding this overdue payment.</p>
          `;
          
          // Get admin notification settings (send to admin emails)
          const settings = await storage.getSettings();
          const adminPhones = settings?.adminPhoneNumbers || {};
          
          // Send SMS to admins
          if (adminPhones.harry) {
            try {
              await sendGenericSMS(adminPhones.harry, message);
              console.log(`[RENT-CHECKER] SMS sent to StaffL for payment ${payment.id}`);
            } catch (smsError) {
              console.error(`[RENT-CHECKER] Failed to send SMS to StaffL:`, smsError);
            }
          }
          
          if (adminPhones.aras) {
            try {
              await sendGenericSMS(adminPhones.aras, message);
              console.log(`[RENT-CHECKER] SMS sent to Alex for payment ${payment.id}`);
            } catch (smsError) {
              console.error(`[RENT-CHECKER] Failed to send SMS to Alex:`, smsError);
            }
          }
          
          // Send email to tenant if email is available
          if (tenancy.tenantEmail) {
            try {
              await sendGenericEmail(
                tenancy.tenantEmail,
                `Rent Payment Reminder - ${property.name}`,
                `
                  <h2>Rent Payment Reminder</h2>
                  <p>Dear ${tenancy.tenantName},</p>
                  <p>This is a reminder that your rent payment is overdue.</p>
                  <p><strong>Property:</strong> ${property.address}</p>
                  <p><strong>Amount Due:</strong> £${payment.amount}</p>
                  <p><strong>Due Date:</strong> ${format(new Date(payment.dueDate), "dd MMM yyyy")}</p>
                  <p><strong>Days Overdue:</strong> ${daysOverdue} days</p>
                  <p>Please arrange payment as soon as possible.</p>
                  <p>If you have already made this payment, please disregard this notice.</p>
                  <p>Thank you.</p>
                `
              );
              console.log(`[RENT-CHECKER] Email sent to tenant for payment ${payment.id}`);
            } catch (emailError) {
              console.error(`[RENT-CHECKER] Failed to send email to tenant:`, emailError);
            }
          }
          
          // Send SMS to tenant if phone is available
          if (tenancy.tenantPhone) {
            try {
              const tenantMessage = `Rent Payment Reminder\n\nDear ${tenancy.tenantName},\n\nYour rent payment of £${payment.amount} for ${property.address} was due on ${format(new Date(payment.dueDate), "dd MMM yyyy")} and is now ${daysOverdue} days overdue.\n\nPlease arrange payment as soon as possible.`;
              await sendGenericSMS(tenancy.tenantPhone, tenantMessage);
              console.log(`[RENT-CHECKER] SMS sent to tenant for payment ${payment.id}`);
            } catch (smsError) {
              console.error(`[RENT-CHECKER] Failed to send SMS to tenant:`, smsError);
            }
          }
          
          console.log(`[RENT-CHECKER] Processed overdue payment ${payment.id} - ${daysOverdue} days overdue`);
        } catch (error) {
          console.error(`[RENT-CHECKER] Error processing payment ${payment.id}:`, error);
        }
      }
      
      console.log("[RENT-CHECKER] Daily rent payment check completed");
    } catch (error) {
      console.error("[RENT-CHECKER] Error in daily rent payment check:", error);
    }
  });
  
  console.log("[Rent Checker] Daily rent payment checker started (runs at 9:00 AM)");
}
