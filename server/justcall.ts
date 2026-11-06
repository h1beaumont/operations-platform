/**
 * JustCall API Integration
 * Used for making calls and sending SMS directly from the portal
 */

const JUSTCALL_API_URL = 'https://api.justcall.io/v2.1';

interface JustCallCredentials {
  apiKey: string;
  apiSecret: string;
  phoneNumber: string;
}

/**
 * Get JustCall credentials from environment
 */
function getJustCallCredentials(): JustCallCredentials {
  const apiKey = process.env.JUSTCALL_API_KEY;
  const apiSecret = process.env.JUSTCALL_API_SECRET;
  const phoneNumber = process.env.JUSTCALL_PHONE_NUMBER;

  if (!apiKey || !apiSecret || !phoneNumber) {
    throw new Error('JustCall credentials not configured. Please set JUSTCALL_API_KEY, JUSTCALL_API_SECRET, and JUSTCALL_PHONE_NUMBER');
  }

  return { apiKey, apiSecret, phoneNumber };
}

/**
 * Initiate a call from JustCall number to target phone
 * This will call the target phone and connect to an agent when answered
 */
export async function initiateCall(
  targetPhone: string,
  staffName: string
): Promise<{ success: boolean; callId?: string; error?: string }> {
  try {
    const { apiKey, apiSecret, phoneNumber } = getJustCallCredentials();

    // JustCall uses plain apiKey:apiSecret format (no Base64 encoding)
    const authHeader = `${apiKey}:${apiSecret}`;

    const response = await fetch(`${JUSTCALL_API_URL}/calls/new`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        from: phoneNumber, // Your JustCall number
        to: targetPhone,   // Staff member's phone
        // You can add more parameters as needed based on JustCall API docs
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `JustCall API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`[JustCall] Call initiated to ${staffName} (${targetPhone})`);
    
    return {
      success: true,
      callId: data.call_id || data.id,
    };
  } catch (error: any) {
    console.error('[JustCall] Failed to initiate call:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get call status from JustCall
 */
export async function getCallStatus(callId: string): Promise<any> {
  try {
    const { apiKey, apiSecret } = getJustCallCredentials();
    // JustCall uses plain apiKey:apiSecret format (no Base64 encoding)
    const authHeader = `${apiKey}:${apiSecret}`;

    const response = await fetch(`${JUSTCALL_API_URL}/calls/${callId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get call status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('[JustCall] Failed to get call status:', error);
    throw error;
  }
}

/**
 * Send SMS via JustCall
 */
export async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { apiKey, apiSecret, phoneNumber } = getJustCallCredentials();

    // JustCall uses plain apiKey:apiSecret format (no Base64 encoding)
    const authHeader = `${apiKey}:${apiSecret}`;

    console.log(`[JustCall] Attempting to send SMS to ${to}`);
    console.log(`[JustCall] Using phone number: ${phoneNumber}`);
    console.log(`[JustCall] API Key exists: ${!!apiKey}, length: ${apiKey?.length || 0}`);
    console.log(`[JustCall] API Secret exists: ${!!apiSecret}, length: ${apiSecret?.length || 0}`);

    const response = await fetch(`${JUSTCALL_API_URL}/texts/new`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        justcall_number: phoneNumber,
        contact_number: to,
        body: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `JustCall API error: ${response.status}`;
      console.error('[JustCall] SMS send failed:', errorMessage, errorData);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    console.log(`[JustCall] SMS sent successfully to ${to}:`, data);
    
    return {
      success: true,
      messageId: data.id || data.message_id,
    };
  } catch (error: any) {
    console.error('[JustCall] Failed to send SMS:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
