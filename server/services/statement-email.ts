import { setupEmailTransport } from '../email';
import type { Landlord, MonthlyStatement } from '@shared/schema';
import path from 'path';
import { promises as fs } from 'fs';

interface SendStatementEmailParams {
  landlord: Landlord;
  statement: MonthlyStatement;
}

/**
 * Send monthly statement email to landlord with PDF attachment
 */
export async function sendStatementEmail(params: SendStatementEmailParams): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { landlord, statement } = params;

    // Validate landlord email
    if (!landlord.email) {
      return {
        success: false,
        error: 'Landlord does not have an email address on file',
      };
    }

    // Validate file path
    if (!statement.filePath) {
      return {
        success: false,
        error: 'Statement does not have a file path',
      };
    }

    // Check if file exists
    const filePath = path.join(process.cwd(), statement.filePath);
    try {
      await fs.access(filePath);
    } catch (error) {
      return {
        success: false,
        error: `Statement file not found at: ${statement.filePath}`,
      };
    }

    // Get email transport
    const transporter = setupEmailTransport();

    // Format month and year for email
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[statement.month - 1];
    const subject = `Monthly Statement - ${monthName} ${statement.year}`;

    // Create professional email body
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
            .statement-details {
              background-color: #e3f2fd;
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
            <h1>Monthly Statement</h1>
          </div>
          <div class="content">
            <p>Dear ${escapeHtml(landlord.name)},</p>
            
            <p>Please find attached your monthly statement for <strong>${monthName} ${statement.year}</strong>.</p>
            
            ${statement.totalIncome || statement.totalExpenses || statement.netAmount ? `
            <div class="statement-details">
              <h3>Statement Summary</h3>
              ${statement.totalIncome ? `<p><strong>Total Income:</strong> £${parseFloat(statement.totalIncome).toFixed(2)}</p>` : ''}
              ${statement.totalExpenses ? `<p><strong>Total Expenses:</strong> £${parseFloat(statement.totalExpenses).toFixed(2)}</p>` : ''}
              ${statement.netAmount ? `<p><strong>Net Amount:</strong> £${parseFloat(statement.netAmount).toFixed(2)}</p>` : ''}
            </div>
            ` : ''}
            
            ${statement.notes ? `<p><strong>Notes:</strong><br>${escapeHtml(statement.notes)}</p>` : ''}
            
            <p>The detailed statement is attached to this email as a PDF document.</p>
            
            <p>If you have any questions or concerns about this statement, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>
            The Northstay Team</p>
            
            <div class="footer">
              <p>This is an automated email. For inquiries, please contact us at your usual communication channel.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email with attachment
    await transporter.sendMail({
      from: '"Northstay" <team@example.com>',
      to: landlord.email,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: statement.fileName,
          path: filePath,
        },
      ],
    });

    console.log(`[Statement Email] Successfully sent statement to ${landlord.email} for ${monthName} ${statement.year}`);
    
    return { success: true };
  } catch (error) {
    console.error('[Statement Email] Error sending statement email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send statement email',
    };
  }
}

/**
 * Escape HTML special characters to prevent HTML injection
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
