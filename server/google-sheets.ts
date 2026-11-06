import { google } from 'googleapis';

let connectionSettings: any;

const SPREADSHEET_ID = '1R8E0K5AzyszwcrbPHboe015TNKvKoxMeLCHFu9N7krQ';

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token ?? connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet not connected');
  }
  return accessToken;
}

export async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.sheets({ version: 'v4', auth: oauth2Client });
}

export async function getSheetData(spreadsheetId: string, range: string) {
  const sheets = await getUncachableGoogleSheetClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return response.data.values || [];
}

export async function getAllSheetNames() {
  const sheets = await getUncachableGoogleSheetClient();
  const response = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  return response.data.sheets?.map(sheet => sheet.properties?.title || '') || [];
}

export async function examineSheetStructure() {
  console.log('=== EXAMINING GOOGLE SHEETS STRUCTURE ===');
  console.log('Spreadsheet ID:', SPREADSHEET_ID);
  
  const sheetNames = await getAllSheetNames();
  console.log('\nAvailable Sheets:', sheetNames);
  
  for (const sheetName of sheetNames) {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const data = await getSheetData(SPREADSHEET_ID, `${sheetName}!A1:Z10`);
    console.log('First 10 rows:');
    data.forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
  }
  
  console.log('\n=== END OF STRUCTURE EXAMINATION ===');
  return { sheetNames, message: 'Structure logged to console' };
}

export async function getStaffFromSheet() {
  try {
    const data = await getSheetData(SPREADSHEET_ID, 'Staff!A:Z');
    
    if (data.length === 0) {
      return [];
    }
    
    const headers = data[0].map((h: string) => h.toLowerCase().trim());
    const rows = data.slice(1);
    
    const staffData = rows.map((row: any[]) => {
      const staffMember: any = {};
      headers.forEach((header: string, index: number) => {
        staffMember[header] = row[index] || '';
      });
      return staffMember;
    }).filter((staff: any) => staff.full_name || staff.fullname || staff.name);
    
    return staffData;
  } catch (error) {
    console.error('Error fetching staff from sheet:', error);
    throw error;
  }
}

export async function getAvailabilityFromSheet() {
  try {
    const sheetNames = await getAllSheetNames();
    
    if (!sheetNames.includes('Availability')) {
      console.log('Availability sheet not found in Google Sheets');
      return { error: 'SHEET_NOT_FOUND', message: 'Availability sheet does not exist in Google Sheets yet' };
    }
    
    const data = await getSheetData(SPREADSHEET_ID, 'Availability!A:Z');
    
    if (data.length === 0) {
      return [];
    }
    
    const headers = data[0].map((h: string) => h.toLowerCase().trim());
    const rows = data.slice(1);
    
    const availabilityData = rows.map((row: any[]) => {
      const availability: any = {};
      headers.forEach((header: string, index: number) => {
        availability[header] = row[index] || '';
      });
      return availability;
    });
    
    return availabilityData;
  } catch (error) {
    console.error('Error fetching availability from sheet:', error);
    throw error;
  }
}
