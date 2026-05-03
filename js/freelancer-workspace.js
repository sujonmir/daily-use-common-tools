/**
 * freelancer-workspace.js — Freelancer Workspace
 * Features: project management (fixed/hourly), multi-currency, time tracker,
 *           invoices (auto/manual), payments, payment history, Google Sheets sync.
 */

// ─── Config & State ──────────────────────────────────────────────────────────
const APPSCRIPT_URL_KEY = "freelancer_workspace_appscript_url";
const TIMER_STATE_KEY   = "freelancer_workspace_active_timers";
const PROFILE_KEYS = {
  name:  "freelancer_workspace_freelancer_name",
  title: "freelancer_workspace_freelancer_title",
};
const SHEET_URL_KEY = "freelancer_workspace_spreadsheet_url";

const CCY = {
  USD: { symbol: "$",  code: "USD" },
  EUR: { symbol: "€",  code: "EUR" },
  BDT: { symbol: "৳", code: "BDT" },
};

// ─── Minimalist SVG icons ────────────────────────────────────────────────────
const ICON = {
  user:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  clock:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  cash:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><line x1="6" y1="12" x2="6" y2="12.01"/><line x1="18" y1="12" x2="18" y2="12.01"/></svg>`,
  doc:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  edit:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="ico-lg"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  play:    `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20"/></svg>`,
  stop:    `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>`,
  close:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ico"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
};

let appscriptUrl = "";
let state = {
  projects: [],
  timeEntries: [],
  payments: [],
  invoices: [],
};
let activeTimers = {};   // { projectId: { startedAt: ISO } }
let _timerInterval = null;
let _confirmCallback = null;
let _editingTimeProjectId = null;

// ─── Init ────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  appscriptUrl = (localStorage.getItem(APPSCRIPT_URL_KEY) || "").trim();

  if (!appscriptUrl) {
    show("connect-prompt");
    return;
  }

  loadActiveTimers();

  show("loading-state");
  const ok = await loadAllData();
  hide("loading-state");

  if (!ok) {
    show("connect-prompt");
    document.querySelector("#connect-prompt h2").textContent = "⚠️ Couldn't reach Google Sheet";
    document.querySelector("#connect-prompt p").textContent = "Check your Apps Script URL in Settings, redeploy if you updated the script, and make sure access is set to 'Anyone'.";
    return;
  }

  show("workspace");
  document.getElementById("fab-add-project").style.display = "flex";

  setupModals();
  setupFilters();
  setupProjectForm();
  setupPaymentForm();
  setupInvoiceForm();
  setupTimeForm();
  setupHeaderButtons();
  setupConfirmDialog();

  $("#btn-print-invoice").addEventListener("click", printCurrentInvoice);

  document.getElementById("fab-add-project").addEventListener("click", () => openProjectModal(null));

  startTimerTick();
  render();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function show(id) { document.getElementById(id).style.display = ""; }
function hide(id) { document.getElementById(id).style.display = "none"; }

function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function ccySymbol(code) { return (CCY[code] || CCY.USD).symbol; }
function fmtMoney(amount, currency) {
  const n = Number(amount) || 0;
  return ccySymbol(currency) + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtSeconds(totalSec) {
  const s = Math.floor(totalSec) % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function parseHMS(str) {
  const parts = String(str).trim().split(":").map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function getProfile() {
  return {
    name:  (localStorage.getItem(PROFILE_KEYS.name) || "").trim(),
    title: (localStorage.getItem(PROFILE_KEYS.title) || "").trim(),
  };
}
const DEFAULT_COPYRIGHT = "Freelancer Workspace";
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

// ─── Sheets sync ─────────────────────────────────────────────────────────────
async function loadAllData() {
  try {
    const res = await fetch(appscriptUrl, { method: "GET" });
    const json = await res.json();
    if (json.status === "error") return false;
    state.projects    = json.projects    || [];
    state.timeEntries = json.timeEntries || [];
    state.payments    = json.payments    || [];
    state.invoices    = json.invoices    || [];
    if (json.spreadsheetUrl) localStorage.setItem(SHEET_URL_KEY, json.spreadsheetUrl);
    return true;
  } catch (err) {
    console.error("Load failed:", err);
    return false;
  }
}

async function postAction(action, data, statusEl) {
  if (statusEl) {
    statusEl.textContent = "Saving…";
    statusEl.className = "sync-status";
  }
  try {
    const res = await fetch(appscriptUrl, {
      method: "POST",
      body: JSON.stringify({ action, ...data }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    const json = await res.json();
    if (json.status === "success") {
      if (statusEl) {
        statusEl.textContent = "✓ Saved";
        statusEl.className = "sync-status success";
      }
      return json;
    } else {
      if (statusEl) {
        statusEl.textContent = "✗ " + (json.error || "Sync failed");
        statusEl.className = "sync-status error";
      }
      return null;
    }
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = "✗ Network error";
      statusEl.className = "sync-status error";
    }
    return null;
  }
}

// ─── Compute derived values per project ──────────────────────────────────────
function projectTotals(project) {
  const id = String(project.id);
  let billable;
  let trackedSeconds = 0;

  if (project.type === "hourly") {
    state.timeEntries.filter(e => String(e.projectId) === id).forEach(e => {
      trackedSeconds += Number(e.durationSeconds) || 0;
    });
    // include any currently-running session
    const t = activeTimers[id];
    if (t) {
      trackedSeconds += Math.floor((Date.now() - new Date(t.startedAt).getTime()) / 1000);
    }
    const hours = trackedSeconds / 3600;
    billable = hours * (Number(project.hourlyRate) || 0);
  } else {
    billable = Number(project.fixedAmount) || 0;
  }

  const paid = state.payments
    .filter(p => String(p.projectId) === id)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const balance = billable - paid;
  let balanceLabel = "Paid";
  let balanceClass = "paid";
  if (balance > 0.001) {
    balanceLabel = `Due: ${fmtMoney(balance, project.currency)}`;
    balanceClass = "due";
  } else if (balance < -0.001) {
    balanceLabel = `Advance: ${fmtMoney(-balance, project.currency)}`;
    balanceClass = "adv";
  } else {
    balanceLabel = `Paid: ${fmtMoney(paid, project.currency)}`;
    balanceClass = "paid";
  }

  return { billable, paid, balance, balanceLabel, balanceClass, trackedSeconds };
}

function dashboardStats() {
  const byCcy = {};            // { USD: { earned, due, advance } }
  state.projects.forEach(p => {
    const c = p.currency || "USD";
    byCcy[c] = byCcy[c] || { earned: 0, due: 0, advance: 0 };
    const t = projectTotals(p);
    byCcy[c].earned += t.paid;
    if (t.balance > 0) byCcy[c].due += t.balance;
    if (t.balance < 0) byCcy[c].advance += -t.balance;
  });
  return byCcy;
}

// ─── Render ──────────────────────────────────────────────────────────────────
function render() {
  renderDashboard();
  renderProjects();
}

function renderDashboard() {
  const stats = dashboardStats();
  const codes = Object.keys(stats);
  const wrap = $("#dashboard");

  const projectCount = state.projects.length;
  const activeCount  = state.projects.filter(p => p.status === "active").length;

  const ccyHtml = (key) => {
    if (codes.length === 0) return '<div class="multi-ccy"><span>—</span></div>';
    return '<div class="multi-ccy">' +
      codes.map(c => `<span>${ccySymbol(c)}${(stats[c][key] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>`).join("") +
      '</div>';
  };

  wrap.innerHTML = `
    <div class="stat-card proj">
      <div class="label">Projects</div>
      <div class="value">${projectCount}</div>
      <div class="sub">${activeCount} active</div>
    </div>
    <div class="stat-card earned">
      <div class="label">Total Earned</div>
      ${ccyHtml("earned")}
    </div>
    <div class="stat-card due">
      <div class="label">Outstanding Due</div>
      ${ccyHtml("due")}
    </div>
    <div class="stat-card adv">
      <div class="label">Advance Received</div>
      ${ccyHtml("advance")}
    </div>
  `;
}

function renderProjects() {
  const grid = $("#projects-grid");
  const empty = $("#empty-state");
  const countEl = $("#project-count");

  const fStatus   = $("#filter-status").value;
  const fType     = $("#filter-type").value;
  const fCurrency = $("#filter-currency").value;
  const fSearch   = $("#filter-search").value.trim().toLowerCase();

  const filtered = state.projects.filter(p => {
    if (fStatus !== "all" && p.status !== fStatus) return false;
    if (fType !== "all" && p.type !== fType) return false;
    if (fCurrency !== "all" && p.currency !== fCurrency) return false;
    if (fSearch) {
      const hay = (p.name + " " + p.client + " " + p.description).toLowerCase();
      if (!hay.includes(fSearch)) return false;
    }
    return true;
  });

  countEl.textContent = `${filtered.length} project${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    empty.style.display = "";
    return;
  }
  empty.style.display = "none";

  grid.innerHTML = filtered.map(renderProjectCard).join("");

  // wire up actions per card
  filtered.forEach(p => wireProjectCard(p));
}

function renderProjectCard(p) {
  const t = projectTotals(p);
  const id = escapeHtml(p.id);
  const statusClass = `status-${(p.status || "active").replace(" ", "-")}`;
  const trackedHrs  = (t.trackedSeconds / 3600);
  const isHourly    = p.type === "hourly";
  const isRunning   = !!activeTimers[String(p.id)];

  return `
    <div class="project-card ${statusClass}" data-id="${id}">
      <div class="project-head">
        <div class="info">
          <h3 class="project-name">${escapeHtml(p.name)}</h3>
          ${p.client ? `<p class="project-client">${ICON.user} ${escapeHtml(p.client)}</p>` : ""}
        </div>
      </div>
      <div class="project-badges">
        <span class="badge type-${p.type || "fixed"}">${p.type === "hourly" ? "Hourly" : "Fixed"}</span>
        <span class="badge currency ccy-${(p.currency || "USD").toLowerCase()}">${ccySymbol(p.currency)} ${escapeHtml(p.currency)}</span>
        <span class="badge ${statusClass}">${escapeHtml(p.status || "active")}</span>
        ${isHourly ? `<span class="badge currency ccy-${(p.currency || "USD").toLowerCase()}">${fmtMoney(p.hourlyRate, p.currency)}/hr</span>` : ""}
      </div>

      ${isHourly ? `
        <div class="tracker-box ${isRunning ? "running" : ""}" data-tracker-pid="${id}">
          <div>
            <div class="tracker-time" data-timer-pid="${id}">${fmtSeconds(t.trackedSeconds)}</div>
            <div class="totals">${trackedHrs.toFixed(2)} hrs · ${fmtMoney(t.billable, p.currency)}</div>
          </div>
          <button class="tracker-btn ${isRunning ? "stop" : ""}" data-action="${isRunning ? "stop-timer" : "start-timer"}" data-id="${id}" title="${isRunning ? "Stop" : "Start"} timer">
            ${isRunning ? ICON.stop : ICON.play}
          </button>
        </div>
      ` : ""}

      <div class="project-amounts">
        <div class="amt-block">
          <div class="lbl">${isHourly ? "Billable" : "Total"}</div>
          <div class="val">${fmtMoney(t.billable, p.currency)}</div>
        </div>
        <div class="amt-block">
          <div class="lbl">Paid</div>
          <div class="val paid-amt">${fmtMoney(t.paid, p.currency)}</div>
        </div>
        <div class="amt-block" style="grid-column:1/-1">
          <div class="lbl">Status</div>
          <div class="val ${t.balanceClass}">${t.balanceLabel}</div>
        </div>
      </div>

      ${p.description ? `<p class="description">${escapeHtml(p.description)}</p>` : ""}

      <div class="project-actions ${isHourly ? "is-hourly" : ""}">
        ${isHourly ? `<button data-action="time-entries" data-id="${id}" title="Time entries">${ICON.clock} Entries</button>` : ""}
        <button data-action="payment" data-id="${id}" title="Record payment">${ICON.cash} Payment</button>
        <button data-action="invoice" data-id="${id}" title="Generate invoice">${ICON.doc} Invoice</button>
        <button data-action="edit" data-id="${id}" title="Edit project">${ICON.edit} Edit</button>
        <button data-action="delete" data-id="${id}" title="Delete project" class="danger">${ICON.trash}</button>
      </div>
    </div>
  `;
}

function wireProjectCard(p) {
  const card = $(`.project-card[data-id="${CSS.escape(String(p.id))}"]`);
  if (!card) return;
  $$(".project-actions button, .tracker-btn", card).forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      handleAction(action, p);
    });
  });
}

function handleAction(action, project) {
  switch (action) {
    case "edit":          return openProjectModal(project);
    case "delete":        return confirmDeleteProject(project);
    case "payment":       return openPaymentModal(project);
    case "invoice":       return openInvoiceModal(project);
    case "time-entries":  return openTimeModal(project);
    case "start-timer":   return startTimer(project);
    case "stop-timer":    return stopTimer(project);
  }
}

// ─── Modal management ────────────────────────────────────────────────────────
function setupModals() {
  $$(".modal-close, [data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.close;
      if (id) closeModal(id);
    });
  });
  // Modals only close via the close button — no click-outside, no Esc.
}

function openModal(id)  { document.getElementById(id).classList.add("active"); }
function closeModal(id) { document.getElementById(id).classList.remove("active"); }

// ─── Project form ────────────────────────────────────────────────────────────
function setupProjectForm() {
  $("#proj-type").addEventListener("change", () => {
    const isHourly = $("#proj-type").value === "hourly";
    $("#field-fixed").style.display  = isHourly ? "none" : "";
    $("#field-hourly").style.display = isHourly ? "" : "none";
  });

  $("#btn-save-project").addEventListener("click", async (e) => {
    e.preventDefault();
    const id        = $("#proj-id").value;
    const name      = $("#proj-name").value.trim();
    const client    = $("#proj-client").value.trim();
    const type      = $("#proj-type").value;
    const currency  = $("#proj-currency").value;
    const fixed     = parseFloat($("#proj-fixed").value) || 0;
    const hourly    = parseFloat($("#proj-hourly").value) || 0;
    const status    = $("#proj-status").value;
    const description = $("#proj-description").value.trim();
    const statusEl  = $("#proj-sync-status");

    if (!name) {
      statusEl.textContent = "✗ Project name is required.";
      statusEl.className = "sync-status error";
      return;
    }
    if (type === "fixed" && fixed <= 0) {
      statusEl.textContent = "✗ Fixed price must be greater than 0.";
      statusEl.className = "sync-status error";
      return;
    }
    if (type === "hourly" && hourly <= 0) {
      statusEl.textContent = "✗ Hourly rate must be greater than 0.";
      statusEl.className = "sync-status error";
      return;
    }

    const payload = {
      name, client, type, currency, status, description,
      fixedAmount: type === "fixed" ? fixed : "",
      hourlyRate:  type === "hourly" ? hourly : "",
    };

    let result;
    if (id) {
      result = await postAction("updateProject", { id, ...payload }, statusEl);
      if (result) {
        const idx = state.projects.findIndex(p => String(p.id) === String(id));
        if (idx !== -1) state.projects[idx] = { ...state.projects[idx], ...payload };
      }
    } else {
      result = await postAction("addProject", payload, statusEl);
      if (result) {
        state.projects.push({ id: result.id, createdAt: new Date().toISOString(), ...payload });
      }
    }
    if (result) {
      render();
      setTimeout(() => closeModal("modal-project"), 600);
    }
  });
}

function openProjectModal(project) {
  $("#modal-project-title").textContent = project ? "Edit Project" : "New Project";
  $("#proj-sync-status").textContent = "";
  $("#proj-id").value          = project ? project.id : "";
  $("#proj-name").value        = project ? project.name : "";
  $("#proj-client").value      = project ? project.client || "" : "";
  $("#proj-type").value        = project ? project.type : "fixed";
  $("#proj-currency").value    = project ? project.currency || "USD" : "USD";
  $("#proj-fixed").value       = project ? project.fixedAmount || "" : "";
  $("#proj-hourly").value      = project ? project.hourlyRate || "" : "";
  $("#proj-status").value      = project ? project.status || "active" : "active";
  $("#proj-description").value = project ? project.description || "" : "";

  // toggle the right amount field
  const isHourly = $("#proj-type").value === "hourly";
  $("#field-fixed").style.display  = isHourly ? "none" : "";
  $("#field-hourly").style.display = isHourly ? "" : "none";

  openModal("modal-project");
}

function confirmDeleteProject(project) {
  showConfirm({
    title: "Delete Project?",
    msg: `"${project.name}" and all its time entries, payments, and invoices will be permanently deleted.`,
    onYes: async (statusEl) => {
      const result = await postAction("deleteProject", { id: project.id }, statusEl);
      if (result) {
        state.projects    = state.projects.filter(p => String(p.id) !== String(project.id));
        state.timeEntries = state.timeEntries.filter(e => String(e.projectId) !== String(project.id));
        state.payments    = state.payments.filter(p => String(p.projectId) !== String(project.id));
        state.invoices    = state.invoices.filter(i => String(i.projectId) !== String(project.id));
        const id = String(project.id);
        if (activeTimers[id]) { delete activeTimers[id]; saveActiveTimers(); }
        render();
        return true;
      }
      return false;
    }
  });
}

// ─── Payment ─────────────────────────────────────────────────────────────────
function setupPaymentForm() {
  $("#btn-save-payment").addEventListener("click", async (e) => {
    e.preventDefault();
    const projectId = $("#pay-project-id").value;
    const amount    = parseFloat($("#pay-amount").value) || 0;
    const date      = $("#pay-date").value;
    const note      = $("#pay-note").value.trim();
    const statusEl  = $("#pay-sync-status");

    if (!projectId || amount <= 0 || !date) {
      statusEl.textContent = "✗ Amount and date are required.";
      statusEl.className = "sync-status error";
      return;
    }
    const project = state.projects.find(p => String(p.id) === String(projectId));
    const result = await postAction("addPayment", {
      projectId, amount, currency: project?.currency || "USD", date, note,
    }, statusEl);
    if (result) {
      state.payments.push({
        id: result.id, projectId, amount, currency: project?.currency || "USD", date, note,
      });
      render();
      setTimeout(() => closeModal("modal-payment"), 600);
    }
  });
}

function openPaymentModal(project) {
  $("#pay-project-id").value   = project.id;
  $("#pay-project-name").value = project.name;
  $("#pay-amount").value = "";
  $("#pay-date").value   = todayISO();
  $("#pay-note").value   = "";
  $("#pay-sync-status").textContent = "";
  openModal("modal-payment");
}

// ─── Invoice ─────────────────────────────────────────────────────────────────
function setupInvoiceForm() {
  $("#inv-amount-type").addEventListener("change", refreshInvoiceAmount);

  // generated-by radio toggle (active class + show/hide manual input + hint)
  $$("#inv-genby-row label").forEach(lbl => {
    lbl.addEventListener("click", () => {
      const value = lbl.dataset.genby;
      $$("#inv-genby-row input").forEach(r => { r.checked = (r.value === value); });
      $$("#inv-genby-row label").forEach(l => l.classList.toggle("active", l.dataset.genby === value));
      const manualInput = $("#inv-genby-manual");
      manualInput.style.display = value === "manual" ? "" : "none";
      refreshGenByHint();
    });
  });
  $("#inv-genby-manual").addEventListener("input", refreshGenByHint);

  $("#btn-save-invoice").addEventListener("click", async (e) => {
    e.preventDefault();
    const result = await saveInvoice();
    if (result) setTimeout(() => closeModal("modal-invoice"), 600);
  });

  $("#btn-preview-invoice").addEventListener("click", async (e) => {
    e.preventDefault();
    const saved = await saveInvoice();
    if (saved) {
      const project = state.projects.find(p => String(p.id) === $("#inv-project-id").value);
      const inv = state.invoices.find(i => String(i.id) === $("#inv-id").value);
      if (project && inv) renderInvoicePreview(project, inv);
    }
  });
}

function getGenByValue() {
  const checked = document.querySelector('input[name="inv-genby"]:checked');
  const mode = checked ? checked.value : "me";
  if (mode === "me")      return getProfile().name || DEFAULT_COPYRIGHT;
  if (mode === "default") return DEFAULT_COPYRIGHT;
  return ($("#inv-genby-manual").value || "").trim() || DEFAULT_COPYRIGHT;
}

function refreshGenByHint() {
  $("#inv-genby-hint").textContent = `Footer will read: "Generated by ${getGenByValue()}"`;
}

async function saveInvoice() {
  const projectId  = $("#inv-project-id").value;
  const id         = $("#inv-id").value;
  const number     = $("#inv-number").value.trim();
  const amountType = $("#inv-amount-type").value;
  const amount     = parseFloat($("#inv-amount").value) || 0;
  const issueDate  = $("#inv-issue-date").value;
  const dueDate    = $("#inv-due-date").value;
  const status     = $("#inv-status").value;
  const notes      = $("#inv-notes").value.trim();
  const statusEl   = $("#inv-sync-status");

  if (!projectId || !number || amount <= 0 || !issueDate) {
    statusEl.textContent = "✗ Number, amount, and issue date are required.";
    statusEl.className = "sync-status error";
    return null;
  }

  const profile = getProfile();
  const payload = {
    projectId, invoiceNumber: number, amount, amountType,
    issueDate, dueDate, status, notes, items: "",
    generatedBy:    getGenByValue(),
    freelancerName: profile.name,
    freelancerTitle: profile.title,
  };
  let result;
  if (id) {
    result = await postAction("updateInvoice", { id, ...payload }, statusEl);
    if (result) {
      const idx = state.invoices.findIndex(i => String(i.id) === String(id));
      if (idx !== -1) state.invoices[idx] = { ...state.invoices[idx], ...payload };
    }
  } else {
    result = await postAction("addInvoice", payload, statusEl);
    if (result) {
      state.invoices.push({ id: result.id, createdAt: new Date().toISOString(), ...payload });
      $("#inv-id").value = result.id;
    }
  }
  return result;
}

function refreshInvoiceAmount() {
  const projectId = $("#inv-project-id").value;
  const project = state.projects.find(p => String(p.id) === projectId);
  if (!project) return;
  const t = projectTotals(project);
  const amountType = $("#inv-amount-type").value;
  const hint = $("#inv-amount-hint");
  const amtInput = $("#inv-amount");
  if (amountType === "auto") {
    const due = Math.max(0, t.balance);
    amtInput.value = due.toFixed(2);
    amtInput.disabled = true;
    hint.textContent = `Auto = current outstanding due. Edit by switching to Manual.`;
  } else {
    amtInput.disabled = false;
    hint.textContent = `Manual mode — enter any amount.`;
  }
}

function openInvoiceModal(project, existingInvoice = null) {
  $("#inv-project-id").value   = project.id;
  $("#inv-project-name").value = project.name;
  $("#inv-id").value           = existingInvoice ? existingInvoice.id : "";

  const nextNum = "INV-" + String(state.invoices.length + 1).padStart(4, "0");
  $("#inv-number").value      = existingInvoice ? existingInvoice.invoiceNumber : nextNum;
  $("#inv-amount-type").value = existingInvoice ? existingInvoice.amountType || "manual" : "auto";
  $("#inv-issue-date").value  = existingInvoice ? (existingInvoice.issueDate || "").slice(0,10) : todayISO();
  $("#inv-due-date").value    = existingInvoice ? (existingInvoice.dueDate || "").slice(0,10) : "";
  $("#inv-status").value      = existingInvoice ? existingInvoice.status || "draft" : "draft";
  $("#inv-notes").value       = existingInvoice ? existingInvoice.notes || "" : "";
  $("#inv-sync-status").textContent = "";

  $("#modal-invoice-title").textContent = existingInvoice ? "Edit Invoice" : "Generate Invoice";

  if (existingInvoice) {
    $("#inv-amount").value = existingInvoice.amount || 0;
    $("#inv-amount").disabled = false;
    $("#inv-amount-hint").textContent = "";
  } else {
    refreshInvoiceAmount();
  }

  // Restore generated-by selection
  const profile = getProfile();
  let genMode = "me";
  let manualText = "";
  if (existingInvoice && existingInvoice.generatedBy) {
    const g = String(existingInvoice.generatedBy).trim();
    if (g === profile.name && profile.name) genMode = "me";
    else if (g === DEFAULT_COPYRIGHT)       genMode = "default";
    else { genMode = "manual"; manualText = g; }
  }
  $$("#inv-genby-row input").forEach(r => { r.checked = (r.value === genMode); });
  $$("#inv-genby-row label").forEach(l => l.classList.toggle("active", l.dataset.genby === genMode));
  $("#inv-genby-manual").value = manualText;
  $("#inv-genby-manual").style.display = genMode === "manual" ? "" : "none";
  refreshGenByHint();

  openModal("modal-invoice");
}

function buildInvoiceHTML(project, invoice) {
  const t = projectTotals(project);
  const ccy = project.currency;
  const teRows = project.type === "hourly"
    ? state.timeEntries.filter(e => String(e.projectId) === String(project.id))
    : [];
  const totalSec = teRows.reduce((s, e) => s + (Number(e.durationSeconds) || 0), 0);
  const totalHrs = (totalSec / 3600);

  // Snapshot freelancer info from invoice if persisted, else current profile
  const profile = getProfile();
  const freelancerName  = (invoice.freelancerName  || profile.name  || "").trim();
  const freelancerTitle = (invoice.freelancerTitle || profile.title || "").trim();
  const generatedBy     = (invoice.generatedBy || profile.name || "—").trim();

  return `
    <div class="invoice-paper">
      <header class="inv-header">
        <div class="inv-from">
          ${freelancerName  ? `<div class="inv-from-name">${escapeHtml(freelancerName)}</div>` : ""}
          ${freelancerTitle ? `<div class="inv-from-title">${escapeHtml(freelancerTitle)}</div>` : ""}
        </div>
        <div class="inv-title-block">
          <h1>INVOICE</h1>
          <div class="inv-num">${escapeHtml(invoice.invoiceNumber)}</div>
        </div>
      </header>
      <hr class="inv-hr" />
      <div class="inv-row">
        <div>
          <h4>Bill To</h4>
          <p><strong>${escapeHtml(project.client || "—")}</strong></p>
          <p>Project: ${escapeHtml(project.name)}</p>
        </div>
        <div class="inv-meta">
          <h4>Issue Date</h4>
          <p>${escapeHtml(invoice.issueDate || "—")}</p>
          ${invoice.dueDate ? `<h4>Due Date</h4><p>${escapeHtml(invoice.dueDate)}</p>` : ""}
          <h4>Status</h4>
          <p style="text-transform:capitalize">${escapeHtml(invoice.status || "draft")}</p>
        </div>
      </div>
      <table class="inv-items">
        <thead>
          <tr>
            <th>Description</th>
            ${project.type === "hourly" ? `<th class="ralign">Hours</th><th class="ralign">Rate</th>` : ""}
            <th class="ralign">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${project.type === "hourly"
            ? `<tr>
                 <td>${escapeHtml(project.name)} — hourly work</td>
                 <td class="ralign">${totalHrs.toFixed(2)}</td>
                 <td class="ralign">${fmtMoney(project.hourlyRate, ccy)}</td>
                 <td class="ralign">${fmtMoney(t.billable, ccy)}</td>
               </tr>`
            : `<tr>
                 <td>${escapeHtml(project.name)}${project.description ? " — " + escapeHtml(project.description) : ""}</td>
                 <td class="ralign">${fmtMoney(project.fixedAmount, ccy)}</td>
               </tr>`}
          <tr class="total-row">
            <td colspan="${project.type === "hourly" ? 3 : 1}" class="ralign">Invoice Amount</td>
            <td class="ralign">${fmtMoney(invoice.amount, ccy)}</td>
          </tr>
        </tbody>
      </table>
      ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</div>` : ""}
      <div class="inv-footer">Generated by ${escapeHtml(generatedBy)}</div>
    </div>
  `;
}

// Styles scoped to .invoice-paper — safe to inject into a modal without
// leaking page-level rules (no `body`, no `*`, no top-level resets).
function INVOICE_SCOPED_CSS() {
  return `
    .invoice-paper { font-family: "Segoe UI", Arial, sans-serif; color: #1a1a1a; max-width: 760px; margin: 0 auto; }
    .invoice-paper * { box-sizing: border-box; }
    .invoice-paper .inv-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
    .invoice-paper .inv-from-name { font-size: 22px; font-weight: 700; color: #000; letter-spacing: -0.3px; }
    .invoice-paper .inv-from-title { font-size: 13px; color: #555; margin-top: 2px; }
    .invoice-paper .inv-title-block { text-align: right; }
    .invoice-paper .inv-title-block h1 { margin: 0; font-size: 32px; color: #000; letter-spacing: 1px; }
    .invoice-paper h1 { margin: 0 0 4px; font-size: 32px; color: #000; letter-spacing: 1px; }
    .invoice-paper .inv-num { font-size: 13px; color: #666; font-family: monospace; margin-top: 2px; }
    .invoice-paper .inv-hr { border: none; border-top: 2px solid #000; margin: 18px 0 22px; }
    .invoice-paper .inv-row { display: flex; justify-content: space-between; gap: 30px; margin-bottom: 24px; }
    .invoice-paper .inv-row > div { flex: 1; }
    .invoice-paper .inv-row h4 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: #888; font-weight: 700; }
    .invoice-paper .inv-row p { margin: 2px 0; font-size: 14px; }
    .invoice-paper .inv-meta { text-align: right; }
    .invoice-paper .inv-meta h4 { margin-top: 10px; }
    .invoice-paper .inv-meta h4:first-child { margin-top: 0; }
    .invoice-paper table.inv-items { width: 100%; border-collapse: collapse; margin: 18px 0; }
    .invoice-paper table.inv-items th { text-align: left; background: #f5f5f5; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 2px solid #000; color: #000; }
    .invoice-paper table.inv-items td { padding: 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
    .invoice-paper table.inv-items .ralign { text-align: right; }
    .invoice-paper table.inv-items .total-row { font-weight: 700; font-size: 16px; background: #fafafa; }
    .invoice-paper .notes { margin-top: 24px; padding: 12px 14px; background: #fafafa; border-left: 3px solid #000; font-size: 13px; color: #333; }
    .invoice-paper .inv-footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #888; text-align: center; }
  `;
}

// Full document CSS for the standalone print window. Includes body resets
// because that window has no other styles.
function INVOICE_PRINT_DOC_CSS() {
  return `
    body { margin: 0; padding: 30px; background: #fff; }
    ${INVOICE_SCOPED_CSS()}
    @media print {
      body { padding: 0; }
      .invoice-paper { max-width: none; }
    }
  `;
}

function renderInvoicePreview(project, invoice) {
  const html = buildInvoiceHTML(project, invoice);
  $("#invoice-preview-body").innerHTML = `<style>${INVOICE_SCOPED_CSS()}</style>${html}`;
  // Stash data for the print button
  $("#invoice-preview-body").dataset.printHtml = html;
  openModal("modal-invoice-preview");
}

function printCurrentInvoice() {
  const html = $("#invoice-preview-body").dataset.printHtml;
  if (!html) return;
  const w = window.open("", "PrintInvoice", "width=900,height=1100");
  if (!w) {
    alert("Pop-up blocker prevented opening the print window. Please allow pop-ups for this site and try again.");
    return;
  }
  w.document.open();
  w.document.write(`<!doctype html><html><head><title>Invoice</title><meta charset="UTF-8"><style>${INVOICE_PRINT_DOC_CSS()}</style></head><body>${html}<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},250);window.onafterprint=function(){window.close();};};<\/script></body></html>`);
  w.document.close();
}

// ─── Time entries ────────────────────────────────────────────────────────────
function setupTimeForm() {
  $("#btn-add-time-entry").addEventListener("click", async (e) => {
    e.preventDefault();
    const projectId = _editingTimeProjectId;
    const date  = $("#te-date").value;
    const dur   = parseHMS($("#te-dur").value);
    const desc  = $("#te-desc").value.trim();
    const statusEl = $("#te-sync-status");

    if (!projectId || !date || dur <= 0) {
      statusEl.textContent = "✗ Date and duration are required.";
      statusEl.className = "sync-status error";
      return;
    }
    const result = await postAction("addTimeEntry", {
      projectId, startTime: date, endTime: date, durationSeconds: dur, description: desc,
    }, statusEl);
    if (result) {
      state.timeEntries.push({
        id: result.id, projectId, startTime: date, endTime: date, durationSeconds: dur, description: desc,
      });
      $("#te-dur").value = "";
      $("#te-desc").value = "";
      renderTimeEntriesList(projectId);
      render();
    }
  });
}

function openTimeModal(project) {
  _editingTimeProjectId = project.id;
  $("#modal-time-title").textContent = `Time Entries — ${project.name}`;
  $("#te-date").value = todayISO();
  $("#te-dur").value  = "";
  $("#te-desc").value = "";
  $("#te-sync-status").textContent = "";
  renderTimeEntriesList(project.id);
  openModal("modal-time");
}

function renderTimeEntriesList(projectId) {
  const entries = state.timeEntries
    .filter(e => String(e.projectId) === String(projectId))
    .sort((a, b) => String(b.startTime).localeCompare(String(a.startTime)));
  const wrap = $("#time-entries-list");
  if (entries.length === 0) {
    wrap.innerHTML = `<div style="padding:20px;text-align:center;color:#999;font-size:12px">No time entries yet.</div>`;
    return;
  }
  wrap.innerHTML = entries.map(e => {
    const date = String(e.startTime || "").slice(0, 10);
    return `
      <div class="time-entry">
        <div class="te-date">${escapeHtml(date)}</div>
        <div class="te-dur">${fmtSeconds(e.durationSeconds)}</div>
        <div class="te-desc">${escapeHtml(e.description || "—")}</div>
        <button class="te-del" data-te-id="${escapeHtml(e.id)}" title="Delete">${ICON.close}</button>
      </div>
    `;
  }).join("");

  $$(".te-del", wrap).forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.teId;
      btn.disabled = true;
      const result = await postAction("deleteTimeEntry", { id }, $("#te-sync-status"));
      if (result) {
        state.timeEntries = state.timeEntries.filter(e => String(e.id) !== String(id));
        renderTimeEntriesList(projectId);
        render();
      } else {
        btn.disabled = false;
      }
    });
  });
}

// ─── Live timer (start/stop) ─────────────────────────────────────────────────
function loadActiveTimers() {
  try {
    activeTimers = JSON.parse(localStorage.getItem(TIMER_STATE_KEY) || "{}");
  } catch { activeTimers = {}; }
}
function saveActiveTimers() {
  localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(activeTimers));
}

function startTimer(project) {
  const id = String(project.id);
  activeTimers[id] = { startedAt: new Date().toISOString() };
  saveActiveTimers();
  render();
}

async function stopTimer(project) {
  const id = String(project.id);
  const t = activeTimers[id];
  if (!t) return;
  const startedAt = new Date(t.startedAt);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
  delete activeTimers[id];
  saveActiveTimers();
  render();

  if (seconds < 1) return;
  const result = await postAction("addTimeEntry", {
    projectId: id,
    startTime: startedAt.toISOString(),
    endTime: now.toISOString(),
    durationSeconds: seconds,
    description: "Timer session",
  });
  if (result) {
    state.timeEntries.push({
      id: result.id, projectId: id,
      startTime: startedAt.toISOString(), endTime: now.toISOString(),
      durationSeconds: seconds, description: "Timer session",
    });
    render();
  } else {
    // sync failed — restart the timer so user doesn't lose tracked time
    activeTimers[id] = { startedAt: startedAt.toISOString() };
    saveActiveTimers();
    alert("Could not save the time entry. Timer was restarted to preserve your time. Stop again when network is back.");
    render();
  }
}

function startTimerTick() {
  if (_timerInterval) clearInterval(_timerInterval);
  _timerInterval = setInterval(() => {
    let any = false;
    Object.keys(activeTimers).forEach(pid => {
      any = true;
      const startedAt = new Date(activeTimers[pid].startedAt);
      const project = state.projects.find(p => String(p.id) === pid);
      if (!project) return;
      const baseSec = state.timeEntries
        .filter(e => String(e.projectId) === pid)
        .reduce((s, e) => s + (Number(e.durationSeconds) || 0), 0);
      const sessionSec = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      const total = baseSec + sessionSec;
      const el = document.querySelector(`[data-timer-pid="${CSS.escape(pid)}"]`);
      if (el) el.textContent = fmtSeconds(total);
    });
  }, 1000);
}

// ─── Filters ─────────────────────────────────────────────────────────────────
function setupFilters() {
  ["filter-status","filter-type","filter-currency"].forEach(id => {
    $("#" + id).addEventListener("change", renderProjects);
  });
  $("#filter-search").addEventListener("input", renderProjects);
}

// ─── Header buttons (Payment History, All Invoices) ──────────────────────────
function setupHeaderButtons() {
  $("#btn-payment-history").addEventListener("click", openPaymentHistory);
  $("#btn-invoices").addEventListener("click", openAllInvoices);
}

function openPaymentHistory() {
  // populate project filter
  const sel = $("#hist-filter-project");
  sel.innerHTML = '<option value="all">All Projects</option>' +
    state.projects.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");

  const renderHist = () => {
    const fProj = sel.value;
    const fCcy  = $("#hist-filter-currency").value;
    const q     = $("#hist-search").value.trim().toLowerCase();
    const rows = state.payments.filter(p => {
      if (fProj !== "all" && String(p.projectId) !== fProj) return false;
      if (fCcy !== "all" && p.currency !== fCcy) return false;
      if (q && !(p.note || "").toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => String(b.date).localeCompare(String(a.date)));

    const totals = {};
    rows.forEach(p => {
      const c = p.currency || "USD";
      totals[c] = (totals[c] || 0) + (Number(p.amount) || 0);
    });

    $("#history-total").textContent = `${rows.length} payments · ` +
      Object.keys(totals).map(c => `${ccySymbol(c)}${totals[c].toFixed(2)}`).join(" · ");

    if (rows.length === 0) {
      $("#history-table-wrap").innerHTML = `<div style="padding:30px;text-align:center;color:#999">No payments found.</div>`;
      return;
    }

    $("#history-table-wrap").innerHTML = `
      <table class="history-table">
        <thead>
          <tr>
            <th>Date</th><th>Project</th><th>Amount</th><th>Note</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(p => {
            const proj = state.projects.find(pr => String(pr.id) === String(p.projectId));
            return `<tr>
              <td>${escapeHtml(String(p.date).slice(0,10))}</td>
              <td>${escapeHtml(proj ? proj.name : "—")}</td>
              <td><span class="ccy">${escapeHtml(p.currency)}</span> ${fmtMoney(p.amount, p.currency)}</td>
              <td>${escapeHtml(p.note || "—")}</td>
              <td class="row-actions">
                <button class="danger" data-pay-del="${escapeHtml(p.id)}">Delete</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    `;
    $$("[data-pay-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this payment?")) return;
        btn.disabled = true;
        const result = await postAction("deletePayment", { id: btn.dataset.payDel });
        if (result) {
          state.payments = state.payments.filter(p => String(p.id) !== String(btn.dataset.payDel));
          renderHist();
          render();
        } else {
          btn.disabled = false;
          alert("Could not delete payment.");
        }
      });
    });
  };

  sel.onchange = renderHist;
  $("#hist-filter-currency").onchange = renderHist;
  $("#hist-search").oninput = renderHist;
  renderHist();
  openModal("modal-history");
}

function openAllInvoices() {
  const sel = $("#invs-filter-project");
  sel.innerHTML = '<option value="all">All Projects</option>' +
    state.projects.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join("");

  const renderInvs = () => {
    const fProj = sel.value;
    const fStat = $("#invs-filter-status").value;
    const q     = $("#invs-search").value.trim().toLowerCase();
    const rows = state.invoices.filter(i => {
      if (fProj !== "all" && String(i.projectId) !== fProj) return false;
      if (fStat !== "all" && i.status !== fStat) return false;
      if (q && !(i.invoiceNumber || "").toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => String(b.issueDate).localeCompare(String(a.issueDate)));

    $("#invs-total").textContent = `${rows.length} invoices`;

    if (rows.length === 0) {
      $("#invs-table-wrap").innerHTML = `<div style="padding:30px;text-align:center;color:#999">No invoices found.</div>`;
      return;
    }

    $("#invs-table-wrap").innerHTML = `
      <table class="history-table">
        <thead>
          <tr>
            <th>Number</th><th>Project</th><th>Issue Date</th><th>Amount</th><th>Status</th><th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(i => {
            const proj = state.projects.find(pr => String(pr.id) === String(i.projectId));
            return `<tr>
              <td><strong>${escapeHtml(i.invoiceNumber)}</strong></td>
              <td>${escapeHtml(proj ? proj.name : "—")}</td>
              <td>${escapeHtml(String(i.issueDate).slice(0,10))}</td>
              <td>${fmtMoney(i.amount, proj?.currency || "USD")}</td>
              <td style="text-transform:capitalize">${escapeHtml(i.status || "draft")}</td>
              <td class="row-actions">
                <button data-inv-print="${escapeHtml(i.id)}">Preview</button>
                <button data-inv-edit="${escapeHtml(i.id)}">Edit</button>
                <button class="danger" data-inv-del="${escapeHtml(i.id)}">Delete</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    `;
    $$("[data-inv-print]").forEach(btn => btn.addEventListener("click", () => {
      const inv = state.invoices.find(i => String(i.id) === btn.dataset.invPrint);
      const proj = state.projects.find(p => String(p.id) === String(inv?.projectId));
      if (inv && proj) renderInvoicePreview(proj, inv);
    }));
    $$("[data-inv-edit]").forEach(btn => btn.addEventListener("click", () => {
      const inv = state.invoices.find(i => String(i.id) === btn.dataset.invEdit);
      const proj = state.projects.find(p => String(p.id) === String(inv?.projectId));
      if (inv && proj) {
        closeModal("modal-all-invoices");
        openInvoiceModal(proj, inv);
      }
    }));
    $$("[data-inv-del]").forEach(btn => btn.addEventListener("click", async () => {
      if (!confirm("Delete this invoice?")) return;
      btn.disabled = true;
      const result = await postAction("deleteInvoice", { id: btn.dataset.invDel });
      if (result) {
        state.invoices = state.invoices.filter(i => String(i.id) !== String(btn.dataset.invDel));
        renderInvs();
      } else {
        btn.disabled = false;
        alert("Could not delete invoice.");
      }
    }));
  };

  sel.onchange = renderInvs;
  $("#invs-filter-status").onchange = renderInvs;
  $("#invs-search").oninput = renderInvs;
  renderInvs();
  openModal("modal-all-invoices");
}

// ─── Custom confirmation dialog ──────────────────────────────────────────────
function setupConfirmDialog() {
  const overlay = $("#confirm-overlay");
  const yes = $("#confirm-yes");
  const no  = $("#confirm-no");

  no.addEventListener("click", () => {
    overlay.classList.remove("active");
    yes.disabled = false;
    _confirmCallback = null;
  });
  // Confirm dialog also only closes via Cancel/Yes — no backdrop click.
  yes.addEventListener("click", async () => {
    if (!_confirmCallback) return;
    yes.disabled = true;
    const ok = await _confirmCallback($("#confirm-status"));
    if (ok) {
      overlay.classList.remove("active");
      _confirmCallback = null;
    }
    yes.disabled = false;
  });
}

function showConfirm({ title = "Are you sure?", msg = "", onYes }) {
  $("#confirm-title").textContent = title;
  $("#confirm-msg").textContent = msg;
  $("#confirm-status").textContent = "";
  $("#confirm-yes").disabled = false;
  _confirmCallback = onYes;
  $("#confirm-overlay").classList.add("active");
}
