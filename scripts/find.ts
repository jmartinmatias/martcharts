/**
 * The search both catalog pages share (the chart list and the Data guide), as browser code written into each page's
 * script: words and refs, read the way people type them.
 *
 * - Words: a typed word matches a whole word in a chart's keywords (its type, summary, data and search words), plural
 *   or not ("share" finds "shares" but not "shared"). Only when nothing matches that way does it fall back to word
 *   starts across everything the card says, so a half-typed "tre" still finds trend charts.
 * - Refs: W-M9C7, w-m9c7, "W M9C7" and a bare M9C7 all name the same chart (a bare code only when the index has it, so
 *   a word such as "area" still searches words). The index is docs/refs.json.
 *
 * @module
 */

/** Browser code: `readRef`, `lookUpRef`, `refItems`, `tokens`, `matchWords`. Plain ES2020, no imports. */
export const FIND_JS = String.raw`
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
`;
