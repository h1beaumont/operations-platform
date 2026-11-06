
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Type definitions
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceExtractionResult {
  supplier?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  currency?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  lineItems?: InvoiceLineItem[];
  rawText?: string;
}

// Helper function for retries
async function withRetries<T>(fn: () => Promise<T>, attempts = 3, delayMs = 750): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { 
      return await fn(); 
    } catch (e) { 
      lastErr = e; 
    }
    if (i < attempts - 1) {
      await new Promise(r => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}

// Extract text from buffer
async function extractTextFromBuffer(buffer: Buffer, mime: string): Promise<string> {
  if (mime === "application/pdf") {
    try {
      const pdfParse = await import('pdf-parse') as any;
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    } catch (error) {
      const text = buffer.toString("utf8");
      const printable = (text.match(/[ -~\t\r\n]/g) || []).length;
      if (printable / Math.max(text.length, 1) < 0.3) {
        return "[[binary-pdf-without-text]]";
      }
      return text;
    }
  }
  return buffer.toString("utf8");
}

// Parse invoice without AI (fallback)
function parseInvoiceHeuristically(raw: string, supplier?: string): InvoiceExtractionResult {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const invoiceNumber = (lines.find(l => /invoice\s*#?\s*[:\- ]/i.test(l)) || "")
    .replace(/.*invoice\s*#?\s*[:\- ]/i, "").split(/\s+/)[0] || undefined;

  let currency = /£/.test(raw) ? "GBP" : /€/.test(raw) ? "EUR" : /\$/.test(raw) ? "USD" : undefined;
  const totalMatch = raw.match(/total\s*[:\- ]\s*([£€$]?\s*\d[\d,]*(?:\.\d{2})?)/i);
  const totalStr = totalMatch?.[1]?.replace(/[£€$\s,]/g, "");
  const total = totalStr && !isNaN(Number(totalStr)) ? Number(totalStr) : undefined;

  const itemLines = lines.filter(l => /\b(\d+)\b.*(@|x).*\d/.test(l)).slice(0, 30);
  const lineItems: InvoiceLineItem[] = itemLines.map((l) => {
    const qty = Number((l.match(/\b(\d+)\b/) || [])[1] || 1);
    const unit = Number((l.match(/@\s*([0-9.,]+)/) || [])[1]?.replace(/,/g, "")) || 0;
    const tot = Number((l.match(/=\s*([0-9.,]+)/) || [])[1]?.replace(/,/g, "")) || (qty * unit);
    const desc = l.replace(/\b\d+\b/g, "").replace(/[@=].*$/, "").trim() || "Item";
    return { description: desc, quantity: qty, unitPrice: unit, total: tot };
  });

  return {
    supplier,
    invoiceNumber,
    currency,
    total,
    lineItems: lineItems.length ? lineItems : undefined,
    rawText: raw.slice(0, 20000),
  };
}

// Parse with AI
async function parseInvoiceWithAI(raw: string, mime: string, supplier?: string): Promise<InvoiceExtractionResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY missing");
  }
  
  const { default: OpenAI } = await import("openai");
  const openaiClient = new OpenAI({ apiKey: key });

  const schema = z.object({
    supplier: z.string().optional(),
    invoiceNumber: z.string().optional(),
    invoiceDate: z.string().optional(),
    currency: z.string().optional(),
    subtotal: z.number().optional(),
    tax: z.number().optional(),
    total: z.number().optional(),
    lineItems: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      total: z.number(),
    })).optional(),
  });

  const systemPrompt = `You are a precise invoice parser. Return a strict JSON object with fields:
- supplier (string)
- invoiceNumber (string)
- invoiceDate (YYYY-MM-DD)
- currency (ISO or symbol like GBP/EUR/USD)
- subtotal (number)
- tax (number)
- total (number)
- lineItems: array of { description, quantity, unitPrice, total }.
Respond with JSON only.`;

  const userPrompt = `MIME: ${mime}
Supplier hint: ${supplier ?? "unknown"}
TEXT SNIPPET:
${raw.slice(0, 12000)}`;

  const resp = await withRetries(async () => {
    if (mime.startsWith('image/')) {
      const base64Image = raw;
      const r = await openaiClient.chat.completions.create({
        model: "gpt-4o-2024-11-20",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              {
                type: "text",
                text: `Extract data from this ${supplier || ''} invoice. Return JSON as specified.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
      });
      return r.choices[0]?.message?.content || "{}";
    } else {
      const r = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });
      return r.choices[0]?.message?.content || "{}";
    }
  });

  const json = JSON.parse(resp || "{}");
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error("AI JSON schema validation failed");
  }
  return { 
    ...parsed.data, 
    supplier: parsed.data.supplier ?? supplier, 
    rawText: raw.slice(0, 20000) 
  };
}

// Main export function
export async function processInvoiceFile(
  fileBuffer: Buffer,
  mimetype: string,
  supplier?: string
): Promise<InvoiceExtractionResult> {
  let raw: string;
  
  if (mimetype.startsWith('image/')) {
    raw = fileBuffer.toString('base64');
  } else {
    raw = await extractTextFromBuffer(fileBuffer, mimetype);
  }

  // Try AI extraction with retries
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await parseInvoiceWithAI(raw, mimetype, supplier);
    } catch (error) {
      lastError = error as Error;
      console.error(`[Invoice Extraction] AI parsing attempt ${attempt + 1} failed:`, error);
      if (attempt === 0) {
        // Wait before retry
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }
  
  // Fallback to heuristic parsing
  console.error('[Invoice Extraction] All AI attempts failed, using heuristic fallback');
  if (mimetype.startsWith('image/')) {
    throw new Error(`Image invoice extraction requires AI processing. Error: ${lastError?.message}`);
  }
  return parseInvoiceHeuristically(raw, supplier);
}

// Alternative export for text extraction
export async function extractInvoiceData(
  fileContent: string, 
  supplier: string
): Promise<InvoiceExtractionResult> {
  try {
    return await parseInvoiceWithAI(fileContent, 'text/plain', supplier);
  } catch (error) {
    console.error('[Invoice Extraction] AI parsing failed, using heuristic fallback:', error);
    return parseInvoiceHeuristically(fileContent, supplier);
  }
}
