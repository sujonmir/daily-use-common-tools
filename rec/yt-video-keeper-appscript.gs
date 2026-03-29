/**
 * YT VIDEO KEEPER — Google Apps Script Backend
 * =============================================
 *
 * SETUP INSTRUCTIONS (one-time):
 * -----------------------------------------------
 * 1. Open your target Google Spreadsheet (can be the same one as Zikir Counter).
 * 2. Click Extensions → Apps Script.
 * 3. Delete all existing code and paste this entire file, then Save (Ctrl+S).
 * 4. Click Deploy → New Deployment.
 * 5. Click the ⚙️ gear next to "Select type" → choose "Web app".
 * 6. Set "Execute as"     → Me  (the script owner — your Google account)
 *    Set "Who has access" → Anyone  (no Google account required)
 * 7. Click Deploy → authorize the permissions when prompted (one-time, owner only).
 * 8. Copy the Web App URL shown after deployment.
 * 9. Open yt-video-keeper.html and paste that URL as YT_APPS_SCRIPT_URL.
 * 10. Open yt-video-keeper.html on any device — it will ask for your Gmail once
 *     and remember it. All devices with the same Gmail share one sheet tab.
 *
 * HOW DATA IS ORGANIZED:
 * -----------------------------------------------
 * - Each Gmail user gets their own sheet tab automatically.
 *   Tab name = the part of the email before @
 *   e.g. sujonmhk786@gmail.com  →  tab "sujonmhk786"
 * - Row 1: headers  [videoIds, lastUpdated]
 * - Row 2: data     [JSON array of video IDs, ISO timestamp]
 *
 * REQUEST FORMAT (HTTP GET):
 * -----------------------------------------------
 *   Load:  ?action=load&email=you@gmail.com
 *   Save:  ?action=save&email=you@gmail.com&videos=["abc123","xyz789"]
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function getUserInfo(params) {
  var email = (params && params.email) ? params.email.trim().toLowerCase() : '';
  if (!email || email.indexOf('@') === -1) {
    throw new Error(
      'EMAIL_REQUIRED: Pass your Gmail as ?email=you@gmail.com'
    );
  }
  return { email: email, tabName: email.split('@')[0] };
}

function getOrCreateUserSheet(info) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(info.tabName);

  if (!sheet) {
    sheet = ss.insertSheet(info.tabName);

    // Row 1 — bold headers
    sheet.getRange(1, 1, 1, 2)
         .setValues([['videoIds', 'lastUpdated']])
         .setFontWeight('bold')
         .setBackground('#d9e8fb');

    // Row 2 — empty list + timestamp
    sheet.getRange(2, 1, 1, 2).setValues([['[]', new Date().toISOString()]]);
  }
  return sheet;
}

// ── Web-app entry point ───────────────────────────────────────────────────────

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

  var raw    = sheet.getRange(2, 1).getValue();
  var videos = [];
  try { videos = JSON.parse(raw); } catch(e) { videos = []; }
  if (!Array.isArray(videos)) videos = [];

  return jsonResponse({
    success  : true,
    videos   : videos,
    userEmail: info.email,
    tabName  : info.tabName
  });
}

function handleSave(params) {
  var info  = getUserInfo(params);
  var sheet = getOrCreateUserSheet(info);

  var videos = [];
  try { videos = JSON.parse(params.videos || '[]'); } catch(e) { videos = []; }
  if (!Array.isArray(videos)) videos = [];

  sheet.getRange(2, 1, 1, 2).setValues([[JSON.stringify(videos), new Date().toISOString()]]);

  return jsonResponse({
    success  : true,
    tabName  : info.tabName,
    userEmail: info.email,
    count    : videos.length
  });
}

// ── Utility ───────────────────────────────────────────────────────────────────

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
