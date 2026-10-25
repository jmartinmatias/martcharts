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
    button.textContent = "Copied";
  } catch { button.textContent = "Copy failed"; }
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
// Find: charts whose name, summary or jobs hold every word typed.
const find = document.getElementById("find");
const count = document.getElementById("count");
const none = document.getElementById("none");
const charts = [...document.querySelectorAll("section.chart")];
find.addEventListener("input", () => {
  const words = find.value.toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const chart of charts) {
    chart.hidden = !words.every((word) => chart.dataset.search.includes(word));
    if (!chart.hidden) shown++;
  }
  count.textContent = words.length ? shown + " of " + charts.length : "";
  none.hidden = !words.length || shown > 0;
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
    if (button.closest(".matrix")) document.getElementById("c-" + from).scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
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
