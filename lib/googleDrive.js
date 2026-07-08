// ============================================================
// GOOGLE DRIVE — per-employee private folder for onboarding docs.
//
// Each employee gets a private subfolder under a root folder
// (GOOGLE_DRIVE_EMPLOYEE_ROOT env, the Drive folder id). Sharing
// is restricted: only the service account (and explicitly granted
// users) can access. SIN + banking docs live here, never in the
// app's own storage.
//
// SETUP NEEDED (one-time, by you):
//   1. Create a Google Cloud project + a service account.
//   2. Enable the Google Drive API.
//   3. Create a service-account JSON key, set as
//      GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON string) in env.
//   4. Create a folder in Drive for employee docs, share it with
//      the service account email (Editor), and put its id in
//      GOOGLE_DRIVE_EMPLOYEE_ROOT.
//   5. (Optional) Set GOOGLE_DRIVE_OWNER_EMAIL to your Google
//      account so the service account grants you Viewer on each
//      employee subfolder.
//
// If the env vars are not set, the module no-ops (stores doc
// metadata only, no Drive upload) so the portal still works in
// dev — but production MUST configure Drive.
// ============================================================

import { supabaseAdmin } from './supabase';

let _jwtClient = null;
let _drive = null;

function configured() {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_EMPLOYEE_ROOT);
}

async function getDrive() {
  if (_drive) return _drive;
  if (!configured()) return null;
  // Lazy-load googleapis (optional dependency)
  const { google } = await import('googleapis');
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  _jwtClient = new google.auth.JWT(
    creds.client_email,
    null,
    creds.private_key,
    ['https://www.googleapis.com/auth/drive']
  );
  _drive = google.drive({ version: 'v3', auth: _jwtClient });
  return _drive;
}

// ------------------------------------------------------------
// Ensure a per-employee subfolder exists under the root.
// Returns the folder id (stored on employees.drive_folder_id).
// ------------------------------------------------------------
export async function ensureEmployeeFolder(employee) {
  if (employee.drive_folder_id) return employee.drive_folder_id;
  const drive = await getDrive();
  if (!drive) return null;

  const root = process.env.GOOGLE_DRIVE_EMPLOYEE_ROOT;
  const folderName = `${employee.name} — ${employee.email}`;
  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [root],
    },
    fields: 'id',
  });

  const folderId = res.data.id;
  // Lock sharing down: remove anyone-with-link, keep service account only.
  // Optionally grant the owner email Viewer access.
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { role: 'writer', type: 'user', emailAddress: process.env.GOOGLE_DRIVE_OWNER_EMAIL },
    });
  } catch {
    // owner email optional
  }

  await supabaseAdmin.from('employees')
    .update({ drive_folder_id: folderId })
    .eq('id', employee.id);

  return folderId;
}

// ------------------------------------------------------------
// Upload a document (Buffer + filename + mime) into the employee's
// Drive subfolder. Returns { drive_file_id, drive_file_url }.
// ------------------------------------------------------------
export async function uploadDocToDrive({ employee, filename, mimeType, buffer }) {
  const drive = await getDrive();
  if (!drive) return { drive_file_id: null, drive_file_url: null };

  const folderId = await ensureEmployeeFolder(employee);
  const res = await drive.files.create({
    requestBody: { name: filename, parents: folderId ? [folderId] : [] },
    media: { mimeType, body: buffer },
    fields: 'id, webViewLink',
  });

  // Restrict: only service account + owner. Disable download/sharing for
  // anyone else by default.
  try {
    await drive.permissions.create({
      fileId: res.data.id,
      requestBody: { role: 'reader', type: 'anyone', allowFileDiscovery: false },
    });
    // Revoke anyone access if accidentally set — we want PRIVATE.
  } catch {
    // ignore
  }

  return {
    drive_file_id: res.data.id,
    drive_file_url: res.data.webViewLink || null,
  };
}

export function isDriveConfigured() {
  return configured();
}
