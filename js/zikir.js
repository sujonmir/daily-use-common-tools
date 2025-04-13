/**
 * Zikr Counter - Final Version (Focus: Stability, Fast Sound)
 * Uses IndexedDB via IDB library for storage.
 * Features: Selection, Counting, Styling, Ripples, Fast preloaded Beep Sound.
 * Deselection feature REMOVED.
 */

// --- Globals & Constants ---
let z1, z2, z3, z4, z5;
let totalCount, msg;
let subhanallahEl, alhamdulillahEl, la_ilaha_illallahEl, astaghfirullahEl, allahuEl;
let audio;
const ringTone = "media/audio/beep-07a.wav";
const DB_NAME = "ZikrCounterDB_v1";
const STORE_NAME = "counts";
const DB_VERSION = 1;
const COUNT_KEY = "currentCounts";
let dbPromise;
let zikrCounts = { subhanallah: 0, alhamdulillah: 0, la_ilaha_illallah: 0, astaghfirullah: 0, allahu: 0, total: 0 };

// --- DOM Element Assignment ---
function assignElements() {
    z1 = document.getElementById("z1"); z2 = document.getElementById("z2"); z3 = document.getElementById("z3"); z4 = document.getElementById("z4"); z5 = document.getElementById("z5");
    totalCount = document.querySelector("#totalCount"); msg = document.getElementById("errorMsg");
    subhanallahEl = document.getElementById("subhanallah"); alhamdulillahEl = document.getElementById("alhamdulillah"); la_ilaha_illallahEl = document.getElementById("la_ilaha_illallah"); astaghfirullahEl = document.getElementById("astaghfirullah"); allahuEl = document.getElementById("allahu");
    if (!totalCount || !msg || !z1 || !z2 || !z3 || !z4 || !z5) { console.error("Essential elements missing!"); throw new Error("Missing elements"); }
}

// --- IndexedDB Functions ---
function initDBWithIdb() {
    if (!window.indexedDB || !window.idb) { console.error("IDB prerequisites missing."); return Promise.reject("IDB N/A"); }
    dbPromise = idb.openDB(DB_NAME, DB_VERSION, {
        upgrade(db) { if (!db.objectStoreNames.contains(STORE_NAME)) { db.createObjectStore(STORE_NAME); } },
        blocked() { console.warn("DB blocked."); }, blocking() { console.warn("DB blocking."); }, terminated() { console.error("DB terminated."); }
    }); return dbPromise;
}
async function loadCountsFromDBWithIdb() {
    if (!dbPromise) { return zikrCounts; } try { const db = await dbPromise; const d = await db.get(STORE_NAME, COUNT_KEY); if (d) zikrCounts = { ...zikrCounts, ...d }; return zikrCounts; } catch (e) { console.error("Load error:", e); return zikrCounts; }
}
async function saveCountsToDBWithIdb() {
    if (!dbPromise) { return; } try { const db = await dbPromise; await db.put(STORE_NAME, zikrCounts, COUNT_KEY); } catch (e) { console.error("Save error:", e); }
}

// --- Core Logic ---
function updateDisplay() {
    const els = { subhanallah: subhanallahEl, alhamdulillah: alhamdulillahEl, la_ilaha_illallah: la_ilaha_illallahEl, astaghfirullah: astaghfirullahEl, allahu: allahuEl };
    for (let k in zikrCounts) { if (k !== "total" && els[k]) els[k].textContent = zikrCounts[k]; }
    if (totalCount) { let tn = Array.from(totalCount.childNodes).find(n => n.nodeType === Node.TEXT_NODE); if (tn) tn.nodeValue = zikrCounts.total; else totalCount.insertBefore(document.createTextNode(zikrCounts.total), totalCount.firstChild); }
}
function keyText(k) { const n = { subhanallah: "সুবাহান আল্লাহ", alhamdulillah: "আলহামদুলিল্লাহ", la_ilaha_illallah: "লা-ইলাহা ইল্লাল্লাহ", astaghfirullah: "আস্তাগফিরুল্লাহ", allahu: "আল্লাহু" }; return n[k] || "?"; }
function playBeepSound() { if (!audio) return; audio.currentTime = 0; audio.play().catch((e) => { if (e.name === 'NotAllowedError') console.warn("Audio requires interaction."); else console.warn("Audio error:", e.name); }); }
function counter() {
    let radio = document.querySelector("input[name='zikr']:checked"); if (!radio) { if (msg) msg.innerHTML = `<span style="color: red;">অনুগ্রহ করে প্রথমে একটি জিকির সিলেক্ট করুন</span>`; return; }
    let key = radio.value; if (!zikrCounts.hasOwnProperty(key)) { console.error(`Invalid key: ${key}`); return; }
    zikrCounts[key]++; zikrCounts.total++;
    if (zikrCounts[key] % 33 === 0 && zikrCounts[key] !== 0) playBeepSound(); // Play sound ASAP
    saveCountsToDBWithIdb(); // Save data
    if (msg) msg.innerHTML = `<span style="color: green;">আপনি এই মুহুর্তে "<big>${keyText(key)}</big>" জিকিরটিতে মশগুল আছেন।</span>`; // Update message
    updateDisplay(); // Update display last
}

// --- Event Handlers ---
function handleKeyDown(e) { if (e.key === " " || e.code === "Space") { e.preventDefault(); counter(); createPressRipple(); } }
function handleTotalCountClick(e) { counter(); if (totalCount) { let r = totalCount.getBoundingClientRect(); createRipple(e.clientX - r.left, e.clientY - r.top); } }
function defaultColor() { [z1, z2, z3, z4, z5].forEach(s => { if (s) { s.style.color = "#000"; s.style.background = "transparent"; } }); }

function handleDocumentClick(event) { // Version 7 logic - simplified selection/styling only
    let clickIsRelevant = false;
    let targetElement = event.target;
    if (targetElement.matches("input[name='zikr'], #z1, #z2, #z3, #z4, #z5") || targetElement.closest('label.zikr')) { clickIsRelevant = true; }
    if (!clickIsRelevant) return;

    setTimeout(() => { // Allow browser default action first
        const currentlyCheckedRadio = document.querySelector("input[name='zikr']:checked");
        defaultColor(); // Reset all styles
        if (currentlyCheckedRadio) {
            const spanToStyle = currentlyCheckedRadio.nextElementSibling;
            if (spanToStyle && spanToStyle.tagName === 'SPAN') {
                spanToStyle.style.background = "#222"; spanToStyle.style.color = "#fff";
                let key = currentlyCheckedRadio.value;
                if (msg) msg.innerHTML = `<span style="color: green;">আপনি এই মুহুর্তে "<big>${keyText(key)}</big>" জিকিরটিতে মশগুল আছেন।</span>`;
            } else { console.warn("Could not find/style span for:", currentlyCheckedRadio.id); }
        } else {
             if (msg) msg.innerHTML = `<span style="color: blue;">অনুগ্রহ করে একটি জিকির নির্বাচন করুন।</span>`;
        }
    }, 0);
}

// --- Utility Functions ---
function createRipple(x, y) { if (!totalCount) return; let r = document.createElement("span"); r.className = "ripple"; let s = 20; r.style.left = `${x-s/2}px`; r.style.top = `${y-s/2}px`; totalCount.appendChild(r); setTimeout(() => r.remove(), 600); }
function createPressRipple() { if (!totalCount) return; let r = document.createElement("span"); r.className = "ripple2"; let rect = totalCount.getBoundingClientRect(); let a = Math.random()*2*Math.PI; let rad = Math.max(rect.width, rect.height)/2 + 15; let cx = rect.width/2; let cy = rect.height/2; let x = Math.cos(a)*rad + cx; let y = Math.sin(a)*rad + cy; let s=20; r.style.left = `${x-s/2}px`; r.style.top = `${y-s/2}px`; totalCount.appendChild(r); setTimeout(() => r.remove(), 600); }

// --- Initialisation ---
function attachEventListeners() {
    document.removeEventListener("keydown", handleKeyDown); // Clean up
    document.removeEventListener("click", handleTotalCountClick); // Clean up (was attached to totalCount)
    document.removeEventListener("click", handleDocumentClick); // Clean up

    document.addEventListener("keydown", handleKeyDown);
    if (totalCount) totalCount.addEventListener("click", handleTotalCountClick);
    document.addEventListener("click", handleDocumentClick); // Single click listener
    console.log("Event listeners attached.");
}
async function initializeApp() {
    try {
        assignElements();
        console.log("Preloading audio..."); audio = new Audio(ringTone); audio.load(); // Explicitly start loading audio
        audio.addEventListener('error', (e) => console.error("Audio load error:", audio.error));
        audio.addEventListener('canplaythrough', () => console.log("Audio ready.")); // Indicates ready to play with no buffering
        await initDBWithIdb(); await loadCountsFromDBWithIdb(); updateDisplay();
        const selectedRadio = document.querySelector("input[name='zikr']:checked"); // Style initial selection
        if (selectedRadio) { defaultColor(); const span = selectedRadio.nextElementSibling; if (span && span.tagName === 'SPAN') { span.style.background = "#222"; span.style.color = "#fff"; } if (msg) msg.innerHTML = `<span style="color: green;">আপনি এই মুহুর্তে "<big>${keyText(selectedRadio.value)}</big>" জিকিরটিতে মশগুল আছেন।</span>`; }
        else if (msg) { msg.innerHTML = `<span style="color: blue;">গণনা শুরু করতে একটি জিকির নির্বাচন করুন এবং ক্লিক করুন বা স্পেসবার চাপুন।</span>`; }
        attachEventListeners(); console.log("App Initialized.");
    } catch (error) { console.error("App Init failed:", error); if (msg) msg.innerHTML = `<span style="color: red;">অ্যাপ শুরু করতে সমস্যা হয়েছে।</span>`; }
}

// --- Start ---
document.addEventListener('DOMContentLoaded', initializeApp);