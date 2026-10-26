
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
  if (!result.found.length) return [Object.assign(document.createElement("li"), { textContent: "No chart on the site has the ref " + result.ref + "." })];
  return result.found.map((entry) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = base + entry.url;
    link.textContent = (entry.title || entry.key) + ", " + entry.where;
    link.addEventListener("click", (event) => {
      const target = new URL(link.href, location.href);
      if (target.pathname !== location.pathname || !target.hash) return;
      event.preventDefault();
      onHere(target.hash);
    });
    const code = document.createElement("code");
    code.textContent = entry.ref + " ";
    item.append(code, link);
    if (entry.ref !== result.ref) item.prepend(result.ref + " is now ");
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

const find = document.getElementById("find");
const count = document.getElementById("count");
const none = document.getElementById("none");
const noneWords = document.getElementById("none-words");
const cards = [...document.querySelectorAll(".card")].map((el) => ({ el, keywords: tokens(el.dataset.search), everything: tokens(el.dataset.search + " " + el.dataset.more) }));
// A ref (W-AM22) names one chart in one place on the site: the index (docs/refs.json) says which and where.
const hits = document.getElementById("ref-hits");
function showAll() {
  for (const card of cards) card.el.hidden = false;
  hits.hidden = true;
  none.hidden = true;
  count.textContent = "";
}
// A ref led to a chart on this page: clear the search, then bring the card into view and onto the keyboard.
function showHere(hash) {
  find.value = "";
  showAll();
  const card = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!card) return;
  history.replaceState(null, "", hash);
  card.tabIndex = -1;
  card.classList.add("found");
  card.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  card.focus({ preventScroll: true });
  setTimeout(() => card.classList.remove("found"), 2400);
}
function filterWords(text) {
  hits.hidden = true;
  const words = tokens(text);
  if (!words.length) return showAll();
  const shown = new Set(matchWords(words, cards));
  for (const card of cards) card.el.hidden = !shown.has(card);
  count.textContent = shown.size + " of " + cards.length;
  noneWords.textContent = "No chart matches “" + text.trim() + "”.";
  none.hidden = shown.size > 0;
}
// The ref's charts are the result: the grid steps aside until one is chosen or the search is cleared.
function showRef(result) {
  for (const card of cards) card.el.hidden = true;
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
