const find = document.getElementById("find");
const count = document.getElementById("count");
const cards = [...document.querySelectorAll(".card")];
find.addEventListener("input", () => {
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
