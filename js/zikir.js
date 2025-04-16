/**
 * Zikr Counter - Final Version (Focus: Stability, Fast Sound, Export/Import)
 * Uses IndexedDB via IDB library for storage.
 * Features: Selection, Counting, Styling, Ripples, Fast preloaded Beep Sound, Export/Import.
 * Deselection feature REMOVED.
 */

// --- Globals & Constants ---
let z1, z2, z3, z4, z5;
let totalCount, msg;
let subhanallahEl,
  alhamdulillahEl,
  la_ilaha_illallahEl,
  astaghfirullahEl,
  allahuEl;
let audio;
const ringTone = "media/audio/beep-07a.wav"; // Make sure this path is correct
const DB_NAME = "ZikrCounterDB_v1";
const STORE_NAME = "counts";
const DB_VERSION = 1;
const COUNT_KEY = "currentCounts";
let dbPromise;
let zikrCounts = {
  subhanallah: 0,
  alhamdulillah: 0,
  la_ilaha_illallah: 0,
  astaghfirullah: 0,
  allahu: 0,
  total: 0,
};

// --- DOM Element Assignment ---
let exportButton, importFile; // <-- Add export/import elements
function assignElements() {
  z1 = document.getElementById("z1");
  z2 = document.getElementById("z2");
  z3 = document.getElementById("z3");
  z4 = document.getElementById("z4");
  z5 = document.getElementById("z5");
  totalCount = document.querySelector("#totalCount");
  msg = document.getElementById("errorMsg");
  subhanallahEl = document.getElementById("subhanallah");
  alhamdulillahEl = document.getElementById("alhamdulillah");
  la_ilaha_illallahEl = document.getElementById("la_ilaha_illallah");
  astaghfirullahEl = document.getElementById("astaghfirullah");
  allahuEl = document.getElementById("allahu");
  // --- Assign Export/Import elements ---
  exportButton = document.getElementById("exportButton");
  importFile = document.getElementById("importFile");
  // --- ---

  if (
    !totalCount ||
    !msg ||
    !z1 ||
    !z2 ||
    !z3 ||
    !z4 ||
    !z5 ||
    !exportButton ||
    !importFile
  ) {
    // <-- Check them
    console.error("Essential elements missing! Check IDs in HTML and JS.");
    if (msg)
      msg.innerHTML = `<span style="color: red;">Error: Could not find all necessary page elements.</span>`;
    throw new Error("Missing essential elements");
  }
}

// --- IndexedDB Functions ---
function initDBWithIdb() {
  if (!window.indexedDB) {
    console.error("IndexedDB not supported.");
    return Promise.reject("IndexedDB not supported");
  }
  if (typeof idb === "undefined") {
    console.error("IDB library not loaded.");
    return Promise.reject("IDB library not loaded");
  }

  dbPromise = idb.openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      console.log("Upgrading DB...");
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log(`Object store "${STORE_NAME}" created.`);
      }
    },
    blocked() {
      console.warn("IndexedDB access blocked. Close other tabs using this DB?");
    },
    blocking() {
      console.warn("IndexedDB access is blocking other connections.");
    },
    terminated() {
      console.error("IndexedDB connection terminated unexpectedly.");
    },
  });
  dbPromise
    .then(() => console.log("DB Initialized"))
    .catch((e) => console.error("DB Init failed:", e));
  return dbPromise;
}

async function loadCountsFromDBWithIdb() {
  if (!dbPromise) {
    console.warn("DB not initialized yet for loading.");
    return zikrCounts; // Return default if DB isn't ready
  }
  try {
    console.log("Attempting to load counts from DB...");
    const db = await dbPromise;
    const storedData = await db.get(STORE_NAME, COUNT_KEY);
    if (storedData) {
      console.log("Counts loaded from DB:", storedData);
      // Basic validation of loaded data
      const expectedKeys = [
        "subhanallah",
        "alhamdulillah",
        "la_ilaha_illallah",
        "astaghfirullah",
        "allahu",
        "total",
      ];
      let isValid = true;
      for (const key of expectedKeys) {
        if (typeof storedData[key] !== "number") {
          console.warn(
            `Loaded data missing or has invalid type for key: ${key}`
          );
          isValid = false;
          break;
        }
      }
      if (isValid) {
        zikrCounts = { ...zikrCounts, ...storedData }; // Merge carefully
      } else {
        console.warn("Loaded data structure invalid, using defaults.");
        await saveCountsToDBWithIdb(); // Optionally save defaults back if data was corrupt
      }
    } else {
      console.log("No counts found in DB, using defaults.");
      // Optionally save defaults if nothing was there
      await saveCountsToDBWithIdb();
    }
    return zikrCounts;
  } catch (error) {
    console.error("Failed to load counts from DB:", error);
    // Fallback to default counts in case of error
    return zikrCounts;
  }
}

async function saveCountsToDBWithIdb() {
  if (!dbPromise) {
    console.warn("DB not initialized yet for saving.");
    return;
  }
  try {
    // console.log("Attempting to save counts to DB:", zikrCounts); // Debug log
    const db = await dbPromise;
    await db.put(STORE_NAME, zikrCounts, COUNT_KEY);
    // console.log("Counts saved successfully."); // Debug log
  } catch (error) {
    console.error("Failed to save counts to DB:", error);
    if (msg)
      msg.innerHTML = `<span style="color: red;">Error saving progress.</span>`;
  }
}

// --- Core Logic ---
function updateDisplay() {
  const els = {
    subhanallah: subhanallahEl,
    alhamdulillah: alhamdulillahEl,
    la_ilaha_illallah: la_ilaha_illallahEl,
    astaghfirullah: astaghfirullahEl,
    allahu: allahuEl,
  };
  for (let key in zikrCounts) {
    if (key !== "total" && els[key]) {
      els[key].textContent = zikrCounts[key];
    }
  }
  if (totalCount) {
    // Find the text node directly within totalCount to update only the number
    let textNode = Array.from(totalCount.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE
    );
    if (textNode) {
      textNode.nodeValue = ` ${zikrCounts.total}`; // Update existing text node
    } else {
      // Fallback if text node not found (shouldn't happen with initial HTML)
      totalCount.textContent = ` ${zikrCounts.total}`;
      console.warn("Total count text node not found, replacing content.");
    }
  }
}

function keyText(key) {
  const names = {
    subhanallah: "সুবাহান আল্লাহ",
    alhamdulillah: "আলহামদুলিল্লাহ",
    la_ilaha_illallah: "লা-ইলাহা ইল্লাল্লাহ",
    astaghfirullah: "আস্তাগফিরুল্লাহ",
    allahu: "আল্লাহু",
  };
  return names[key] || "?";
}

function playBeepSound() {
  if (!audio) {
    console.warn("Audio object not ready.");
    return;
  }
  if (audio.readyState >= 2) {
    // HAVE_CURRENT_DATA or more
    audio.currentTime = 0;
    audio.play().catch((error) => {
      // Common issue: User hasn't interacted with the page yet.
      if (error.name === "NotAllowedError") {
        console.warn("Audio playback requires user interaction first.");
        // Optional: Show a message to the user to click/tap first
        if (msg)
          msg.innerHTML = `<span style="color: orange;">Click or tap the counter first to enable sound.</span>`;
      } else {
        console.error("Audio playback error:", error);
      }
    });
  } else {
    console.warn("Audio not ready to play yet.");
    // You might want to retry or wait for the 'canplaythrough' event
  }
}

function counter() {
  const radio = document.querySelector("input[name='zikr']:checked");
  if (!radio) {
    if (msg)
      msg.innerHTML = `<span style="color: red;">অনুগ্রহ করে প্রথমে একটি জিকির সিলেক্ট করুন</span>`;
    return;
  }
  const key = radio.value;
  if (!zikrCounts.hasOwnProperty(key)) {
    console.error(`Invalid key: ${key}`);
    return;
  }

  zikrCounts[key]++;
  zikrCounts.total++;

  // Play sound immediately if condition met
  if (zikrCounts[key] % 33 === 0 && zikrCounts[key] !== 0) {
    playBeepSound();
  }

  // Update display first for responsiveness
  updateDisplay();

  // Save data (asynchronously)
  saveCountsToDBWithIdb();

  // Update status message
  if (msg)
    msg.innerHTML = `<span style="color: green;">আপনি এই মুহুর্তে "<big>${keyText(
      key
    )}</big>" জিকিরটিতে মশগুল আছেন।</span>`;
}

// --- Export / Import Functions ---
function exportCounts() {
  try {
    const dataStr = JSON.stringify(zikrCounts, null, 2); // Pretty print JSON
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const anchor = document.createElement("a");
    anchor.href = url;
    // Suggest a filename including the date
    const date = new Date();
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
    anchor.download = `zikr-counts-${dateString}.json`;

    document.body.appendChild(anchor); // Required for Firefox
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url); // Clean up blob URL
    if (msg)
      msg.innerHTML = `<span style="color: blue;">Counts exported successfully! File: ${anchor.download}</span>`;
    console.log("Counts exported.");
  } catch (error) {
    console.error("Export failed:", error);
    if (msg)
      msg.innerHTML = `<span style="color: red;">Failed to export counts. See console for details.</span>`;
  }
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) {
    console.log("No file selected for import.");
    return; // No file selected
  }

  // Check file type
  if (!file.type.match("application/json")) {
    console.warn("Import failed: Invalid file type selected.", file.type);
    if (msg)
      msg.innerHTML = `<span style="color: red;">Import failed: Please select a valid '.json' file.</span>`;
    event.target.value = null; // Reset file input
    return;
  }

  const reader = new FileReader();

  reader.onload = async (e) => {
    try {
      const importedText = e.target.result;
      const importedData = JSON.parse(importedText);
      console.log("Raw imported data:", importedData);

      // **Validation:** Check if essential keys exist and are numbers
      const requiredKeys = [
        "subhanallah",
        "alhamdulillah",
        "la_ilaha_illallah",
        "astaghfirullah",
        "allahu",
        "total",
      ];
      let isValid = true;
      const validatedData = {};

      for (const key of requiredKeys) {
        if (
          typeof importedData[key] === "number" &&
          Number.isInteger(importedData[key]) &&
          importedData[key] >= 0
        ) {
          validatedData[key] = importedData[key];
        } else {
          console.warn(
            `Invalid or missing data for key '${key}' in imported file. Found:`,
            importedData[key]
          );
          isValid = false;
          break; // Stop validation on first error
        }
      }

      if (!isValid) {
        // Try to provide a more specific error message
        const problematicKey = requiredKeys.find(
          (key) =>
            typeof importedData[key] !== "number" ||
            !Number.isInteger(importedData[key]) ||
            importedData[key] < 0
        );
        throw new Error(
          `Invalid data structure or non-integer/negative count for '${
            problematicKey || "unknown key"
          }' in imported file.`
        );
      }

      // Optional: Recalculate total to ensure consistency, or trust the imported one if valid
      const calculatedTotal =
        validatedData.subhanallah +
        validatedData.alhamdulillah +
        validatedData.la_ilaha_illallah +
        validatedData.astaghfirullah +
        validatedData.allahu;
      if (validatedData.total !== calculatedTotal) {
        console.warn(
          `Imported total (${validatedData.total}) does not match calculated total (${calculatedTotal}). Using calculated total.`
        );
        validatedData.total = calculatedTotal; // Use the recalculated total
      }

      // Update global counts object
      zikrCounts = { ...validatedData }; // Replace entirely with validated data

      // Save the newly imported counts to IndexedDB
      await saveCountsToDBWithIdb();
      console.log("Imported counts saved to DB.");

      // Update the display on the page
      updateDisplay();

      if (msg)
        msg.innerHTML = `<span style="color: green;">Counts imported successfully!</span>`;
      console.log("Counts imported and updated.");
    } catch (error) {
      console.error("Import processing failed:", error);
      if (msg)
        msg.innerHTML = `<span style="color: red;">Import failed: ${error.message}</span>`;
    } finally {
      // Reset file input value so the 'change' event fires
      // even if the same file is selected again.
      event.target.value = null;
    }
  };

  reader.onerror = (e) => {
    console.error("File reading error:", e);
    if (msg)
      msg.innerHTML = `<span style="color: red;">Error reading the selected file.</span>`;
    event.target.value = null; // Reset file input
  };

  reader.readAsText(file); // Read the file content as text
}

// --- Event Handlers ---
function handleKeyDown(e) {
  // Only trigger counter if space is pressed and not while typing in an input field (if any existed)
  if (e.key === " " || e.code === "Space") {
    // Check if the event target is something that accepts text input
    const targetTagName = e.target.tagName.toLowerCase();
    if (
      targetTagName !== "input" &&
      targetTagName !== "textarea" &&
      targetTagName !== "select"
    ) {
      e.preventDefault(); // Prevent default spacebar action (like scrolling)
      counter();
      createPressRipple();
    }
  }
}

function handleTotalCountClick(e) {
  counter();
  if (totalCount) {
    // Calculate ripple position relative to the clicked element
    const rect = totalCount.getBoundingClientRect();
    createRipple(e.clientX - rect.left, e.clientY - rect.top);
  }
}

function defaultColor() {
  [z1, z2, z3, z4, z5].forEach((span) => {
    if (span) {
      span.style.color = "#000"; // Or your default text color
      span.style.background = "transparent";
    }
  });
}

function handleDocumentClick(event) {
  let targetElement = event.target;
  let relevantClick = false;
  let clickedRadio = null;
  let clickedLabel = null;

  // Check if click is on a radio button itself
  if (targetElement.matches("input[name='zikr']")) {
    relevantClick = true;
    clickedRadio = targetElement;
  }
  // Check if click is on the SPAN *inside* a label.zikr
  else if (targetElement.matches(".zikr span")) {
    clickedLabel = targetElement.closest("label.zikr");
    if (clickedLabel) {
      clickedRadio = clickedLabel.querySelector("input[name='zikr']");
      relevantClick = true;
      // Manually check the radio if the label text was clicked
      if (clickedRadio && !clickedRadio.checked) {
        // Need a slight delay to let the default label behavior potentially check it first
        // Although programmatically checking might be more reliable here.
        setTimeout(() => {
          if (!clickedRadio.checked) clickedRadio.checked = true;
          // Re-run styling logic after potential check change
          applySelectionStyle();
        }, 0);
      }
    }
  }
  // Check if click is directly on the label.zikr
  else if (targetElement.matches("label.zikr")) {
    clickedLabel = targetElement;
    clickedRadio = clickedLabel.querySelector("input[name='zikr']");
    relevantClick = true;
    // The browser might handle the check automatically here.
  }

  if (!relevantClick) {
    return; // Ignore clicks elsewhere
  }

  // Use setTimeout to ensure browser's default action (checking the radio) completes
  setTimeout(applySelectionStyle, 0);
}

// Helper function to apply styling based on the checked radio
function applySelectionStyle() {
  const currentlyCheckedRadio = document.querySelector(
    "input[name='zikr']:checked"
  );
  defaultColor(); // Reset all styles first

  if (currentlyCheckedRadio) {
    const label = currentlyCheckedRadio.closest("label.zikr");
    const spanToStyle = label
      ? label.querySelector("span:first-of-type")
      : null; // Target the first span (name)

    if (spanToStyle) {
      spanToStyle.style.background = "#222"; // Dark background
      spanToStyle.style.color = "#fff"; // White text
      const key = currentlyCheckedRadio.value;
      if (msg)
        msg.innerHTML = `<span style="color: green;">আপনি এই মুহুর্তে "<big>${keyText(
          key
        )}</big>" জিকিরটিতে মশগুল আছেন।</span>`;
    } else {
      console.warn(
        "Could not find the correct span to style for:",
        currentlyCheckedRadio.id
      );
    }
  } else {
    // No radio selected after click (shouldn't normally happen with this logic)
    if (msg)
      msg.innerHTML = `<span style="color: blue;">অনুগ্রহ করে একটি জিকির নির্বাচন করুন।</span>`;
  }
}

// --- Utility Functions ---
function createRipple(x, y) {
  if (!totalCount) return;
  const ripple = document.createElement("span");
  ripple.className = "ripple";
  const size = 20; // Ripple size
  ripple.style.left = `${x - size / 2}px`;
  ripple.style.top = `${y - size / 2}px`;
  totalCount.appendChild(ripple);
  // Remove the ripple element after the animation completes
  setTimeout(() => ripple.remove(), 600); // Match animation duration
}

function createPressRipple() {
  if (!totalCount) return;
  const ripple = document.createElement("span");
  ripple.className = "ripple2"; // Different style for key press
  const rect = totalCount.getBoundingClientRect();
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.max(rect.width, rect.height) / 2 + 15; // Start outside
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const x = Math.cos(angle) * radius + centerX;
  const y = Math.sin(angle) * radius + centerY;
  const size = 20;
  ripple.style.left = `${x - size / 2}px`;
  ripple.style.top = `${y - size / 2}px`;
  totalCount.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// --- Initialisation ---
function attachEventListeners() {
  // Remove potential old listeners first to prevent duplicates on re-init
  document.removeEventListener("keydown", handleKeyDown);
  if (totalCount)
    totalCount.removeEventListener("click", handleTotalCountClick);
  document.removeEventListener("click", handleDocumentClick);
  if (exportButton) exportButton.removeEventListener("click", exportCounts);
  if (importFile) importFile.removeEventListener("change", handleImport);

  // Attach main listeners
  document.addEventListener("keydown", handleKeyDown);
  if (totalCount) totalCount.addEventListener("click", handleTotalCountClick);

  // Use a single delegation listener on the document for radio/label clicks
  document.addEventListener("click", handleDocumentClick);

  // Attach Export/Import listeners
  if (exportButton) exportButton.addEventListener("click", exportCounts);
  if (importFile) importFile.addEventListener("change", handleImport);

  console.log("Event listeners attached.");
}

async function initializeApp() {
  console.log("Initializing App...");
  try {
    assignElements(); // Find elements first

    // Preload audio
    console.log("Preloading audio...");
    audio = new Audio(ringTone);
    audio.preload = "auto"; // Hint to browser to load metadata and possibly data
    audio.load(); // Explicitly start loading

    // Listen for audio readiness and errors
    audio.addEventListener(
      "canplaythrough",
      () => console.log("Audio ready to play through."),
      { once: true }
    );
    audio.addEventListener("error", (e) =>
      console.error("Audio load error:", audio.error || e)
    );
    // Optional: Handle stalled audio
    audio.addEventListener("stalled", () =>
      console.warn("Audio loading stalled. Network issue?")
    );

    // Initialize DB, then load data
    await initDBWithIdb(); // Wait for DB setup
    await loadCountsFromDBWithIdb(); // Wait for data loading
    updateDisplay(); // Show loaded counts

    // Set initial state message and style selected radio (if any)
    const selectedRadio = document.querySelector("input[name='zikr']:checked");
    if (selectedRadio) {
      applySelectionStyle(); // Use the helper to apply style and message
    } else if (msg) {
      msg.innerHTML = `<span style="color: blue;">গণনা শুরু করতে একটি জিকির নির্বাচন করুন এবং ক্লিক করুন বা স্পেসবার চাপুন।</span>`;
    }

    // Attach all event listeners last
    attachEventListeners();

    console.log("App Initialized Successfully.");
  } catch (error) {
    console.error("App Initialization failed:", error);
    if (msg)
      msg.innerHTML = `<span style="color: red;">Error initializing application. Please refresh. Details in console.</span>`;
  }
}

// --- Start the application ---
// Use DOMContentLoaded to ensure the HTML is fully parsed
document.addEventListener("DOMContentLoaded", initializeApp);
