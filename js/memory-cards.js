/**
 * memory-cards.js — Personal Memory Cards page scripts
 * Features: time-spent counter, image/video popup, fullscreen, filter/search toolbar,
 *           add-card modal (file pickers + date picker), Google Sheets sync.
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SHEETS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxIdTlVJcXKpWqAe2hwJWR5ibfSScCSXnNuY_xf7inQcmq5CIEPL-5kKpDbD5MNTrqD/exec"; // paste your Memory Cards Apps Script URL here

// Time tracking — persisted to Google Sheets
let   _savedSeconds  = 0;          // total seconds fetched from Sheets on load
const _pageLoadTime  = Date.now(); // ms when this tab opened

// My date of birth (for "My Age" display)
const MY_DOB = new Date(1996, 3, 19); // April 19, 1996

// Local server upload endpoint (only used on localhost)
const LOCAL_UPLOAD_URL = "http://localhost:3000/upload";

// True when running via node server.js locally; false on GitHub Pages / any other host
const IS_LOCAL =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

// Relative folder paths used in both local and GitHub upload modes
const IMG_DIR   = "img/";

// ── GitHub upload config (used on GitHub Pages instead of Google Drive) ───────
// Fine-grained PAT: Settings → Developer settings → Fine-grained tokens
// Required permission: Contents → Read and write  (for this repo only)
const GITHUB_TOKEN  = ""; 
const GITHUB_REPO   = "sujonmir/daily-use-common-tools";          // e.g. "sujonmhk786/daily-use-common-tools"
const GITHUB_BRANCH = "main";

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Start ticking immediately (will update again once saved seconds load)
  updateTimeSpent();
  setInterval(updateTimeSpent, 1000);

  // Load saved time then auto-save periodically and on page leave
  if (SHEETS_WEB_APP_URL) {
    loadSavedTime();
    setInterval(saveTimeToSheets, 60000); // every 60 s
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveTimeToSheets();
    });
    window.addEventListener("beforeunload", saveTimeToSheets);
  }

  updateMyAge();

  setupImagePopup(".img-trigger");
  setupContentFullscreen(".full-screen-mode");

  // Wire copy buttons on hardcoded static cards
  document.querySelectorAll(".box-wrapper .box").forEach((box) => {
    const btn = box.querySelector(".card-copy-btn");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        copyCard(box, btn);
      });
    }
  });

  setupToolbar();
  setupAddCardModal();
  setupFabStickyShift();
  setupScrollToTop();
  setupMobileFilterToggle();

  if (SHEETS_WEB_APP_URL) loadCardsFromSheets();
});

// ─── TIME SPENT COUNTER (live, ticks every second) ───────────────────────────
function _totalSeconds() {
  return _savedSeconds + Math.floor((Date.now() - _pageLoadTime) / 1000);
}

function updateTimeSpent() {
  let total = _totalSeconds();
  const s = total % 60; total = Math.floor(total / 60);
  const m = total % 60; total = Math.floor(total / 60);
  const h = total % 24; total = Math.floor(total / 24);
  // total is now total days
  const Y = Math.floor(total / 365);
  const rem = total % 365;
  const M = Math.floor(rem / 30);
  const D = rem % 30;

  const parts = [];
  if (Y >= 1) parts.push(`${Y} Year${Y !== 1 ? "s" : ""}`);
  if (M >= 1) parts.push(`${M} Month${M !== 1 ? "s" : ""}`);
  if (D >= 1) parts.push(`${D} Day${D !== 1 ? "s" : ""}`);
  parts.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);

  const el = document.getElementById("time-spent");
  if (el) el.textContent = parts.join(", ");
}

// ─── TIME PERSISTENCE ─────────────────────────────────────────────────────────
async function loadSavedTime() {
  try {
    const res  = await fetch(`${SHEETS_WEB_APP_URL}?action=getTime`);
    const json = await res.json();
    _savedSeconds = parseInt(json.seconds) || 0;
  } catch { /* offline — start from 0 */ }
}

async function saveTimeToSheets() {
  if (!SHEETS_WEB_APP_URL) return;
  try {
    navigator.sendBeacon
      ? navigator.sendBeacon(SHEETS_WEB_APP_URL, JSON.stringify({ action: "saveTime", seconds: _totalSeconds() }))
      : await fetch(SHEETS_WEB_APP_URL, {
          method: "POST",
          body: JSON.stringify({ action: "saveTime", seconds: _totalSeconds() }),
          headers: { "Content-Type": "text/plain;charset=utf-8" },
        });
  } catch { /* ignore */ }
}

// ─── MY AGE ──────────────────────────────────────────────────────────────────
function updateMyAge() {
  const now = new Date();
  let Y = now.getFullYear() - MY_DOB.getFullYear();
  let M = now.getMonth()    - MY_DOB.getMonth();
  let D = now.getDate()     - MY_DOB.getDate();
  if (D < 0) { M--; D += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (M < 0) { M += 12; Y--; }
  const el = document.getElementById("my-age");
  if (el) el.textContent = `${Y} Years, ${M} Months and ${D} Days`;
}

// ─── FAB VISIBILITY ───────────────────────────────────────────────────────────
function setFabVisible(visible) {
  const fab = document.getElementById("fab-add-btn");
  if (fab) fab.style.display = visible ? "flex" : "none";
}

// ─── IMAGE POPUP ──────────────────────────────────────────────────────────────
function setupImagePopup(sel) {
  const modal = document.getElementById("imageModal");
  const mImg = document.getElementById("modalImage");
  const closeBtn = document.querySelector(".modal-close-btn");
  if (!modal || !mImg || !closeBtn) return;

  const esc = (e) => {
    if (e.key === "Escape") close();
  };
  const close = () => {
    modal.style.display = "none";
    document.removeEventListener("keydown", esc);
    setFabVisible(true);
  };

  document.querySelectorAll(sel).forEach((img) => {
    const fresh = img.cloneNode(true);
    img.parentNode.replaceChild(fresh, img);
    fresh.addEventListener("click", (e) => {
      mImg.src = e.currentTarget.src;
      modal.style.display = "flex";
      document.addEventListener("keydown", esc);
      setFabVisible(false);
    });
  });

  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
}


// ─── FULLSCREEN ───────────────────────────────────────────────────────────────
function setupContentFullscreen(sel) {
  const els = document.querySelectorAll(sel);
  if (!els.length) return;
  const exitFS = () =>
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  const onChange = () => {
    const active = document.fullscreenElement || document.webkitFullscreenElement;
    els.forEach((e) => e.classList.toggle("in-fullscreen", e === active));
    setFabVisible(!active);
  };
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);
  els.forEach((el) => {
    el.querySelector(".fullscreen-close-btn")?.addEventListener(
      "click",
      exitFS,
    );
    el.addEventListener("click", (e) => {
      if (e.target.matches(".fullscreen-close-btn")) return;
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
    });
  });
}

// ─── DATE UTILITIES ───────────────────────────────────────────────────────────
const MONTH_MAP = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};
const MONTH_NAMES = [
  "",
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const MONTH_SHORT = [
  "",
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/** Parse date from h3 text — returns Date or null */
function parseDateFromText(txt) {
  const s = txt.replace(/\s+/g, " ").trim();
  // D.M.YY
  let m = s.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{2})\b/);
  if (m) {
    const [d, mo, y] = [+m[1], +m[2], 2000 + +m[3]];
    if (mo >= 1 && mo <= 12) return new Date(y, mo - 1, d);
  }
  // D MonthName[.][,] YY
  m = s.match(/\b(\d{1,2})\s+([A-Za-z]+\.?),?\s*(\d{2})\b/);
  if (m) {
    const mo = MONTH_MAP[m[2].toLowerCase().replace(/\.$/, "")];
    if (mo) return new Date(2000 + +m[3], mo - 1, +m[1]);
  }
  return null;
}

/** Date → "DD.MM.YY" */
function formatDDMMYY(date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getFullYear()).slice(-2)}`;
}

/** ISO date string → Date (handles "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM:SS.sssZ" from Sheets) */
function isoToDate(s) {
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Check if isoDate string matches freeform search query */
function dateMatchesQuery(iso, q) {
  const dt = isoToDate(iso);
  const d = dt.getDate(),
    mo = dt.getMonth() + 1,
    y = dt.getFullYear();
  const yy = String(y).slice(-2);
  const dd = String(d).padStart(2, "0"),
    mm = String(mo).padStart(2, "0");
  return [
    `${dd}.${mm}.${yy}`,
    `${d}.${mo}.${yy}`,
    `${dd}-${mm}-${yy}`,
    `${d}-${mo}-${yy}`,
    `${d}/${mo}/${yy}`,
    `${dd}/${mm}/${yy}`,
    MONTH_NAMES[mo],
    MONTH_SHORT[mo],
    String(y),
    yy,
    `${MONTH_NAMES[mo]} ${d}`,
    `${d} ${MONTH_NAMES[mo]}`,
  ].some((f) => f.includes(q));
}

/** Sanitize string to safe filename part */
function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

// ─── SCROLL TO TOP ────────────────────────────────────────────────────────────
function setupScrollToTop() {
  const btn = document.getElementById("scroll-top-btn");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 300);
  }, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

// ─── MOBILE FILTER TOGGLE ─────────────────────────────────────────────────────
function setupMobileFilterToggle() {
  const toggle  = document.getElementById("toolbar-filter-toggle");
  const filters = document.getElementById("toolbar-filters");
  const search  = document.getElementById("search-input");
  if (!toggle || !filters) return;

  const closeFilters = () => {
    filters.classList.remove("open");
    toggle.classList.remove("active");
    if (search) search.style.display = "";
  };

  toggle.addEventListener("click", () => {
    const open = filters.classList.toggle("open");
    toggle.classList.toggle("active", open);
    if (search) search.style.display = open ? "none" : "";
  });

  // Auto-close after selecting any filter option
  filters.querySelectorAll("select").forEach((sel) => {
    sel.addEventListener("change", closeFilters);
  });
}

// ─── FAB STICKY SHIFT ─────────────────────────────────────────────────────────
/**
 * Watch the sentinel element placed just before the toolbar.
 * When the sentinel scrolls out of view the toolbar has gone sticky
 * → add .toolbar-sticky to the FAB so it drops below the toolbar.
 * When the sentinel is visible again (page is at top) → remove the class.
 */
function setupFabStickyShift() {
  const sentinel   = document.getElementById("toolbar-sentinel");
  const fab        = document.getElementById("fab-add-btn");
  const backToHome = document.querySelector(".back-to-home");
  if (!sentinel || !fab) return;

  const obs = new IntersectionObserver(
    ([entry]) => {
      const sticky = !entry.isIntersecting;
      fab.classList.toggle("toolbar-sticky", sticky);
      if (backToHome) backToHome.classList.toggle("toolbar-sticky", sticky);
    },
    { threshold: 0 }
  );
  obs.observe(sentinel);
}

// ─── TOOLBAR ──────────────────────────────────────────────────────────────────
let _applyFilters = null;

function setupToolbar() {
  const ftTime  = document.getElementById("filter-time");
  const ftSort  = document.getElementById("filter-sort");
  const ftYear  = document.getElementById("filter-year");
  const ftType  = document.getElementById("filter-type");
  const search  = document.getElementById("search-input");
  const countEl = document.getElementById("toolbar-count");
  const noRes   = document.getElementById("no-results-msg");
  const wrapper = document.querySelector(".box-wrapper");
  if (!ftTime || !wrapper) return;

  function stampAll() {
    wrapper.querySelectorAll(".box").forEach((box) => {
      if (box.dataset.date) {
        if (!box.querySelector(".card-date-badge")) {
          const b = document.createElement("div");
          b.className = "card-date-badge";
          b.textContent = formatDDMMYY(isoToDate(box.dataset.date));
          box.appendChild(b);
        }
        return;
      }
      const h3 = box.querySelector("h3");
      if (!h3) return;
      const dt = parseDateFromText(h3.textContent);
      if (dt) {
        box.dataset.date = dt.toISOString().split("T")[0];
        if (!box.querySelector(".card-date-badge")) {
          const b = document.createElement("div");
          b.className = "card-date-badge";
          b.textContent = formatDDMMYY(dt);
          box.appendChild(b);
        }
      }
    });
  }

  function applyFilters() {
    stampAll();

    // ── Sort (independent of time filter) ──────────────────────────────────
    const sortOrd = ftSort ? ftSort.value : "";
    if (sortOrd) {
      [...wrapper.querySelectorAll(".box")]
        .sort((a, b) => {
          const da = a.dataset.date ? isoToDate(a.dataset.date) : new Date(0);
          const db = b.dataset.date ? isoToDate(b.dataset.date) : new Date(0);
          return sortOrd === "new-old" ? db - da : da - db;
        })
        .forEach((b) => wrapper.appendChild(b));
    }

    // ── Time cutoff ────────────────────────────────────────────────────────
    const tv  = ftTime.value;
    const now = new Date();
    let cutoff = null;
    const offsets = { "3m": -3, "6m": -6, "9m": -9 };
    if (offsets[tv] !== undefined) {
      cutoff = new Date(now.getFullYear(), now.getMonth() + offsets[tv], now.getDate());
    } else if (tv === "1y") {
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else if (tv === "2y") {
      cutoff = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    }

    // ── Year + search ──────────────────────────────────────────────────────
    const yv  = ftYear ? (+ftYear.value || null) : null;
    const tv2 = ftType ? (ftType.value || "") : "";
    const sq  = search.value.toLowerCase().trim();

    let vis = 0;
    wrapper.querySelectorAll(".box").forEach((box) => {
      const iso = box.dataset.date || null;
      const dt  = iso ? isoToDate(iso) : null;

      const timeOk = !cutoff || !dt || dt >= cutoff;
      const yearOk = !yv    || !dt || dt.getFullYear() === yv;
      const typeOk = !tv2   || (box.dataset.type || "image") === tv2;

      let srchOk = true;
      if (sq) {
        const h3t  = (box.querySelector("h3")?.textContent || "").toLowerCase();
        const bdy  = (box.querySelector(".card-text-wrapper,.details")?.textContent || "").toLowerCase();
        const alt  = (box.querySelector("img")?.alt || "").toLowerCase();
        const tags = (box.dataset.tags || "").toLowerCase();
        srchOk = h3t.includes(sq) || bdy.includes(sq) || alt.includes(sq) ||
                 tags.includes(sq) || (iso && dateMatchesQuery(iso, sq));
      }

      const show = timeOk && yearOk && typeOk && srchOk;
      box.classList.toggle("filter-hidden", !show);
      if (show) vis++;
    });

    if (countEl) countEl.textContent = `${vis} card${vis !== 1 ? "s" : ""}`;
    if (noRes)   noRes.style.display  = vis === 0 ? "block" : "none";

    // Force the flex container to recalculate its height immediately after
    // hiding cards, then clamp the scroll position to the new content height.
    void wrapper.offsetHeight; // triggers synchronous reflow
    requestAnimationFrame(() => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (window.scrollY > maxScroll) {
        window.scrollTo({ top: maxScroll, behavior: "smooth" });
      }
    });
  }

  _applyFilters = applyFilters;
  [ftTime, ftSort, ftYear, ftType].filter(Boolean).forEach((el) =>
    el.addEventListener("change", applyFilters)
  );
  search.addEventListener("input", applyFilters);
  applyFilters();
}

// ─── ADD CARD MODAL ───────────────────────────────────────────────────────────
let _selectedFile = null; // the File object picked by the user

function setupAddCardModal() {
  const fab = document.getElementById("fab-add-btn");
  const modal = document.getElementById("addCardModal");
  const cancel = document.getElementById("addCardCancel");
  const form = document.getElementById("addCardForm");
  if (!fab || !modal || !form) return;

  const typeBtns = modal.querySelectorAll(".type-btn");
  const imageFields = document.getElementById("fc-image-fields");
  const textFields = document.getElementById("fc-text-fields");
  const statusEl = document.getElementById("sync-status");
  let selectedType = "image";
  let _editBox = null; // the .box element being edited (null = add mode)

  const titleEl  = document.getElementById("addCardTitle");
  const submitEl = document.getElementById("addCardSubmit");

  // ── Open / Close ──
  const open = () => {
    modal.classList.add("open");
    setFabVisible(false);
  };
  const close = () => {
    _editBox = null;
    if (titleEl)  titleEl.textContent  = "Add New Card";
    if (submitEl) submitEl.textContent = "Add Card";
    // Reset current-src displays
    const imgWrap = document.getElementById("fc-img-current-wrap");
    const imgPL   = document.getElementById("fc-img-pick-label");
    if (imgWrap) imgWrap.style.display = "none";
    if (imgPL)   imgPL.textContent  = "Pick Image *";
    modal.classList.remove("open");
    form.reset();
    _selectedFile = null;
    resetPreviews();
    statusEl.textContent = "";
    statusEl.className = "sync-status";
    setFabVisible(true);
  };
  fab.addEventListener("click", open);
  cancel.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) close();
  });

  // ── Edit mode: pre-fill modal with existing card data ──────────────────────
  window.openEditModal = (box) => {
    _editBox = box;
    if (titleEl)  titleEl.textContent  = "Edit Card";
    if (submitEl) submitEl.textContent = "Update Card";

    // Set type
    const t = box.dataset.type || "image";
    typeBtns.forEach((b) => b.classList.toggle("active", b.dataset.type === t));
    selectedType = t;
    imageFields.style.display = t === "image" ? "" : "none";
    textFields.style.display  = t === "text"  ? "" : "none";

    // Pre-fill date & title
    document.getElementById("fc-date").value  = box.dataset.date  || "";
    document.getElementById("fc-title").value = box.querySelector("h3")?.textContent || "";

    // Show current mediaSrc for image/video
    const src = box.dataset.mediaSrc || "";
    if (t === "image") {
      const wrap = document.getElementById("fc-img-current-wrap");
      const disp = document.getElementById("fc-img-current-src");
      const lbl  = document.getElementById("fc-img-pick-label");
      if (wrap) wrap.style.display = "block";
      if (disp) disp.textContent   = src || "(none)";
      if (lbl)  lbl.textContent    = "Replace Image (optional)";
      document.getElementById("fc-img-alt").value = box.dataset.mediaAlt || "";
    } else if (t === "text") {
      const ta = document.getElementById("fc-body-text");
      if (ta) ta.value = box.dataset.bodyText || box.querySelector(".card-text-wrapper")?.innerHTML || "";
    }

    const tagsEl = document.getElementById("fc-tags");
    if (tagsEl) tagsEl.value = box.dataset.tags || "";

    open();
  };

  function resetPreviews() {
    const prev   = document.getElementById("fc-img-preview");
    const name   = document.getElementById("fc-img-name");
    const info   = document.getElementById("fc-img-save-info");
    const btnTxt = document.getElementById("fc-img-btn-text");
    if (prev)   prev.style.display = "none";
    if (name)   name.textContent   = "";
    if (info)   info.style.display = "none";
    if (btnTxt) btnTxt.textContent = "Choose image file…";
    const imgThumb = document.getElementById("fc-img-thumb");
    if (imgThumb) imgThumb.src = "";
  }

  // ── Type selection ──
  typeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedType = btn.dataset.type;
      imageFields.style.display = selectedType === "image" ? "" : "none";
      textFields.style.display  = selectedType === "text"  ? "" : "none";
      _selectedFile = null;
      resetPreviews();
    });
  });

  // ── Image file picker ──
  document
    .getElementById("fc-img-file")
    .addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;
      _selectedFile = file;
      const thumb = document.getElementById("fc-img-thumb");
      const preview = document.getElementById("fc-img-preview");
      const nameEl = document.getElementById("fc-img-name");
      const infoEl = document.getElementById("fc-img-save-info");
      const btnTxt = document.getElementById("fc-img-btn-text");
      const objUrl = URL.createObjectURL(file);
      thumb.src = objUrl;
      preview.style.display = "block";
      nameEl.textContent = file.name;
      btnTxt.textContent = "✓ Image selected";
      // Show suggested save path (filled in on submit after slug is known)
      infoEl.style.display = "block";
      infoEl.textContent = `Will be saved to: ${IMG_DIR}[title-date]${getExt(file.name)}`;
    });

  // ── Submit (add or edit) ───────────────────────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const isEdit  = !!_editBox;
    const dateVal = document.getElementById("fc-date").value;
    const titleVal = document.getElementById("fc-title").value.trim();
    if (!dateVal || !titleVal) return;

    const dateObj    = isoToDate(dateVal);
    const displayDate = formatDDMMYY(dateObj);
    const slug       = toSlug(titleVal);
    const dateSlug   = displayDate.replace(/\./g, "-");

    let mediaSrc = isEdit ? (_editBox.dataset.mediaSrc || "") : "";
    let mediaAlt = "";
    let bodyText = "";

    if (selectedType === "image") {
      const file = document.getElementById("fc-img-file").files[0];
      mediaAlt = document.getElementById("fc-img-alt").value.trim() || titleVal;
      if (!file && !mediaSrc) {
        statusEl.textContent = "✗ Please pick an image file.";
        statusEl.className = "sync-status error";
        return;
      }
      if (file) {
        const localPath = IMG_DIR + `${slug}-${dateSlug}${getExt(file.name)}`;
        document.getElementById("fc-img-save-info").textContent = IS_LOCAL
          ? `Saving to: ${localPath}` : "Uploading to Google Drive…";
        const uploaded = await saveFileToPath(file, localPath, statusEl);
        if (uploaded === null) return; // upload failed — error already shown
        mediaSrc = uploaded || localPath;
      }
    } else {
      bodyText = document.getElementById("fc-body-text").value.trim();
    }

    const tags = (document.getElementById("fc-tags")?.value || "").trim();
    const cardData = { type: selectedType, date: dateVal, displayDate, title: titleVal, mediaSrc, mediaAlt, bodyText, tags };

    if (isEdit) {
      // ── Edit: replace old card in DOM, update Sheets ──
      const sheetId = _editBox.dataset.sheetId;
      const newBox  = createCardElement(cardData);
      // Show image immediately via blob URL (CDN/server propagation can lag)
      if (selectedType === "image" && _selectedFile) {
        const imgEl = newBox.querySelector("img.img-trigger");
        if (imgEl) imgEl.src = URL.createObjectURL(_selectedFile);
      }
      if (sheetId) newBox.dataset.sheetId = sheetId;
      _editBox.replaceWith(newBox);
      if (selectedType === "image") setupImagePopup(".img-trigger");
      if (selectedType === "text")  setupContentFullscreen(".full-screen-mode");
      if (_applyFilters) _applyFilters();
      await updateToSheets(sheetId, cardData, statusEl);
    } else {
      // ── Add: append new card, save to Sheets ──
      const newBox = createCardElement(cardData);
      // Show image immediately via blob URL (CDN/server propagation can lag)
      if (selectedType === "image" && _selectedFile) {
        const imgEl = newBox.querySelector("img.img-trigger");
        if (imgEl) imgEl.src = URL.createObjectURL(_selectedFile);
      }
      document.querySelector(".box-wrapper").appendChild(newBox);
      if (selectedType === "image") setupImagePopup(".img-trigger");
      if (selectedType === "text")  setupContentFullscreen(".full-screen-mode");
      if (_applyFilters) _applyFilters();
      await saveToSheets(cardData, statusEl);
    }

    setTimeout(close, 2200);
  });
}

/** Get file extension including dot, lowercased. e.g. ".webp" */
function getExt(filename) {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

/**
 * Save a file and return its final public URL.
 * • On localhost  → POST to node server → saved to img/ or media/Video/ → returns relative path
 * • On GitHub Pages / any other host → POST base64 to Apps Script → saved to Google Drive → returns Drive URL
 */
async function saveFileToPath(file, relativePath, statusEl) {
  statusEl.textContent = "Uploading file…";
  statusEl.className = "sync-status";

  if (IS_LOCAL) {
    return await _uploadToLocalServer(file, relativePath, statusEl);
  } else {
    return await _uploadToGitHub(file, relativePath, statusEl);
  }
}

/**
 * Commit a file directly to the GitHub repo via the Contents API.
 * Token is read from localStorage (never hard-coded) — set once via the
 * token prompt that appears automatically on first upload attempt.
 * Returns the relative path on success (works as-is on GitHub Pages), null on failure.
 */
async function _uploadToGitHub(file, relativePath, statusEl) {
  // Read token from localStorage — never from source code
  let token = localStorage.getItem("baby_gh_token") || "";

  if (!token) {
    token = (prompt(
      "Enter your GitHub Personal Access Token (PAT).\n" +
      "It will be saved in this browser only — never in the source code.\n\n" +
      "Create one at: GitHub → Settings → Developer settings → Fine-grained tokens\n" +
      "Permission needed: Contents → Read and write"
    ) || "").trim();
    if (!token) {
      statusEl.textContent = "✗ No GitHub token — upload cancelled.";
      statusEl.className = "sync-status error";
      return null;
    }
    localStorage.setItem("baby_gh_token", token);
  }

  if (!GITHUB_REPO) {
    statusEl.textContent = "✗ Set GITHUB_REPO in memory-cards.js";
    statusEl.className = "sync-status error";
    return null;
  }

  statusEl.textContent = "Uploading to GitHub…";
  statusEl.className = "sync-status";

  try {
    // Read file as base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });

    const apiUrl  = `https://api.github.com/repos/${GITHUB_REPO}/contents/${relativePath}`;
    const headers = {
      "Authorization": `token ${token}`,
      "Accept":        "application/vnd.github+json",
      "Content-Type":  "application/json",
    };

    // If the file already exists we need its SHA to overwrite it
    let sha;
    const getRes = await fetch(apiUrl, { headers });
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const body = {
      message: `Add media: ${file.name}`,
      content: base64,
      branch:  GITHUB_BRANCH,
    };
    if (sha) body.sha = sha; // required for updates

    const putRes = await fetch(apiUrl, {
      method:  "PUT",
      headers,
      body:    JSON.stringify(body),
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      throw new Error(err.message || `HTTP ${putRes.status}`);
    }

    statusEl.textContent = "✓ Uploaded to GitHub";
    statusEl.className   = "sync-status success";
    return relativePath; // relative path works directly on GitHub Pages
  } catch (err) {
    console.warn("GitHub upload failed:", err);
    statusEl.textContent = "✗ GitHub upload failed: " + err.message;
    statusEl.className   = "sync-status error";
    return null;
  }
}

/** Upload to node server.js — works only on localhost */
async function _uploadToLocalServer(file, relativePath, statusEl) {
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("savePath", relativePath);
  try {
    const res = await fetch(LOCAL_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    statusEl.textContent = `✓ Saved to ${relativePath}`;
    statusEl.className = "sync-status success";
    return relativePath; // relative path works because server also serves static files
  } catch (err) {
    console.warn("Local upload failed:", err.message);
    statusEl.textContent = "✗ Local server unreachable. Run: node server.js";
    statusEl.className = "sync-status error";
    return relativePath; // optimistic: path is correct even if server missed it
  }
}

/** POST cardData to Google Sheets web app */
async function saveToSheets(cardData, statusEl) {
  if (!SHEETS_WEB_APP_URL) return;
  try {
    statusEl.textContent = "Saving to Google Sheets…";
    statusEl.className = "sync-status";
    const res = await fetch(SHEETS_WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(cardData),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    const json = await res.json();
    if (json.status === "success") {
      statusEl.textContent = "✓ Card saved to Google Sheets!";
      statusEl.className = "sync-status success";
    } else {
      statusEl.textContent = "✗ Sheet error: " + (json.message || "");
      statusEl.className = "sync-status error";
    }
  } catch {
    statusEl.textContent = "✗ Could not reach Google Sheets.";
    statusEl.className = "sync-status error";
  }
}

/** PUT updated card data to Google Sheets */
async function updateToSheets(id, cardData, statusEl) {
  if (!SHEETS_WEB_APP_URL || !id) return;
  try {
    statusEl.textContent = "Updating Google Sheets…";
    statusEl.className = "sync-status";
    const res = await fetch(SHEETS_WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({ action: "updateCard", id, ...cardData }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    const json = await res.json();
    if (json.status === "success") {
      statusEl.textContent = "✓ Card updated!";
      statusEl.className = "sync-status success";
    } else {
      statusEl.textContent = "✗ Update error: " + (json.error || "");
      statusEl.className = "sync-status error";
    }
  } catch {
    statusEl.textContent = "✗ Could not reach Google Sheets.";
    statusEl.className = "sync-status error";
  }
}

// ─── CREATE CARD ELEMENT ──────────────────────────────────────────────────────
function createCardElement(data) {
  const box = document.createElement("div");
  box.className = "box";

  // Normalize date to YYYY-MM-DD (Google Sheets may return ISO datetime strings)
  const dateStr = data.date ? String(data.date).slice(0, 10) : "";
  box.dataset.date     = dateStr;
  box.dataset.type     = data.type     || "image";
  box.dataset.mediaSrc = data.mediaSrc || "";
  box.dataset.mediaAlt = data.mediaAlt || "";
  box.dataset.bodyText = data.bodyText || "";
  box.dataset.tags     = data.tags     || "";

  const h3 = document.createElement("h3");
  h3.textContent = data.title || "";
  box.appendChild(h3);

  const hr = document.createElement("hr");

  if (data.type === "image" && data.mediaSrc) {
    box.appendChild(hr);
    const img = document.createElement("img");
    img.src = data.mediaSrc;
    img.alt = data.mediaAlt || data.title;
    img.className = "img-trigger";
    box.appendChild(img);
  } else if (data.type === "text") {
    box.classList.add("full-screen-mode");
    const closeBtn = document.createElement("button");
    closeBtn.className = "fullscreen-close-btn";
    closeBtn.textContent = "×";
    box.appendChild(closeBtn);
    box.appendChild(hr);
    const p = document.createElement("p");
    p.className = "card-text-wrapper";
    p.innerHTML = data.bodyText || "";
    box.appendChild(p);
  }

  // Date badge
  const badge = document.createElement("div");
  badge.className = "card-date-badge";
  badge.textContent = data.displayDate || (dateStr ? formatDDMMYY(isoToDate(dateStr)) : "");
  box.appendChild(badge);

  // Edit button (visible on hover)
  const editBtn = document.createElement("button");
  editBtn.className = "card-edit-btn";
  editBtn.title = "Edit card";
  editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (window.openEditModal) window.openEditModal(box);
  });
  box.appendChild(editBtn);

  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.className = "card-copy-btn";
  copyBtn.title = "Copy card";
  copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
  copyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    copyCard(box, copyBtn);
  });
  box.appendChild(copyBtn);

  return box;
}

/** Copy card content to clipboard.
 * - text card  → copies title + body text as plain text
 * - image card → copies image to clipboard (ClipboardItem)
 */
/**
 * Load an image from `src`, draw it on a canvas, overlay the title as a
 * semi-transparent bar at the bottom, and return a PNG Blob.
 */
function _compositeImageWithTitle(src, title) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // needed for canvas.toBlob on remote URLs
    img.onload = () => {
      const BAR = title ? Math.max(36, Math.round(img.naturalHeight * 0.07)) : 0;
      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight + BAR;
      const ctx = canvas.getContext("2d");

      // Draw original image
      ctx.drawImage(img, 0, 0);

      if (BAR && title) {
        // Dark gradient bar
        const grad = ctx.createLinearGradient(0, img.naturalHeight - BAR * 0.4, 0, canvas.height);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.72)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, img.naturalHeight - BAR * 0.4, canvas.width, BAR * 1.4);

        // Title text
        const fontSize = Math.round(BAR * 0.52);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Truncate if too wide
        let label = title;
        const maxW = canvas.width - fontSize * 2;
        while (ctx.measureText(label).width > maxW && label.length > 4) {
          label = label.slice(0, -4) + "…";
        }
        ctx.fillText(label, canvas.width / 2, img.naturalHeight + BAR / 2);
      }

      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("canvas.toBlob failed")), "image/png");
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });
}

async function copyCard(box, btn) {
  const type  = box.dataset.type || "image";
  const title = box.querySelector("h3")?.textContent || "";

  try {
    if (type === "text" || !type) {
      const body = box.dataset.bodyText
        || box.querySelector(".card-text-wrapper")?.innerText
        || box.querySelector(".details")?.innerText
        || "";
      const combined = title ? `${title}\n\n${body}` : body;
      await navigator.clipboard.writeText(combined);
    } else if (type === "image") {
      // Use the already-loaded img element if available (avoids a second fetch)
      const imgEl = box.querySelector("img.img-trigger");
      const src   = imgEl?.src || box.dataset.mediaSrc || "";
      if (!src) return;

      const finalBlob = await _compositeImageWithTitle(src, title);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": finalBlob }),
      ]);
    }

    btn.classList.add("copied");
    setTimeout(() => btn.classList.remove("copied"), 1800);
  } catch (err) {
    console.warn("Copy failed:", err);
  }
}

// ─── LOAD CARDS FROM GOOGLE SHEETS ───────────────────────────────────────────
async function loadCardsFromSheets() {
  if (!SHEETS_WEB_APP_URL) return;
  const wrapper = document.querySelector(".box-wrapper");
  const loader  = document.getElementById("cards-loader");
  const errEl   = document.getElementById("cards-load-error");
  if (loader) loader.style.display = "block";

  try {
    const res  = await fetch(SHEETS_WEB_APP_URL);
    const json = await res.json();
    if (loader) loader.style.display = "none";

    if (!json.cards?.length) return;

    json.cards.forEach((card) => {
      if (card.id && wrapper.querySelector(`[data-sheet-id="${card.id}"]`))
        return;
      const box = createCardElement(card);
      if (card.id) box.dataset.sheetId = card.id;
      wrapper.appendChild(box);
    });

    setupImagePopup(".img-trigger");
    setupContentFullscreen(".full-screen-mode");
    if (_applyFilters) _applyFilters();
  } catch (err) {
    if (loader) loader.style.display = "none";
    if (errEl)  errEl.style.display  = "block";
    console.warn("Could not load cards from Sheets:", err);
  }
}
