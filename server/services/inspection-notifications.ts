import { storage } from "../storage";
import { sendGenericEmail } from "../email";
import type { InspectionReport, Property } from "@shared/schema";

/**
 * Check and send email notifications for completed inspections
 * based on configured notification settings
 */
export async function checkAndSendNotifications(inspectionId: string): Promise<void> {
  try {
    console.log(`[INSPECTION-NOTIFICATIONS] Checking notifications for inspection ${inspectionId}`);
    
    // 1. Get inspection with score
    const inspection = await storage.getInspectionReport(inspectionId);
    if (!inspection) {
      console.error(`[INSPECTION-NOTIFICATIONS] Inspection ${inspectionId} not found`);
      return;
    }

    // Check if already notified
    if (inspection.clientNotified) {
      console.log(`[INSPECTION-NOTIFICATIONS] Client already notified for inspection ${inspectionId}`);
      return;
    }

    // Check if inspection has a score
    if (inspection.overallScore === null || inspection.overallScore === undefined) {
      console.log(`[INSPECTION-NOTIFICATIONS] Inspection ${inspectionId} has no score yet`);
      return;
    }

    // 2. Get applicable notification settings
    const allSettings = await storage.getNotificationSettings();
    
    // Filter for this property or global settings (propertyId = null)
    const applicableSettings = allSettings.filter(setting => 
      setting.enabled && (
        setting.propertyId === inspection.propertyId || 
        setting.propertyId === null
      )
    );

    if (applicableSettings.length === 0) {
      console.log(`[INSPECTION-NOTIFICATIONS] No active notification settings for inspection ${inspectionId}`);
      return;
    }

    console.log(`[INSPECTION-NOTIFICATIONS] Found ${applicableSettings.length} applicable notification settings`);

    // 3. Check if score meets threshold criteria
    const triggeredSettings = applicableSettings.filter(setting => {
      // Notify when score is BELOW threshold (poor inspection score)
      return inspection.overallScore! < setting.scoreThreshold;
    });

    if (triggeredSettings.length === 0) {
      console.log(`[INSPECTION-NOTIFICATIONS] Score ${inspection.overallScore} does not meet any thresholds`);
      return;
    }

    console.log(`[INSPECTION-NOTIFICATIONS] Score ${inspection.overallScore} triggered ${triggeredSettings.length} notification(s)`);

    // Get property details
    const property = await storage.getProperty(inspection.propertyId);
    if (!property) {
      console.error(`[INSPECTION-NOTIFICATIONS] Property ${inspection.propertyId} not found`);
      return;
    }

    // Get inspector details
    const inspector = await storage.getStaff(inspection.inspectorId);
    const inspectorName = inspector?.fullName || "Unknown Inspector";

    // Get inspection issues
    const issues = await storage.getInspectionIssues(inspectionId);
    const criticalIssues = issues.filter(i => i.severity === "critical");
    const majorIssues = issues.filter(i => i.severity === "major");

    // 5. Send email notifications and track success
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const setting of triggeredSettings) {
      const recipients = setting.recipientEmails || [];
      const ccRecipients = setting.ccEmails || [];
      const allRecipients = [...recipients, ...ccRecipients];

      if (allRecipients.length === 0) {
        console.log(`[INSPECTION-NOTIFICATIONS] No recipients configured for setting ${setting.id}`);
        continue;
      }

      // Build email content (without emojis)
      const emailSubject = `INSPECTION ALERT: ${property.name} - Score: ${inspection.overallScore}%`;
      const emailBody = buildEmailBody({
        property,
        inspection,
        inspectorName,
        criticalIssues: criticalIssues.length,
        majorIssues: majorIssues.length,
        issues: issues.slice(0, 5), // Top 5 issues
        threshold: setting.scoreThreshold,
      });

      // Send to all recipients and track success
      for (const recipient of allRecipients) {
        try {
          const result = await sendGenericEmail(recipient, emailSubject, emailBody);
          if (result.success) {
            emailsSent++;
            console.log(`[INSPECTION-NOTIFICATIONS] Email sent successfully to ${recipient}`);
          } else {
            emailsFailed++;
            console.error(`[INSPECTION-NOTIFICATIONS] Failed to send email to ${recipient}:`, result.error);
          }
        } catch (error) {
          emailsFailed++;
          console.error(`[INSPECTION-NOTIFICATIONS] Error sending email to ${recipient}:`, error);
        }
      }
    }

    // 6. Only mark as clientNotified if at least one email was successfully sent
    if (emailsSent > 0) {
      await storage.updateInspectionReport(inspectionId, {
        clientNotified: true,
        clientNotifiedAt: new Date(),
      });
      console.log(`[INSPECTION-NOTIFICATIONS] Successfully sent ${emailsSent} email(s), ${emailsFailed} failed for inspection ${inspectionId}`);
    } else {
      console.error(`[INSPECTION-NOTIFICATIONS] ALL emails failed for inspection ${inspectionId} - will retry later`);
      throw new Error(`Failed to send any notifications for inspection ${inspectionId}`);
    }
  } catch (error) {
    console.error(`[INSPECTION-NOTIFICATIONS] Error processing notifications for inspection ${inspectionId}:`, error);
    throw error;
  }
}

/**
 * Build formatted email body for inspection notification
 */
function buildEmailBody(params: {
  property: Property;
  inspection: InspectionReport;
  inspectorName: string;
  criticalIssues: number;
  majorIssues: number;
  issues: any[];
  threshold: number;
}): string {
  const {
    property,
    inspection,
    inspectorName,
    criticalIssues,
    majorIssues,
    issues,
    threshold,
  } = params;

  const score = inspection.overallScore || 0;
  const scoreStatus = score >= 90 ? "PASSED" : score >= 75 ? "NEEDS ATTENTION" : "FAILED";
  const inspectionDate = new Date(inspection.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let body = `INSPECTION ALERT - Score Below Threshold

Property: ${property.name}
Address: ${property.address || 'N/A'}

Inspection Date: ${inspectionDate}
Inspector: ${inspectorName}

Overall Score: ${score}% [${scoreStatus}] (Threshold: ${threshold}%)

This inspection score is below the configured threshold of ${threshold}% and requires attention.

`;

  // Add issue summary
  if (criticalIssues > 0 || majorIssues > 0) {
    body += `ISSUES FOUND:
${criticalIssues > 0 ? `• ${criticalIssues} Critical Issue${criticalIssues !== 1 ? 's' : ''}` : ''}
${majorIssues > 0 ? `• ${majorIssues} Major Issue${majorIssues !== 1 ? 's' : ''}` : ''}

`;
  }

  // Add top issues
  if (issues.length > 0) {
    body += `TOP ISSUES:\n`;
    issues.forEach((issue, index) => {
      const severityLabel = issue.severity === 'critical' ? '[CRITICAL]' :
                           issue.severity === 'major' ? '[MAJOR]' : '[MINOR]';
      body += `${index + 1}. ${severityLabel}: ${issue.description}\n`;
    });
    body += `\n`;
  }

  body += `Please review the full inspection report and take appropriate action.

---
This is an automated notification based on your configured inspection alert settings.
`;

  return body;
}
