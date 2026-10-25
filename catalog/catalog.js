const find = document.getElementById("find");
const count = document.getElementById("count");
const cards = [...document.querySelectorAll(".card")];
// A ref (W-AM22) names one chart in one place on the site: the index (docs/refs.json) says which and where.
const hits = document.getElementById("ref-hits");
let index;
async function findRef(text) {
  const ref = text.trim().toUpperCase();
  if (!/^W-[0-9A-Z]{4}$/.test(ref)) {
    hits.hidden = true;
    return false;
  }
  index = index || (await fetch("../docs/refs.json").then((r) => r.json()).catch(() => []));
  const found = index.filter((entry) => entry.ref === ref || entry.formerly === ref);
  count.textContent = "";
  hits.replaceChildren(...(found.length ? found.map((entry) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "../" + entry.url;
    link.textContent = (entry.title || entry.key) + ", " + entry.where;
    const code = document.createElement("code");
    code.textContent = entry.ref + " ";
    item.append(code, link);
    if (entry.ref !== ref) item.prepend(ref + " is now ");
    return item;
  }) : [Object.assign(document.createElement("li"), { textContent: "No chart on the site has the ref " + ref + "." })]));
  hits.hidden = false;
  return true;
}
find.addEventListener("input", async () => {
  if (await findRef(find.value)) return;
  const words = find.value.toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const card of cards) {
    card.hidden = !words.every((word) => card.dataset.search.includes(word));
    if (!card.hidden) shown++;
  }
  count.textContent = words.length ? shown + " of " + cards.length : "";
});
document.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-copy]");
  if (!button) return;
  const type = button.dataset.type;
  const text = button.dataset.copy === "tag"
    ? '<fft-widget src="catalog/' + type + '.json"></fft-widget>'
    : await (await fetch(type + ".json")).text();
  const label = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "Copied";
  } catch {
    button.textContent = "Copy failed";
  }
  setTimeout(() => (button.textContent = label), 1200);
});
