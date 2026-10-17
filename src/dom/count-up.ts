/** Count-up length in milliseconds: a Fibonacci step, matching the line draw. */
const COUNT_MS = 987;

const targets = new WeakMap<Element, { value: number; format: (n: number) => string }>();

/**
 * Marks a headline number so the widget's entrance can count it up from zero.
 * The element already shows the final text; nothing moves until `countUp` runs.
 */
export function countable(el: HTMLElement, value: number | null, format: (n: number) => string): void {
  if (value === null || !Number.isFinite(value)) return;
  el.dataset.count = "";
  targets.set(el, { value, format });
}

/** Decimal places in a number as written (0.031 has 3), so the count never shows more precision than the value. */
function decimals(value: number): number {
  const text = String(value);
  if (text.includes("e-")) return Number(text.split("e-")[1]);
  return text.split(".")[1]?.length ?? 0;
}

/**
 * Counts every marked number under `root` up from zero, easing out over 987ms
 * and landing on exactly the final text. Runs only when the reader has said
 * motion is fine (prefers-reduced-motion: no-preference); otherwise the final
 * numbers simply stay.
 */
export function countUp(root: Element): void {
  const view = root.ownerDocument.defaultView;
  if (!view?.matchMedia?.("(prefers-reduced-motion: no-preference)")?.matches) return;
  for (const el of root.querySelectorAll<HTMLElement>("[data-count]")) {
    const target = targets.get(el);
    if (!target) continue;
    const final = el.textContent;
    const step = 10 ** decimals(target.value);
    el.textContent = target.format(0);
    let start: number | null = null;
    const frame = (time: number) => {
      if (!el.isConnected) return;
      start ??= time;
      const t = Math.min(1, (time - start) / COUNT_MS);
      if (t >= 1) {
        el.textContent = final;
        return;
      }
      const eased = 1 - (1 - t) ** 4;
      el.textContent = target.format(Math.round(target.value * eased * step) / step);
      view.requestAnimationFrame(frame);
    };
    view.requestAnimationFrame(frame);
  }
}
