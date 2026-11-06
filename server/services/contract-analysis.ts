import OpenAI from 'openai';
import type { ManagementContract } from '@shared/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ContractAnalysisResult {
  isLegallyValid: boolean;
  legalAnalysisNotes: string;
  aiAnalysisSummary: string;
  renewalDate: Date | null;
  startDate: Date | null;
  endDate: Date | null;
  managementFeePercentage: string | null;
  managementFeeFixed: string | null;
  paymentSchedule: string | null;
  specialTerms: string | null;
  maintenancePreference: string | null;
  maintenanceApprovalLimit: string | null;
}

/**
 * Analyzes a property management contract PDF using OpenAI
 * Extracts key dates, fees, terms, and provides a legal validity assessment
 */
export async function analyzeManagementContract(
  contractText: string,
  fileName: string
): Promise<ContractAnalysisResult> {
  try {
    console.log(`[Contract Analysis] Analyzing contract: ${fileName}`);
    
    const prompt = `You are a legal expert specializing in property management contracts in the UK.

Analyze the following property management contract and extract key information.

CONTRACT TEXT:
${contractText.substring(0, 15000)} ${contractText.length > 15000 ? '...(truncated for analysis)' : ''}

Please provide a comprehensive analysis in the following JSON format:
{
  "isLegallyValid": boolean (true if contract appears legally sound with all necessary clauses),
  "legalAnalysisNotes": "Detailed notes about legal validity, missing clauses, or concerns",
  "aiAnalysisSummary": "Brief 2-3 sentence summary of the contract",
  "renewalDate": "YYYY-MM-DD or null if not found",
  "startDate": "YYYY-MM-DD or null if not found",
  "endDate": "YYYY-MM-DD or null if not found",
  "managementFeePercentage": "X.XX or null (e.g., 15.00 for 15%)",
  "managementFeeFixed": "XXXX.XX or null (e.g., 150.00 for £150)",
  "paymentSchedule": "monthly, quarterly, annually, or null",
  "specialTerms": "Any special clauses, restrictions, or notable terms",
  "maintenancePreference": "approve_all, auto_under_amount, emergency_only, or null",
  "maintenanceApprovalLimit": "XXXX.XX or null (e.g., 500.00 for £500)"
}

Key things to check for legal validity:
1. Clear identification of both parties (property owner and management company)
2. Property address and description
3. Duration/term of agreement
4. Management fees clearly stated
5. Termination clauses
6. Liability and insurance provisions
7. Maintenance and repair responsibilities
8. Payment terms and conditions

Be thorough but concise. Return ONLY valid JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a legal expert analyzing UK property management contracts. Always return valid JSON with no markdown formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(content);
    
    // Parse dates safely
    const parseDate = (dateStr: string | null): Date | null => {
      if (!dateStr || dateStr === 'null') return null;
      try {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    };

    const result: ContractAnalysisResult = {
      isLegallyValid: analysis.isLegallyValid === true,
      legalAnalysisNotes: analysis.legalAnalysisNotes || 'No analysis notes provided',
      aiAnalysisSummary: analysis.aiAnalysisSummary || 'Analysis completed',
      renewalDate: parseDate(analysis.renewalDate),
      startDate: parseDate(analysis.startDate),
      endDate: parseDate(analysis.endDate),
      managementFeePercentage: analysis.managementFeePercentage || null,
      managementFeeFixed: analysis.managementFeeFixed || null,
      paymentSchedule: analysis.paymentSchedule || null,
      specialTerms: analysis.specialTerms || null,
      maintenancePreference: analysis.maintenancePreference || null,
      maintenanceApprovalLimit: analysis.maintenanceApprovalLimit || null,
    };

    console.log('[Contract Analysis] Analysis completed successfully');
    console.log('[Contract Analysis] Legal validity:', result.isLegallyValid);
    console.log('[Contract Analysis] Renewal date:', result.renewalDate);
    
    return result;
  } catch (error) {
    console.error('[Contract Analysis] Error analyzing contract:', error);
    throw new Error(`Contract analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks for contracts expiring within the specified number of days
 * and returns a formatted summary
 */
export function formatExpiringContractsSummary(contracts: ManagementContract[]): string {
  if (contracts.length === 0) {
    return 'No contracts expiring soon.';
  }

  const lines = contracts.map((contract) => {
    const daysUntilRenewal = contract.renewalDate
      ? Math.ceil((new Date(contract.renewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return `- ${contract.propertyName}: ${daysUntilRenewal} days until renewal (${
      contract.renewalDate ? new Date(contract.renewalDate).toLocaleDateString('en-GB') : 'Unknown date'
    })`;
  });

  return `${contracts.length} contract(s) expiring soon:\n${lines.join('\n')}`;
}

/**
 * Generates a draft renewal contract based on the original contract
 * This is a template that can be customized before sending to clients
 */
export async function generateRenewalContract(
  originalContract: ManagementContract,
  newStartDate: Date,
  newEndDate: Date
): Promise<string> {
  try {
    console.log(`[Contract Generation] Generating renewal for: ${originalContract.propertyName}`);

    const prompt = `Generate a professional property management contract renewal document.

ORIGINAL CONTRACT DETAILS:
- Property: ${originalContract.propertyName}
- Owner: ${originalContract.ownerName}
- Original Start Date: ${originalContract.startDate ? new Date(originalContract.startDate).toLocaleDateString('en-GB') : 'N/A'}
- Original End Date: ${originalContract.endDate ? new Date(originalContract.endDate).toLocaleDateString('en-GB') : 'N/A'}
- Management Fee (Percentage): ${originalContract.managementFeePercentage}%
- Management Fee (Fixed): £${originalContract.managementFeeFixed}
- Payment Schedule: ${originalContract.paymentSchedule}
- Special Terms: ${originalContract.specialTerms || 'None'}

NEW TERM:
- New Start Date: ${newStartDate.toLocaleDateString('en-GB')}
- New End Date: ${newEndDate.toLocaleDateString('en-GB')}

Generate a formal contract renewal document maintaining the same terms and conditions. The document should:
1. Reference the original agreement
2. State the new term dates
3. Confirm all terms and conditions remain the same
4. Include signature blocks for both parties
5. Be professional and legally formatted

Format the contract in plain text with clear sections.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a legal document assistant specializing in UK property management contracts. Generate professional, clear, and legally sound contract documents.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const contractText = response.choices[0]?.message?.content;
    if (!contractText) {
      throw new Error('No response from OpenAI');
    }

    console.log('[Contract Generation] Renewal contract generated successfully');
    return contractText;
  } catch (error) {
    console.error('[Contract Generation] Error generating renewal contract:', error);
    throw new Error(`Contract generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
