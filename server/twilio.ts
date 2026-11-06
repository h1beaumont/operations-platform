import twilio from 'twilio';
import { validateAssignments, checkStaffOptIn } from './sms-utils';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
  };
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

/**
 * Send generic SMS with custom body text
 */
export async function sendGenericSMS(
  to: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const message = await client.messages.create({
      body: body,
      from: fromNumber,
      to: to
    });
    
    console.log('Generic SMS sent to:', to);
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send generic SMS:', error);
    return { success: false, error: error.message };
  }
}

export async function sendScreeningLinkSMS(to: string, roleType: string, screeningUrl: string, appliedDate: string) {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const messageBody = `You applied for ${roleType} Cleaner at Northstay via Indeed on ${appliedDate}. Complete your screening: ${screeningUrl}`;
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: to
    });
    
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send screening SMS:', error);
    return { success: false, error: error.message };
  }
}

export async function sendOnboardingLinkSMS(to: string, candidateName: string, onboardingUrl: string) {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const messageBody = `Congrats ${candidateName}! Welcome to Northstay. Complete your onboarding: ${onboardingUrl}`;
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: to
    });
    
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send onboarding SMS:', error);
    return { success: false, error: error.message };
  }
}

export async function sendAvailabilitySMS(to: string, responseLink: string, deadline?: Date) {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    let messageBody = `Hi! Please confirm your availability for the next 7 days (10am-3pm slots).`;
    
    if (deadline) {
      const deadlineStr = deadline.toLocaleString('en-GB', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      messageBody += ` DEADLINE: ${deadlineStr}. If we don't receive your response, you will NOT be scheduled for any shifts.`;
    }
    
    messageBody += ` Submit here: ${responseLink}`;
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: to
    });
    
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send SMS:', error);
    return { success: false, error: error.message };
  }
}

export async function sendAvailabilityReminderSMS(to: string, responseLink: string, deadline: Date) {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const deadlineStr = deadline.toLocaleString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const message = await client.messages.create({
      body: `REMINDER: You haven't submitted your availability yet! Deadline: ${deadlineStr}. If we don't receive your response, you will NOT be scheduled for shifts. Submit now: ${responseLink}`,
      from: fromNumber,
      to: to
    });
    
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send reminder SMS:', error);
    return { success: false, error: error.message };
  }
}

export async function sendMeetingInviteSMS(to: string, candidateName: string, meetingLink: string, meetingDate: string) {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const messageBody = `Hi ${candidateName}! You're invited to an interview with Northstay on ${meetingDate}. Join here: ${meetingLink}`;
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: to
    });
    
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send meeting invite SMS:', error);
    return { success: false, error: error.message };
  }
}

export async function sendTrialShiftNotificationSMS(to: string, candidateName: string, shift1Date: string, shift2Date: string, mentorName: string) {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const messageBody = `Congratulations ${candidateName}! You've been assigned 2 trial shifts with mentor ${mentorName}. Shift 1: ${shift1Date}. Shift 2: ${shift2Date}. We look forward to working with you!`;
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: to
    });
    
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send trial shift notification SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send individual cleaning schedule to staff member
 * Enforces opt-in check before sending
 */
export async function sendIndividualScheduleSMS(
  to: string,
  staffId: string,
  staffName: string,
  weekStart: string,
  assignments: Array<{
    date: string;
    propertyName: string;
    timeSlot: string;
  }>,
  calendarLink?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Validate assignments list is not empty
  if (!validateAssignments(assignments)) {
    console.warn('Cannot send schedule SMS: assignments list is empty');
    return { success: false, error: 'No assignments to send' };
  }
  
  // Check if staff has opted in to SMS notifications
  const hasOptedIn = await checkStaffOptIn(staffId);
  if (!hasOptedIn) {
    console.warn(`Cannot send schedule SMS: staff ${staffId} has opted out of SMS`);
    return { success: false, error: 'Staff has opted out of SMS notifications' };
  }
  
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    let messageBody = `Hi ${staffName}! Your cleaning schedule for week of ${weekStart}:\n\n`;
    
    assignments.forEach((assignment, index) => {
      messageBody += `${index + 1}. ${assignment.date} - ${assignment.propertyName} (${assignment.timeSlot})\n`;
    });
    
    messageBody += `\nNote: Schedules may change daily. `;
    
    if (calendarLink) {
      messageBody += `View full calendar: ${calendarLink}`;
    } else {
      messageBody += `Check your schedule daily.`;
    }
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: to
    });
    
    console.log('Individual schedule SMS sent to:', to);
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send individual schedule SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send location-based schedule to supervisor (e.g., StaffC for Building A, StaffF/StaffG for Building B)
 */
export async function sendLocationScheduleSMS(
  to: string,
  recipientName: string,
  locationName: string,
  weekStart: string,
  assignments: Array<{
    date: string;
    propertyName: string;
    staffName: string;
    timeSlot: string;
  }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Validate assignments list is not empty
  if (!validateAssignments(assignments)) {
    console.warn('Cannot send location schedule SMS: assignments list is empty');
    return { success: false, error: 'No assignments to send' };
  }
  
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    let messageBody = `Hi ${recipientName}! ${locationName} cleaning schedule for week of ${weekStart}:\n\n`;
    
    // Group by date
    const byDate = assignments.reduce((acc, assignment) => {
      if (!acc[assignment.date]) {
        acc[assignment.date] = [];
      }
      acc[assignment.date].push(assignment);
      return acc;
    }, {} as Record<string, typeof assignments>);
    
    Object.entries(byDate).forEach(([date, items]) => {
      messageBody += `${date}:\n`;
      items.forEach(item => {
        messageBody += `  • ${item.propertyName} - ${item.staffName} (${item.timeSlot})\n`;
      });
      messageBody += `\n`;
    });
    
    messageBody += `Schedule subject to change.`;
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: to
    });
    
    console.log('Location schedule SMS sent to:', to, 'for', locationName);
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send location schedule SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send manual onboarding request with data collection link
 */
/**
 * Send maintenance notification SMS to guest
 */
export async function sendMaintenanceGuestNotificationSMS(
  guestPhone: string,
  guestName: string,
  propertyAddress: string,
  availabilityDate: string,
  availabilityTime: string,
  assignedWorkerName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const messageBody = `Hi ${guestName}! A maintenance job has been scheduled for ${propertyAddress} on ${availabilityDate} at ${availabilityTime}. Contractor: ${assignedWorkerName}. IMPORTANT: Please remember to provide access to the lockbox/property. Thank you!`;
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: guestPhone
    });
    
    console.log('Maintenance guest notification SMS sent to:', guestPhone);
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send maintenance guest notification SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send maintenance job assignment SMS to contractor/assigned staff
 */
export async function sendMaintenanceStaffSMS(
  staffPhone: string,
  maintenanceDetails: {
    propertyAddress: string;
    title: string;
    description: string;
    availabilityDate: string;
    availabilityTime: string;
    accessCode: string;
    wifiDetails: string;
    guestName: string;
    guestPhone: string;
    checkInDetails: string;
    photos: string[];
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    let messageBody = `New maintenance job assigned to you!\n\n`;
    messageBody += `Property: ${maintenanceDetails.propertyAddress}\n`;
    messageBody += `Issue: ${maintenanceDetails.title}\n`;
    messageBody += `Details: ${maintenanceDetails.description}\n`;
    messageBody += `Scheduled: ${maintenanceDetails.availabilityDate} at ${maintenanceDetails.availabilityTime}\n`;
    messageBody += `Access code: ${maintenanceDetails.accessCode}\n`;
    messageBody += `WiFi: ${maintenanceDetails.wifiDetails}\n`;
    messageBody += `Guest contact: ${maintenanceDetails.guestName} ${maintenanceDetails.guestPhone}\n`;
    messageBody += `Check-in details: ${maintenanceDetails.checkInDetails}\n`;
    
    if (maintenanceDetails.photos.length > 0) {
      messageBody += `\nPhotos: ${maintenanceDetails.photos.join(', ')}`;
    }
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: staffPhone
    });
    
    console.log('Maintenance staff SMS sent to:', staffPhone);
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send maintenance staff SMS:', error);
    return { success: false, error: error.message };
  }
}

export async function sendManualOnboardingDataRequestSMS(
  to: string,
  candidateName: string,
  formLink: string,
  missingFields: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const fieldsText = missingFields.join(', ');
    const messageBody = `Hi ${candidateName}! To complete your onboarding with Northstay, we need additional information: ${fieldsText}. Please fill out this quick form: ${formLink}`;
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: to
    });
    
    console.log('Manual onboarding data request SMS sent to:', to);
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send manual onboarding data request SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send calendar access link to staff member
 */
export async function sendCalendarAccessLinkSMS(
  to: string,
  staffName: string,
  calendarLink: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const messageBody = `Hi ${staffName}! Access your personal cleaning schedule calendar anytime: ${calendarLink}. This link is unique to you - don't share it. Schedules update daily.`;
    
    const message = await client.messages.create({
      body: messageBody,
      from: fromNumber,
      to: to
    });
    
    console.log('Calendar access link SMS sent to:', to);
    return { success: true, messageId: message.sid };
  } catch (error: any) {
    console.error('Failed to send calendar access link SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send meeting reminder to admin staff with candidate details
 */
export async function sendMeetingReminderToAdmins(
  adminPhones: { harry?: string; aras?: string },
  meetingDate: Date,
  roleType: string,
  candidateDetails: Array<{ name: string; phone: string }>,
  attendanceLink: string
): Promise<{ success: boolean; errors?: string[] }> {
  const errors: string[] = [];
  
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    const meetingTimeStr = meetingDate.toLocaleString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const candidateList = candidateDetails
      .map(c => `${c.name} (${c.phone || 'no phone'})`)
      .join(', ');
    
    const messageBody = `Meeting in 15 mins at ${meetingTimeStr} for ${roleType} candidates: ${candidateList}. Mark attendance: ${attendanceLink}`;
    
    // Send to StaffL if phone configured
    if (adminPhones.harry) {
      try {
        await client.messages.create({
          body: messageBody,
          from: fromNumber,
          to: adminPhones.harry
        });
        console.log('Meeting reminder sent to StaffL:', adminPhones.harry);
      } catch (error: any) {
        errors.push(`StaffL: ${error.message}`);
        console.error('Failed to send to StaffL:', error);
      }
    }
    
    // Send to Alex if phone configured
    if (adminPhones.aras) {
      try {
        await client.messages.create({
          body: messageBody,
          from: fromNumber,
          to: adminPhones.aras
        });
        console.log('Meeting reminder sent to Alex:', adminPhones.aras);
      } catch (error: any) {
        errors.push(`Alex: ${error.message}`);
        console.error('Failed to send to Alex:', error);
      }
    }
    
    if (!adminPhones.harry && !adminPhones.aras) {
      console.warn('No admin phone numbers configured for meeting reminders');
      return { success: false, errors: ['No admin phone numbers configured'] };
    }
    
    return { 
      success: errors.length === 0, 
      errors: errors.length > 0 ? errors : undefined 
    };
  } catch (error: any) {
    console.error('Failed to send meeting reminder to admins:', error);
    return { success: false, errors: [error.message] };
  }
}

/**
 * Send bulk onboarding links to multiple candidates
 */
export async function sendBulkOnboardingLinks(
  candidates: Array<{
    id: string;
    name: string;
    phone: string;
    onboardingToken: string;
  }>,
  baseUrl: string
): Promise<{ 
  success: boolean; 
  sent: string[]; 
  failed: Array<{ candidateId: string; error: string }> 
}> {
  const sent: string[] = [];
  const failed: Array<{ candidateId: string; error: string }> = [];
  
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();
    
    // Send to each candidate in parallel with rate limiting
    const sendPromises = candidates.map(async (candidate) => {
      try {
        const onboardingUrl = `${baseUrl}/onboarding/${candidate.onboardingToken}`;
        const messageBody = `Congrats ${candidate.name}! Welcome to Northstay. Complete your onboarding now: ${onboardingUrl}`;
        
        await client.messages.create({
          body: messageBody,
          from: fromNumber,
          to: candidate.phone
        });
        
        sent.push(candidate.id);
        console.log(`Onboarding SMS sent to ${candidate.name} (${candidate.phone})`);
      } catch (error: any) {
        failed.push({ 
          candidateId: candidate.id, 
          error: error.message 
        });
        console.error(`Failed to send onboarding SMS to ${candidate.name}:`, error.message);
      }
    });
    
    await Promise.all(sendPromises);
    
    return {
      success: failed.length === 0,
      sent,
      failed
    };
  } catch (error: any) {
    console.error('Failed to send bulk onboarding links:', error);
    return { 
      success: false, 
      sent: [], 
      failed: candidates.map(c => ({ 
        candidateId: c.id, 
        error: error.message 
      }))
    };
  }
}
