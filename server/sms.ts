import type { Staff } from "@shared/schema";
import { getTwilioClient, getTwilioFromPhoneNumber } from "./twilio";

// This file has been deprecated in favor of server/twilio.ts
// All Twilio functionality should be imported from server/twilio.ts

export async function sendMonthlyRankingSMS(
  staff: Staff,
  rank: number,
  score: number,
  totalStaff: number,
  prizes: { first: string, second: string, third: string }
): Promise<void> {
  try {
    const client = await getTwilioClient();
    const fromNumber = await getTwilioFromPhoneNumber();

    if (!staff.phone) {
      console.warn(`Staff member ${staff.fullName} has no phone number. SMS not sent.`);
      return;
    }
    
    const prizeText = rank === 1 ? `1ST PLACE - YOU WON: ${prizes.first}!` :
                      rank === 2 ? `2ND PLACE - YOU WON: ${prizes.second}!` :
                      rank === 3 ? `3RD PLACE - YOU WON: ${prizes.third}!` :
                      '';
    
    const message = `
Monthly Compliance Update

Your Ranking: ${rank} of ${totalStaff}
Your Score: ${score.toFixed(1)}/15.0 (${((score/15)*100).toFixed(0)}%)

${prizeText}

Top 3 Prizes:
1st: ${prizes.first}
2nd: ${prizes.second}  
3rd: ${prizes.third}

Keep up the great work!
    `.trim();

    await client.messages.create({
      body: message,
      from: fromNumber,
      to: staff.phone
    });
    console.log(`SMS sent to ${staff.fullName} at ${staff.phone}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not connected')) {
      console.warn('Twilio not configured. SMS not sent.');
      return;
    }
    console.error(`Failed to send SMS to ${staff.fullName}:`, error);
    throw error;
  }
}
