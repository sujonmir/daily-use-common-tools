/**
 * baby.js — Parenthood page scripts
 * Features: age counter, image/video popup, fullscreen, filter/search toolbar,
 *           add-card modal (file pickers + date picker), Google Sheets sync.
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SHEETS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwDoghIcHErRl_V6Z5oz3gumjAAzzhjmLediOe_qJseLUDhjFVPWi4mGsxV_pqZinbC/exec";

// Local server upload endpoint (only used on localhost)
const LOCAL_UPLOAD_URL = "http://localhost:3000/upload";

// True when running via node server.js locally; false on GitHub Pages / any other host
const IS_LOCAL =
  location.hostname === "localhost" || location.hostname === "127.0.0.1";

// Relative folder paths used in both local and GitHub upload modes
const IMG_DIR   = "img/";
const VIDEO_DIR = "media/Video/";

// ── GitHub upload config (used on GitHub Pages instead of Google Drive) ───────
// Fine-grained PAT: Settings → Developer settings → Fine-grained tokens
// Required permission: Contents → Read and write  (for this repo only)
const GITHUB_TOKEN  = "";          // paste your PAT here (never commit the actual token)
const GITHUB_REPO   = "sujonmir/daily-use-common-tools";          // e.g. "sujonmhk786/daily-use-common-tools"
const GITHUB_BRANCH = "main";

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  createAgeCounter({
    startDate: "2025-03-29T00:00:00",
    endDate: "2025-12-28T00:00:00",
    weekElementId: "p-week",
    dayElementId: "p-day",
  });

  updateDaughterAge();
  setInterval(updateDaughterAge, 60000);

  setupImagePopup(".img-trigger");
  setupVideoPopup(".video-trigger");
  setupContentFullscreen(".full-screen-mode");

  setupToolbar();
  setupAddCardModal();
  setupFabStickyShift();
  setupScrollToTop();
  setupMobileFilterToggle();

  if (SHEETS_WEB_APP_URL) loadCardsFromSheets();
});

// ─── AGE COUNTER ──────────────────────────────────────────────────────────────
function createAgeCounter(config) {
  const weekEl = document.getElementById(config.weekElementId);
  const dayEl = document.getElementById(config.dayElementId);
  const ageEl = document.querySelector(".age b");
  if (!weekEl || !dayEl) return;

  if (ageEl) ageEl.innerText = "Pregnancy Duration :";
  const diff = new Date(config.endDate) - new Date(config.startDate);
  if (diff < 0) {
    weekEl.textContent = dayEl.textContent = "0";
    return;
  }
  const total = Math.floor(diff / 86400000);
  weekEl.textContent = Math.floor(total / 7);
  dayEl.textContent = total % 7;
  document.getElementById("ageInDays").innerText = `${total} Days`;
  document.getElementById("p-month").innerText =
    `${Math.floor(total / 30)} Months ${total % 30} Days`;
}

// ─── DAUGHTER AGE ─────────────────────────────────────────────────────────────
function updateDaughterAge() {
  const birth = new Date(2025, 11, 28, 17, 47, 0);
  const now = new Date();
  let [Y, M, D, h, m] = [
    now.getFullYear() - birth.getFullYear(),
    now.getMonth() - birth.getMonth(),
    now.getDate() - birth.getDate(),
    now.getHours() - birth.getHours(),
    now.getMinutes() - birth.getMinutes(),
  ];
  if (m < 0) {
    m += 60;
    h--;
  }
  if (h < 0) {
    h += 24;
    D--;
  }
  if (D < 0) {
    M--;
    D += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (M < 0) {
    M += 12;
    Y--;
  }
  const el = document.getElementById("daughter-age");
  if (el)
    el.textContent =
      `${Y} Years, ${M} Months and ${D} Days ` +
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} hours`;
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

// ─── VIDEO POPUP ──────────────────────────────────────────────────────────────
function setupVideoPopup(sel) {
  const modal = document.getElementById("videoModal");
  if (!modal) return;
  const mVid = document.getElementById("modalVideo");
  const closeBtn = modal.querySelector(".modal-close-btn");
  if (!mVid || !closeBtn) return;

  const esc = (e) => {
    if (e.key === "Escape") close();
  };
  const close = () => {
    modal.style.display = "none";
    mVid.pause();
    document.removeEventListener("keydown", esc);
    setFabVisible(true);
  };

  document.querySelectorAll(sel).forEach((vid) => {
    const fresh = vid.cloneNode(true);
    vid.parentNode.replaceChild(fresh, vid);
    fresh.addEventListener("click", (e) => {
      e.preventDefault();
      mVid.src = e.currentTarget.src;
      modal.style.display = "flex";
      mVid.play();
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
  const sentinel = document.getElementById("toolbar-sentinel");
  const fab      = document.getElementById("fab-add-btn");
  if (!sentinel || !fab) return;

  const obs = new IntersectionObserver(
    ([entry]) => fab.classList.toggle("toolbar-sticky", !entry.isIntersecting),
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
    const yv = ftYear ? (+ftYear.value || null) : null;
    const sq = search.value.toLowerCase().trim();

    let vis = 0;
    wrapper.querySelectorAll(".box").forEach((box) => {
      const iso = box.dataset.date || null;
      const dt  = iso ? isoToDate(iso) : null;

      const timeOk = !cutoff || !dt || dt >= cutoff;
      const yearOk = !yv    || !dt || dt.getFullYear() === yv;

      let srchOk = true;
      if (sq) {
        const h3t = (box.querySelector("h3")?.textContent || "").toLowerCase();
        const bdy = (box.querySelector(".card-text-wrapper,.details")?.textContent || "").toLowerCase();
        const alt = (box.querySelector("img")?.alt || "").toLowerCase();
        srchOk = h3t.includes(sq) || bdy.includes(sq) || alt.includes(sq) ||
                 (iso && dateMatchesQuery(iso, sq));
      }

      const show = timeOk && yearOk && srchOk;
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
  [ftTime, ftSort, ftYear].filter(Boolean).forEach((el) =>
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
  const videoFields = document.getElementById("fc-video-fields");
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
    const vidWrap = document.getElementById("fc-video-current-wrap");
    const imgPL   = document.getElementById("fc-img-pick-label");
    const vidPL   = document.getElementById("fc-video-pick-label");
    if (imgWrap) imgWrap.style.display = "none";
    if (vidWrap) vidWrap.style.display = "none";
    if (imgPL)   imgPL.textContent  = "Pick Image *";
    if (vidPL)   vidPL.textContent  = "Pick Video *";
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
    videoFields.style.display = t === "video" ? "" : "none";
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
    } else if (t === "video") {
      const wrap = document.getElementById("fc-video-current-wrap");
      const disp = document.getElementById("fc-video-current-src");
      const lbl  = document.getElementById("fc-video-pick-label");
      if (wrap) wrap.style.display = "block";
      if (disp) disp.textContent   = src || "(none)";
      if (lbl)  lbl.textContent    = "Replace Video (optional)";
      document.getElementById("fc-video-alt").value = box.dataset.mediaAlt || "";
    } else if (t === "text") {
      const ta = document.getElementById("fc-body-text");
      if (ta) ta.value = box.dataset.bodyText || box.querySelector(".card-text-wrapper")?.innerHTML || "";
    }

    open();
  };

  function resetPreviews() {
    ["img", "video"].forEach((t) => {
      const prev = document.getElementById(`fc-${t}-preview`);
      const name = document.getElementById(`fc-${t}-name`);
      const info = document.getElementById(`fc-${t}-save-info`);
      const btnTxt = document.getElementById(`fc-${t}-btn-text`);
      if (prev) prev.style.display = "none";
      if (name) name.textContent = "";
      if (info) info.style.display = "none";
      if (btnTxt)
        btnTxt.textContent =
          t === "img" ? "Choose image file…" : "Choose video file…";
    });
    const imgThumb = document.getElementById("fc-img-thumb");
    const vidThumb = document.getElementById("fc-video-thumb");
    if (imgThumb) imgThumb.src = "";
    if (vidThumb) {
      vidThumb.src = "";
      vidThumb.load();
    }
  }

  // ── Type selection ──
  typeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      typeBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      selectedType = btn.dataset.type;
      imageFields.style.display = selectedType === "image" ? "" : "none";
      videoFields.style.display = selectedType === "video" ? "" : "none";
      textFields.style.display = selectedType === "text" ? "" : "none";
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

  // ── Video file picker ──
  document
    .getElementById("fc-video-file")
    .addEventListener("change", function () {
      const file = this.files[0];
      if (!file) return;
      _selectedFile = file;
      const vidEl = document.getElementById("fc-video-thumb");
      const preview = document.getElementById("fc-video-preview");
      const nameEl = document.getElementById("fc-video-name");
      const infoEl = document.getElementById("fc-video-save-info");
      const btnTxt = document.getElementById("fc-video-btn-text");
      vidEl.src = URL.createObjectURL(file);
      vidEl.load();
      preview.style.display = "block";
      nameEl.textContent = file.name;
      btnTxt.textContent = "✓ Video selected";
      infoEl.style.display = "block";
      infoEl.textContent = `Will be saved to: ${VIDEO_DIR}[title-date]${getExt(file.name)}`;
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
    } else if (selectedType === "video") {
      const file = document.getElementById("fc-video-file").files[0];
      mediaAlt = document.getElementById("fc-video-alt").value.trim() || titleVal;
      if (!file && !mediaSrc) {
        statusEl.textContent = "✗ Please pick a video file.";
        statusEl.className = "sync-status error";
        return;
      }
      if (file) {
        const localPath = VIDEO_DIR + `${slug}-${dateSlug}${getExt(file.name)}`;
        document.getElementById("fc-video-save-info").textContent = IS_LOCAL
          ? `Saving to: ${localPath}` : "Uploading to Google Drive…";
        const uploaded = await saveFileToPath(file, localPath, statusEl);
        if (uploaded === null) return; // upload failed — error already shown
        mediaSrc = uploaded || localPath;
      }
    } else {
      bodyText = document.getElementById("fc-body-text").value.trim();
    }

    const cardData = { type: selectedType, date: dateVal, displayDate, title: titleVal, mediaSrc, mediaAlt, bodyText };

    if (isEdit) {
      // ── Edit: replace old card in DOM, update Sheets ──
      const sheetId = _editBox.dataset.sheetId;
      const newBox  = createCardElement(cardData);
      if (sheetId) newBox.dataset.sheetId = sheetId;
      _editBox.replaceWith(newBox);
      if (selectedType === "image") setupImagePopup(".img-trigger");
      if (selectedType === "video") setupVideoPopup(".video-trigger");
      if (selectedType === "text")  setupContentFullscreen(".full-screen-mode");
      if (_applyFilters) _applyFilters();
      await updateToSheets(sheetId, cardData, statusEl);
    } else {
      // ── Add: append new card, save to Sheets ──
      const newBox = createCardElement(cardData);
      document.querySelector(".box-wrapper").appendChild(newBox);
      if (selectedType === "image") setupImagePopup(".img-trigger");
      if (selectedType === "video") setupVideoPopup(".video-trigger");
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
    statusEl.textContent = "✗ Set GITHUB_REPO in baby.js";
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

/**
 * Upload to Google Drive via Apps Script.
 * Reads the file as base64, POSTs to the web app → returns a public Drive URL.
 */
async function _uploadToDrive(file, relativePath, statusEl) {
  statusEl.textContent = "Uploading to Google Drive…";
  statusEl.className = "sync-status";

  try {
    // Convert file to base64 (inside try so any FileReader error is caught)
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    });

    const filename = relativePath.split("/").pop();
    const payload = {
      action: "uploadFile",
      base64,
      filename,
      mimeType: file.type || "application/octet-stream",
      fileType: (file.type || "").startsWith("video/") ? "video" : "image",
    };

    const res = await fetch(SHEETS_WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Drive upload failed");
    statusEl.textContent = "✓ Uploaded to Google Drive";
    statusEl.className = "sync-status success";
    return json.url; // public Drive URL
  } catch (err) {
    console.warn("Drive upload failed:", err);
    statusEl.textContent = "✗ Upload failed: " + err.message;
    statusEl.className = "sync-status error";
    return null; // signals failure to caller
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
  } else if (data.type === "video" && data.mediaSrc) {
    box.appendChild(hr);
    const vid = document.createElement("video");
    vid.src = data.mediaSrc;
    vid.className = "video video-trigger";
    vid.controls = true;
    vid.setAttribute("controlsList", "nofullscreen");
    box.appendChild(vid);
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
  editBtn.textContent = "✏ Edit";
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (window.openEditModal) window.openEditModal(box);
  });
  box.appendChild(editBtn);

  return box;
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
    setupVideoPopup(".video-trigger");
    setupContentFullscreen(".full-screen-mode");
    if (_applyFilters) _applyFilters();
  } catch (err) {
    if (loader) loader.style.display = "none";
    if (errEl)  errEl.style.display  = "block";
    console.warn("Could not load cards from Sheets:", err);
  }
}
