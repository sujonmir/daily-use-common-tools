      // ---- Auth Guard ----
      (function () {
        const FINANCE_HASH_KEY = "financeHashKey";
        const SESSION_KEY      = "personal-finance-tracker-session";

        async function sha256hex(text) {
          const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
          return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
        }

        function sessionValid() {
          const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
          return s && s.exp > Date.now();
        }

        function createSession() {
          localStorage.setItem(SESSION_KEY, JSON.stringify({ exp: Date.now() + 8 * 60 * 60 * 1000 }));
        }

        window.clearFTSession = function () {
          localStorage.removeItem(SESSION_KEY);
        };

        var _resolveAuth;
        window.authReady = new Promise(function (resolve) { _resolveAuth = resolve; });

        window.setSyncStatus = function (msg) {
          document.getElementById("login-form").style.display = "none";
          var wrap = document.getElementById("sync-status-wrap");
          wrap.style.display = "flex";
          document.getElementById("sync-status-msg").textContent = msg || "Loading...";
        };

        window.hideSyncOverlay = function () {
          document.getElementById("login-overlay").style.display = "none";
        };

        function showError(msg) {
          var el = document.getElementById("login-error");
          el.textContent = msg;
          el.style.display = "block";
        }

        function init() {
          const hash = localStorage.getItem(FINANCE_HASH_KEY);

          // No secret key set — prompt to go to settings
          if (!hash) {
            document.getElementById("login-sub-text").textContent = "Secret key not configured.";
            document.getElementById("login-secret").style.display = "none";
            document.getElementById("login-submit-btn").style.display = "none";
            document.getElementById("login-setup-notice").style.display = "block";
            document.getElementById("login-setup-notice").innerHTML =
              "<strong>No secret key found.</strong><br>Set up your secret key in Settings first.<br>" +
              "<a href=\"finance-tracker-settings.html\">→ Go to Settings</a>";
            return;
          }

          // Show sheet notice if no URL configured
          if (!localStorage.getItem("personal-finance-tracker-sheet-token")) {
            document.getElementById("login-setup-notice").style.display = "block";
          }

          // Valid session — skip login prompt
          if (sessionValid()) {
            window.setSyncStatus("Preparing your dashboard...");
            _resolveAuth();
            return;
          }

          var form = document.getElementById("login-form");
          form.addEventListener("submit", async function (e) {
            e.preventDefault();
            document.getElementById("login-error").style.display = "none";
            var pw = document.getElementById("login-secret").value;
            if (!pw) return showError("Enter your secret key.");

            const inputHash = await sha256hex(pw);
            if (inputHash !== hash) return showError("Wrong secret key.");

            createSession();
            window.setSyncStatus("Preparing your dashboard...");
            _resolveAuth();
          });
        }

        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", init);
        } else {
          init();
        }
      })();

      // Keyword Income Tracking Feature
      (function () {
        "use strict";

        // Store keywords in memory for this session
        const keywords = [];

        // Show the keyword input form
        function showForm() {
          const popup = document.getElementById("keyword-popup");
          const input = document.getElementById("keyword-input");
          popup.style.display = "block";
          input.value = "";
          input.focus();
        }

        // Hide the keyword input form
        function hideForm() {
          const popup = document.getElementById("keyword-popup");
          popup.style.display = "none";
        }

        // This function will be defined in the main script block later
        // but we declare it here so the IIFE knows it might exist.
        let formatToIndianCurrency = (num) =>
          num.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

        // Update the sums display in the footer
        function updateSums() {
          const note = document.getElementById("special-footer-note");

          // Check if we have transactions to process
          if (!window.transactions || !Array.isArray(window.transactions)) {
            note.innerHTML =
              '<span style="color:#888;">No transactions available</span>';
            return;
          }

          // Check if the global formatter function is available
          if (typeof window.formatToIndianCurrency === "function") {
            formatToIndianCurrency = window.formatToIndianCurrency;
          }

          // Helper to extract searchable text from a transaction detail
          const getDetailText = (detail) => {
            return [
              detail.title,
              detail.vehicle,
              detail.from,
              detail.to,
              detail.patientName,
              detail.doctorName,
              detail.doctorType,
              detail.person,
              detail.number,
              detail.feeType,
              detail.type,
              detail.subType,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();
          };

          // Helper to get amount from a detail
          const getDetailAmount = (detail) => {
            return (
              parseFloat(
                detail.amount != null
                  ? detail.amount
                  : detail.itemTotal != null
                    ? detail.itemTotal
                    : detail.fare != null
                      ? detail.fare
                      : detail.fee != null
                        ? detail.fee
                        : detail.total != null
                          ? detail.total
                          : detail.payableTests != null
                            ? detail.payableTests
                            : 0,
              ) || 0
            );
          };

          // Calculate sums for each keyword
          const results = keywords
            .map((keyword) => {
              let incomeSum = 0;
              let expenseSum = 0;
              const kw = keyword.toLowerCase();

              // Loop through all transactions
              window.transactions.forEach((tx) => {
                if (!Array.isArray(tx.details)) return;
                const categoryMatch = (tx.category || "")
                  .toLowerCase()
                  .includes(kw);
                tx.details.forEach((detail) => {
                  const textMatch = getDetailText(detail).includes(kw);
                  if (textMatch || categoryMatch) {
                    const amount = getDetailAmount(detail);
                    if (tx.type === "income") incomeSum += amount;
                    else expenseSum += amount;
                  }
                });
              });

              // Return formatted HTML showing income | expense
              if (incomeSum > 0 || expenseSum > 0) {
                return `<span class="keyword-sum" value="${keyword.toLowerCase()}"><span>${keyword}:</span> <span style="color:var(--success-color);font-weight:600;">৳${formatToIndianCurrency(incomeSum)}</span> <span style="color:#888;margin:0 2px;">|</span> <span style="color:tomato;font-weight:600;">৳${formatToIndianCurrency(expenseSum)}</span></span>`;
              }
              return "";
            })
            .filter((html) => html !== ""); // Filter out keywords with no matches

          // Update the display
          note.innerHTML =
            results.length > 0
              ? results.join("")
              : '<span style="color:#888;">No matching income found for keywords</span>';
        }

        // Initialize the feature
        function init() {
          // Get DOM elements
          const btn = document.getElementById("floating-keyword-btn");
          const popup = document.getElementById("keyword-popup");
          const closeBtn = popup.querySelector(".close-popup");
          const form = document.getElementById("keyword-form");

          // Add event listeners
          btn.addEventListener("click", showForm);
          closeBtn.addEventListener("click", hideForm);
          popup.addEventListener("click", (e) => {
            if (e.target === popup) hideForm();
          });

          // Handle form submission
          form.addEventListener("submit", (e) => {
            e.preventDefault();
            const input = document.getElementById("keyword-input");
            const keyword = input.value.trim();

            if (
              keyword &&
              !keywords.some((k) => k.toLowerCase() === keyword.toLowerCase())
            ) {
              keywords.push(keyword);
              updateSums();
            }

            hideForm();
          });

          // Make the update function available globally
          window.updateKeywordFooterNote = updateSums;
        }

        // Start when document is ready
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", init);
        } else {
          init();
        }
      })();

      // Scroll-to-top button
      (function () {
        const scrollBtn = document.getElementById("scroll-top-btn");
        window.addEventListener("scroll", function () {
          if (window.scrollY > 300) {
            scrollBtn.classList.add("visible");
          } else {
            scrollBtn.classList.remove("visible");
          }
        });
        scrollBtn.addEventListener("click", function () {
          window.scrollTo({ top: 0, behavior: "smooth" });
        });
      })();

      document.addEventListener("DOMContentLoaded", async () => {
        // Wait for the user to authenticate before running anything
        await window.authReady;

        // ---- Google Sheets Config (plain JSON, no encryption) ----
        const APPS_SCRIPT_URL = localStorage.getItem("personal-finance-tracker-sheet-token") || "";
        const SHEETS_TOKEN    = localStorage.getItem("financeHashKey") || "";

        // ---- Sync badge ----
        const _showSyncBadge = (state) => {
          let el = document.getElementById("sheets-sync-badge");
          if (!el) {
            el = document.createElement("div");
            el.id = "sheets-sync-badge";
            el.style.cssText =
              "position:fixed;bottom:80px;right:16px;padding:6px 12px;" +
              "border-radius:20px;font-size:12px;font-weight:600;z-index:4000;" +
              "box-shadow:0 2px 6px rgba(0,0,0,.2);transition:opacity 0.3s;";
            document.body.appendChild(el);
          }
          if (state === "syncing") {
            el.style.background = "#e9ecef"; el.style.color = "#495057";
            el.textContent = "⏳ Syncing…"; el.style.opacity = "1";
          } else if (state === "ok") {
            el.style.background = "#d4edda"; el.style.color = "#155724";
            el.textContent = "☁ Synced"; el.style.opacity = "1";
            clearTimeout(el._t);
            el._t = setTimeout(() => { el.style.opacity = "0"; }, 3000);
          } else {
            el.style.background = "#fde8ea"; el.style.color = "#b02030";
            el.textContent = "⚠ Sync failed"; el.style.opacity = "1";
            clearTimeout(el._t);
            el._t = setTimeout(() => { el.style.opacity = "0"; }, 5000);
          }
        };

        // Fire-and-forget POST via sendBeacon (text/plain = simple request, no preflight)
        // Apps Script receives body via e.postData.contents and JSON.parse()s it
        const _postToSheets = (body) => {
          if (!APPS_SCRIPT_URL || !SHEETS_TOKEN) return;
          if (window._sheetsSyncBlocked) return;
          const payload = JSON.stringify({ token: SHEETS_TOKEN, ...body });
          _showSyncBadge("syncing");
          const sent = navigator.sendBeacon(APPS_SCRIPT_URL, payload);
          if (sent) {
            setTimeout(() => _showSyncBadge("ok"), 400);
          } else {
            fetch(APPS_SCRIPT_URL, {
              method: "POST", mode: "no-cors", redirect: "follow",
              headers: { "Content-Type": "text/plain" }, body: payload,
            }).then(() => _showSyncBadge("ok")).catch(() => _showSyncBadge("fail"));
          }
        };

        const syncAdd        = (tx)     => _postToSheets({ action: "add",        data: tx });
        const syncDelete     = (id)     => _postToSheets({ action: "delete",     id });
        const syncUpdate     = (tx)     => _postToSheets({ action: "update",     data: tx });
        const syncReplaceAll = (txList) => _postToSheets({ action: "replaceAll", data: txList });

        // GET all rows from Sheets on startup (no CORS issue with GET)
        const fetchFromSheets = async () => {
          if (!APPS_SCRIPT_URL || !SHEETS_TOKEN) return null;
          const url = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(SHEETS_TOKEN)}&action=getAll`;
          const res = await fetch(url, { method: "GET", redirect: "follow" });
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          return Array.isArray(data) && data.length > 0 ? data : null;
        };

        // --- DOM Elements ---
        const transactionTypeSelect =
          document.getElementById("transaction-type");
        const categoryGroup = document.getElementById("category-group");
        const categorySelect = document.getElementById("expense-category");
        const calculatorContainer = document.getElementById(
          "calculator-container",
        );
        const transactionForm = document.getElementById("transaction-form");
        const transactionDateInput =
          document.getElementById("transaction-date");
        const entriesContainer = document.getElementById("entries-container");
        const currentBalanceEl = document.getElementById("current-balance");
        const balanceWrapper = currentBalanceEl.parentElement;
        const balanceVisibilityToggle = document.getElementById(
          "balance-visibility-toggle",
        );
        const applyBalanceVisibility = (visible) => {
          balanceWrapper.classList.toggle("balance-visible", visible);
          balanceWrapper.classList.toggle("balance-hidden", !visible);
        };
        const initialBalanceVisible =
          localStorage.getItem("balance-visibility") !== "0";
        balanceVisibilityToggle.checked = initialBalanceVisible;
        applyBalanceVisibility(initialBalanceVisible);
        balanceVisibilityToggle.addEventListener("change", () => {
          const visible = balanceVisibilityToggle.checked;
          localStorage.setItem("balance-visibility", visible ? "1" : "0");
          applyBalanceVisibility(visible);
        });
        const currentMonthHeader = document.getElementById(
          "current-month-header",
        );

        const monthlySummaryTitle = document.getElementById(
          "monthly-summary-title",
        );
        const monthlySummaryTable = document.getElementById(
          "monthly-summary-table",
        );
        const yearlySummaryTitle = document.getElementById(
          "yearly-summary-title",
        );
        const yearlySummaryTable = document.getElementById(
          "yearly-summary-table",
        );
        const footerSummary = document.getElementById("footer-summary");

        const exportMonthlyBtn = document.getElementById("export-monthly-btn");
        const exportYearlyBtn = document.getElementById("export-yearly-btn");
        const importBtn = document.getElementById("import-data-btn");
        const exportBtn = document.getElementById("export-data-btn");
        const fileImporter = document.getElementById("file-importer");

        // --- State Management ---
        let transactions = []; // This is now a cache of the DB data
        window.transactions = transactions; // Make it globally accessible for the keyword feature
        const EXPENSE_CATEGORIES = Array.from(categorySelect.options).map(
          (opt) => opt.value,
        );
        let db; // To hold the IndexedDB connection

        // --- IndexedDB Helper Functions ---
        const initDB = () => {
          return new Promise((resolve, reject) => {
            const request = indexedDB.open("FinanceTrackerDB", 1);

            request.onupgradeneeded = (event) => {
              const db = event.target.result;
              if (!db.objectStoreNames.contains("transactions")) {
                db.createObjectStore("transactions", { keyPath: "id" });
              }
            };

            request.onsuccess = (event) => {
              db = event.target.result;
              resolve();
            };

            request.onerror = (event) => {
              console.error("Database error:", event.target.errorCode);
              reject(event.target.error);
            };
          });
        };

        const dbRequest = (storeName, mode, action, data) => {
          return new Promise((resolve, reject) => {
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            let request;
            if (data !== undefined) {
              request = store[action](data);
            } else {
              request = store[action]();
            }

            transaction.oncomplete = () => resolve(request.result);
            transaction.onerror = (event) => reject(event.target.error);
          });
        };

        const getAllTransactions = () =>
          dbRequest("transactions", "readonly", "getAll");
        const addTransaction = (tx) =>
          dbRequest("transactions", "readwrite", "add", tx);
        const updateTransaction = (tx) =>
          dbRequest("transactions", "readwrite", "put", tx);
        const deleteTransaction = (id) =>
          dbRequest("transactions", "readwrite", "delete", id);
        const clearTransactions = () =>
          dbRequest("transactions", "readwrite", "clear");

        let editingId = null;

        const localToday = () => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        };

        const normalizeDate = (str) => {
          if (!str) return localToday();
          if (/^\d{4}-\d{2}-\d{2}$/.test(String(str))) return String(str);
          const d = new Date(str);
          if (isNaN(d)) return String(str).slice(0, 10);
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        };

        // --- NEW: Currency Formatting Helper ---
        const formatToIndianCurrency = (num) => {
          if (typeof num !== "number") {
            return num;
          }
          // Using Intl.NumberFormat is more robust and locale-aware
          return new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(num);
        };
        window.formatToIndianCurrency = formatToIndianCurrency; // Make it globally available

        // --- Initialization ---
        const CATEGORY_RENAMES = {
          "General Transport Cost": "Transport Cost",
          "Lend, Donate & Gifts": "Lend, Donate & Gift",
        };

        const migrateCategories = async () => {
          const toMigrate = transactions.filter(
            (t) => CATEGORY_RENAMES[t.category],
          );
          if (toMigrate.length === 0) return;
          console.log(
            `Migrating ${toMigrate.length} transaction(s) to updated category names...`,
          );
          for (const tx of toMigrate) {
            tx.category = CATEGORY_RENAMES[tx.category];
            // Update in IndexedDB: delete old + re-add with new category
            try {
              await deleteTransaction(tx.id);
              await addTransaction(tx);
            } catch (e) {
              console.warn("Migration IDB error:", e);
            }
            syncUpdate(tx);
          }
        };

        const init = async () => {
          try {
            await initDB();

            if (APPS_SCRIPT_URL) {
              try {
                window.setSyncStatus("☁️ Syncing from Google Sheets...");
                const sheetsData = await fetchFromSheets(); // null = empty sheet
                window._sheetsSyncBlocked = false;

                if (sheetsData !== null && sheetsData.length > 0) {
                  // Sheets has data — it's source of truth, overwrite local
                  window.setSyncStatus("🔄 Updating local data...");
                  const normalizedData = sheetsData.map(tx => ({ ...tx, date: normalizeDate(tx.date) }));
                  await clearTransactions();
                  for (const tx of normalizedData) await addTransaction(tx);
                  window.transactions = transactions = normalizedData;
                } else {
                  // Sheets is empty — use local data and push it up as initial backup
                  const localData = await getAllTransactions();
                  window.transactions = transactions = localData;
                  if (localData.length > 0) syncReplaceAll(localData);
                }
              } catch (sheetsErr) {
                console.warn("Sheets load error:", sheetsErr.message);
                const isTokenErr = sheetsErr.message && sheetsErr.message.includes("Unauthorized");
                if (isTokenErr) {
                  window._sheetsSyncBlocked = true;
                  window.setSyncStatus("🔑 Wrong token — sync paused.");
                  await new Promise(r => setTimeout(r, 2000));
                  let warn = document.getElementById("sheets-pw-warn");
                  if (!warn) {
                    warn = document.createElement("div");
                    warn.id = "sheets-pw-warn";
                    warn.style.cssText =
                      "position:fixed;top:64px;left:50%;transform:translateX(-50%);" +
                      "background:#dc3545;color:#fff;padding:10px 20px;border-radius:7px;" +
                      "z-index:5000;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.3);" +
                      "text-align:center;max-width:90vw;";
                    warn.textContent =
                      "⚠️ Wrong secret token — sync paused. Check the token in Settings matches your Apps Script.";
                    document.body.appendChild(warn);
                  }
                } else {
                  window._sheetsSyncBlocked = false;
                  window.setSyncStatus("⚠️ Sheets unavailable — using local data.");
                  await new Promise(r => setTimeout(r, 1200));
                }
                window.transactions = transactions = await getAllTransactions();
              }
            } else {
              window._sheetsSyncBlocked = false;
              window.transactions = transactions = await getAllTransactions();
            }
          } catch (error) {
            console.error("Failed to initialize database:", error);
            alert("Could not initialize the database. Data will not be saved.");
          }

          transactionDateInput.value = localToday();
          // Update keyword sums after loading transactions
          if (window.updateKeywordFooterNote) window.updateKeywordFooterNote();
          transactionTypeSelect.addEventListener("change", renderCalculator);
          categorySelect.addEventListener("change", renderCalculator);
          transactionForm.addEventListener("submit", handleFormSubmit);
          entriesContainer.addEventListener("click", handleEntryAction);
          document.getElementById("cancel-edit-btn").addEventListener("click", resetEditMode);

          exportMonthlyBtn.addEventListener("click", () =>
            openExportModal("monthly"),
          );
          exportYearlyBtn.addEventListener("click", () =>
            openExportModal("yearly"),
          );
          document
            .getElementById("export-custom-range-btn")
            .addEventListener("click", () => openExportModal("custom"));
          document
            .getElementById("export-modal-close-btn")
            .addEventListener("click", closeExportModal);
          document
            .getElementById("export-modal-overlay")
            .addEventListener("click", (e) => {
              if (e.target.id === "export-modal-overlay") closeExportModal();
            });
          document
            .getElementById("modal-download-btn")
            .addEventListener("click", handleModalDownload);
          document
            .querySelectorAll('input[name="custom-range-type"]')
            .forEach((radio) => {
              radio.addEventListener("change", updateCustomRangeInputs);
            });
          importBtn.addEventListener("click", () => fileImporter.click());
          fileImporter.addEventListener("change", handleImport);
          exportBtn.addEventListener("click", handleExport);
          document
            .getElementById("loans-full-details-btn")
            .addEventListener("click", () => {
              const allLoans = getAllLoansWithRepayments();
              if (allLoans.length === 0) {
                alert("No loan records found.");
                return;
              }
              let bodyHtml = "";
              allLoans.forEach((l) => {
                const totalRepaid = l.repayments.reduce(
                  (s, r) => s + r.amount,
                  0,
                );
                const remaining = l.amount - totalRepaid;
                const status = remaining <= 0 ? "Done" : "Active";
                const statusColor = status === "Done" ? "#28a745" : "#dc3545";
                bodyHtml += `<div style="border:1px solid #ddd;border-radius:8px;padding:15px;margin-bottom:20px;">
                <h3 style="margin:0 0 10px;">${l.loanPerson} <span style="color:${statusColor};font-size:0.85em;">[${status}]</span></h3>
                <p>Loan Date: ${l.date} &nbsp;|&nbsp; Total Loan: ${formatToIndianCurrency(l.amount)}</p>
                <p>Total Repaid: ${formatToIndianCurrency(totalRepaid)} &nbsp;|&nbsp; Remaining: ${formatToIndianCurrency(Math.max(0, remaining))}</p>
                ${l.repayments.length > 0 ? `<h4>Repayments:</h4><table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:6px;border-bottom:1px solid #ddd;">Date</th><th style="text-align:right;padding:6px;border-bottom:1px solid #ddd;">Amount</th></tr></thead><tbody>${l.repayments.map((r) => `<tr><td style="padding:6px;">${r.date}</td><td style="text-align:right;padding:6px;">${formatToIndianCurrency(r.amount)}</td></tr>`).join("")}</tbody></table>` : "<p>No repayments yet.</p>"}
              </div>`;
              });
              const win = window.open("", "_blank");
              win.document
                .write(`<!DOCTYPE html><html><head><title>Loan Full Report</title><style>
              body{font-family:sans-serif;max-width:900px;margin:0 auto;padding:20px;line-height:1.6;}
              h1{color:#333;border-bottom:2px solid #4a90e2;padding-bottom:10px;}
              h3{color:#333;margin:0 0 8px;}h4{color:#555;margin:8px 0 4px;}
              p{margin:4px 0;}
              table{width:100%;border-collapse:collapse;}
              th,td{padding:6px 8px;border-bottom:1px solid #ddd;}
              th{text-align:left;background:#f5f5f5;}
              .card{border:1px solid #ddd;border-radius:8px;padding:15px;margin-bottom:20px;page-break-inside:avoid;}
              .no-print{text-align:center;margin-bottom:20px;}
              @media print{.no-print{display:none;}}
            </style></head><body>
            <div class="no-print"><button onclick="window.print()" style="padding:10px 28px;font-size:15px;background:#4a90e2;color:#fff;border:none;border-radius:6px;cursor:pointer;">🖨 Print / Save as PDF</button></div>
            <h1>Loan &amp; Repayment Records</h1>${bodyHtml}</body></html>`);
              win.document.close();
            });

          await migrateCategories();
          renderCalculator();
          window.hideSyncOverlay();
          renderApp();
        };

        // --- Core Rendering Functions ---
        const updateLoanRepaymentVisibility = () => {
          const opt = categorySelect.querySelector(
            'option[value="Loan repayment"]',
          );
          if (!opt) return;
          const hasActive = getActiveLoans().length > 0;
          opt.disabled = !hasActive;
          opt.style.display = hasActive ? "" : "none";
          // If currently selected and now hidden, switch to first available
          if (!hasActive && categorySelect.value === "Loan repayment") {
            categorySelect.value = categorySelect.options[0].value;
            renderCalculator();
          }
        };
        const renderApp = () => {
          const today = new Date();
          renderEntries(today.getFullYear(), today.getMonth());
          updateCurrentBalance();
          renderSummaries(today.getFullYear(), today.getMonth());
          renderFooterSummary();
          renderActiveLoans();
          updateLoanRepaymentVisibility();
        };
        const renderActiveLoans = () => {
          const container = document.getElementById("active-loans-section");
          if (!container) return;
          const allLoans = [];
          const loans = {};
          transactions
            .filter((t) => t.type === "income" && t.details[0]?.isLoan)
            .forEach((t) => {
              const d = t.details[0];
              loans[t.id] = {
                id: t.id,
                loanPerson: d.title,
                amount: t.total,
                date: t.date,
                repaid: 0,
              };
            });
          transactions
            .filter((t) => t.category === "Loan repayment")
            .forEach((t) => {
              const d = t.details[0];
              if (d?.loanId && loans[d.loanId])
                loans[d.loanId].repaid += d.amount;
            });
          const loanList = Object.values(loans).map((l) => {
            l.remaining = l.amount - l.repaid;
            l.status = l.remaining <= 0 ? "Done" : "Active";
            return l;
          });
          const activeLoansOnly = loanList.filter((l) => l.status === "Active");
          if (activeLoansOnly.length === 0) {
            container.innerHTML =
              "<p style='color:var(--light-text);text-align:center;'>No active loans.</p>";
            return;
          }
          let html = `<table class="summary-table" style="width:100%;"><thead><tr>
            <th style="text-align:left;">Person/Org</th>
            <th style="text-align:left;">Date</th>
            <th style="text-align:right;">Loan</th>
            <th style="text-align:right;">Repaid</th>
            <th style="text-align:right;">Remaining</th>
          </tr></thead><tbody>`;
          activeLoansOnly.forEach((l) => {
            html += `<tr>
              <td>${l.loanPerson}</td>
              <td>${l.date}</td>
              <td style="text-align:right;">${formatToIndianCurrency(l.amount)}</td>
              <td style="text-align:right;">${formatToIndianCurrency(l.repaid)}</td>
              <td style="text-align:right;color:#dc3545;font-weight:bold;">${formatToIndianCurrency(Math.max(0, l.remaining))}</td>
            </tr>`;
          });
          html += "</tbody></table>";
          container.innerHTML = html;
        };
        const renderCalculator = () => {
          const e = transactionTypeSelect.value,
            t = categorySelect.value;
          let n;
          ((categoryGroup.style.display = "expense" === e ? "flex" : "none"),
            (n =
              "income" === e
                ? '\n                    <h4>Income Details</h4>\n                    <div style="margin-bottom:10px;">\n                        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">\n                            <input type="checkbox" id="income-is-loan" class="income-is-loan-cb">\n                            <span>This is a Loan</span>\n                        </label>\n                    </div>\n                    <div class="item-row grid-income">\n                         <input type="text" placeholder="Income from (title)" class="item-title" required>\n                         <input type="number" step="0.01" placeholder="Amount" class="item-amount" required>\n                    </div>'
                : ((n = `<h4>${t} Details</h4>`),
                  (() => {
                    switch (t) {
                      case "Medicines":
                        n +=
                          '\n                            <div class="items-list">\n                                <div class="item-row grid-medicines">\n                                    <input type="text" placeholder="Goods title" class="item-title" required>\n                                    <input type="number" step="0.01" placeholder="Price" class="item-price" required>\n                                    <input type="number" value="1" placeholder="Quantity" class="item-quantity" required>\n                                    <input type="number" value="0" placeholder="Discount %" class="item-discount">\n                                    <button type="button" class="remove-item-btn" style="display:none;">X</button>\n                                </div>\n                            </div>\n                            <button type="button" class="add-item-btn">+ Add Item</button>\n                            <div class="item-row" style="margin-top:15px;">\n                                <input type="number" step="0.01" value="0" placeholder="Round total amount (e.g. +5 or -3)" class="medicine-rounding" style="width:100%;">\n                            </div>';
                        break;
                      case "Groccery":
                      case "Milk, Fishs & Meats":
                      case "Vegetabls":
                      case "Fruits":
                        n +=
                          '\n                            <div class="items-list">\n                                <div class="item-row grid-groccery">\n                                    <input type="text" placeholder="Goods title" class="item-title" required>\n                                    <select class="item-type-select">\n                                        <option value="weight">per Kilogram</option>\n                                        <option value="item">per Item</option>\n                                    </select>\n                                    <input type="number" step="0.01" placeholder="Price" class="item-price" required>\n                                    <input type="number" step="0.01" placeholder="Quantity" class="item-quantity" required>\n                                    <input type="number" step="0.01" value="0" placeholder="Discount (flat)" class="item-discount">\n                                    <button type="button" class="remove-item-btn" style="display:none;">X</button>\n                                </div>\n                            </div>\n                            <button type="button" class="add-item-btn">+ Add Item</button>';
                        break;
                      case "Doctors fee & Medical Test":
                        n +=
                          '\n                            <div class="item-row grid-doctor-fee">\n                                <input type="text" placeholder="Patient Name" class="patient-name">\n                                <input type="text" placeholder="Doctor Name" class="doctor-name">\n                                <input type="text" placeholder="Doctor Type" class="doctor-type">\n                                <input type="number" step="0.01" placeholder="Doctor Visit Fee" class="doctor-fee" required>\n                            </div>\n                            <h5 style="margin-top:20px;">Medical Tests</h5>\n                            <div class="items-list">\n                                <div class="item-row grid-doctor-test">\n                                    <input type="text" placeholder="Test Title" class="item-title">\n                                    <input type="number" step="0.01" placeholder="Test Price" class="item-price">\n                                    <button type="button" class="remove-item-btn" style="display:none;">X</button>\n                                </div>\n                            </div>\n                            <button type="button" class="add-item-btn">+ Add Test</button>\n                             <div class="item-row" style="margin-top: 15px;">\n                                <input type="number" step="0.01" value="0" placeholder="Flat Discount on Total Tests" class="total-test-discount">\n                            </div>';
                        break;
                      case "Shopping":
                      case "Personal Snacks":
                      case "Salon and Beauty Parlor":
                        n +=
                          '\n                            <div class="items-list">\n                                <div class="item-row grid-shopping">\n                                    <input type="text" placeholder="Product title" class="item-title" required>\n                                    <input type="number" step="0.01" placeholder="Item price" class="item-price" required>\n                                    <input type="number" value="1" placeholder="Quantity" class="item-quantity" required>\n                                    <button type="button" class="remove-item-btn" style="display:none;">X</button>\n                                </div>\n                            </div>\n                            <button type="button" class="add-item-btn">+ Add Item</button>';
                        break;
                      case "Transport Cost":
                        n +=
                          '\n                            <div class="items-list">\n                                <div class="item-row grid-transport">\n                                    <input type="text" placeholder="Vehicle Title" class="item-vehicle" required>\n                                    <input type="text" placeholder="From" class="item-from" required>\n                                    <input type="text" placeholder="To" class="item-to" required>\n                                    <input type="number" step="0.01" placeholder="Fare" class="item-fare" required>\n                                    <input type="number" value="1" placeholder="Quantity" class="item-quantity" required>\n                                    <button type="button" class="remove-item-btn" style="display:none;">X</button>\n                                </div>\n                            </div>\n                            <button type="button" class="add-item-btn">+ Add Trip</button>';
                        break;
                      case "Tour & Hangouts":
                        n +=
                          '\n                            <div class="items-list">\n                                <div class="item-row grid-tour">\n                                    <select class="item-type-select">\n                                        <option value="transport">Transport</option>\n                                        <option value="food">Food</option>\n                                        <option value="ticket">Ticket</option>\n                                    </select>\n                                    <input type="text" placeholder="Title (e.g., Bus, Lunch, Museum)" class="item-title" required>\n                                    <input type="number" step="0.01" placeholder="Price/Fare per person" class="item-price" required>\n                                    <input type="number" value="1" placeholder="Persons / Quantity" class="item-quantity" required>\n                                    <button type="button" class="remove-item-btn" style="display:none;">X</button>\n                                </div>\n                            </div>\n                            <button type="button" class="add-item-btn">+ Add Expense Item</button>';
                        break;
                      case "Home Rent":
                        n +=
                          '<div class="item-row grid-home-rent">\n                                    <input type="text" placeholder="Month of rent title" class="item-title" required>\n                                    <input type="number" step="0.01" placeholder="Rent amount" class="item-rent" required>\n                                    <input type="number" value="1" placeholder="Amount of months" class="item-months" required>\n                                </div>';
                        break;
                      case "Gas & Electricity bills":
                        n +=
                          '<select id="bill-type-select" class="form-group" style="margin-bottom:15px; padding:10px; border: 1px solid var(--border-color); border-radius: 4px;">\n                                    <option value="gas">Gas Bill</option>\n                                    <option value="electricity">Electricity Bill</option>\n                                </select>\n                                <div id="bill-details"></div>';
                        break;
                      case "Phone and WIFI bills":
                        n +=
                          '<select id="bill-type-select" class="form-group" style="margin-bottom:15px; padding:10px; border: 1px solid var(--border-color); border-radius: 4px;">\n                                    <option value="wifi">WIFI Bill</option>\n                                    <option value="phone">Phone Recharge</option>\n                                </select>\n                                <div id="bill-details"></div>';
                        break;
                      case "Lend, Donate & Gift":
                        n +=
                          '<select id="lend-gift-type-select" class="form-group" style="margin-bottom:15px; padding:10px; border: 1px solid var(--border-color); border-radius: 4px;">\n                                    <option value="lend">Lend</option>\n                                    <option value="donate">Donate</option>\n                                    <option value="gift">Gift</option>\n                                </select>\n                                <div id="lend-gift-details"></div>';
                        break;
                      case "Loan repayment": {
                        const activeLoans = getActiveLoans();
                        if (activeLoans.length > 0) {
                          const opts = activeLoans
                            .map(
                              (l) =>
                                `<option value="${l.id}">${l.loanPerson} (remaining: ${l.remaining.toFixed(2)})</option>`,
                            )
                            .join("");
                          n += `<div class="item-row grid-loan"><select class="item-loan-select" style="flex:1;padding:10px;border:1px solid var(--border-color);border-radius:4px;">${opts}</select><input type="number" step="0.01" placeholder="Amount" class="item-amount" required></div>`;
                        } else {
                          n +=
                            '<div class="item-row grid-loan">\n                                    <input type="text" placeholder="Paying whom (name)" class="item-to" required>\n                                    <input type="number" step="0.01" placeholder="Amount" class="item-amount" required>\n                                </div>';
                        }
                        break;
                      }
                      case "Educational Expense":
                        n += `<select id="educational-expense-type-select" class="form-group" style="margin-bottom:15px; padding:10px; border: 1px solid var(--border-color); border-radius: 4px;">
                                    <option value="academic">Academic</option>
                                    <option value="educational_goods">Educational Goods</option>
                                </select>
                                <div id="educational-expense-details"></div>`;
                        break;
                      case "Gardening":
                        n +=
                          '\n                            <div class="items-list">\n                                <div class="item-row grid-gardening">\n                                    <input type="text" placeholder="Item Title" class="item-title" required>\n                                    <input type="number" step="0.01" placeholder="Item Price" class="item-price" required>\n                                    <input type="number" value="1" placeholder="Quantity" class="item-quantity" required>\n                                    <button type="button" class="remove-item-btn" style="display:none;">X</button>\n                                </div>\n                            </div>\n                            <button type="button" class="add-item-btn">+ Add Item</button>\n                            <div class="item-row" style="margin-top:15px;">\n                                <input type="number" step="0.01" value="0" placeholder="Flat Discount on All Products" class="total-flat-discount" style="width:100%;">\n                            </div>';
                        break;
                      case "Sweets and Bakery":
                        n +=
                          '\n                            <div class="items-list">\n                                <div class="item-row grid-sweets">\n                                    <input type="text" placeholder="Item Title" class="item-title" required>\n                                    <select class="item-unit-select" style="padding:8px;border:1px solid var(--border-color);border-radius:4px;"><option value="kg">per Kg</option><option value="liter">per Liter</option><option value="item">per Item</option></select>\n                                    <input type="number" step="0.01" placeholder="Item Price" class="item-price" required>\n                                    <input type="number" step="0.01" value="1" placeholder="Quantity" class="item-quantity" required>\n                                    <button type="button" class="remove-item-btn" style="display:none;">X</button>\n                                </div>\n                            </div>\n                            <button type="button" class="add-item-btn">+ Add Item</button>\n                            <div class="item-row" style="margin-top:15px;">\n                                <input type="number" step="0.01" value="0" placeholder="Flat Discount on All Products" class="total-flat-discount" style="width:100%;">\n                            </div>';
                        break;
                      case "Others Subscription":
                        n +=
                          '\n                            <div class="items-list">\n                                <div class="item-row grid-subscription">\n                                    <input type="text" placeholder="Title" class="item-title" required>\n                                    <input type="text" placeholder="Month Name" class="item-month" required>\n                                    <input type="number" step="0.01" placeholder="Amount" class="item-amount" required>\n                                    <button type="button" class="remove-item-btn" style="display:none;">X</button>\n                                </div>\n                            </div>\n                            <button type="button" class="add-item-btn">+ Add Subscription</button>';
                        break;
                      case "Professional Expense":
                      case "Others":
                        n +=
                          '\n                            <div class="items-list">\n                                <div class="item-row grid-others">\n                                    <input type="text" placeholder="Title" class="item-title" required>\n                                    <input type="number" step="0.01" placeholder="Amount" class="item-amount" required>\n                                    <button type="button" class="remove-item-btn" style="display:none;">X</button>\n                                </div>\n                            </div>\n                            <button type="button" class="add-item-btn">+ Add Item</button>';
                    }
                  })(),
                  n)),
            (calculatorContainer.innerHTML = n),
            attachDynamicHandlers());
        };
        const buildMonthEntriesHtml = (year, month) => {
            const monthTransactions = transactions
              .filter((t) => {
                const date = new Date(t.date);
                return date.getFullYear() === year && date.getMonth() === month;
              })
              .sort((a, b) => new Date(b.date) - new Date(a.date));

            if (monthTransactions.length === 0) return "";

            const groupedByDate = monthTransactions.reduce((acc, t) => {
              const dateKey = new Date(t.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              });
              if (!acc[dateKey]) acc[dateKey] = [];
              acc[dateKey].push(t);
              return acc;
            }, {});

            let html = "";
            for (const date in groupedByDate) {
              const dailyTotalExpense = groupedByDate[date]
                .filter((t) => t.type === "expense")
                .reduce((sum, t) => sum + t.total, 0);

              const totalHtml =
                dailyTotalExpense > 0
                  ? `<span class="daily-total">Expense: -${formatToIndianCurrency(
                      dailyTotalExpense,
                    )} BDT</span>`
                  : "";

              html += `<div class="date-group">
                            <h2 class="date-header">
                                <span>${date}</span>
                                ${totalHtml}
                            </h2>
                            <hr class="section-hr" style="margin-bottom:15px;">`;

              groupedByDate[date].forEach((t) => {
                html += `
                        <div class="entry ${t.type}" data-id="${t.id}">
                             <button class="delete-btn" title="Delete Entry">&times;</button>
                            <div class="entry-header">
                                <span class="entry-category">${
                                  t.category || "Income"
                                }</span>
                                <span class="entry-total">${
                                  t.type === "income" ? "+" : "-"
                                } ${formatToIndianCurrency(t.total)} BDT</span>
                            </div>
                            <div class="entry-details">${formatEntryDetails(
                              t,
                            )}</div>
                            <button class="edit-btn" title="Edit Entry">Edit</button>
                        </div>`;
              });
              html += `</div>`;
            }
            return html;
          },
          renderEntries = (year, month) => {
            currentMonthHeader.textContent = `${new Date(
              year,
              month,
            ).toLocaleString("en-US", { month: "long", year: "numeric" })}`;

            if (transactions.length === 0) {
              entriesContainer.innerHTML = `<p style="text-align:center; color: var(--light-text); font-size: 1.2em;">No transactions yet. Add a new one to get started!</p>`;
              return;
            }

            const currentHtml =
              buildMonthEntriesHtml(year, month) ||
              `<p style="text-align:center; color: var(--light-text);">No transactions for this month.</p>`;

            let historyHtml = "";
            for (let i = 1; i <= 3; i++) {
              let m = month - i;
              let y = year;
              while (m < 0) {
                m += 12;
                y -= 1;
              }
              const monthHtml = buildMonthEntriesHtml(y, m);
              if (!monthHtml) continue;
              const label = new Date(y, m).toLocaleString("en-US", {
                month: "long",
                year: "numeric",
              });
              const totals = transactions
                .filter((t) => {
                  const d = new Date(t.date);
                  return d.getFullYear() === y && d.getMonth() === m;
                })
                .reduce(
                  (acc, t) => {
                    if (t.type === "income") acc.income += t.total;
                    else if (t.type === "expense") acc.expense += t.total;
                    return acc;
                  },
                  { income: 0, expense: 0 },
                );
              const totalsHtml = `<span class="month-history-totals">
                  <span class="month-history-income">+${formatToIndianCurrency(totals.income)} BDT</span>
                  <span class="separator">|</span>
                  <span class="month-history-expense">-${formatToIndianCurrency(totals.expense)} BDT</span>
                </span>`;
              historyHtml += `<details class="month-history"><summary class="month-history-summary"><span class="month-history-label">${label}</span>${totalsHtml}</summary><div class="month-history-body">${monthHtml}</div></details>`;
            }

            entriesContainer.innerHTML = currentHtml + historyHtml;
          },
          renderSummaries = (e, t) => {
            monthlySummaryTitle.textContent = `Summary for ${new Date(
              e,
              t,
            ).toLocaleString("en-US", { month: "long", year: "numeric" })}`;
            const n = getSummaryData(
              transactions.filter((n) => {
                const o = new Date(n.date);
                return o.getFullYear() === e && o.getMonth() === t;
              }),
            );
            ((monthlySummaryTable.innerHTML = generateSummaryTableHTML(n)),
              (yearlySummaryTitle.textContent = `Summary for ${e}`));
            const o = getSummaryData(
              transactions.filter((t) => new Date(t.date).getFullYear() === e),
            );
            yearlySummaryTable.innerHTML = generateSummaryTableHTML(o);
          },
          renderFooterSummary = () => {
            const e = new Date(),
              t = [[], [], []];
            for (let n = 0; n < 12; n++) {
              const o = new Date(e.getFullYear(), e.getMonth() - n, 1),
                r = o.getFullYear(),
                a = o.getMonth(),
                i = transactions.filter((e) => {
                  const t = new Date(e.date);
                  return t.getFullYear() === r && t.getMonth() === a;
                }),
                l = i
                  .filter((e) => "income" === e.type)
                  .reduce((e, t) => e + t.total, 0),
                s = i
                  .filter((e) => "expense" === e.type)
                  .reduce((e, t) => e + t.total, 0),
                c = `<p>\n                    <strong>${o.toLocaleString(
                  "en-US",
                  { month: "short", year: "2-digit" },
                )}:</strong> \n                    <span>\n                        <span class="income-amount">${new Intl.NumberFormat(
                  "en-IN",
                ).format(
                  l.toFixed(0),
                )}</span> | \n                        <span class="expense-amount">${new Intl.NumberFormat(
                  "en-IN",
                ).format(
                  s.toFixed(0),
                )}</span>\n                    </span>\n                   </p>`;
              n < 4 ? t[0].push(c) : n < 8 ? t[1].push(c) : t[2].push(c);
            }
            const n = ["Latest 4 Months", "5-8 Months Ago", "9-12 Months Ago"];
            let o = "";
            for (let e = 0; e < 3; e++)
              o += `<div class="footer-column">\n                            <h4>${
                n[e]
              }</h4>\n                            ${t[e].join(
                "",
              )}\n                         </div>`;
            footerSummary.innerHTML = o;
          };

        // --- Event Handlers & Logic ---
        const resetEditMode = () => {
          editingId = null;
          document.getElementById("form-title").textContent = "Add New Transaction";
          document.getElementById("form-submit-btn").textContent = "Add Transaction";
          document.getElementById("cancel-edit-btn").style.display = "none";
          transactionForm.reset();
          transactionDateInput.value = localToday();
          renderCalculator();
        };

        const handleFormSubmit = async (e) => {
          e.preventDefault();
          const date = transactionDateInput.value;
          const type = transactionTypeSelect.value;
          const txData = {
            id: editingId !== null ? editingId : Date.now(),
            date,
            type,
            details: [],
            total: 0,
          };
          if (type === "income") {
            txData.category = "Income";
            const title = calculatorContainer.querySelector(".item-title").value;
            const amount = parseFloat(calculatorContainer.querySelector(".item-amount").value);
            const isLoan = document.getElementById("income-is-loan")?.checked || false;
            txData.details.push({ title, amount, isLoan });
            txData.total = amount;
          } else {
            txData.category = categorySelect.value;
            const calculation = calculateExpense(txData.category);
            txData.details = calculation.details;
            txData.total = calculation.total;
          }
          if (isNaN(txData.total) || txData.total <= 0) {
            alert("Please check your inputs. The total amount is invalid.");
            return;
          }
          try {
            if (editingId !== null) {
              await updateTransaction(txData);
              window.transactions = transactions = transactions.map(t => t.id === editingId ? txData : t);
              syncUpdate(txData);
            } else {
              await addTransaction(txData);
              transactions.push(txData);
              syncAdd(txData);
            }
            renderApp();
            if (window.updateKeywordFooterNote) window.updateKeywordFooterNote();
            resetEditMode();
          } catch (error) {
            console.error("Failed to save transaction:", error);
            alert("Error: Could not save the transaction to the database.");
          }
        };

        const handleEntryAction = async (e) => {
          if (e.target.classList.contains("delete-btn")) {
            if (
              confirm(
                "Are you sure you want to delete this entry? This action is permanent.",
              )
            ) {
              const entryEl = e.target.closest(".entry");
              const id = parseInt(entryEl.dataset.id);
              try {
                await deleteTransaction(id);
                window.transactions = transactions = transactions.filter(
                  (t) => t.id !== id,
                );
                syncDelete(id);
                renderApp();
                if (window.updateKeywordFooterNote)
                  window.updateKeywordFooterNote();
              } catch (error) {
                console.error("Failed to delete transaction:", error);
                alert(
                  "Error: Could not delete the transaction from the database.",
                );
              }
            }
          } else if (e.target.classList.contains("edit-btn")) {
            const entryEl = e.target.closest(".entry");
            const id = parseInt(entryEl.dataset.id);
            const transactionToEdit = transactions.find((t) => t.id === id);
            if (!transactionToEdit) return;

            // Enter edit mode — do NOT delete the transaction yet
            editingId = id;
            document.getElementById("form-title").textContent = "Edit Transaction";
            document.getElementById("form-submit-btn").textContent = "Update Transaction";
            document.getElementById("cancel-edit-btn").style.display = "block";

            document.getElementById("form-section").scrollIntoView({ behavior: "smooth" });
            transactionDateInput.value = normalizeDate(transactionToEdit.date);
            transactionTypeSelect.value = transactionToEdit.type;
            transactionTypeSelect.dispatchEvent(new Event("change"));

            if (transactionToEdit.type === "expense") {
              categorySelect.value = transactionToEdit.category;
              categorySelect.dispatchEvent(new Event("change"));
            }

            setTimeout(() => {
              populateCalculator(transactionToEdit);
            }, 100);
          }
        };

        const calculateExpense = (e) => {
          const t = { details: [], total: 0 },
            n = Array.from(calculatorContainer.querySelectorAll(".item-row"));
          switch (e) {
            case "Medicines":
              Array.from(
                calculatorContainer.querySelectorAll(".items-list .item-row"),
              ).forEach((e) => {
                const n = e.querySelector(".item-title").value,
                  o = parseFloat(e.querySelector(".item-price").value),
                  r = parseFloat(e.querySelector(".item-quantity").value),
                  a = parseFloat(e.querySelector(".item-discount").value),
                  i = o * r * (1 - a / 100);
                (t.details.push({
                  title: n,
                  price: o,
                  quantity: r,
                  discount: a,
                  itemTotal: i,
                }),
                  (t.total += i));
              });
              {
                const roundingEl =
                  calculatorContainer.querySelector(".medicine-rounding");
                const rounding = roundingEl
                  ? parseFloat(roundingEl.value) || 0
                  : 0;
                if (rounding !== 0) {
                  t.total += rounding;
                  t.details.push({ type: "Rounding", amount: rounding });
                }
              }
              break;
            case "Groccery":
            case "Milk, Fishs & Meats":
            case "Vegetabls":
            case "Fruits":
              n.forEach((e) => {
                const n = e.querySelector(".item-title").value,
                  o = e.querySelector(".item-type-select").value,
                  r = parseFloat(e.querySelector(".item-price").value),
                  a = parseFloat(e.querySelector(".item-quantity").value),
                  i = parseFloat(e.querySelector(".item-discount").value),
                  s = r * a - i;
                (t.details.push({
                  title: n,
                  type: o,
                  price: r,
                  quantity: a,
                  discount: i,
                  itemTotal: s,
                }),
                  (t.total += s));
              });
              break;
            case "Doctors fee & Medical Test":
              const o =
                  calculatorContainer.querySelector(".patient-name").value,
                r = calculatorContainer.querySelector(".doctor-name").value,
                a = calculatorContainer.querySelector(".doctor-type").value,
                i = parseFloat(
                  calculatorContainer.querySelector(".doctor-fee").value,
                );
              (t.details.push({
                type: "Doctor Fee",
                patientName: o,
                doctorName: r,
                doctorType: a,
                fee: i,
              }),
                (t.total += i));
              let s = 0;
              const l = calculatorContainer.querySelectorAll(
                  ".items-list .item-row",
                ),
                c = [];
              l.forEach((e) => {
                const t = e.querySelector(".item-title").value,
                  n = parseFloat(e.querySelector(".item-price").value);
                t && n > 0 && (c.push({ title: t, price: n }), (s += n));
              });
              const d = parseFloat(
                  calculatorContainer.querySelector(".total-test-discount")
                    .value,
                ),
                u = s - d;
              (t.details.push({
                type: "Medical Tests",
                items: c,
                testsTotal: s,
                testDiscount: d,
                payableTests: u,
              }),
                (t.total += u));
              break;
            case "Shopping":
            case "Personal Snacks":
            case "Salon and Beauty Parlor":
              n.forEach((e) => {
                const n = e.querySelector(".item-title").value,
                  o = parseFloat(e.querySelector(".item-price").value),
                  r = parseFloat(e.querySelector(".item-quantity").value),
                  a = o * r;
                (t.details.push({
                  title: n,
                  price: o,
                  quantity: r,
                  itemTotal: a,
                }),
                  (t.total += a));
              });
              break;
            case "Transport Cost":
              n.forEach((e) => {
                const vehicle = e.querySelector(".item-vehicle").value,
                  from = e.querySelector(".item-from").value,
                  to = e.querySelector(".item-to").value,
                  fare = parseFloat(e.querySelector(".item-fare").value),
                  qty =
                    parseFloat(e.querySelector(".item-quantity").value) || 1,
                  itemTotal = fare * qty;
                (t.details.push({
                  vehicle,
                  from,
                  to,
                  fare,
                  quantity: qty,
                  itemTotal,
                }),
                  (t.total += itemTotal));
              });
              break;
            case "Tour & Hangouts":
              n.forEach((e) => {
                const n = e.querySelector(".item-type-select").value,
                  o = e.querySelector(".item-title").value,
                  r = parseFloat(e.querySelector(".item-price").value),
                  a = parseFloat(e.querySelector(".item-quantity").value),
                  i = r * a;
                (t.details.push({
                  type: n,
                  title: o,
                  price: r,
                  quantity: a,
                  itemTotal: i,
                }),
                  (t.total += i));
              });
              break;
            case "Home Rent":
              const m = n[0].querySelector(".item-title").value,
                p = parseFloat(n[0].querySelector(".item-rent").value),
                y = parseFloat(n[0].querySelector(".item-months").value);
              ((t.total = p * y),
                t.details.push({
                  title: m,
                  rent: p,
                  months: y,
                  total: t.total,
                }));
              break;
            case "Gas & Electricity bills":
              "gas" === document.getElementById("bill-type-select").value
                ? (() => {
                    const e = parseFloat(
                        n[0].querySelector(".item-price").value,
                      ),
                      o = parseFloat(
                        n[0].querySelector(".item-quantity").value,
                      ),
                      r = parseFloat(n[0].querySelector(".item-labour").value);
                    ((t.total = e * o + r),
                      t.details.push({
                        type: "Gas",
                        price: e,
                        quantity: o,
                        labour: r,
                        total: t.total,
                      }));
                  })()
                : (() => {
                    const e = n[0].querySelector(".item-title").value,
                      o = parseFloat(n[0].querySelector(".item-amount").value);
                    ((t.total = o),
                      t.details.push({
                        type: "Electricity",
                        title: e,
                        amount: o,
                      }));
                  })();
              break;
            case "Phone and WIFI bills":
              "wifi" === document.getElementById("bill-type-select").value
                ? (() => {
                    const e = n[0].querySelector(".item-title").value,
                      o = parseFloat(n[0].querySelector(".item-price").value),
                      r = parseFloat(
                        n[0].querySelector(".item-quantity").value,
                      );
                    ((t.total = o * r),
                      t.details.push({
                        type: "WIFI",
                        title: e,
                        price: o,
                        quantity: r,
                        total: t.total,
                      }));
                  })()
                : (() => {
                    const e = n[0].querySelector(".item-number").value,
                      o = parseFloat(n[0].querySelector(".item-price").value),
                      r = parseFloat(
                        n[0].querySelector(".item-discount").value,
                      );
                    ((t.total = o - r),
                      t.details.push({
                        type: "Phone",
                        number: e,
                        amount: o,
                        discount: r,
                        total: t.total,
                      }));
                  })();
              break;
            case "Lend, Donate & Gift":
              "lend" === document.getElementById("lend-gift-type-select").value
                ? (() => {
                    const e = n[0].querySelector(".item-person").value,
                      o = parseFloat(n[0].querySelector(".item-amount").value);
                    ((t.total = o),
                      t.details.push({ type: "Lend", person: e, amount: o }));
                  })()
                : "donate" ===
                    document.getElementById("lend-gift-type-select").value
                  ? (() => {
                      const e = n[0].querySelector(".item-person").value,
                        o = parseFloat(
                          n[0].querySelector(".item-amount").value,
                        );
                      ((t.total = o),
                        t.details.push({
                          type: "Donate",
                          person: e,
                          amount: o,
                        }));
                    })()
                  : n.forEach((e) => {
                      const n = e.querySelector(".item-title").value,
                        o = parseFloat(e.querySelector(".item-price").value),
                        r = parseFloat(e.querySelector(".item-quantity").value),
                        a = o * r;
                      (t.details.push({
                        type: "Gift",
                        title: n,
                        price: o,
                        quantity: r,
                        itemTotal: a,
                      }),
                        (t.total += a));
                    });
              break;
            case "Loan repayment": {
              const loanSelect = n[0].querySelector(".item-loan-select");
              const loanTo = loanSelect
                ? loanSelect.options[loanSelect.selectedIndex]?.text.split(
                    " (",
                  )[0] || ""
                : n[0].querySelector(".item-to")?.value || "";
              const loanId = loanSelect ? loanSelect.value : null;
              const repayAmt = parseFloat(
                n[0].querySelector(".item-amount").value,
              );
              t.total = repayAmt;
              const repayDetail = { to: loanTo, amount: repayAmt };
              if (loanId) repayDetail.loanId = loanId;
              t.details.push(repayDetail);
              break;
            }
            case "Educational Expense":
              const subType = document.getElementById(
                "educational-expense-type-select",
              ).value;
              if (subType === "academic") {
                const person = n[0].querySelector(".item-person").value;
                const feeType = n[0].querySelector(".item-fee-type").value;
                const amount = parseFloat(
                  n[0].querySelector(".item-amount").value,
                );
                t.total = amount;
                t.details.push({
                  subType: "Academic",
                  person,
                  feeType,
                  amount,
                });
              } else {
                // educational_goods
                n.forEach((row) => {
                  const title = row.querySelector(".item-title").value;
                  const price = parseFloat(
                    row.querySelector(".item-price").value,
                  );
                  const quantity = parseFloat(
                    row.querySelector(".item-quantity").value,
                  );
                  const discount = parseFloat(
                    row.querySelector(".item-discount").value,
                  );
                  const itemTotal = price * quantity - discount;
                  t.details.push({
                    subType: "Educational Good",
                    title,
                    price,
                    quantity,
                    discount,
                    itemTotal,
                  });
                  t.total += itemTotal;
                });
              }
              break;
            case "Gardening":
              Array.from(
                calculatorContainer.querySelectorAll(".items-list .item-row"),
              ).forEach((e) => {
                const title = e.querySelector(".item-title").value,
                  price = parseFloat(e.querySelector(".item-price").value),
                  qty =
                    parseFloat(e.querySelector(".item-quantity").value) || 1,
                  itemTotal = price * qty;
                t.details.push({ title, price, quantity: qty, itemTotal });
                t.total += itemTotal;
              });
              {
                const discEl = calculatorContainer.querySelector(
                  ".total-flat-discount",
                );
                const disc = discEl ? parseFloat(discEl.value) || 0 : 0;
                if (disc > 0) {
                  t.total -= disc;
                  t.details.push({ type: "Flat Discount", discount: disc });
                }
              }
              break;
            case "Sweets and Bakery":
              Array.from(
                calculatorContainer.querySelectorAll(".items-list .item-row"),
              ).forEach((e) => {
                const title = e.querySelector(".item-title").value,
                  unit = e.querySelector(".item-unit-select")?.value || "item",
                  price = parseFloat(e.querySelector(".item-price").value),
                  qty =
                    parseFloat(e.querySelector(".item-quantity").value) || 1,
                  itemTotal = price * qty;
                t.details.push({
                  title,
                  unit,
                  price,
                  quantity: qty,
                  itemTotal,
                });
                t.total += itemTotal;
              });
              {
                const discEl = calculatorContainer.querySelector(
                  ".total-flat-discount",
                );
                const disc = discEl ? parseFloat(discEl.value) || 0 : 0;
                if (disc > 0) {
                  t.total -= disc;
                  t.details.push({ type: "Flat Discount", discount: disc });
                }
              }
              break;
            case "Others Subscription":
              n.forEach((e) => {
                const title = e.querySelector(".item-title").value,
                  month = e.querySelector(".item-month").value,
                  amount = parseFloat(e.querySelector(".item-amount").value);
                t.details.push({ title, month, amount });
                t.total += amount;
              });
              break;
            case "Professional Expense":
            case "Others":
              n.forEach((e) => {
                const n = e.querySelector(".item-title").value,
                  o = parseFloat(e.querySelector(".item-amount").value);
                (t.details.push({ title: n, amount: o }), (t.total += o));
              });
          }
          return t;
        };

        const populateCalculator = (tx) => {
          const details = tx.details;
          if (!details) return;

          if (tx.type === "income") {
            calculatorContainer.querySelector(".item-title").value =
              details[0]?.title || "";
            calculatorContainer.querySelector(".item-amount").value =
              details[0]?.amount || "";
            const isLoanCb = document.getElementById("income-is-loan");
            if (isLoanCb) isLoanCb.checked = details[0]?.isLoan || false;
            return;
          }

          const populateList = (selector, details, populator) => {
            const list = calculatorContainer.querySelector(selector);
            if (!list) return;
            const template = list.querySelector(".item-row");
            if (!template) return;
            list.innerHTML = "";
            if (!details || details.length === 0) {
              list.appendChild(template.cloneNode(true)); // Add a blank one back
              return;
            }
            details.forEach((detail, index) => {
              const newItem = template.cloneNode(true);
              populator(newItem, detail);
              const removeBtn = newItem.querySelector(".remove-item-btn");
              if (removeBtn) {
                removeBtn.style.display =
                  details.length > 1 ? "inline-block" : "none";
                removeBtn.onclick = () => newItem.remove();
              }
              list.appendChild(newItem);
            });
          };

          switch (tx.category) {
            case "Groccery":
            case "Milk, Fishs & Meats":
            case "Vegetabls":
            case "Fruits":
              populateList(".items-list", details, (row, detail) => {
                row.querySelector(".item-title").value = detail.title;
                row.querySelector(".item-type-select").value = detail.type;
                row.querySelector(".item-price").value = detail.price;
                row.querySelector(".item-quantity").value = detail.quantity;
                row.querySelector(".item-discount").value = detail.discount;
              });
              break;
            case "Doctors fee & Medical Test": {
              const feeDetail = details.find((d) => d.type === "Doctor Fee");
              const testDetail = details.find(
                (d) => d.type === "Medical Tests",
              );
              if (feeDetail) {
                calculatorContainer.querySelector(".patient-name").value =
                  feeDetail.patientName;
                calculatorContainer.querySelector(".doctor-name").value =
                  feeDetail.doctorName;
                calculatorContainer.querySelector(".doctor-type").value =
                  feeDetail.doctorType;
                calculatorContainer.querySelector(".doctor-fee").value =
                  feeDetail.fee;
              }
              if (testDetail && testDetail.items) {
                populateList(".items-list", testDetail.items, (row, detail) => {
                  row.querySelector(".item-title").value = detail.title;
                  row.querySelector(".item-price").value = detail.price;
                });
                calculatorContainer.querySelector(
                  ".total-test-discount",
                ).value = testDetail.testDiscount;
              }
              break;
            }
            case "Medicines":
              populateList(
                ".items-list",
                details.filter((d) => !d.type),
                (row, detail) => {
                  row.querySelector(".item-title").value = detail.title;
                  row.querySelector(".item-price").value = detail.price;
                  row.querySelector(".item-quantity").value = detail.quantity;
                  row.querySelector(".item-discount").value = detail.discount;
                },
              );
              {
                const roundingDetail = details.find(
                  (d) => d.type === "Rounding",
                );
                const roundEl =
                  calculatorContainer.querySelector(".medicine-rounding");
                if (roundEl && roundingDetail)
                  roundEl.value = roundingDetail.amount;
              }
              break;
            case "Shopping":
            case "Personal Snacks":
            case "Salon and Beauty Parlor":
              populateList(".items-list", details, (row, detail) => {
                row.querySelector(".item-title").value = detail.title;
                row.querySelector(".item-price").value = detail.price;
                row.querySelector(".item-quantity").value = detail.quantity;
              });
              break;
            case "Transport Cost":
              populateList(".items-list", details, (row, detail) => {
                row.querySelector(".item-vehicle").value = detail.vehicle;
                row.querySelector(".item-from").value = detail.from;
                row.querySelector(".item-to").value = detail.to;
                row.querySelector(".item-fare").value = detail.fare;
                if (row.querySelector(".item-quantity"))
                  row.querySelector(".item-quantity").value =
                    detail.quantity || 1;
              });
              break;
            case "Tour & Hangouts":
              populateList(".items-list", details, (row, detail) => {
                row.querySelector(".item-type-select").value = detail.type;
                row.querySelector(".item-title").value = detail.title;
                row.querySelector(".item-price").value = detail.price;
                row.querySelector(".item-quantity").value = detail.quantity;
              });
              break;
            case "Home Rent": {
              const detail = details[0];
              if (!detail) break;
              const row = calculatorContainer.querySelector(".item-row");
              row.querySelector(".item-title").value = detail.title;
              row.querySelector(".item-rent").value = detail.rent;
              row.querySelector(".item-months").value = detail.months;
              break;
            }
            case "Gas & Electricity bills": {
              const detail = details[0];
              if (!detail) break;
              const select = document.getElementById("bill-type-select");
              select.value = detail.type.toLowerCase();
              select.dispatchEvent(new Event("change"));
              setTimeout(() => {
                const row = calculatorContainer.querySelector(".item-row");
                if (detail.type === "Gas") {
                  row.querySelector(".item-price").value = detail.price;
                  row.querySelector(".item-quantity").value = detail.quantity;
                  row.querySelector(".item-labour").value = detail.labour;
                } else {
                  row.querySelector(".item-title").value = detail.title;
                  row.querySelector(".item-amount").value = detail.amount;
                }
              }, 50);
              break;
            }
            case "Phone and WIFI bills": {
              const detail = details[0];
              if (!detail) break;
              const select = document.getElementById("bill-type-select");
              select.value = detail.type.toLowerCase();
              select.dispatchEvent(new Event("change"));
              setTimeout(() => {
                const row = calculatorContainer.querySelector(".item-row");
                if (detail.type === "WIFI") {
                  row.querySelector(".item-title").value = detail.title;
                  row.querySelector(".item-price").value = detail.price;
                  row.querySelector(".item-quantity").value = detail.quantity;
                } else {
                  row.querySelector(".item-number").value = detail.number;
                  row.querySelector(".item-price").value = detail.amount;
                  row.querySelector(".item-discount").value = detail.discount;
                }
              }, 50);
              break;
            }
            case "Lend, Donate & Gift": {
              const detailType = details[0]?.type;
              if (!detailType) break;
              const select = document.getElementById("lend-gift-type-select");
              select.value = detailType.toLowerCase();
              select.dispatchEvent(new Event("change"));
              setTimeout(() => {
                if (detailType === "Lend" || detailType === "Donate") {
                  const row = calculatorContainer.querySelector(".item-row");
                  row.querySelector(".item-person").value = details[0].person;
                  row.querySelector(".item-amount").value = details[0].amount;
                } else {
                  populateList(
                    "#lend-gift-details .items-list",
                    details,
                    (row, detail) => {
                      row.querySelector(".item-title").value = detail.title;
                      row.querySelector(".item-price").value = detail.price;
                      row.querySelector(".item-quantity").value =
                        detail.quantity;
                    },
                  );
                }
              }, 50);
              break;
            }
            case "Loan repayment": {
              const detail = details[0];
              if (!detail) break;
              const row = calculatorContainer.querySelector(".item-row");
              const toInput = row?.querySelector(".item-to");
              const loanSelect = row?.querySelector(".item-loan-select");
              if (toInput) toInput.value = detail.to || "";
              if (loanSelect && detail.loanId) loanSelect.value = detail.loanId;
              const amtEl = row?.querySelector(".item-amount");
              if (amtEl) amtEl.value = detail.amount;
              break;
            }
            case "Educational Expense": {
              const detailType = details[0]?.subType;
              if (!detailType) break;
              const select = document.getElementById(
                "educational-expense-type-select",
              );
              select.value =
                detailType === "Academic" ? "academic" : "educational_goods";
              select.dispatchEvent(new Event("change"));
              setTimeout(() => {
                if (detailType === "Academic") {
                  const row = calculatorContainer.querySelector(".item-row");
                  row.querySelector(".item-person").value = details[0].person;
                  row.querySelector(".item-fee-type").value =
                    details[0].feeType;
                  row.querySelector(".item-amount").value = details[0].amount;
                } else {
                  populateList(".items-list", details, (row, detail) => {
                    row.querySelector(".item-title").value = detail.title;
                    row.querySelector(".item-price").value = detail.price;
                    row.querySelector(".item-quantity").value = detail.quantity;
                    row.querySelector(".item-discount").value = detail.discount;
                  });
                }
              }, 50);
              break;
            }
            case "Gardening": {
              populateList(
                ".items-list",
                details.filter((d) => !d.type),
                (row, detail) => {
                  row.querySelector(".item-title").value = detail.title;
                  row.querySelector(".item-price").value = detail.price;
                  row.querySelector(".item-quantity").value = detail.quantity;
                },
              );
              const gDisc = details.find((d) => d.type === "Flat Discount");
              const gDiscEl = calculatorContainer.querySelector(
                ".total-flat-discount",
              );
              if (gDiscEl && gDisc) gDiscEl.value = gDisc.discount;
              break;
            }
            case "Sweets and Bakery": {
              populateList(
                ".items-list",
                details.filter((d) => !d.type),
                (row, detail) => {
                  row.querySelector(".item-title").value = detail.title;
                  if (row.querySelector(".item-unit-select"))
                    row.querySelector(".item-unit-select").value =
                      detail.unit || "item";
                  row.querySelector(".item-price").value = detail.price;
                  row.querySelector(".item-quantity").value = detail.quantity;
                },
              );
              const sDisc = details.find((d) => d.type === "Flat Discount");
              const sDiscEl = calculatorContainer.querySelector(
                ".total-flat-discount",
              );
              if (sDiscEl && sDisc) sDiscEl.value = sDisc.discount;
              break;
            }
            case "Others Subscription":
              populateList(".items-list", details, (row, detail) => {
                row.querySelector(".item-title").value = detail.title;
                if (row.querySelector(".item-month"))
                  row.querySelector(".item-month").value = detail.month;
                row.querySelector(".item-amount").value = detail.amount;
              });
              break;
            case "Professional Expense":
            case "Others":
              populateList(".items-list", details, (row, detail) => {
                row.querySelector(".item-title").value = detail.title;
                row.querySelector(".item-amount").value = detail.amount;
              });
              break;
          }
        };

        const attachDynamicHandlers = () => {
          const addItemBtn = calculatorContainer.querySelector(".add-item-btn");
          if (addItemBtn) {
            addItemBtn.onclick = () => {
              const list = calculatorContainer.querySelector(".items-list");
              const firstItem = list.querySelector(".item-row");
              const newItem = firstItem.cloneNode(true);
              newItem
                .querySelectorAll("input")
                .forEach((input) => (input.value = ""));
              if (newItem.querySelector(".item-quantity"))
                newItem.querySelector(".item-quantity").value = "1";
              if (newItem.querySelector(".item-discount"))
                newItem.querySelector(".item-discount").value = "0";
              const removeBtn = newItem.querySelector(".remove-item-btn");
              removeBtn.style.display = "inline-block";
              removeBtn.onclick = () => newItem.remove();
              list.appendChild(newItem);
            };
          }

          const isLoanCb = document.getElementById("income-is-loan");
          if (isLoanCb) {
            isLoanCb.addEventListener("change", () => {
              const titleInput =
                calculatorContainer.querySelector(".item-title");
              if (titleInput) {
                titleInput.placeholder = isLoanCb.checked
                  ? "Person / Organization Name (Lender)"
                  : "Income from (title)";
              }
            });
          }

          const billTypeSelect = document.getElementById("bill-type-select");
          if (billTypeSelect) {
            const renderBillDetails = () => {
              const billDetailsContainer =
                document.getElementById("bill-details");
              let html = "";
              if (billTypeSelect.value === "gas") {
                html = `<div class="item-row grid-gas-bill">
                                    <input type="number" step="0.01" placeholder="Cilinder price" class="item-price" required>
                                    <input type="number" value="1" placeholder="Quantity" class="item-quantity" required>
                                    <input type="number" step="0.01" value="0" placeholder="Labour cost" class="item-labour">
                                </div>`;
              } else if (billTypeSelect.value === "electricity") {
                html = `<div class="item-row grid-electricity-bill">
                                    <input type="text" placeholder="Title of the Month" class="item-title" required>
                                    <input type="number" step="0.01" placeholder="Bill amount" class="item-amount" required>
                                </div>`;
              } else if (billTypeSelect.value === "wifi") {
                html = `<div class="item-row grid-wifi-bill">
                                    <input type="text" placeholder="WIFI Bill month title" class="item-title" required>
                                    <input type="number" step="0.01" placeholder="Monthly bill amount" class="item-price" required>
                                    <input type="number" value="1" placeholder="Quantity of months" class="item-quantity" required>
                                </div>`;
              } else if (billTypeSelect.value === "phone") {
                html = `<div class="item-row grid-phone-bill">
                                    <input type="text" placeholder="Phone number" class="item-number" required>
                                    <input type="number" step="0.01" placeholder="Amount" class="item-price" required>
                                    <input type="number" step="0.01" value="0" placeholder="Discount" class="item-discount">
                                </div>`;
              }
              billDetailsContainer.innerHTML = html;
            };
            billTypeSelect.addEventListener("change", renderBillDetails);
            renderBillDetails();
          }

          const lendGiftTypeSelect = document.getElementById(
            "lend-gift-type-select",
          );
          if (lendGiftTypeSelect) {
            const renderLendGiftDetails = () => {
              const detailsContainer =
                document.getElementById("lend-gift-details");
              let html = "";
              if (
                lendGiftTypeSelect.value === "lend" ||
                lendGiftTypeSelect.value === "donate"
              ) {
                html = `<div class="item-row grid-lend-donate">
                                    <input type="text" placeholder="Person name" class="item-person" required>
                                    <input type="number" step="0.01" placeholder="Amount" class="item-amount" required>
                                </div>`;
                detailsContainer.innerHTML = html;
              } else {
                // gift
                html = `<div class="items-list">
                                    <div class="item-row grid-gift">
                                        <input type="text" placeholder="Gift title" class="item-title" required>
                                        <input type="number" step="0.01" placeholder="Item price" class="item-price" required>
                                        <input type="number" value="1" placeholder="Quantity" class="item-quantity" required>
                                        <button type="button" class="remove-item-btn" style="display:none;">X</button>
                                    </div>
                                </div>
                                <button type="button" class="add-item-btn">+ Add Gift</button>`;
                detailsContainer.innerHTML = html;
                const addGiftBtn =
                  detailsContainer.querySelector(".add-item-btn");
                if (addGiftBtn) {
                  addGiftBtn.onclick = () => {
                    const list = detailsContainer.querySelector(".items-list");
                    const firstItem = list.querySelector(".item-row");
                    const newItem = firstItem.cloneNode(true);
                    newItem
                      .querySelectorAll("input")
                      .forEach((input) => (input.value = ""));
                    if (newItem.querySelector(".item-quantity"))
                      newItem.querySelector(".item-quantity").value = "1";
                    const removeBtn = newItem.querySelector(".remove-item-btn");
                    removeBtn.style.display = "inline-block";
                    removeBtn.onclick = () => newItem.remove();
                    list.appendChild(newItem);
                  };
                }
              }
            };
            lendGiftTypeSelect.addEventListener(
              "change",
              renderLendGiftDetails,
            );
            renderLendGiftDetails();
          }

          const educationalExpenseTypeSelect = document.getElementById(
            "educational-expense-type-select",
          );
          if (educationalExpenseTypeSelect) {
            const renderEducationalExpenseDetails = () => {
              const detailsContainer = document.getElementById(
                "educational-expense-details",
              );
              let html = "";
              if (educationalExpenseTypeSelect.value === "academic") {
                html = `<div class="item-row grid-edu-academic">
                                  <input type="text" placeholder="Person for (Name)" class="item-person" required>
                                  <input type="text" placeholder="Fee Type (e.g., Admission, Monthly)" class="item-fee-type" required>
                                  <input type="number" step="0.01" placeholder="Fee Amount" class="item-amount" required>
                              </div>`;
                detailsContainer.innerHTML = html;
              } else {
                // educational_goods
                html = `<div class="items-list">
                                  <div class="item-row grid-edu-goods">
                                      <input type="text" placeholder="Goods title" class="item-title" required>
                                      <input type="number" step="0.01" placeholder="Price" class="item-price" required>
                                      <input type="number" value="1" placeholder="Quantity" class="item-quantity" required>
                                      <input type="number" step="0.01" value="0" placeholder="Discount (flat)" class="item-discount">
                                      <button type="button" class="remove-item-btn" style="display:none;">X</button>
                                  </div>
                              </div>
                              <button type="button" class="add-item-btn">+ Add Item</button>`;
                detailsContainer.innerHTML = html;

                const addEduItemBtn =
                  detailsContainer.querySelector(".add-item-btn");
                if (addEduItemBtn) {
                  addEduItemBtn.onclick = () => {
                    const list = detailsContainer.querySelector(".items-list");
                    const firstItem = list.querySelector(".item-row");
                    const newItem = firstItem.cloneNode(true);
                    newItem
                      .querySelectorAll("input")
                      .forEach((input) => (input.value = ""));
                    if (newItem.querySelector(".item-quantity"))
                      newItem.querySelector(".item-quantity").value = "1";
                    if (newItem.querySelector(".item-discount"))
                      newItem.querySelector(".item-discount").value = "0";
                    const removeBtn = newItem.querySelector(".remove-item-btn");
                    removeBtn.style.display = "inline-block";
                    removeBtn.onclick = () => newItem.remove();
                    list.appendChild(newItem);
                  };
                }
              }
            };
            educationalExpenseTypeSelect.addEventListener(
              "change",
              renderEducationalExpenseDetails,
            );
            renderEducationalExpenseDetails();
          }
        };

        // --- Helper & Utility Functions ---
        const updateCurrentBalance = () => {
            const e = transactions
                .filter((e) => "income" === e.type)
                .reduce((e, t) => e + t.total, 0),
              t = transactions
                .filter((e) => "expense" === e.type)
                .reduce((e, t) => e + t.total, 0),
              n = e - t;
            ((currentBalanceEl.textContent = `${formatToIndianCurrency(n)} BDT`),
              (currentBalanceEl.style.color =
                n >= 0 ? "var(--success-color)" : "var(--danger-color)"));
          },
          formatEntryDetails = (e) => {
            let t = "<ul>";
            return (
              e.details.forEach((n) => {
                let o = "";
                ((o =
                  e.category === "Educational Expense" &&
                  n.subType === "Academic"
                    ? `<li>${n.feeType} for ${
                        n.person
                      }: ${formatToIndianCurrency(n.amount)}</li>`
                    : e.category === "Educational Expense" &&
                        n.subType === "Educational Good"
                      ? `<li>${n.title} (x${
                          n.quantity
                        }): ${formatToIndianCurrency(n.itemTotal)}</li>`
                      : n.title && n.amount
                        ? `<li>${n.title}: ${formatToIndianCurrency(n.amount)}</li>`
                        : n.title && n.itemTotal
                          ? `<li>${n.title} (x${
                              n.quantity || 1
                            }): ${formatToIndianCurrency(n.itemTotal)}</li>`
                          : n.vehicle
                            ? `<li>${n.vehicle} (${n.from} → ${n.to}) x${n.quantity || 1}: ${formatToIndianCurrency(n.itemTotal || n.fare)}</li>`
                            : "Doctor Fee" === n.type
                              ? `<li>Doctor Fee (${
                                  n.doctorName
                                }): ${formatToIndianCurrency(n.fee)}</li>`
                              : "Medical Tests" === n.type
                                ? `<li>Tests: ${formatToIndianCurrency(
                                    n.payableTests,
                                  )} (Total: ${n.testsTotal} - Discount: ${
                                    n.testDiscount
                                  })</li>`
                                : "Tour & Hangouts" === e.category &&
                                    n.itemTotal
                                  ? `<li>${n.type}: ${n.title} (x${
                                      n.quantity
                                    }) - ${formatToIndianCurrency(n.itemTotal)}</li>`
                                  : "Home Rent" === e.category && n.total
                                    ? `<li>${n.title} (x${n.months}): ${formatToIndianCurrency(
                                        n.total,
                                      )}</li>`
                                    : "Gas & Electricity bills" ===
                                          e.category && n.type === "Gas"
                                      ? `<li>Gas Bill (x${n.quantity}): ${formatToIndianCurrency(
                                          n.total,
                                        )}</li>`
                                      : "Gas & Electricity bills" ===
                                            e.category &&
                                          n.type === "Electricity"
                                        ? `<li>${n.title}: ${formatToIndianCurrency(n.amount)}</li>`
                                        : "Phone and WIFI bills" ===
                                              e.category && n.type === "WIFI"
                                          ? `<li>${n.title} (x${
                                              n.quantity
                                            }): ${formatToIndianCurrency(n.total)}</li>`
                                          : "Phone and WIFI bills" ===
                                                e.category && n.type === "Phone"
                                            ? `<li>Phone Recharge (${n.number}): ${formatToIndianCurrency(
                                                n.total,
                                              )}</li>`
                                            : n.to && n.amount
                                              ? `<li>Paid to ${n.to}: ${formatToIndianCurrency(
                                                  n.amount,
                                                )}</li>`
                                              : "Lend" === n.type
                                                ? `<li>Lent to ${n.person}: ${formatToIndianCurrency(
                                                    n.amount,
                                                  )}</li>`
                                                : "Donate" === n.type
                                                  ? `<li>Donated to ${n.person}: ${formatToIndianCurrency(
                                                      n.amount,
                                                    )}</li>`
                                                  : n.type === "Flat Discount"
                                                    ? `<li>Flat Discount: -${formatToIndianCurrency(n.discount)}</li>`
                                                    : n.type === "Rounding"
                                                      ? `<li>Rounding: ${n.amount >= 0 ? "+" : ""}${formatToIndianCurrency(n.amount)}</li>`
                                                      : n.month
                                                        ? `<li>${n.title} (${n.month}): ${formatToIndianCurrency(n.amount)}</li>`
                                                        : n.unit
                                                          ? `<li>${n.title} (${n.unit}) x${n.quantity}: ${formatToIndianCurrency(n.itemTotal)}</li>`
                                                          : `<li>${JSON.stringify(n)}</li>`),
                  (t += o));
              }),
              t + "</ul>"
            );
          },
          getActiveLoans = () => {
            const loans = {};
            transactions
              .filter((t) => t.type === "income" && t.details[0]?.isLoan)
              .forEach((t) => {
                const d = t.details[0];
                loans[t.id] = {
                  id: t.id,
                  loanPerson: d.title,
                  amount: t.total,
                  date: t.date,
                  repaid: 0,
                };
              });
            transactions
              .filter((t) => t.category === "Loan repayment")
              .forEach((t) => {
                const d = t.details[0];
                if (d?.loanId && loans[d.loanId])
                  loans[d.loanId].repaid += d.amount;
              });
            return Object.values(loans)
              .map((l) => {
                l.remaining = l.amount - l.repaid;
                l.status = l.remaining <= 0 ? "done" : "active";
                return l;
              })
              .filter((l) => l.status === "active");
          },
          getAllLoansWithRepayments = () => {
            const loans = {};
            transactions
              .filter((t) => t.type === "income" && t.details[0]?.isLoan)
              .forEach((t) => {
                const d = t.details[0];
                loans[t.id] = {
                  id: t.id,
                  loanPerson: d.title,
                  amount: t.total,
                  date: t.date,
                  repayments: [],
                };
              });
            transactions
              .filter((t) => t.category === "Loan repayment")
              .forEach((t) => {
                const d = t.details[0];
                if (d?.loanId && loans[d.loanId])
                  loans[d.loanId].repayments.push({
                    date: t.date,
                    amount: d.amount,
                  });
              });
            return Object.values(loans);
          },
          getSummaryData = (e) => {
            const t = { income: 0, expense: 0, balance: 0, categories: {} };
            return (
              EXPENSE_CATEGORIES.forEach((e) => (t.categories[e] = 0)),
              e.forEach((e) => {
                "income" === e.type
                  ? (t.income += e.total)
                  : ((t.expense += e.total),
                    void 0 !== t.categories[e.category] &&
                      (t.categories[e.category] += e.total));
              }),
              (t.balance = t.income - t.expense),
              t
            );
          },
          generateSummaryTableHTML = (e) => {
            let t = `<tbody>\n                <tr>\n                    <td class="label">♥ Total Income</td>\n                    <td class="amount income">+ ${formatToIndianCurrency(
              e.income,
            )}</td>\n                </tr>`;
            for (const n in e.categories)
              e.categories[n] > 0 &&
                (t += `<tr>\n                        <td class="label">→ ${n}</td>\n                        <td class="amount expense">- ${formatToIndianCurrency(
                  e.categories[n],
                )}</td>\n                     </tr>`);
            const balanceColorStyle =
              e.balance < 0
                ? `style="color: var(--danger-color);"`
                : `style="color: var(--primary-color);"`;
            return (t += `<tr class="balance">\n                        <td class="label">Balance</td>\n                        <td class="amount"><span ${balanceColorStyle}>${formatToIndianCurrency(
              e.balance,
            )}</span> | <span class="expense">${formatToIndianCurrency(
              e.expense,
            )}</span></td>\n                    </tr>\n             </tbody>`);
          };

        // --- Report & Data Management ---
        let currentModalType = "";

        const openExportModal = (type) => {
          currentModalType = type;
          document.getElementById("modal-monthly-group").style.display = "none";
          document.getElementById("modal-yearly-group").style.display = "none";
          document.getElementById("modal-custom-group").style.display = "none";
          const today = new Date();
          if (type === "monthly") {
            document.getElementById("export-modal-title").textContent =
              "Monthly Report Export";
            document.getElementById("modal-monthly-group").style.display =
              "block";
            document.getElementById("modal-month-input").value =
              `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
          } else if (type === "yearly") {
            document.getElementById("export-modal-title").textContent =
              "Yearly Report Export";
            document.getElementById("modal-yearly-group").style.display =
              "block";
            document.getElementById("modal-year-input").value =
              today.getFullYear();
          } else if (type === "custom") {
            document.getElementById("export-modal-title").textContent =
              "Custom Range Export";
            document.getElementById("modal-custom-group").style.display =
              "block";
            const todayStr = today.toISOString().split("T")[0];
            document.getElementById("modal-custom-start-date").value = todayStr;
            document.getElementById("modal-custom-end-date").value = todayStr;
            document.getElementById("modal-custom-from").value = todayStr;
            document.getElementById("modal-custom-to").value = todayStr;
            updateCustomRangeInputs();
          }
          document
            .getElementById("export-modal-overlay")
            .classList.add("active");
        };

        const closeExportModal = () => {
          document
            .getElementById("export-modal-overlay")
            .classList.remove("active");
        };

        const updateCustomRangeInputs = () => {
          const checked = document.querySelector(
            'input[name="custom-range-type"]:checked',
          );
          const rangeType = checked ? checked.value : "year-from-date";
          document.getElementById("modal-year-from-date").style.display =
            rangeType === "year-from-date" ? "block" : "none";
          document.getElementById("modal-year-to-date").style.display =
            rangeType === "year-to-date" ? "block" : "none";
          document.getElementById("modal-custom-range-inputs").style.display =
            rangeType === "custom-range" ? "block" : "none";
        };

        const handleModalDownload = () => {
          const formatRadio = document.querySelector(
            'input[name="report-format"]:checked',
          );
          const format = formatRadio ? formatRadio.value : "pdf";
          let data = [];
          let title = "";

          if (currentModalType === "monthly") {
            const monthInput =
              document.getElementById("modal-month-input").value;
            if (!monthInput) {
              alert("Please select a month.");
              return;
            }
            const [yearStr, monthStr] = monthInput.split("-");
            const yearNum = parseInt(yearStr);
            const monthObj = parseInt(monthStr) - 1;
            data = transactions.filter((t) => {
              const d = new Date(t.date);
              return d.getFullYear() === yearNum && d.getMonth() === monthObj;
            });
            title = `Monthly Report - ${new Date(yearNum, monthObj).toLocaleString("en-US", { month: "long", year: "numeric" })}`;
            if (data.length === 0) {
              alert("No data found for the selected month.");
              return;
            }
          } else if (currentModalType === "yearly") {
            const yearNum = parseInt(
              document.getElementById("modal-year-input").value,
            );
            if (isNaN(yearNum)) {
              alert("Please enter a valid year.");
              return;
            }
            data = transactions.filter(
              (t) => new Date(t.date).getFullYear() === yearNum,
            );
            title = `Summary for ${yearNum}`;
            if (data.length === 0) {
              alert("No data found for the selected year.");
              return;
            }
          } else if (currentModalType === "custom") {
            const checked = document.querySelector(
              'input[name="custom-range-type"]:checked',
            );
            const rangeType = checked ? checked.value : "year-from-date";
            if (rangeType === "year-from-date") {
              const startDateStr = document.getElementById(
                "modal-custom-start-date",
              ).value;
              if (!startDateStr) {
                alert("Please select a start date.");
                return;
              }
              const endDateObj = new Date(startDateStr);
              endDateObj.setFullYear(endDateObj.getFullYear() + 1);
              const endDateStr = endDateObj.toISOString().split("T")[0];
              data = transactions.filter(
                (t) => t.date >= startDateStr && t.date < endDateStr,
              );
              title = `Report - ${startDateStr} to ${endDateStr}`;
            } else if (rangeType === "year-to-date") {
              const endDateStr = document.getElementById(
                "modal-custom-end-date",
              ).value;
              if (!endDateStr) {
                alert("Please select an end date.");
                return;
              }
              const startDateObj = new Date(endDateStr);
              startDateObj.setFullYear(startDateObj.getFullYear() - 1);
              startDateObj.setDate(startDateObj.getDate() + 1);
              const startDateStr = startDateObj.toISOString().split("T")[0];
              data = transactions.filter(
                (t) => t.date >= startDateStr && t.date <= endDateStr,
              );
              title = `Report - ${startDateStr} to ${endDateStr}`;
            } else {
              const fromStr =
                document.getElementById("modal-custom-from").value;
              const toStr = document.getElementById("modal-custom-to").value;
              if (!fromStr || !toStr) {
                alert("Please select both start and end dates.");
                return;
              }
              if (fromStr > toStr) {
                alert("Start date must be before end date.");
                return;
              }
              data = transactions.filter(
                (t) => t.date >= fromStr && t.date <= toStr,
              );
              title = `Report - ${fromStr} to ${toStr}`;
            }
            if (data.length === 0) {
              alert("No data found for the selected range.");
              return;
            }
          }

          closeExportModal();

          if (format === "pdf") {
            generatePDFReport(data, title);
          } else {
            const safeFilename = `Finance_${title.replace(/[^a-zA-Z0-9\-]/g, "_")}.csv`;
            exportToCSV(data, safeFilename, title);
          }
        };

        const generatePDFReport = (data, title) => {
          const esc = (s) =>
            String(s)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");

          // Compute full summary (totals + per-category breakdown)
          const summaryData = getSummaryData(data);
          const balanceColor = summaryData.balance >= 0 ? "#28a745" : "#dc3545";

          // Build summary table rows (matching the in-app summary box)
          let summaryRowsHTML = `
            <tr>
              <td style="padding:5px 8px;">&#9829; Total Income</td>
              <td style="padding:5px 8px;text-align:right;color:#28a745;font-weight:700;">+ ${formatToIndianCurrency(summaryData.income)}</td>
            </tr>`;
          for (const cat in summaryData.categories) {
            if (summaryData.categories[cat] > 0) {
              summaryRowsHTML += `
            <tr>
              <td style="padding:5px 8px;">&rarr; ${esc(cat)}</td>
              <td style="padding:5px 8px;text-align:right;color:#dc3545;">- ${formatToIndianCurrency(summaryData.categories[cat])}</td>
            </tr>`;
            }
          }
          summaryRowsHTML += `
            <tr style="border-top:2px solid #333;">
              <td style="padding:8px 8px 5px;font-weight:700;">Balance</td>
              <td style="padding:8px 8px 5px;text-align:right;font-weight:700;">
                <span style="color:${balanceColor};">${formatToIndianCurrency(summaryData.balance)}</span>
                &nbsp;|&nbsp;<span style="color:#dc3545;">${formatToIndianCurrency(summaryData.expense)}</span>
              </td>
            </tr>`;

          // Build transaction rows
          const sorted = [...data].sort(
            (a, b) => new Date(a.date) - new Date(b.date),
          );
          let rowsHTML = "";
          sorted.forEach((t) => {
            const detailsStr = esc(formatDetailsForCSV(t.details, t.category));
            const amtColor = t.type === "income" ? "#28a745" : "#dc3545";
            rowsHTML += `<tr>
              <td>${esc(t.date)}</td>
              <td style="text-transform:capitalize;color:${amtColor}">${esc(t.type)}</td>
              <td>${esc(t.category || "Income")}</td>
              <td style="text-align:right;color:${amtColor};font-weight:600;">${t.type === "income" ? "+" : "-"}${formatToIndianCurrency(t.total)}</td>
              <td style="font-size:10px;">${detailsStr}</td>
            </tr>`;
          });

          const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;margin:20px;color:#333}
  h1{color:#4a90e2;font-size:18px;margin-bottom:4px}
  .summary-title{text-align:center;font-size:15px;font-weight:700;margin:16px 0 8px;color:#333}
  .summary-wrap{display:flex;justify-content:center;margin-bottom:24px}
  .summary-table{border-collapse:collapse;min-width:300px;font-size:12px}
  .summary-table td{border-bottom:1px solid #eee}
  table.tx-table{width:100%;border-collapse:collapse}
  thead th{background:#4a90e2;color:#fff;padding:8px 6px;text-align:left;font-size:11px}
  tbody td{padding:5px 6px;border-bottom:1px solid #eee;vertical-align:top}
  tbody tr:nth-child(even){background:#fafafa}
  hr{border:0;border-top:1px solid #ddd;margin:20px 0}
  @media print{.no-print{display:none}}
</style>
</head>
<body>
<button class="no-print" onclick="window.print()" style="margin-bottom:16px;padding:8px 20px;background:#4a90e2;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;">&#128438; Print / Save as PDF</button>
<h1>Finance Tracker</h1>
<p class="summary-title">${esc(title)}</p>
<div class="summary-wrap">
  <table class="summary-table">
    <tbody>${summaryRowsHTML}</tbody>
  </table>
</div>
<hr>
<p style="color:#555;font-size:12px;font-weight:600;margin-bottom:8px;">Transaction Details</p>
<table class="tx-table">
  <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Details</th></tr></thead>
  <tbody>${rowsHTML}</tbody>
</table>
</body>
</html>`;

          const printWindow = window.open("", "_blank");
          if (!printWindow) {
            alert("Please allow popups for this site to generate PDF reports.");
            return;
          }
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        };

        const formatDetailsForCSV = (details, category) => {
          if (!details || details.length === 0) {
            return "";
          }
          return details
            .map((n) => {
              if (category === "Educational Expense") {
                if (n.subType === "Academic")
                  return `Academic - ${n.feeType} for ${
                    n.person
                  }: ${n.amount.toFixed(2)}`;
                if (n.subType === "Educational Good")
                  return `Goods - ${n.title} (x${
                    n.quantity
                  }): ${n.itemTotal.toFixed(2)}`;
              }
              if (n.title && n.amount)
                return `${n.title}: ${n.amount.toFixed(2)}`;
              if (n.title && n.itemTotal)
                return `${n.title} (x${n.quantity || 1}): ${n.itemTotal.toFixed(
                  2,
                )}`;
              if (n.vehicle)
                return `${n.vehicle} (${n.from} → ${n.to}) x${n.quantity || 1}: ${(n.itemTotal || n.fare).toFixed(2)}`;
              if (n.type === "Doctor Fee")
                return `Doctor Fee (${n.doctorName}): ${n.fee.toFixed(2)}`;
              if (n.type === "Medical Tests")
                return `Tests: ${n.payableTests.toFixed(2)} (Total: ${
                  n.testsTotal
                } - Discount: ${n.testDiscount})`;
              if (category === "Tour & Hangouts" && n.itemTotal)
                return `${n.type}: ${n.title} (x${
                  n.quantity
                }) - ${n.itemTotal.toFixed(2)}`;
              if (category === "Home Rent" && n.total)
                return `${n.title} (x${n.months}): ${n.total.toFixed(2)}`;
              if (category === "Gas & Electricity bills" && n.type === "Gas")
                return `Gas Bill (x${n.quantity}): ${n.total.toFixed(2)}`;
              if (
                category === "Gas & Electricity bills" &&
                n.type === "Electricity"
              )
                return `${n.title}: ${n.amount.toFixed(2)}`;
              if (category === "Phone and WIFI bills" && n.type === "WIFI")
                return `${n.title} (x${n.quantity}): ${n.total.toFixed(2)}`;
              if (n.to && n.amount)
                return `Paid to ${n.to}: ${n.amount.toFixed(2)}`;
              if (n.type === "Lend")
                return `Lent to ${n.person}: ${n.amount.toFixed(2)}`;
              if (n.type === "Donate")
                return `Donated to ${n.person}: ${n.amount.toFixed(2)}`;
              if (n.type === "Flat Discount")
                return `Flat Discount: -${n.discount.toFixed(2)}`;
              if (n.type === "Rounding")
                return `Rounding: ${n.amount >= 0 ? "+" : ""}${n.amount.toFixed(2)}`;
              if (n.month)
                return `${n.title} (${n.month}): ${n.amount.toFixed(2)}`;
              if (n.unit)
                return `${n.title} (${n.unit}) x${n.quantity}: ${n.itemTotal.toFixed(2)}`;
              return JSON.stringify(n);
            })
            .join("; ");
        };

        const exportToCSV = (data, filename, title = "") => {
          const headers = [
            "ID",
            "Date",
            "Type",
            "Category",
            "Total",
            "Details",
          ];
          const csvRows = [headers.join(",")];
          let totalIncome = 0;
          let totalExpense = 0;

          data.forEach((t) => {
            if (t.type === "income") {
              totalIncome += t.total;
            } else {
              totalExpense += t.total;
            }
            const detailsString = formatDetailsForCSV(t.details, t.category);
            const row = [
              t.id,
              t.date,
              t.type,
              t.category,
              t.total.toFixed(2),
              `"${detailsString.replace(/"/g, '""')}"`,
            ];
            csvRows.push(row.join(","));
          });

          // --- Summary section with per-category breakdown ---
          const summaryData = getSummaryData(data);
          csvRows.push("");
          if (title) csvRows.push(`"--- ${title} ---"`);
          csvRows.push(`"♥ Total Income",,,,+${summaryData.income.toFixed(2)}`);
          for (const cat in summaryData.categories) {
            if (summaryData.categories[cat] > 0) {
              csvRows.push(
                `"→ ${cat}",,,,-${summaryData.categories[cat].toFixed(2)}`,
              );
            }
          }
          csvRows.push(`"Balance",,,,${summaryData.balance.toFixed(2)}`);

          downloadFile(csvRows.join("\n"), filename, "text/csv;charset=utf-8;");
        };

        const handleImport = (event) => {
          const file = event.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (e) => {
            if (
              !confirm(
                "Are you sure you want to import this file? This will ERASE all current data.",
              )
            ) {
              fileImporter.value = "";
              return;
            }
            try {
              const importedData = JSON.parse(e.target.result);
              if (!Array.isArray(importedData))
                throw new Error("Data is not in the correct array format.");

              await clearTransactions();
              const transaction = db.transaction("transactions", "readwrite");
              const store = transaction.objectStore("transactions");
              importedData.forEach((item) => store.add(item));

              await new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = reject;
              });

              window.transactions = transactions = importedData;
              syncReplaceAll(importedData);
              renderApp();
              if (window.updateKeywordFooterNote)
                window.updateKeywordFooterNote();
              alert("Data successfully imported and overwritten!");
            } catch (error) {
              alert(
                "Error importing file. Please ensure it is a valid backup file.\n\n" +
                  error.message,
              );
            }
          };
          reader.readAsText(file);
          fileImporter.value = "";
        };

        const handleExport = async () => {
          const dataToExport = await getAllTransactions();
          if (dataToExport.length === 0) {
            alert("No data to export.");
            return;
          }
          const dataStr = JSON.stringify(dataToExport, null, 2);

          const now = new Date();
          const timestamp = `${now.getFullYear()}-${String(
            now.getMonth() + 1,
          ).padStart(2, "0")}-${String(now.getDate()).padStart(
            2,
            "0",
          )}_${String(now.getHours()).padStart(2, "0")}-${String(
            now.getMinutes(),
          ).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`;
          const fileName = `financetracker-backup_${timestamp}.json`;

          downloadFile(dataStr, fileName, "application/json");
        };

        const downloadFile = (content, fileName, contentType) => {
          const blob = new Blob([content], { type: contentType });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", fileName);
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        // --- Start the App ---
        init();
      });

document
  .getElementById("keyword-form")
  .addEventListener("submit", function (e) {
    setTimeout(function () {
      document
        .getElementById("special-footer-note")
        .scrollIntoView({ behavior: "smooth" });
    }, 100);
  });
