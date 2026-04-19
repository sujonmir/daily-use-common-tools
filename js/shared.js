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

  const processInlineFormatting = (text) => {
    // [url] or [url] label text  →  <a>
    text = text.replace(/\[([^\]]+)\](?:\s+(.+))?/g, (_, href, label) => {
      const fullHref = /^https?:\/\//i.test(href) ? href : `https://${href}`;
      return `<a href="${fullHref}" target="_blank" rel="noopener noreferrer">${label || href}</a>`;
    });
    // _..._  → italic
    text = text.replace(/_([^_]+)_/g, "<em>$1</em>");
    // *...* → bold
    text = text.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
    return text;
  };

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("##")) {
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
