import OpenAI from "openai";

interface ComplaintDetails {
  guestName: string;
  property: string;
  cleaningIssues?: string;
  maintenanceIssues?: string;
  customerServiceIssues?: string;
  linenIssues?: string;
  compensationOffered?: string;
  fullDescription: string;
}

export async function generateComplaintResponse(
  complaintDetails: ComplaintDetails
): Promise<{
  subject: string;
  body: string;
  compensationAdvice: { recommended: string; reason: string };
}> {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  // Analyze complaint to determine compensation recommendation
  const compensationPrompt = `You are analyzing a guest complaint for a serviced accommodation property. Based on the complaint details below, recommend appropriate compensation following these guidelines:

**Compensation Guidelines:**
- Cleaning issues (minor): Cleaning fee refund
- Cleaning issues (major): Cleaning fee refund + 10% discount on future stay
- Maintenance issues (minor/medium): One night's cost refund
- Maintenance issues (severe): Up to 30% of booking refund
- Customer service issues: 10% discount on future stay
- Multiple issues combined: Scale up compensation appropriately
- Linen quality issues: Apology + 10% discount on future stay

**Complaint Details:**
Property: ${complaintDetails.property}
Guest: ${complaintDetails.guestName}
${complaintDetails.cleaningIssues ? `Cleaning Issues: ${complaintDetails.cleaningIssues}` : ''}
${complaintDetails.maintenanceIssues ? `Maintenance Issues: ${complaintDetails.maintenanceIssues}` : ''}
${complaintDetails.customerServiceIssues ? `Customer Service Issues: ${complaintDetails.customerServiceIssues}` : ''}
${complaintDetails.linenIssues ? `Linen Issues: ${complaintDetails.linenIssues}` : ''}
${complaintDetails.compensationOffered ? `Compensation Already Offered: ${complaintDetails.compensationOffered}` : ''}

Full Description: ${complaintDetails.fullDescription}

Provide your recommendation in this exact JSON format:
{
  "recommended": "Brief recommendation (e.g., 'Cleaning fee refund + 10% future discount')",
  "reason": "Brief explanation of why this compensation is appropriate"
}`;

  const compensationResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a guest relations specialist for a serviced accommodation business. Provide compensation recommendations in JSON format only."
      },
      {
        role: "user",
        content: compensationPrompt
      }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  const compensationAdvice = JSON.parse(compensationResponse.choices[0].message.content || "{}");

  // Generate email subject
  const subjectPrompt = `Create a professional, empathetic email subject line (5-10 words) in British English for responding to this guest complaint about ${complaintDetails.property}. 

Complaint summary: ${complaintDetails.fullDescription.substring(0, 200)}

The subject should be:
- Professional and empathetic
- Acknowledge the issue without being defensive
- Be concise (5-10 words maximum)

Provide ONLY the subject line, nothing else.`;

  const subjectResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a professional guest relations specialist. Provide only the email subject line requested, nothing more."
      },
      {
        role: "user",
        content: subjectPrompt
      }
    ],
    temperature: 0.7,
    max_tokens: 50
  });

  const subject = subjectResponse.choices[0].message.content?.trim() || "Regarding Your Recent Stay";

  // Generate email body
  const bodyPrompt = `Create a professional, empathetic email response (300-500 words) in British English to this guest complaint:

**Guest:** ${complaintDetails.guestName}
**Property:** ${complaintDetails.property}
${complaintDetails.cleaningIssues ? `**Cleaning Issues:** ${complaintDetails.cleaningIssues}` : ''}
${complaintDetails.maintenanceIssues ? `**Maintenance Issues:** ${complaintDetails.maintenanceIssues}` : ''}
${complaintDetails.customerServiceIssues ? `**Customer Service Issues:** ${complaintDetails.customerServiceIssues}` : ''}
${complaintDetails.linenIssues ? `**Linen Issues:** ${complaintDetails.linenIssues}` : ''}
${complaintDetails.compensationOffered ? `**Compensation Already Offered:** ${complaintDetails.compensationOffered}` : ''}

**Full Complaint:** ${complaintDetails.fullDescription}

**Recommended Compensation:** ${compensationAdvice.recommended}

**Requirements:**
1. Use British English spelling and phrasing
2. Be professional, empathetic, and solution-focused
3. Acknowledge the specific issues raised
4. Apologise sincerely without being overly defensive
5. Explain what went wrong (if clear) and what improvements are being made
6. Offer the recommended compensation clearly
7. Mention that we track quality through our Properly/Connect systems (without revealing internal processes)
8. Thank them for their feedback
9. Invite them to stay with us again
10. Close professionally with contact information for further concerns
11. 300-500 words total
12. Use proper email formatting with paragraphs

Tone: Professional, warm, empathetic, solution-oriented`;

  const bodyResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "You are a senior guest relations manager for a high-end serviced accommodation business. Write professional, empathetic responses to guest complaints in British English."
      },
      {
        role: "user",
        content: bodyPrompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  const body = bodyResponse.choices[0].message.content?.trim() || "We sincerely apologise for the issues you experienced during your stay.";

  return {
    subject,
    body,
    compensationAdvice: {
      recommended: compensationAdvice.recommended || "Case-by-case review needed",
      reason: compensationAdvice.reason || "Multiple factors to consider"
    }
  };
}
