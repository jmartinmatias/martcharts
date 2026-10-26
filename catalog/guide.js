const switches = JSON.parse(document.getElementById("switches").textContent);
const specs = new Map();
const spec = async (type) => {
  if (!specs.has(type)) specs.set(type, fetch(type + ".json").then((r) => r.json()));
  return specs.get(type);
};
async function showAs(type, to) {
  const el = document.getElementById("w-" + type);
  const said = document.getElementById("said-" + type);
  const select = document.querySelector('select[data-type="' + type + '"]');
  const base = await spec(type);
  const view = switches[type][to];
  // The verdict and assessment are in the section's switch table.
  const row = view && document.querySelector("#c-" + type + ' tr[data-to="' + to + '"]');
  if (select) select.value = view ? to : type;
  el.spec = view ? { ...base, view: { ...view } } : base;
  said.textContent = row ? row.querySelector(".verdict").textContent.slice(2) + ": " + row.querySelector(".assess").textContent : "";
  said.className = "said" + (row ? " v-" + row.dataset.verdict : "");
}
const text = (v) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
const csvCell = (v) => { const t = text(v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
async function copy(button, value) {
  const label = button.textContent;
  // Safari keeps the click's permission to copy only if the write starts now, so the text goes in as a promise.
  try {
    if (window.ClipboardItem && navigator.clipboard.write) await navigator.clipboard.write([new ClipboardItem({ "text/plain": Promise.resolve(value).then((t) => new Blob([t], { type: "text/plain" })) })]);
    else await navigator.clipboard.writeText(await value);
    button.textContent = T("Copied");
  } catch { button.textContent = T("Copy failed"); }
  setTimeout(() => (button.textContent = label), 1200);
}
// A section's detail opens on demand: its live chart loads only then, so the page draws 57 charts only if asked.
const load = (details) => {
  const el = details.querySelector("fft-widget[data-src]");
  if (el && !el.hasAttribute("src")) el.setAttribute("src", el.dataset.src);
};
document.querySelectorAll("details.more").forEach((details) => details.addEventListener("toggle", () => details.open && load(details)));
const open = (type) => {
  const details = document.querySelector("#c-" + type + " details.more");
  if (details && !details.open) details.open = true;
  if (details) load(details);
};
// A link to a chart (#c-pie), from the jobs table, the matrix or another page, opens that chart's detail.
const openFromHash = () => {
  const match = /^#c-(.+)$/.exec(location.hash);
  if (match) open(match[1]);
};
window.addEventListener("hashchange", openFromHash);
openFromHash();

// The page's words in the reader's language, from the site's dictionary (public/site-look.js); English without it.
const T = (text, ...args) => (window.siteLook && window.siteLook.t ? window.siteLook.t(text, ...args) : text.replace(/\{(\d)\}/g, (_, i) => args[Number(i)]));
// The ref alphabet leaves out I, L, O and U, so a ref never reads as a word.
function readRef(text) {
  const typed = text.trim().toUpperCase();
  const full = /^W[-\s]?([0-9A-HJKMNP-TV-Z]{4})$/.exec(typed);
  if (full) return { ref: "W-" + full[1], sure: true };
  const bare = /^([0-9A-HJKMNP-TV-Z]{4})$/.exec(typed);
  return bare ? { ref: "W-" + bare[1], sure: false } : null;
}
let refIndex;
// The charts a typed ref names (also by a code it had before), or null when the text is not a ref.
async function lookUpRef(text, base) {
  const read = readRef(text);
  if (!read) return null;
  refIndex = refIndex || (await fetch(base + "docs/refs.json").then((r) => r.json()).catch(() => []));
  const found = refIndex.filter((entry) => entry.ref === read.ref || entry.formerly === read.ref);
  if (!found.length && !read.sure) return null;
  return { ref: read.ref, found };
}
// One list item per chart found, each a link to it. A link to this page goes through onHere(hash) instead, so the
// page can clear its search and show the chart rather than land on a hidden card.
function refItems(result, base, onHere) {
  if (!result.found.length) return [Object.assign(document.createElement("li"), { textContent: T("No chart on the site has the ref {0}.", result.ref) })];
  return result.found.map((entry) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = base + entry.url;
    // In the page's language: the chart's own title for it, and each step of where it sits from the site's words.
    const lang = (document.documentElement.lang || "en").slice(0, 2);
    const title = (entry.titles && entry.titles[lang]) || entry.title || entry.key;
    const section = entry.section && entry.sections && entry.sections[lang];
    link.textContent = title + ", " + entry.where.split(" › ").map((part) => (section && part === entry.section ? section : T(part))).join(" › ");
    link.addEventListener("click", (event) => {
      const target = new URL(link.href, location.href);
      if (target.pathname !== location.pathname || !target.hash) return;
      event.preventDefault();
      onHere(target.hash);
    });
    const code = document.createElement("code");
    code.textContent = entry.ref + " ";
    item.append(code, link);
    if (entry.ref !== result.ref) item.prepend(T("{0} is now ", result.ref));
    return item;
  });
}
function tokens(text) {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}
function wordIn(word, list, starts) {
  return list.some((token) => token === word || token === word + "s" || token === word + "es" || (word.length > 3 && word.endsWith("s") && token === word.slice(0, -1)) || (starts && token.startsWith(word)));
}
// Which items match every word: by whole words in their keywords first, else by word starts in all they say.
function matchWords(words, items) {
  const strict = items.filter((item) => words.every((word) => wordIn(word, item.keywords, false)));
  return strict.length ? strict : items.filter((item) => words.every((word) => wordIn(word, item.everything, true)));
}

// Find: charts whose name, summary or jobs hold every word typed, or the chart a ref names.
const find = document.getElementById("find");
const count = document.getElementById("count");
const none = document.getElementById("none");
const hits = document.getElementById("ref-hits");
const charts = [...document.querySelectorAll("section.chart")].map((el) => ({ el, keywords: tokens(el.dataset.search), everything: tokens(el.dataset.search) }));
function showAll() {
  for (const chart of charts) chart.el.hidden = false;
  hits.hidden = true;
  none.hidden = true;
  count.textContent = "";
}
// A ref led to a chart in this guide: clear the search, open its section and bring it onto the keyboard.
function showHere(hash) {
  find.value = "";
  showAll();
  history.replaceState(null, "", hash);
  openFromHash();
  const section = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!section) return;
  section.tabIndex = -1;
  section.classList.add("found");
  section.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  section.focus({ preventScroll: true });
  setTimeout(() => section.classList.remove("found"), 2400);
}
function filterWords(text) {
  hits.hidden = true;
  const words = tokens(text);
  if (!words.length) return showAll();
  const shown = new Set(matchWords(words, charts));
  for (const chart of charts) chart.el.hidden = !shown.has(chart);
  count.textContent = T("{0} of {1}", shown.size, charts.length);
  none.hidden = shown.size > 0;
}
function showRef(result) {
  for (const chart of charts) chart.el.hidden = true;
  hits.replaceChildren(...refItems(result, "../", showHere));
  hits.hidden = false;
  none.hidden = true;
  count.textContent = "";
}
let typed = 0;
// Words filter at once; text shaped like a ref then asks the index, and shows the chart it names if there is one.
find.addEventListener("input", () => {
  const turn = ++typed;
  const text = find.value;
  const read = readRef(text);
  if (!read || !read.sure) filterWords(text);
  if (!read) return;
  lookUpRef(text, "../").then((result) => {
    if (turn !== typed) return;
    if (result) showRef(result);
    else if (read.sure) filterWords(text);
  });
});
document.getElementById("clear").addEventListener("click", () => {
  find.value = "";
  showAll();
  find.focus();
});
document.addEventListener("change", (event) => {
  const select = event.target.closest("select[data-type]");
  if (select) showAs(select.dataset.type, select.value);
});
document.addEventListener("click", async (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.from) {
    const { from, to } = button.dataset;
    open(from);
    await showAs(from, to);
    if (button.closest(".matrix")) document.getElementById("c-" + from).scrollIntoView({ behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  } else if (button.dataset.all) {
    const type = button.dataset.all;
    const { data } = await spec(type);
    const table = document.getElementById("d-" + type);
    const columns = [...table.querySelectorAll("thead th")].map((th) => th.textContent);
    table.tBodies[0].innerHTML = data.rows.map((row) => "<tr>" + columns.map((c) => { const td = document.createElement("td"); td.textContent = text(row[c]); return td.outerHTML; }).join("") + "</tr>").join("");
    button.remove();
  } else if (button.dataset.csv) {
    const type = button.dataset.csv;
    copy(button, spec(type).then(({ data }) => {
      const table = document.getElementById("d-" + type);
      const columns = [...table.querySelectorAll("thead th")].map((th) => th.textContent);
      return [columns.map(csvCell).join(","), ...data.rows.map((row) => columns.map((c) => csvCell(row[c])).join(","))].join("\n");
    }));
  } else if (button.dataset.md) {
    copy(button, fetch("guide/" + button.dataset.md + ".md").then((r) => r.text()));
  }
});
