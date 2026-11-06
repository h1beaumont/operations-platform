import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PropertyExtractionResult {
  // Basic Information
  propertyName: string | null;
  address: string | null;
  propertyType: string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  
  // Owner Details (if mentioned in listing)
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  
  // Property Access
  lockboxLocation: string | null;
  lockboxCode: string | null;
  keyLocationDetails: string | null;
  entryInstructions: string | null;
  gateAccessCodes: string | null;
  
  // Utilities
  wifiName: string | null;
  wifiPassword: string | null;
  fuseboxLocation: string | null;
  waterStopcockLocation: string | null;
  electricMeterLocation: string | null;
  gasMeterLocation: string | null;
  binCollectionDay: string | null;
  binStorageLocation: string | null;
  
  // Additional Information
  parkingDetails: string | null;
  cleaningInstructions: string | null;
  houseRules: string | null;
  specialRequirements: string | null;
  notes: string | null;
  
  // Amenities and features
  amenities: string | null;
  
  // AI confidence and summary
  extractionConfidence: 'high' | 'medium' | 'low';
  extractionSummary: string;
}

/**
 * Extracts property information from listing description and check-in details
 * Uses OpenAI to intelligently parse unstructured text
 */
export async function extractPropertyData(
  listingDescription: string | null,
  checkInDetails: string | null,
  bookingLinks: {
    airbnbLink?: string;
    bookingComLink?: string;
    otherLinks?: string;
  } = {}
): Promise<PropertyExtractionResult> {
  try {
    console.log('[Property Extraction] Starting AI extraction...');
    
    // Build combined context for AI
    let context = '';
    
    if (listingDescription) {
      context += `LISTING DESCRIPTION:\n${listingDescription.substring(0, 8000)}\n\n`;
    }
    
    if (checkInDetails) {
      context += `CHECK-IN DETAILS DOCUMENT:\n${checkInDetails.substring(0, 8000)}\n\n`;
    }
    
    if (Object.keys(bookingLinks).length > 0) {
      context += `BOOKING PLATFORM LINKS:\n`;
      if (bookingLinks.airbnbLink) context += `Airbnb: ${bookingLinks.airbnbLink}\n`;
      if (bookingLinks.bookingComLink) context += `Booking.com: ${bookingLinks.bookingComLink}\n`;
      if (bookingLinks.otherLinks) context += `Other: ${bookingLinks.otherLinks}\n`;
      context += '\n';
    }
    
    if (!context.trim()) {
      throw new Error('No content provided for extraction');
    }
    
    const prompt = `You are an expert at extracting structured property information from listing descriptions and check-in documents.

Analyze the following property information and extract all available details into a structured format.

${context}

Please extract and return the information in the following JSON format. If a field is not mentioned or cannot be determined, use null:

{
  "propertyName": "string or null (property title/name)",
  "address": "string or null (full address including postcode)",
  "propertyType": "string or null (House, Apartment, Cottage, Studio, etc.)",
  "bedrooms": "string or null (number as string, e.g., '3')",
  "bathrooms": "string or null (number as string, e.g., '2')",
  
  "ownerName": "string or null",
  "ownerEmail": "string or null",
  "ownerPhone": "string or null",
  
  "lockboxLocation": "string or null (where the lockbox is located)",
  "lockboxCode": "string or null (access code)",
  "keyLocationDetails": "string or null (where keys are kept)",
  "entryInstructions": "string or null (how to enter the property)",
  "gateAccessCodes": "string or null (any gate or building codes)",
  
  "wifiName": "string or null (WiFi network name/SSID)",
  "wifiPassword": "string or null",
  "fuseboxLocation": "string or null (where the electrical fusebox is)",
  "waterStopcockLocation": "string or null (where the water stopcock is)",
  "electricMeterLocation": "string or null",
  "gasMeterLocation": "string or null",
  "binCollectionDay": "string or null (e.g., 'Monday', 'Tuesdays and Fridays')",
  "binStorageLocation": "string or null",
  
  "parkingDetails": "string or null (parking instructions, permit info, etc.)",
  "cleaningInstructions": "string or null (any cleaning-specific notes)",
  "houseRules": "string or null (rules for guests)",
  "specialRequirements": "string or null (any special notes or requirements)",
  "notes": "string or null (any other important information)",
  
  "amenities": "string or null (comma-separated list of amenities)",
  
  "extractionConfidence": "high, medium, or low (how confident you are in the extraction)",
  "extractionSummary": "Brief 1-2 sentence summary of what was extracted and data quality"
}

Guidelines:
- Extract exact information as stated in the documents
- For locations (fusebox, stopcock, etc.), be specific: "Under stairs cupboard", "Kitchen under sink", etc.
- For WiFi details, extract the exact network name and password
- Be conservative - only mark as "high" confidence if the information is clearly stated
- Consolidate similar information from both documents (listing description and check-in details)
- Return ONLY valid JSON with no markdown formatting`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an AI expert at extracting structured property data from unstructured text. Always return valid JSON with no markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for more consistent extraction
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Safe JSON parsing with markdown cleanup
    let extraction: any;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extraction = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('[Property Extraction] JSON parse error:', parseError);
      console.error('[Property Extraction] Raw content:', content.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`);
    }
    
    console.log('[Property Extraction] Extraction completed successfully');
    console.log('[Property Extraction] Confidence:', extraction.extractionConfidence);
    console.log('[Property Extraction] Summary:', extraction.extractionSummary);
    
    return extraction as PropertyExtractionResult;
  } catch (error) {
    console.error('[Property Extraction] Error extracting property data:', error);
    throw new Error(`Property extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extracts text from uploaded document (PDF, Word, or plain text)
 * For PDFs, uses pdf-parse. For other formats, returns as-is or uses OpenAI vision if image
 */
export async function extractTextFromDocument(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    console.log(`[Document Extraction] Processing file: ${fileName} (${mimeType})`);
    
    // Handle PDF files
    if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      // Dynamic import for ESM compatibility - pdf-parse exports function directly
      const pdfParse = await import('pdf-parse') as any;
      const data = await pdfParse(fileBuffer);
      console.log('[Document Extraction] PDF extracted:', data.text.length, 'characters');
      return data.text;
    }
    
    // Handle plain text files
    if (mimeType.startsWith('text/') || fileName.toLowerCase().endsWith('.txt')) {
      const text = fileBuffer.toString('utf-8');
      console.log('[Document Extraction] Text file extracted:', text.length, 'characters');
      return text;
    }
    
    // Handle Word documents
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.toLowerCase().endsWith('.docx')) {
      // For Word docs, we'd need mammoth or similar library
      // For now, return error message
      throw new Error('Word document support not yet implemented. Please use PDF or plain text.');
    }
    
    // Handle images using OpenAI Vision
    if (mimeType.startsWith('image/')) {
      console.log('[Document Extraction] Using OpenAI Vision for image extraction...');
      
      const base64Image = fileBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. This appears to be property check-in details or welcome information. Return all visible text exactly as written, preserving formatting where possible.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
      });
      
      const extractedText = response.choices[0]?.message?.content || '';
      console.log('[Document Extraction] Image OCR completed:', extractedText.length, 'characters');
      return extractedText;
    }
    
    throw new Error(`Unsupported file type: ${mimeType}. Please use PDF, text file, or image.`);
  } catch (error) {
    console.error('[Document Extraction] Error extracting text:', error);
    throw new Error(`Document extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
