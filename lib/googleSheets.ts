import { google } from 'googleapis';

type DuplicateResult = { sheetId: string; webViewLink?: string | null };

async function getAuthClient() {
  // Use OAuth2 with your personal Google account
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Missing Google OAuth2 credentials. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in your .env file.');
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'http://localhost:3000' // redirect URI
  );

  oauth2Client.setCredentials({
    refresh_token: GOOGLE_REFRESH_TOKEN
  });

  return oauth2Client;
}

export async function duplicateMasterSheet(newTitle: string): Promise<DuplicateResult> {
  const masterId = process.env.MASTER_SHEET_ID;
  if (!masterId) throw new Error('MASTER_SHEET_ID not set in env');

  const authClient = await getAuthClient();
  const drive = google.drive({ version: 'v3', auth: authClient });

  console.log(`Creating new sheet copy: "${newTitle}" from master sheet: ${masterId}`);

  // files.copy - this creates a complete copy of the master spreadsheet
  const copyRes = await drive.files.copy({
    fileId: masterId,
    requestBody: {
      name: newTitle,
    },
    fields: 'id, webViewLink, name',
  });

  const sheetId = copyRes.data.id;
  const webViewLink = copyRes.data.webViewLink ?? null;
  const copiedName = copyRes.data.name;

  console.log(`Successfully created sheet: ${copiedName} (ID: ${sheetId})`);

  // Optionally set sharing to anyone with link
  if (process.env.SHARE_COPIES_PUBLIC === 'true') {
    try {
      await drive.permissions.create({
        fileId: sheetId!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
      console.log(`Set public sharing for sheet: ${sheetId}`);
    } catch (err) {
      // Log but don't fail creation
      console.warn('Failed to update permissions on copy', err);
    }
  }

  return { sheetId: sheetId!, webViewLink };
}

// helper: ensure there's a sheet/tab with the given title, returns tabId
async function ensureSheetTab(authClient: any, spreadsheetId: string, title: string) {
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties' });
  const existing = meta.data.sheets?.find(s => s.properties?.title === title);
  if (existing) return existing.properties?.sheetId;
  // create new sheet
  const addRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { addSheet: { properties: { title } } }
      ]
    }
  });
  const newSheetId = addRes.data.replies?.[0]?.addSheet?.properties?.sheetId;
  return newSheetId;
}

/**
 * Write analysis rows to a spreadsheet.
 * rows: array of arrays (each inner array will be a row)
 * e.g. rows = [['id','title','url','analysis'], [...]]
 */
export async function writeAnalysisToSheet(spreadsheetId: string, rows: string[][], tabName = 'Analysis') {
  const authClient = await getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  console.log(`Writing analysis to sheet ${spreadsheetId}, tab: ${tabName}`);

  // ensure tab exists
  await ensureSheetTab(authClient, spreadsheetId, tabName);

  const range = `${tabName}!A1`; // append will find the appropriate row
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: {
      values: rows,
    },
  });

  console.log(`Successfully wrote ${rows.length} rows to ${tabName} tab`);
}
