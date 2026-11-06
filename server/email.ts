import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Escape HTML special characters to prevent HTML injection attacks
 */
function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

let transporter: Transporter | null = null;

/**
 * Configure Gmail SMTP transport using environment variables
 */
export function setupEmailTransport(): Transporter {
  if (!transporter) {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD environment variables must be set');
    }

    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // use STARTTLS
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
  }

  return transporter;
}

/**
 * Convert plain text to formatted HTML email
 */
function formatEmailBody(textBody: string): string {
  const escapedBody = escapeHtml(textBody);
  const paragraphs = escapedBody.split('\n\n').map(p => 
    p.trim() ? `<p>${p.replace(/\n/g, '<br>')}</p>` : ''
  ).filter(p => p).join('\n            ');

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #0066cc;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Northstay</h1>
          </div>
          <div class="content">
            ${paragraphs}
            
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;
}

/**
 * Send generic email with custom subject and body
 */
export async function sendGenericEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = setupEmailTransport();
    const htmlBody = formatEmailBody(body);

    await transport.sendMail({
      from: '"Northstay Team" <team@example.com>',
      to,
      subject,
      html: htmlBody,
    });

    console.log('Generic email sent to:', to);
    return { success: true };
  } catch (error) {
    console.error('Error sending generic email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send meeting invite email to candidate
 */
export async function sendMeetingInvite(
  to: string,
  candidateName: string,
  meetingLink: string,
  meetingDate: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = setupEmailTransport();

    const escapedCandidateName = escapeHtml(candidateName);
    const escapedMeetingLink = escapeHtml(meetingLink);
    const escapedMeetingDate = escapeHtml(meetingDate);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #0066cc;
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
              letter-spacing: 1px;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #0066cc;
              color: white !important;
              font-size: 16px;
              font-weight: 600;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Northstay</h1>
          </div>
          <div class="content">
            <p>Dear ${escapedCandidateName},</p>
            
            <p>Thank you for your interest in joining the Northstay team. We're pleased to invite you to an interview.</p>
            
            <p><strong>Interview Details:</strong></p>
            <p>Date & Time: ${escapedMeetingDate}</p>
            
            <p>Please click the button below to join the meeting:</p>
            
            <a href="${escapedMeetingLink}" class="button">Join Meeting</a>
            
            <p>Or copy and paste this link into your browser:<br>
            <a href="${escapedMeetingLink}">${escapedMeetingLink}</a></p>
            
            <p>We look forward to speaking with you!</p>
            
            <p>Best regards,<br>
            The Northstay Team</p>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const info = await transport.sendMail({
      from: '"Northstay Team" <team@example.com>',
      to,
      subject: '[Northstay] Interview Invitation',
      html: htmlContent,
    });

    console.log('Meeting invite sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending meeting invite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send screening link email to candidate with anti-scam message
 */
export async function sendScreeningLink(
  to: string,
  candidateName: string,
  roleType: string,
  screeningUrl: string,
  appliedDate: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = setupEmailTransport();

    const escapedCandidateName = escapeHtml(candidateName);
    const escapedRoleType = escapeHtml(roleType);
    const escapedScreeningUrl = escapeHtml(screeningUrl);
    const escapedAppliedDate = escapeHtml(appliedDate);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #0066cc;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #0066cc;
              color: white !important;
              font-size: 16px;
              font-weight: 600;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .anti-scam {
              background-color: #fff3cd;
              border: 1px solid #ffc107;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Complete Your Application Screening</h1>
          </div>
          <div class="content">
            <p>Dear ${escapedCandidateName},</p>
            
            <div class="anti-scam">
              <strong>⚠️ IMPORTANT:</strong> You applied for ${escapedRoleType} Cleaner at Northstay via Indeed on ${escapedAppliedDate}.
            </div>
            
            <p>Thank you for your application. To proceed with your application, please complete a short screening questionnaire.</p>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Click the button below to complete your screening</li>
              <li>Answer a few quick questions about your experience</li>
              <li>This link expires in 14 days</li>
            </ul>
            
            <a href="${escapedScreeningUrl}" class="button">Complete Screening</a>
            
            <p>Or copy and paste this link into your browser:<br>
            <a href="${escapedScreeningUrl}">${escapedScreeningUrl}</a></p>
            
            <p>If you did not apply for this position, please disregard this email.</p>
            
            <p>Best regards,<br>
            The Northstay Team</p>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const info = await transport.sendMail({
      from: '"Northstay Team" <team@example.com>',
      to,
      subject: '[Northstay] Complete Your Application Screening',
      html: htmlContent,
    });

    console.log('Screening link sent via email:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending screening link email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send onboarding form email to candidate
 */
export async function sendOnboardingForm(
  to: string,
  candidateName: string,
  formUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = setupEmailTransport();

    const escapedCandidateName = escapeHtml(candidateName);
    const escapedFormUrl = escapeHtml(formUrl);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #0066cc;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #0066cc;
              color: white !important;
              font-size: 16px;
              font-weight: 600;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
            .important {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Onboarding Form</h1>
          </div>
          <div class="content">
            <p>Dear ${escapedCandidateName},</p>
            
            <p>Welcome to Northstay! We're excited to have you join our team.</p>
            
            <p>To complete your onboarding process, please fill out the required information in our onboarding form.</p>
            
            <div class="important">
              <strong>Important:</strong> Please complete this form as soon as possible to ensure a smooth onboarding process.
            </div>
            
            <a href="${escapedFormUrl}" class="button">Complete Onboarding Form</a>
            
            <p>Or copy and paste this link into your browser:<br>
            <a href="${escapedFormUrl}">${escapedFormUrl}</a></p>
            
            <p>If you have any questions or need assistance, please don't hesitate to reach out to us.</p>
            
            <p>Best regards,<br>
            The Northstay Team</p>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const info = await transport.sendMail({
      from: '"Northstay Team" <team@example.com>',
      to,
      subject: '[Northstay] Complete Your Onboarding Form',
      html: htmlContent,
    });

    console.log('Onboarding form sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending onboarding form:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send admin availability reminder email with submission link
 */
export async function sendAdminAvailabilityReminder(
  to: string,
  staffName: string,
  submissionLink: string,
  periodStart: string,
  periodEnd: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = setupEmailTransport();

    const escapedStaffName = escapeHtml(staffName);
    const escapedSubmissionLink = escapeHtml(submissionLink);
    const escapedPeriodStart = escapeHtml(periodStart);
    const escapedPeriodEnd = escapeHtml(periodEnd);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #0066cc;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #0066cc;
              color: white !important;
              font-size: 16px;
              font-weight: 600;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
            .important {
              background-color: #e3f2fd;
              border-left: 4px solid #0066cc;
              padding: 15px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Availability Update Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${escapedStaffName},</p>
            
            <p>This is a reminder to update your availability for the upcoming period.</p>
            
            <div class="important">
              <strong>Period:</strong> ${escapedPeriodStart} to ${escapedPeriodEnd}<br>
              <strong>Deadline:</strong> Please update as soon as possible
            </div>
            
            <p>Please click the button below to submit your availability:</p>
            
            <a href="${escapedSubmissionLink}" class="button">Update My Availability</a>
            
            <p>Or copy and paste this link into your browser:<br>
            <a href="${escapedSubmissionLink}">${escapedSubmissionLink}</a></p>
            
            <p>The form is mobile-friendly and should only take a minute to complete.</p>
            
            <p>Thank you for keeping your availability up to date!</p>
            
            <p>Best regards,<br>
            The Northstay Team</p>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const info = await transport.sendMail({
      from: '"Northstay Team" <team@example.com>',
      to,
      subject: '[Northstay] Please Update Your Availability',
      html: htmlContent,
    });

    console.log('Admin availability reminder sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending admin availability reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send rent payment confirmation receipt to tenant
 */
export async function sendRentPaymentReceipt(
  to: string,
  tenantName: string,
  propertyName: string,
  amount: number,
  dueDate: string,
  paidDate: string,
  paymentMethod: string,
  reference: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = setupEmailTransport();

    const escapedTenantName = escapeHtml(tenantName);
    const escapedPropertyName = escapeHtml(propertyName);
    const escapedDueDate = escapeHtml(dueDate);
    const escapedPaidDate = escapeHtml(paidDate);
    const escapedPaymentMethod = escapeHtml(paymentMethod);
    const escapedReference = escapeHtml(reference);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #28a745;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .receipt-box {
              background-color: white;
              border: 2px solid #28a745;
              border-radius: 5px;
              padding: 20px;
              margin: 20px 0;
            }
            .receipt-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #eee;
            }
            .receipt-row:last-child {
              border-bottom: none;
              font-weight: bold;
              font-size: 1.2em;
              color: #28a745;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>✓ Rent Payment Received</h1>
          </div>
          <div class="content">
            <p>Dear ${escapedTenantName},</p>
            
            <p>Thank you for your rent payment. This email confirms that we have received your payment for <strong>${escapedPropertyName}</strong>.</p>
            
            <div class="receipt-box">
              <h3 style="margin-top: 0; color: #28a745;">Payment Receipt</h3>
              
              <div class="receipt-row">
                <span>Property:</span>
                <span><strong>${escapedPropertyName}</strong></span>
              </div>
              
              <div class="receipt-row">
                <span>Rent Amount:</span>
                <span><strong>£${amount.toFixed(2)}</strong></span>
              </div>
              
              <div class="receipt-row">
                <span>Due Date:</span>
                <span>${escapedDueDate}</span>
              </div>
              
              <div class="receipt-row">
                <span>Payment Date:</span>
                <span>${escapedPaidDate}</span>
              </div>
              
              <div class="receipt-row">
                <span>Payment Method:</span>
                <span>${escapedPaymentMethod}</span>
              </div>
              
              <div class="receipt-row">
                <span>Reference:</span>
                <span>${escapedReference}</span>
              </div>
              
              <div class="receipt-row">
                <span>Status:</span>
                <span style="color: #28a745;"><strong>✓ PAID</strong></span>
              </div>
            </div>
            
            <p>Please keep this email for your records. If you have any questions about this payment, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            Northstay<br>
            Property Management Team</p>
            
            <div class="footer">
              <p>This is an automated receipt confirmation. Please retain this email for your records.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const info = await transport.sendMail({
      from: '"Northstay" <team@example.com>',
      to,
      subject: `[Northstay] Rent Payment Receipt - ${propertyName}`,
      html: htmlContent,
    });

    console.log('Rent payment receipt sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending rent payment receipt:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send trial shift assignment email to new hire
 */
export async function sendTrialShiftNotification(
  to: string,
  candidateName: string,
  shift1Date: string,
  shift2Date: string,
  mentorName: string,
  location: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = setupEmailTransport();

    const escapedCandidateName = escapeHtml(candidateName);
    const escapedShift1Date = escapeHtml(shift1Date);
    const escapedShift2Date = escapeHtml(shift2Date);
    const escapedMentorName = escapeHtml(mentorName);
    const escapedLocation = escapeHtml(location);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #28a745;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .shift-box {
              background-color: #e8f5e9;
              border-left: 4px solid #28a745;
              padding: 15px;
              margin: 15px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Congratulations! Trial Shifts Assigned</h1>
          </div>
          <div class="content">
            <p>Dear ${escapedCandidateName},</p>
            
            <p>Congratulations on being hired! We're excited to welcome you to the Northstay team.</p>
            
            <p>You have been assigned two trial shifts with your mentor, <strong>${escapedMentorName}</strong>.</p>
            
            <div class="shift-box">
              <h3>Trial Shift 1</h3>
              <p><strong>Date & Time:</strong> ${escapedShift1Date}<br>
              <strong>Location:</strong> ${escapedLocation}<br>
              <strong>Mentor:</strong> ${escapedMentorName}</p>
            </div>
            
            <div class="shift-box">
              <h3>Trial Shift 2</h3>
              <p><strong>Date & Time:</strong> ${escapedShift2Date}<br>
              <strong>Location:</strong> ${escapedLocation}<br>
              <strong>Mentor:</strong> ${escapedMentorName}</p>
            </div>
            
            <p><strong>What to expect:</strong></p>
            <ul>
              <li>Your mentor will guide you through the cleaning process</li>
              <li>Please arrive 10 minutes early to meet your mentor</li>
              <li>Bring comfortable work clothes and shoes</li>
              <li>Be ready to learn and ask questions</li>
            </ul>
            
            <p>We look forward to working with you!</p>
            
            <p>Best regards,<br>
            The Northstay Team</p>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const info = await transport.sendMail({
      from: '"Northstay Team" <team@example.com>',
      to,
      subject: '[Northstay] Your Trial Shifts Have Been Scheduled!',
      html: htmlContent,
    });

    console.log('Trial shift notification sent:', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Error sending trial shift notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send maintenance alert email to landlord
 */
export async function sendMaintenanceLandlordEmail(
  landlordEmail: string,
  landlordName: string,
  maintenanceDetails: {
    propertyAddress: string;
    title: string;
    description: string;
    priority: string;
    reportedByName: string;
    assignedWorkerName: string;
    likelyCost: number | null;
    availabilityDate: string;
    availabilityTime: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = setupEmailTransport();

    const escapedLandlordName = escapeHtml(landlordName);
    const escapedPropertyAddress = escapeHtml(maintenanceDetails.propertyAddress);
    const escapedTitle = escapeHtml(maintenanceDetails.title);
    const escapedDescription = escapeHtml(maintenanceDetails.description);
    const escapedPriority = escapeHtml(maintenanceDetails.priority);
    const escapedReportedBy = escapeHtml(maintenanceDetails.reportedByName);
    const escapedWorkerName = escapeHtml(maintenanceDetails.assignedWorkerName);
    const escapedDate = escapeHtml(maintenanceDetails.availabilityDate);
    const escapedTime = escapeHtml(maintenanceDetails.availabilityTime);
    const costText = maintenanceDetails.likelyCost 
      ? `£${maintenanceDetails.likelyCost.toFixed(2)} (estimate)` 
      : 'To be determined';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #0066cc;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .info-box {
              background-color: #fff;
              border-left: 4px solid #0066cc;
              padding: 15px;
              margin: 20px 0;
            }
            .priority-high {
              border-left-color: #dc3545;
            }
            .priority-critical {
              border-left-color: #dc3545;
              background-color: #ffe6e6;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔧 Maintenance Alert</h1>
          </div>
          <div class="content">
            <p>Dear ${escapedLandlordName},</p>
            
            <p>A maintenance issue has been reported for your property at <strong>${escapedPropertyAddress}</strong>.</p>
            
            <div class="info-box ${maintenanceDetails.priority === 'critical' || maintenanceDetails.priority === 'high' ? 'priority-high' : ''}">
              <p><strong>Issue:</strong> ${escapedTitle}</p>
              <p><strong>Description:</strong> ${escapedDescription}</p>
              <p><strong>Priority:</strong> ${escapedPriority}</p>
              <p><strong>Reported by:</strong> ${escapedReportedBy}</p>
              <p><strong>Assigned staff:</strong> ${escapedWorkerName}</p>
              <p><strong>Likely cost:</strong> ${costText}</p>
              <p><strong>Scheduled:</strong> ${escapedDate} at ${escapedTime}</p>
            </div>
            
            <p>We will keep you updated on the progress and notify you once the work is completed.</p>
            
            <p>Best regards,<br>
            Northstay Team</p>
            
            <div class="footer">
              <p>This is an automated email. Please do not reply directly to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transport.sendMail({
      from: '"Northstay Team" <team@example.com>',
      to: landlordEmail,
      subject: `Maintenance Alert: ${escapedPropertyAddress}`,
      html: htmlContent,
    });

    console.log('Maintenance landlord email sent to:', landlordEmail);
    return { success: true };
  } catch (error) {
    console.error('Error sending maintenance landlord email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Send landlord portal invitation email with password setup link
 */
export async function sendLandlordInviteEmail(
  landlordEmail: string,
  landlordName: string,
  setupToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = setupEmailTransport();
    
    // Get base URL from environment or use default
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : 'http://localhost:5000';
    
    const setupUrl = `${baseUrl}/landlord-setup/${setupToken}`;
    
    const escapedName = escapeHtml(landlordName);
    const escapedEmail = escapeHtml(landlordEmail);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #0066cc;
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: #f9f9f9;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 15px 30px;
              background-color: #0066cc;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .info-box {
              background-color: #e8f4fd;
              border-left: 4px solid #0066cc;
              padding: 15px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏠 Welcome to Northstay</h1>
            <p>Landlord Portal Access</p>
          </div>
          <div class="content">
            <p>Dear ${escapedName},</p>
            
            <p>You've been invited to access the Northstay Landlord Portal! This secure portal gives you 24/7 access to:</p>
            
            <ul>
              <li>📊 Monthly financial statements</li>
              <li>🏘️ Your property portfolio</li>
              <li>🔧 Maintenance requests and updates</li>
              <li>📄 Management contracts</li>
            </ul>
            
            <div class="info-box">
              <p><strong>To get started, set up your secure password:</strong></p>
              <p><strong>Email:</strong> ${escapedEmail}</p>
            </div>
            
            <center>
              <a href="${setupUrl}" class="button" style="color: white;">Set Up My Password</a>
            </center>
            
            <p><small>Or copy and paste this link into your browser:<br>
            ${setupUrl}</small></p>
            
            <p><strong>⚠️ Important:</strong> This setup link will expire in 48 hours for security reasons. If it expires, please contact our team for a new invitation.</p>
            
            <p>Once your password is set, you can log in anytime at:<br>
            <strong>${baseUrl}/landlord-login</strong></p>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            Northstay Team</p>
            
            <div class="footer">
              <p>This is an automated email from Northstay. Please do not reply directly to this message.</p>
              <p>If you did not expect this invitation, please contact us immediately.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await transport.sendMail({
      from: '"Northstay Team" <team@example.com>',
      to: landlordEmail,
      subject: '🔐 Your Landlord Portal Access - Set Up Your Password',
      html: htmlContent,
    });

    console.log('Landlord invite email sent to:', landlordEmail);
    return { success: true };
  } catch (error) {
    console.error('Error sending landlord invite email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
