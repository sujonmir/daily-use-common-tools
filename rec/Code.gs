// ============================================================
// Finance Tracker - Google Apps Script Backend
// ------------------------------------------------------------
// SETUP INSTRUCTIONS:
//   1. Open your Google Sheet → Extensions → Apps Script
//   2. Paste this entire file into Code.gs
//   3. Click Deploy → New deployment → Web app
//      - Execute as: Me
//      - Who has access: Anyone
//   4. Copy the deployment URL into personal-finance-tracker.html
//      (set APPS_SCRIPT_URL constant)
// ============================================================

const SECRET_TOKEN = "$ahal$ara"; // Must match SHEETS_TOKEN in the HTML file
const SHEET_NAME = "Transactions";

// ---- Entry points ----

function doGet(e) {
  const result = handleRequest("GET", e.parameter, null);
  return respond(result);
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return respond({ error: "Invalid JSON body" });
  }
  const result = handleRequest("POST", {}, body);
  return respond(result);
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ---- Request router ----

function handleRequest(method, params, body) {
  const token = method === "GET" ? params.token : body.token;
  const action = method === "GET" ? params.action : body.action;

  if (token !== SECRET_TOKEN) {
    return { error: "Unauthorized: invalid token" };
  }

  switch (action) {
    case "getAll":
      return getAll();
    case "add":
      return addRow(body.data);
    case "delete":
      return deleteRow(body.id);
    case "update":
      return updateRow(body.data);
    case "bulkAdd":
      return bulkAdd(body.data);
    case "replaceAll":
      return replaceAll(body.data);
    default:
      return { error: "Unknown action: " + action };
  }
}

// ---- Sheet helpers ----

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["id", "date", "type", "category", "total", "details"]);
    sheet.setFrozenRows(1);
    // Basic formatting
    sheet
      .getRange("A1:F1")
      .setFontWeight("bold")
      .setBackground("#4a90e2")
      .setFontColor("#ffffff");
    sheet.setColumnWidth(1, 140);
    sheet.setColumnWidth(2, 100);
    sheet.setColumnWidth(3, 80);
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(5, 100);
    sheet.setColumnWidth(6, 400);
  }
  return sheet;
}

// ---- CRUD operations ----

function getAll() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map(function (row) {
    let details = [];
    try {
      details = JSON.parse(row[5]);
    } catch (e) {}
    return {
      id: Number(row[0]) || row[0],
      date: row[1],
      type: row[2],
      category: row[3],
      total: parseFloat(row[4]) || 0,
      details: details,
    };
  });
}

function addRow(tx) {
  if (!tx || !tx.id) return { error: "Invalid transaction data" };
  const sheet = getSheet();
  sheet.appendRow([
    tx.id,
    tx.date,
    tx.type,
    tx.category || "",
    tx.total,
    JSON.stringify(tx.details || []),
  ]);
  return { success: true };
}

function deleteRow(id) {
  if (!id) return { error: "No id provided" };
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: "Row not found for id: " + id };
}

function updateRow(tx) {
  if (!tx || !tx.id) return { error: "Invalid transaction data" };
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(tx.id)) {
      sheet
        .getRange(i + 1, 1, 1, 6)
        .setValues([
          [
            tx.id,
            tx.date,
            tx.type,
            tx.category || "",
            tx.total,
            JSON.stringify(tx.details || []),
          ],
        ]);
      return { success: true };
    }
  }
  return { error: "Row not found for id: " + tx.id };
}

function replaceAll(txList) {
  if (!Array.isArray(txList)) return { error: "Invalid data" };
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
  if (txList.length === 0) return { success: true, count: 0 };
  var rows = txList.map(function (tx) {
    return [
      tx.id,
      tx.date,
      tx.type,
      tx.category || "",
      tx.total,
      JSON.stringify(tx.details || []),
    ];
  });
  sheet.getRange(2, 1, rows.length, 6).setValues(rows);
  return { success: true, count: rows.length };
}

function bulkAdd(txList) {
  if (!Array.isArray(txList) || txList.length === 0)
    return { success: true, count: 0 };
  const sheet = getSheet();
  const rows = txList.map(function (tx) {
    return [
      tx.id,
      tx.date,
      tx.type,
      tx.category || "",
      tx.total,
      JSON.stringify(tx.details || []),
    ];
  });
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 6).setValues(rows);
  return { success: true, count: rows.length };
}
