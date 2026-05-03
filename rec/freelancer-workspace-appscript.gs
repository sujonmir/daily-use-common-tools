/**
 * freelancer-workspace-appscript.gs
 * Google Apps Script for the Freelancer Workspace (freelancer-workspace.html) page.
 *
 * HOW TO DEPLOY:
 * 1. Open a NEW Google Sheet → Extensions → Apps Script.
 * 2. Paste this entire file into Code.gs (replace any existing content).
 * 3. Click "Deploy" → "New Deployment" → Type: Web App.
 * 4. Set "Execute as" = Me, "Who has access" = Anyone.
 * 5. Copy the Web App URL and paste it into the Settings page of the workspace.
 *
 * SHEETS USED (auto-created on first call):
 *   Projects     — id, name, client, type, currency, fixedAmount, hourlyRate, status, description, createdAt, updatedAt
 *   TimeEntries  — id, projectId, startTime, endTime, durationSeconds, description, createdAt
 *   Payments     — id, projectId, amount, currency, date, note, createdAt
 *   Invoices     — id, projectId, invoiceNumber, amount, amountType, issueDate, dueDate, status, items, notes, generatedBy, freelancerName, freelancerTitle, createdAt
 *
 * SUPPORTED ACTIONS:
 *   GET (default)                            → returns all data { projects, timeEntries, payments, invoices }
 *   POST {action:"addProject", ...}          → appends a project row
 *   POST {action:"updateProject", id, ...}   → updates a project row
 *   POST {action:"deleteProject", id}        → deletes a project + all its time entries, payments, invoices
 *   POST {action:"addTimeEntry", ...}        → appends a time entry
 *   POST {action:"updateTimeEntry", id, ...} → updates a time entry
 *   POST {action:"deleteTimeEntry", id}      → deletes a time entry
 *   POST {action:"addPayment", ...}          → appends a payment
 *   POST {action:"updatePayment", id, ...}   → updates a payment
 *   POST {action:"deletePayment", id}        → deletes a payment
 *   POST {action:"addInvoice", ...}          → appends an invoice
 *   POST {action:"updateInvoice", id, ...}   → updates an invoice
 *   POST {action:"deleteInvoice", id}        → deletes an invoice
 */

// ── Schema ─────────────────────────────────────────────────────────────────────
const SHEETS = {
  projects: {
    name: 'Projects',
    headers: ['id','name','client','type','currency','fixedAmount','hourlyRate','status','description','createdAt','updatedAt'],
  },
  timeEntries: {
    name: 'TimeEntries',
    headers: ['id','projectId','startTime','endTime','durationSeconds','description','createdAt'],
  },
  payments: {
    name: 'Payments',
    headers: ['id','projectId','amount','currency','date','note','createdAt'],
  },
  invoices: {
    name: 'Invoices',
    headers: ['id','projectId','invoiceNumber','amount','amountType','issueDate','dueDate','status','items','notes','generatedBy','freelancerName','freelancerTitle','createdAt'],
  },
};

// ── GET ────────────────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    return jsonResponse_({
      projects:       readSheet_(SHEETS.projects),
      timeEntries:    readSheet_(SHEETS.timeEntries),
      payments:       readSheet_(SHEETS.payments),
      invoices:       readSheet_(SHEETS.invoices),
      spreadsheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl(),
    });
  } catch (err) {
    return jsonResponse_({ status: 'error', error: err.toString() });
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || '';

    switch (action) {
      case 'addProject':       return addRow_(SHEETS.projects, data);
      case 'updateProject':    return updateRow_(SHEETS.projects, data);
      case 'deleteProject':    return deleteProject_(data);
      case 'addTimeEntry':     return addRow_(SHEETS.timeEntries, data);
      case 'updateTimeEntry':  return updateRow_(SHEETS.timeEntries, data);
      case 'deleteTimeEntry':  return deleteRow_(SHEETS.timeEntries, data);
      case 'addPayment':       return addRow_(SHEETS.payments, data);
      case 'updatePayment':    return updateRow_(SHEETS.payments, data);
      case 'deletePayment':    return deleteRow_(SHEETS.payments, data);
      case 'addInvoice':       return addRow_(SHEETS.invoices, data);
      case 'updateInvoice':    return updateRow_(SHEETS.invoices, data);
      case 'deleteInvoice':    return deleteRow_(SHEETS.invoices, data);
      default:
        return jsonResponse_({ status: 'error', error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse_({ status: 'error', error: err.toString() });
  }
}

// ── Generic CRUD helpers ───────────────────────────────────────────────────────
function readSheet_(spec) {
  const sheet = getOrCreateSheet_(spec);
  const rows  = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;                // skip blank rows (no id)
    const obj = {};
    spec.headers.forEach((h, idx) => {
      obj[h] = r[idx] === undefined || r[idx] === null ? '' : r[idx];
    });
    out.push(obj);
  }
  return out;
}

function addRow_(spec, data) {
  const sheet = getOrCreateSheet_(spec);
  const id    = data.id || generateId_();
  const now   = new Date().toISOString();
  const row   = spec.headers.map((h) => {
    if (h === 'id')        return id;
    if (h === 'createdAt') return data.createdAt || now;
    if (h === 'updatedAt') return now;
    return sanitize_(data[h]);
  });
  sheet.appendRow(row);
  return jsonResponse_({ status: 'success', id });
}

function updateRow_(spec, data) {
  if (!data.id) return jsonResponse_({ status: 'error', error: 'Missing id' });
  const sheet = getOrCreateSheet_(spec);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      spec.headers.forEach((h, idx) => {
        if (h === 'id') return;
        if (h === 'createdAt') return;
        if (h === 'updatedAt') {
          sheet.getRange(i + 1, idx + 1).setValue(new Date().toISOString());
          return;
        }
        if (data[h] !== undefined) {
          sheet.getRange(i + 1, idx + 1).setValue(sanitize_(data[h]));
        }
      });
      return jsonResponse_({ status: 'success', id: data.id });
    }
  }
  return jsonResponse_({ status: 'error', error: 'Row not found' });
}

function deleteRow_(spec, data) {
  if (!data.id) return jsonResponse_({ status: 'error', error: 'Missing id' });
  const sheet = getOrCreateSheet_(spec);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.id)) {
      sheet.deleteRow(i + 1);
      return jsonResponse_({ status: 'success', id: data.id });
    }
  }
  return jsonResponse_({ status: 'error', error: 'Row not found' });
}

function deleteProject_(data) {
  if (!data.id) return jsonResponse_({ status: 'error', error: 'Missing id' });
  const pid = String(data.id);
  // delete the project row
  deleteRow_(SHEETS.projects, { id: pid });
  // delete cascading rows in TimeEntries / Payments / Invoices
  [SHEETS.timeEntries, SHEETS.payments, SHEETS.invoices].forEach((spec) => {
    const sheet = getOrCreateSheet_(spec);
    const rows  = sheet.getDataRange().getValues();
    // iterate from bottom up so deletions don't shift indexes
    for (let i = rows.length - 1; i >= 1; i--) {
      if (String(rows[i][1]) === pid) {  // column 1 = projectId for all child sheets
        sheet.deleteRow(i + 1);
      }
    }
  });
  return jsonResponse_({ status: 'success', id: pid });
}

// ── Sheet helpers ──────────────────────────────────────────────────────────────
function getOrCreateSheet_(spec) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(spec.name);
  if (!sheet) {
    sheet = ss.insertSheet(spec.name);
    sheet.appendRow(spec.headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function generateId_() {
  return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function sanitize_(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val).trim();
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
