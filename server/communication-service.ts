import { storage } from "./storage";
import { sendGenericEmail } from "./email";
import { sendGenericSMS } from "./twilio";
import type { Candidate, CommunicationTemplates } from "@shared/schema";
import { format } from "date-fns";

interface ExtraData {
  meetingDate?: string;
  meetingLink?: string;
  screeningLink?: string;
  [key: string]: any;
}

const DEFAULT_TEMPLATES: CommunicationTemplates = {
  screeningPassed: {
    enabled: true,
    emailSubject: "Congratulations {{firstName}}! Next Steps at Northstay",
    emailBody: `Dear {{firstName}} {{lastName}},

Congratulations! You've passed our initial screening for the cleaning position at Northstay.

We're impressed with your application and would like to invite you to the next stage of our hiring process.

What happens next:
- You'll be scheduled for an in-person interview at our Nottingham office
- We'll send you the meeting details shortly
- Please check your email regularly for updates

If you have any questions, please don't hesitate to reach out.

Best regards,
The Northstay Team`,
    smsBody: "Hi {{firstName}}, you passed screening for Northstay! Check your email for next steps."
  },
  screeningFailed: {
    enabled: true,
    emailSubject: "Update on Your Application - Northstay",
    emailBody: `Dear {{firstName}} {{lastName}},

Thank you for your interest in the cleaning position at Northstay.

After careful review of your application, we regret to inform you that we won't be moving forward with your application at this time.

We appreciate the time you took to apply and wish you all the best in your job search.

Best regards,
The Northstay Team`
  },
  meetingScheduled: {
    enabled: true,
    emailSubject: "Interview Invitation - Northstay",
    emailBody: `Dear {{firstName}} {{lastName}},

Great news! You've been scheduled for an interview for the cleaning position at Northstay.

Interview Details:
Date & Time: {{meetingDate}}
Location: 1 Example Street, Nottingham, AB1 2CD
Google Meet Link: {{meetingLink}}

Confirm your attendance here: {{confirmationLink}}

Please make sure to:
- Arrive on time
- Have your questions ready{{drivingCleanerNote}}

We look forward to meeting you!

Best regards,
The Northstay Team`,
    smsBody: "Hi {{firstName}}, your interview for Northstay is on {{meetingDate}} at 1 Example Street, Nottingham, AB1 2CD. Confirm here: {{confirmationLink}}"
  },
  meetingReminder: {
    enabled: true,
    emailSubject: "Reminder: Interview Tomorrow - Northstay",
    emailBody: `Dear {{firstName}} {{lastName}},

This is a friendly reminder about your interview tomorrow for the cleaning position.

Interview Details:
Date & Time: {{meetingDate}}
Location: 1 Example Street, Nottingham, AB1 2CD

We look forward to speaking with you!

Best regards,
The Northstay Team`,
    smsBody: "Reminder: Your Northstay interview is tomorrow at {{meetingDate}} at 1 Example Street, Nottingham. See you there!"
  },
  hired: {
    enabled: true,
    emailSubject: "Welcome to the Team! - Northstay",
    emailBody: `Dear {{firstName}} {{lastName}},

Congratulations! We're thrilled to offer you the cleaning position at Northstay.

Welcome to the team! We'll be sending you onboarding information shortly, including:
- Your trial shift schedule
- Required documents
- Training materials

Please check your email regularly for these important updates.

We're excited to have you join us!

Best regards,
The Northstay Team`,
    smsBody: "Congrats {{firstName}}! You're hired at Northstay. Check your email for onboarding details."
  },
  rejected: {
    enabled: true,
    emailSubject: "Update on Your Application - Northstay",
    emailBody: `Dear {{firstName}} {{lastName}},

Thank you for taking the time to interview with us for the cleaning position at Northstay.

After careful consideration, we've decided to move forward with other candidates whose experience more closely matches our current needs.

We appreciate your interest in joining our team and wish you all the best in your job search.

Best regards,
The Northstay Team`
  }
};

function replacePlaceholders(template: string, candidate: Candidate, extraData?: ExtraData): string {
  let result = template;
  
  // Add driving cleaner specific note if applicable
  const drivingCleanerNote = candidate.roleType === 'driver' 
    ? `\n- Please DO NOT bring your vehicle to the interview\n- Bring proof of vehicle ownership and valid insurance\n- You will need to bring your vehicle to your first shift if successful`
    : '';
  
  const placeholders: Record<string, string> = {
    firstName: candidate.firstName || '',
    lastName: candidate.lastName || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    roleType: candidate.roleType === 'driver' ? 'Driver' : 'Non-Driver',
    stage: candidate.status || '',
    drivingCleanerNote,
    ...extraData
  };
  
  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`{{${key}}}`, 'gi');
    result = result.replace(regex, value);
  }
  
  return result;
}

async function logCommunication(
  candidateId: string,
  channel: 'email' | 'sms',
  templateKey: string,
  recipientEmail: string | undefined,
  recipientPhone: string | undefined,
  subject: string | undefined,
  body: string,
  status: 'sent' | 'failed',
  error?: string
): Promise<void> {
  try {
    await storage.createCommunicationLog({
      candidateId,
      channel,
      templateKey,
      recipientEmail,
      recipientPhone,
      subject,
      body,
      status,
      error
    });
  } catch (logError) {
    console.error('Failed to log communication:', logError);
  }
}

export async function sendCandidateCommunication(
  candidateId: string,
  templateKey: keyof CommunicationTemplates,
  extraData?: ExtraData
): Promise<{ success: boolean; error?: string }> {
  try {
    const candidate = await storage.getCandidate(candidateId);
    if (!candidate) {
      return { success: false, error: 'Candidate not found' };
    }
    
    const settings = await storage.getSettings();
    if (!settings || !settings.communicationTemplates) {
      console.log('No communication templates configured, using defaults');
    }
    
    const templates = settings?.communicationTemplates || {};
    const template = templates[templateKey] || DEFAULT_TEMPLATES[templateKey];
    
    if (!template || !template.enabled) {
      console.log(`Communication template '${templateKey}' is disabled, skipping`);
      return { success: true };
    }
    
    const results: { success: boolean; error?: string }[] = [];
    
    if (template.emailSubject && template.emailBody && candidate.email) {
      const subject = replacePlaceholders(template.emailSubject, candidate, extraData);
      const body = replacePlaceholders(template.emailBody, candidate, extraData);
      
      const emailResult = await sendGenericEmail(
        candidate.email,
        subject,
        body
      );
      
      await logCommunication(
        candidateId,
        'email',
        templateKey,
        candidate.email,
        undefined,
        subject,
        body,
        emailResult.success ? 'sent' : 'failed',
        emailResult.error
      );
      
      results.push(emailResult);
    }
    
    if (template.smsBody && candidate.phone) {
      const smsBody = replacePlaceholders(template.smsBody, candidate, extraData);
      
      const smsResult = await sendGenericSMS(
        candidate.phone,
        smsBody
      );
      
      await logCommunication(
        candidateId,
        'sms',
        templateKey,
        undefined,
        candidate.phone,
        undefined,
        smsBody,
        smsResult.success ? 'sent' : 'failed',
        smsResult.error
      );
      
      results.push(smsResult);
    }
    
    const allSuccess = results.every(r => r.success);
    const errors = results.filter(r => r.error).map(r => r.error).join('; ');
    
    return {
      success: allSuccess,
      error: errors || undefined
    };
  } catch (error) {
    console.error('Communication service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function sendScreeningPassedEmail(candidateId: string, screeningLink?: string): Promise<{ success: boolean; error?: string }> {
  return sendCandidateCommunication(candidateId, 'screeningPassed', { screeningLink });
}

export async function sendScreeningFailedEmail(candidateId: string): Promise<{ success: boolean; error?: string }> {
  return sendCandidateCommunication(candidateId, 'screeningFailed');
}

export async function sendMeetingScheduledEmail(
  candidateId: string,
  meetingDate?: string,
  meetingLink?: string,
  confirmationLink?: string
): Promise<{ success: boolean; error?: string }> {
  return sendCandidateCommunication(candidateId, 'meetingScheduled', { 
    meetingDate: meetingDate || '', 
    meetingLink: meetingLink || '', 
    confirmationLink: confirmationLink || '' 
  });
}

export async function sendMeetingReminderEmail(
  candidateId: string,
  meetingDate: string,
  meetingLink: string
): Promise<{ success: boolean; error?: string }> {
  return sendCandidateCommunication(candidateId, 'meetingReminder', { meetingDate, meetingLink });
}

export async function sendHiredEmail(candidateId: string): Promise<{ success: boolean; error?: string }> {
  return sendCandidateCommunication(candidateId, 'hired');
}

export async function sendRejectedEmail(candidateId: string): Promise<{ success: boolean; error?: string }> {
  return sendCandidateCommunication(candidateId, 'rejected');
}

export async function getDefaultTemplates(): Promise<CommunicationTemplates> {
  return DEFAULT_TEMPLATES;
}
