// search shortcut: focus function to search input
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey && e.key === "f") {
    e.preventDefault();
    document.getElementById("search-input").focus();
  }
});

/**
 * Minimal markdown → HTML for body text.
 *   ##text  → .md-h2  (16px bold, 1.05 line-height)
 *   #text   → .md-h1  (18px bold, 1.15 line-height)
 *   - text  → <ul><li>
 *   text    → .md-p   (14px normal, 1 line-height)
 *   (blank) → <br>
 */
function mdToHtml(text) {
  if (!text) return "";
  const lines = text.split("\n");
  const out = [];
  let inList = false;

  // 👇 ADD THIS LINE HERE
  const todoCounts = {};

  const processInlineFormatting = (text) => {
    // 1. Extract backtick code spans → placeholders (so inner content is untouched)
    const codeParts = [];
    text = text.replace(/`([^`]+)`/g, (_, code) => {
      const safeDisplay = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const safeAttr = code
        .replace(/&/g, "&amp;")
        .replace(/'/g, "&#39;")
        .replace(/"/g, "&quot;");
      codeParts.push(
        `<code class="md-code" title="Click to copy" onclick="navigator.clipboard.writeText('${safeAttr}').then(()=>{this.classList.add('md-code--copied');setTimeout(()=>this.classList.remove('md-code--copied'),1500)})">${safeDisplay}</code>`,
      );
      return `\x00CODE${codeParts.length - 1}\x00`;
    });

    // 2. Apply other inline formatting (never touches placeholder content)
    text = text.replace(/\[([^\]]+)\](?:\s+(.+))?/g, (_, href, label) => {
      const fullHref = /^https?:\/\//i.test(href) ? href : `https://${href}`;
      return `<a href="${fullHref}" target="_blank" rel="noopener noreferrer">${label || href}</a>`;
    });
    text = text.replace(/_([^_]+)_/g, "<em>$1</em>");
    text = text.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");

    // 3. Restore code spans
    text = text.replace(/\x00CODE(\d+)\x00/g, (_, i) => codeParts[+i]);

    return text;
  };

  for (const line of lines) {
    const t = line.trim();
    // todo start
    if (t.startsWith("(-)")) {
      if (!inList) {
        out.push("<ul class='md-todo-list'>");
        inList = true;
      }
      
      const rawText = t.slice(3).trimStart();
      const content = processInlineFormatting(rawText);
      
      // Track how many times this exact text has appeared
      todoCounts[rawText] = (todoCounts[rawText] || 0) + 1;
      
      // Add the count number to the ID so duplicate text gets a unique save file
      const safeId = 'todo_' + todoCounts[rawText] + '_' + btoa(encodeURIComponent(rawText)).replace(/=/g, '');
      
      const isChecked = localStorage.getItem(safeId) === 'true';
      const checkedAttr = isChecked ? 'checked' : '';
      const textClass = isChecked ? 'md-todo-text is-done' : 'md-todo-text';

      out.push(`
        <li class="md-todo-item">
          <input type="checkbox" class="md-todo-checkbox" ${checkedAttr} onclick="event.stopPropagation();" onchange="
            if(this.checked) { 
              this.nextElementSibling.classList.add('is-done');
              localStorage.setItem('${safeId}', 'true');
            } else {
              this.nextElementSibling.classList.remove('is-done');
              localStorage.removeItem('${safeId}'); 
            }
          ">
          <span class="${textClass}">${content}</span>
        </li>
      `);
    } else if (t.startsWith("##")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(
        `<span class="md-h2">${processInlineFormatting(t.slice(2).trimStart())}</span>`,
      );
    } else if (t.startsWith("#")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(
        `<span class="md-h1">${processInlineFormatting(t.slice(1).trimStart())}</span>`,
      );
    } else if (t.startsWith(">")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(
        `<span class="md-p"><big>${processInlineFormatting(t.slice(1).trimStart())}</big></span>`,
      );
    } else if (t.startsWith("<")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(
        `<span class="md-p"><small>${processInlineFormatting(t.slice(1).trimStart())}</small></span>`,
      );
    } else if (t.startsWith("-- ")) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      const content = processInlineFormatting(t.slice(3));
      out.push(
        `<span class="md-p md-list-title"><big><strong>${content}</strong></big></span>`,
      );
    } else if (t.startsWith("- ")) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${processInlineFormatting(t.slice(2))}</li>`);
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (t)
        out.push(`<span class="md-p">${processInlineFormatting(t)}</span>`);
      else out.push("<br>");
    }
  }
  if (inList) out.push("</ul>");
  return out.join("");
}

// ─── EDIT FROM FULLSCREEN ─────────────────────────────────────────────────────
// Intercepts all edit button clicks globally. If a card is in fullscreen,
// exits first then opens the edit modal. Works on any page automatically.
document.addEventListener(
  "click",
  (e) => {
    const editBtn = e.target.closest(".card-edit-btn");
    if (!editBtn) return;

    e.stopImmediatePropagation(); // prevent the original listener from firing

    const box = editBtn.closest(".box");
    if (!box) return;

    const isFullscreen =
      document.fullscreenElement || document.webkitFullscreenElement;

    if (isFullscreen) {
      const onExit = () => {
        document.removeEventListener("fullscreenchange", onExit);
        document.removeEventListener("webkitfullscreenchange", onExit);
        if (window.openEditModal) window.openEditModal(box);
      };
      document.addEventListener("fullscreenchange", onExit);
      document.addEventListener("webkitfullscreenchange", onExit);
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    } else {
      if (window.openEditModal) window.openEditModal(box);
    }
  },
  true,
); // ← true = capture phase, runs before the original listener

// ─── PREVENT CODE CLICK FROM TRIGGERING FULLSCREEN ───────────────────────────
// Captures click on .md-code, performs the copy, then stops the event
// so it never reaches the parent .box fullscreen listener.
document.addEventListener(
  "click",
  (e) => {
    const codeEl = e.target.closest(".md-code");
    if (!codeEl) return;

    e.stopImmediatePropagation(); // block fullscreen

    // Copy the code text and show feedback
    const text = codeEl.innerText || codeEl.textContent || "";
    navigator.clipboard
      .writeText(text)
      .then(() => {
        codeEl.classList.add("md-code--copied");
        setTimeout(() => codeEl.classList.remove("md-code--copied"), 1500);
      })
      .catch(() => {});
  },
  true,
);

// Note: Make sure your container already has overflow-y: auto set in your CSS. The function only controls justify-content — it doesn't set the overflow itself.

window.addEventListener("load", function () {
  function adjustJustifyOnOverflow(containerSelector) {
    const containers = document.querySelectorAll(containerSelector);

    if (containers.length === 0) {
      console.warn("No elements found for →", containerSelector);
      return;
    }

    function check(el) {
      // 1. Force to flex-start temporarily to get a clean measurement
      el.style.setProperty("justify-content", "flex-start", "important");

      // Force the browser to recalculate layout synchronously
      void el.offsetHeight;

      // 2. Measure TRUE content height vs visible height
      const isOverflowing = el.scrollHeight > el.clientHeight;

      // 3. Lock in the correct alignment
      if (isOverflowing) {
        el.style.setProperty("justify-content", "flex-start", "important");
      } else {
        el.style.setProperty("justify-content", "center", "important");
      }
    }

    containers.forEach((el) => {
      // WAIT for custom fonts (like your Bangla font) to load before checking
      document.fonts.ready.then(() => {
        check(el);
      });

      // Use requestAnimationFrame to prevent ResizeObserver loop errors
      const ro = new ResizeObserver(() =>
        requestAnimationFrame(() => check(el)),
      );
      ro.observe(el);

      const mo = new MutationObserver(() =>
        requestAnimationFrame(() => check(el)),
      );
      mo.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  adjustJustifyOnOverflow(".card-text-wrapper");
});
