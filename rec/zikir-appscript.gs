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
 * 6. Set "Execute as"    → User accessing the web app
 *    Set "Who has access" → Anyone with Google account
 * 7. Click Deploy → authorize permissions when prompted.
 * 8. Copy the Web App URL shown after deployment.
 * 9. Open zikir.js and paste that URL as the value of APPS_SCRIPT_URL.
 * 10. The first time you open zikir.html, visit the Web App URL directly
 *     once in the same browser to complete Google authorization.
 *
 * HOW DATA IS ORGANIZED:
 * -----------------------------------------------
 * - Each Gmail user automatically gets their own sheet tab.
 *   Tab name = the part of the email before @
 *   e.g. sujonmhk786@gmail.com  →  tab named "sujonmhk786"
 * - Multiple devices logged in with the same email share one tab —
 *   all reads/writes go to the same row so data stays in sync.
 * - Row 1 of each tab = column headers
 * - Row 2 of each tab = the live counts for that user
 *
 * REQUEST FORMAT (all via HTTP GET, ?action=...):
 * -----------------------------------------------
 *   Load:  ?action=load
 *   Save:  ?action=save&subhanallah=5&alhamdulillah=3&la_ilaha_illallah=0
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
 * Returns { email, tabName } for the currently authenticated user.
 * Throws an error with code AUTH_REQUIRED if no user is detected.
 */
function getUserInfo() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    throw new Error(
      'AUTH_REQUIRED: Could not detect your Google account. ' +
      'Please open the Web App URL in your browser once to authorize.'
    );
  }
  return { email: email, tabName: email.split('@')[0] };
}

/**
 * Returns the sheet tab for the current user, creating it (with headers
 * and a zeroed data row) if it does not yet exist.
 */
function getOrCreateUserSheet() {
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var info = getUserInfo();

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
 *   ?action=load  → load and return current counts as JSON
 *   ?action=save  → write new counts, return confirmation JSON
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'load';
  try {
    if (action === 'load') { return handleLoad(); }
    if (action === 'save') { return handleSave(e.parameter); }
    throw new Error('Unknown action: ' + action);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ── Action handlers ───────────────────────────────────────────────────────────

function handleLoad() {
  var info  = getUserInfo();
  var sheet = getOrCreateUserSheet();

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
  var info  = getUserInfo();
  var sheet = getOrCreateUserSheet();

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
