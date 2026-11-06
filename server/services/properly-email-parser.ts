import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ProperlyDamageReport {
  // Extracted property information
  propertyName: string | null;
  propertyAddress: string | null;
  roomName: string | null; // Specific room or unit if mentioned
  
  // Damage details
  damageTitle: string; // Brief title for the issue
  damageDescription: string; // Detailed description
  
  // Reporter information
  reporterName: string | null; // Cleaner who reported
  reporterEmail: string | null;
  
  // AI-determined fields
  priority: 'critical' | 'high' | 'medium' | 'low';
  serviceType: 'general' | 'waste_disposal' | 'electrician' | 'plumber' | 'locksmith';
  
  // Meta information
  extractionConfidence: 'high' | 'medium' | 'low';
  extractionNotes: string; // Explanation of AI decisions
}

/**
 * Parses damage report email from Properly cleaning software
 * Uses OpenAI to intelligently extract structured maintenance data
 */
export async function parseProperlyDamageEmail(
  emailSubject: string,
  emailBody: string,
  senderEmail: string,
  senderName?: string
): Promise<ProperlyDamageReport> {
  try {
    console.log('[Properly Parser] Starting AI extraction from damage report email...');
    console.log('[Properly Parser] Subject:', emailSubject);
    console.log('[Properly Parser] Sender:', senderEmail, senderName || '');
    
    const prompt = `You are an expert at extracting structured maintenance information from damage report emails sent by cleaning management software (Properly).

Analyze the following email and extract maintenance request details:

EMAIL SUBJECT: ${emailSubject}

EMAIL BODY:
${emailBody}

SENDER: ${senderName || 'Unknown'} <${senderEmail}>

Extract the following information and return it as JSON:

{
  "propertyName": "string or null (property name or identifier)",
  "propertyAddress": "string or null (full address if mentioned)",
  "roomName": "string or null (specific room, unit, or area damaged)",
  
  "damageTitle": "string (concise 5-10 word title summarizing the issue)",
  "damageDescription": "string (detailed description of the damage, include all relevant details from email)",
  
  "reporterName": "string or null (name of cleaner who reported damage)",
  "reporterEmail": "string or null (email of person who reported)",
  
  "priority": "critical | high | medium | low",
  "serviceType": "general | waste_disposal | electrician | plumber | locksmith",
  
  "extractionConfidence": "high | medium | low",
  "extractionNotes": "string (brief explanation of priority and service type determination)"
}

PRIORITY DETERMINATION GUIDELINES:
- "critical": Safety hazards, flooding, electrical failures, broken locks, gas leaks
- "high": Non-functional essential items (broken toilet, heating failure, major leak)
- "medium": Functional but damaged items (cracked tiles, loose handles, minor leaks)
- "low": Cosmetic issues (scuffs, marks, minor wear)

SERVICE TYPE DETERMINATION:
- "electrician": Electrical issues, lighting, switches, outlets, appliances
- "plumber": Water leaks, toilets, sinks, showers, drains, heating
- "locksmith": Locks, keys, doors, security
- "waste_disposal": Rubbish removal, bin issues, clutter
- "general": Everything else (furniture, walls, floors, windows, general repairs)

IMPORTANT:
- If property name/address is unclear, look for any location identifiers
- Always provide damageTitle and damageDescription even if other fields are uncertain
- Be conservative with "critical" priority - only use for genuine emergencies
- Default to "general" service type if unclear

Return ONLY valid JSON, no additional text.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a maintenance data extraction expert. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent extraction
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content) as ProperlyDamageReport;
    
    console.log('[Properly Parser] Extraction successful:', {
      propertyName: result.propertyName,
      priority: result.priority,
      serviceType: result.serviceType,
      confidence: result.extractionConfidence,
    });

    // Validate required fields
    if (!result.damageTitle || !result.damageDescription) {
      throw new Error('AI failed to extract required damage title or description');
    }

    return result;
  } catch (error: any) {
    console.error('[Properly Parser] Extraction failed:', error);
    throw new Error(`Email parsing failed: ${error.message}`);
  }
}

/**
 * Formats extracted data for logging and debugging
 */
export function formatDamageReportSummary(report: ProperlyDamageReport): string {
  return `
Property: ${report.propertyName || 'Unknown'} ${report.roomName ? `(${report.roomName})` : ''}
Address: ${report.propertyAddress || 'Not specified'}
Issue: ${report.damageTitle}
Priority: ${report.priority.toUpperCase()}
Service: ${report.serviceType}
Reporter: ${report.reporterName || 'Unknown'} ${report.reporterEmail ? `<${report.reporterEmail}>` : ''}
Confidence: ${report.extractionConfidence}
  `.trim();
}
