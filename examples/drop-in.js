// The Embed page (drop-in.html). Each example keeps its markup in one <template>: this script draws it live and shows
// that same markup as the code under it, so the code is always exactly what drew the chart. Code goes in as text,
// never as HTML. Loaded from a file: the site allows scripts from the site only.

/** The live example's spec, set from JavaScript; its own source is shown as the code to copy. */
function liveExample(el) {
  el.spec = {
    title: "Requests per minute",
    data: {
      type: "fn",
      load: () => Array.from({ length: 12 }, (_, i) => ({ minute: `12:${String(i * 5).padStart(2, "0")}`, requests: 200 + Math.round(80 * Math.sin(i / 2)) })),
    },
    fields: { requests: { label: "Requests" } },
    view: { type: "line", x: "minute", y: "requests" },
    i18n: {
      fr: { title: "Requêtes par minute", fields: { requests: { label: "Requêtes" } } },
      de: { title: "Anfragen pro Minute", fields: { requests: { label: "Anfragen" } } },
    },
  };
}

/** An address as it reads from any other site: relative ones resolved against this page. */
const absolute = (value) => (/^([a-z][a-z0-9+.-]*:|#|\/\/)/i.test(value) ? value : new URL(value, location.href).href);

/** Markup as text, one level of indentation removed, its file addresses made absolute so the copy works anywhere. */
function codeOf(html) {
  const lines = html.replace(/^\n+|\s+$/g, "").split("\n");
  const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)[0].length));
  return lines
    .map((line) => line.slice(indent))
    .join("\n")
    // An iframe's own ?src= stays as written: the embed page reads it from its own address, wherever this one is.
    .replace(/\b(src|data)="([^"]+)"/g, (_match, name, value) => `${name}="${absolute(value)}"`);
}

/** A code block with a Copy button; the text goes in as text. */
function snippet(holder, code, label) {
  const pre = document.createElement("pre");
  const block = document.createElement("code");
  block.textContent = code;
  pre.append(block);
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Copy";
  button.setAttribute("aria-label", `Copy the code for ${label}`);
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = "Copied";
    } catch {
      // No clipboard (an insecure page, or permission refused): select the code so the reader can copy it by hand.
      const range = document.createRange();
      range.selectNodeContents(block);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      button.textContent = "Selected";
    }
    setTimeout(() => (button.textContent = "Copy"), 1600);
  });
  holder.replaceChildren(pre, button);
}

// The examples: each template drawn live, its markup shown under it.
for (const example of document.querySelectorAll(".example")) {
  const template = example.querySelector("template");
  if (!template) continue;
  const label = example.querySelector("h2")?.textContent ?? "this example";
  const live = document.createElement("div");
  live.className = "live";
  live.append(document.importNode(template.content, true));
  const code = document.createElement("div");
  code.className = "snippet";
  template.after(live, code);
  let text = codeOf(template.innerHTML);
  if (example.dataset.example === "live") {
    liveExample(live.querySelector("#live"));
    text += `\n<script src="your-page.js"></script>\n\n// your-page.js\n${liveExample.toString()}\nliveExample(document.getElementById("live"));`;
  }
  snippet(code, text, label);
}

// The iframe example draws in the site's language too: the embed page takes it from its own address (&lang=fr).
// The code shown to copy keeps the address as written.
function frameInLanguage() {
  const lang = window.siteLook?.get?.().lang ?? "en";
  for (const frame of document.querySelectorAll('.live iframe[src*="embed.html"]')) {
    const url = new URL(frame.getAttribute("src"), location.href);
    if (lang === "en") url.searchParams.delete("lang");
    else url.searchParams.set("lang", lang);
    if (url.href !== frame.src) frame.src = url.href;
  }
}
frameInLanguage();
window.addEventListener("martcharts:lang", frameInLanguage);

// The bundles: their addresses as any other page would write them, and their sizes as served.
const bundleLinks = [...document.querySelectorAll("a[data-bundle]")];
const lite = bundleLinks[0];
const bundleSnippet = document.querySelector('[data-snippet="bundle"]');
if (lite && bundleSnippet) snippet(bundleSnippet, `<script src="${absolute(lite.getAttribute("href"))}"></script>`, "the lite bundle");
for (const link of bundleLinks) {
  const size = link.parentElement?.querySelector("[data-size]");
  if (!size) continue;
  fetch(link.href)
    .then((response) => (response.ok ? response.blob() : null))
    .then((blob) => {
      if (blob) size.textContent = `(${Math.round(blob.size / 1024)} KB)`;
    })
    .catch(() => {});
}

document.addEventListener("fft-select", (event) => console.log("selected", event.detail.row));
