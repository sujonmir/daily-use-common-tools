/**
 * ZIKIR COUNTER — Google Apps Script Backend
 * ===========================================
 *
 * SETUP INSTRUCTIONS (one-time):
 * -----------------------------------------------
 * 1. Open your target Google Spreadsheet.
 * 2. Click Extensions → Apps Script.
 * 3. Delete all existing code and paste this entire file, then Save (Ctrl+S).
 * 4. Click Deploy → New Deployment.
 * 5. Click the ⚙️ gear next to "Select type" → choose "Web app".
 * 6. Set "Execute as"    → Me  (the script owner — your Google account)
 *    Set "Who has access" → Anyone  (no Google account required)
 * 7. Click Deploy → authorize the permissions when prompted (one-time, owner only).
 * 8. Copy the Web App URL shown after deployment.
 * 9. Open zikir.js and paste that URL as the value of APPS_SCRIPT_URL.
 * 10. Open zikir.html on any device — it will ask for your Gmail once and remember it.
 *
 * WHY "Execute as Me"?
 * -----------------------------------------------
 * The previous "Execute as User" mode required every browser / device to
 * complete an OAuth flow separately.  Mobile browsers often block the
 * third-party cookies that flow relies on, so sync silently broke on mobile.
 * Running as the owner means NO per-device auth is needed — the client just
 * passes its Gmail address as a URL parameter, and the script uses that to
 * route data to the correct sheet tab.
 *
 * HOW DATA IS ORGANIZED:
 * -----------------------------------------------
 * - Each Gmail user automatically gets their own sheet tab.
 *   Tab name = the part of the email before @
 *   e.g. sujonmhk786@gmail.com  →  tab named "sujonmhk786"
 * - Multiple devices using the same email share one tab —
 *   all reads/writes go to the same row so data stays in sync.
 * - Row 1 of each tab = column headers
 * - Row 2 of each tab = the live counts for that user
 *
 * REQUEST FORMAT (all via HTTP GET, ?action=...):
 * -----------------------------------------------
 *   Load:  ?action=load&email=you@gmail.com
 *   Save:  ?action=save&email=you@gmail.com
 *          &subhanallah=5&alhamdulillah=3&la_ilaha_illallah=0
 *          &astaghfirullah=10&allahu=2&total=20
 */

// Keys must match the keys used in zikir.js
var ZIKR_KEYS = [
  'subhanallah',
  'alhamdulillah',
  'la_ilaha_illallah',
  'astaghfirullah',
  'allahu',
  'total'
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts and validates the caller's email from URL parameters.
 * Returns { email, tabName }.
 * Throws if the email param is missing or invalid.
 */
function getUserInfo(params) {
  var email = (params && params.email) ? params.email.trim().toLowerCase() : '';
  if (!email || email.indexOf('@') === -1) {
    throw new Error(
      'EMAIL_REQUIRED: Pass your Gmail as ?email=you@gmail.com. ' +
      'Open zikir.html — it will ask once and remember it.'
    );
  }
  return { email: email, tabName: email.split('@')[0] };
}

/**
 * Returns the sheet tab for the given user, creating it (with headers
 * and a zeroed data row) if it does not yet exist.
 */
function getOrCreateUserSheet(info) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(info.tabName);

  if (!sheet) {
    sheet = ss.insertSheet(info.tabName);

    // Row 1 — bold headers
    var headers = ZIKR_KEYS.concat(['lastUpdated']);
    sheet.getRange(1, 1, 1, headers.length)
         .setValues([headers])
         .setFontWeight('bold')
         .setBackground('#d9e8fb');

    // Row 2 — initial zeros + timestamp
    var initRow = ZIKR_KEYS.map(function() { return 0; })
                            .concat([new Date().toISOString()]);
    sheet.getRange(2, 1, 1, initRow.length).setValues([initRow]);
  }
  return sheet;
}

// ── Web-app entry point ───────────────────────────────────────────────────────

/**
 * Handles all HTTP GET requests from zikir.html.
 *   ?action=load&email=...  → load and return current counts as JSON
 *   ?action=save&email=...  → write new counts, return confirmation JSON
 */
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var action = params.action || 'load';
  try {
    if (action === 'load') { return handleLoad(params); }
    if (action === 'save') { return handleSave(params); }
    throw new Error('Unknown action: ' + action);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ── Action handlers ───────────────────────────────────────────────────────────

function handleLoad(params) {
  var info  = getUserInfo(params);
  var sheet = getOrCreateUserSheet(info);

  var row    = sheet.getRange(2, 1, 1, ZIKR_KEYS.length).getValues()[0];
  var counts = {};
  ZIKR_KEYS.forEach(function(key, i) {
    counts[key] = Number(row[i]) || 0;
  });

  return jsonResponse({
    success  : true,
    data     : counts,
    userEmail: info.email,
    tabName  : info.tabName
  });
}

function handleSave(params) {
  var info  = getUserInfo(params);
  var sheet = getOrCreateUserSheet(info);

  // Parse individual counts from URL params; recalculate total for consistency
  var indivKeys = ['subhanallah', 'alhamdulillah', 'la_ilaha_illallah', 'astaghfirullah', 'allahu'];
  var counts = {};
  indivKeys.forEach(function(key) {
    counts[key] = Math.max(0, parseInt(params[key], 10) || 0);
  });
  counts.total = indivKeys.reduce(function(sum, key) { return sum + counts[key]; }, 0);

  // Write to row 2 (counts + timestamp)
  var row = ZIKR_KEYS.map(function(key) { return counts[key]; })
                      .concat([new Date().toISOString()]);
  sheet.getRange(2, 1, 1, row.length).setValues([row]);

  return jsonResponse({
    success    : true,
    tabName    : info.tabName,
    userEmail  : info.email,
    savedCounts: counts
  });
}

// ── Utility ───────────────────────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
