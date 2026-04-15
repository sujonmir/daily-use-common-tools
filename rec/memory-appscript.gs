/**
 * memory-appscript.gs
 * Google Apps Script for the Personal Memory Cards (memory-cards.html) page.
 *
 * HOW TO DEPLOY:
 * 1. Open a NEW Google Sheet → Extensions → Apps Script.
 * 2. Paste this entire file into Code.gs (replace any existing content).
 * 3. Click "Deploy" → "New Deployment" → Type: Web App.
 * 4. Set "Execute as" = Me, "Who has access" = Anyone.
 * 5. Copy the Web App URL and paste it into memory-cards.js → SHEETS_WEB_APP_URL.
 *
 * WHAT THIS HANDLES:
 *  GET  ?action=getTime  → returns saved time-spent seconds
 *  GET  (default)        → returns all memory cards + saved seconds
 *  POST {action:"saveTime",  seconds: N}    → saves accumulated seconds
 *  POST {action:"uploadFile", ...}          → (unused — GitHub upload used instead)
 *  POST {action:"updateCard", ...}          → updates an existing card row
 *  POST {action:"addCard"}                  → appends a new card row
 */

const SHEET_NAME  = 'MemoryCards';
const TIME_SHEET  = 'TimeSpent';

// ── Column indices (0-based) ───────────────────────────────────────────────────
const COL = {
  id: 0, type: 1, date: 2, displayDate: 3,
  title: 4, mediaSrc: 5, mediaAlt: 6, bodyText: 7, timestamp: 8, tags: 9,
};
const HEADERS = ['id','type','date','displayDate','title','mediaSrc','mediaAlt','bodyText','timestamp','tags'];

// ── GET ────────────────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    // ?action=getTime — lightweight call just for the counter
    if (e && e.parameter && e.parameter.action === 'getTime') {
      return jsonResponse_({ seconds: getSavedSeconds_() });
    }

    // Default: return all cards + saved seconds in one payload
    const sheet = getOrCreateSheet_();
    const rows  = sheet.getDataRange().getValues();
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
    return jsonResponse_({ cards, seconds: getSavedSeconds_() });
  } catch (err) {
    return jsonResponse_({ error: err.toString() });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // ── Action: saveTime ───────────────────────────────────────────────────────
    if (data.action === 'saveTime') {
      const sec = parseInt(data.seconds) || 0;
      if (sec > 0) {
        const ts = getOrCreateTimeSheet_();
        ts.getRange(2, 1).setValue(sec);
      }
      return jsonResponse_({ ok: true });
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

    // ── Action: addCard ────────────────────────────────────────────────────────
    const sheet = getOrCreateSheet_();
    const newId = sheet.getLastRow();
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
function getSavedSeconds_() {
  try {
    const ts  = getOrCreateTimeSheet_();
    const val = ts.getRange(2, 1).getValue();
    return parseInt(val) || 0;
  } catch { return 0; }
}

function getOrCreateSheet_() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(COL.title    + 1, 200);
    sheet.setColumnWidth(COL.mediaSrc + 1, 320);
    sheet.setColumnWidth(COL.bodyText + 1, 350);
  }
  return sheet;
}

function getOrCreateTimeSheet_() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(TIME_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(TIME_SHEET);
    sheet.appendRow(['seconds']);
    sheet.appendRow([0]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function sanitize_(val) {
  return (val === null || val === undefined) ? '' : String(val).trim();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
