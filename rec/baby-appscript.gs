/**
 * baby-appscript.gs
 * Google Apps Script for the Parenthood (baby.html) page.
 *
 * HOW TO DEPLOY:
 * 1. Open your Google Sheet → Extensions → Apps Script.
 * 2. Paste this entire file into Code.gs (replace any existing content).
 * 3. Click "Deploy" → "New Deployment" → Type: Web App.
 * 4. Set "Execute as" = Me, "Who has access" = Anyone.
 * 5. Copy the Web App URL and paste it into baby.js → SHEETS_WEB_APP_URL.
 *
 * WHAT THIS HANDLES:
 *  GET              → returns all cards from the "BabyCards" sheet as JSON
 *  POST {action:"uploadFile"} → saves image/video to Google Drive, returns public URL
 *  POST {action:"addCard"}    → appends a new card row to the sheet
 *
 * Works on GitHub Pages — no local server needed.
 */

const SHEET_NAME   = 'BabyCards';
const DRIVE_FOLDER = 'BabyPageMedia'; // Google Drive folder name (auto-created)

// ── Column indices (0-based) ───────────────────────────────────────────────────
const COL = {
  id: 0, type: 1, date: 2, displayDate: 3,
  title: 4, mediaSrc: 5, mediaAlt: 6, bodyText: 7, timestamp: 8, tags: 9,
};
const HEADERS = ['id','type','date','displayDate','title','mediaSrc','mediaAlt','bodyText','timestamp','tags'];

// ── GET: return all saved cards ────────────────────────────────────────────────
function doGet() {
  try {
    const sheet = getOrCreateSheet_();
    const rows  = sheet.getDataRange().getValues();
    if (rows.length <= 1) return jsonResponse_({ cards: [] });

    const cards = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r[COL.id] && !r[COL.title]) continue;
      cards.push({
        id:          r[COL.id],
        type:        r[COL.type]        || 'image',
        date:        r[COL.date]        || '',
        displayDate: r[COL.displayDate] || '',
        title:       r[COL.title]       || '',
        mediaSrc:    r[COL.mediaSrc]    || '',
        mediaAlt:    r[COL.mediaAlt]    || '',
        bodyText:    r[COL.bodyText]    || '',
        tags:        r[COL.tags]        || '',
      });
    }
    return jsonResponse_({ cards });
  } catch (err) {
    return jsonResponse_({ error: err.toString() });
  }
}

// ── POST: upload file OR add card ──────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // ── Action: uploadFile ─────────────────────────────────────────────────────
    if (data.action === 'uploadFile') {
      if (!data.base64 || !data.filename || !data.mimeType) {
        return jsonResponse_({ ok: false, error: 'Missing base64 / filename / mimeType' });
      }

      // Decode base64 → blob
      const decoded = Utilities.base64Decode(data.base64);
      const blob    = Utilities.newBlob(decoded, data.mimeType, data.filename);

      // Get or create the media folder in Drive
      const folder  = getOrCreateDriveFolder_();
      const driveFile = folder.createFile(blob);

      // Make it publicly accessible (anyone with link can view)
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileId = driveFile.getId();

      // Public URL — works directly in <img> and <video> src for small files
      const url = `https://drive.google.com/uc?export=view&id=${fileId}`;

      return jsonResponse_({ ok: true, url, fileId });
    }

    // ── Action: updateCard ─────────────────────────────────────────────────────
    if (data.action === 'updateCard') {
      const sheet = getOrCreateSheet_();
      const rows  = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][COL.id]) === String(data.id)) {
          sheet.getRange(i + 1, COL.type        + 1).setValue(sanitize_(data.type));
          sheet.getRange(i + 1, COL.date        + 1).setValue(sanitize_(data.date));
          sheet.getRange(i + 1, COL.displayDate + 1).setValue(sanitize_(data.displayDate));
          sheet.getRange(i + 1, COL.title       + 1).setValue(sanitize_(data.title));
          sheet.getRange(i + 1, COL.mediaSrc    + 1).setValue(sanitize_(data.mediaSrc));
          sheet.getRange(i + 1, COL.mediaAlt    + 1).setValue(sanitize_(data.mediaAlt));
          sheet.getRange(i + 1, COL.bodyText    + 1).setValue(sanitize_(data.bodyText));
          sheet.getRange(i + 1, COL.tags        + 1).setValue(sanitize_(data.tags));
          return jsonResponse_({ status: 'success', id: data.id });
        }
      }
      return jsonResponse_({ ok: false, error: 'Card not found' });
    }

    // ── Action: addCard (or legacy POST without action field) ──────────────────
    const sheet  = getOrCreateSheet_();
    const newId  = sheet.getLastRow(); // 1-based, header = row 1

    sheet.appendRow([
      newId,
      sanitize_(data.type),
      sanitize_(data.date),
      sanitize_(data.displayDate),
      sanitize_(data.title),
      sanitize_(data.mediaSrc),
      sanitize_(data.mediaAlt),
      sanitize_(data.bodyText),
      new Date().toISOString(),
      sanitize_(data.tags),
    ]);

    return jsonResponse_({ status: 'success', id: newId });

  } catch (err) {
    return jsonResponse_({ ok: false, status: 'error', error: err.toString() });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getOrCreateSheet_() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(COL.title   + 1, 200);
    sheet.setColumnWidth(COL.mediaSrc + 1, 320);
    sheet.setColumnWidth(COL.bodyText + 1, 350);
  }
  return sheet;
}

function getOrCreateDriveFolder_() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER);
}

function sanitize_(val) {
  return (val === null || val === undefined) ? '' : String(val).trim();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
