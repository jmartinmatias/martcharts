/**
 * Roving focus: a group of marks is one tab stop, and the arrow keys move
 * between them (Home and End jump to the ends). Focusing a mark runs its own
 * focus handlers, so tooltips follow the keyboard. In a grid, pass `down` to
 * move by a whole row with the up and down arrows.
 */
export function roving(items: Element[], opts: { across?: number; down?: number } = {}): void {
  const across = opts.across ?? 1;
  const down = opts.down ?? 1;
  items.forEach((item, i) => item.setAttribute("tabindex", i === 0 ? "0" : "-1"));
  items.forEach((item, i) => {
    item.addEventListener("keydown", (event) => {
      const key = (event as KeyboardEvent).key;
      const step = key === "ArrowRight" ? across : key === "ArrowLeft" ? -across : key === "ArrowDown" ? down : key === "ArrowUp" ? -down : null;
      const next = step !== null ? i + step : key === "Home" ? 0 : key === "End" ? items.length - 1 : null;
      if (next === null) return;
      event.preventDefault();
      const target = items[next];
      if (!target || next === i) return;
      item.setAttribute("tabindex", "-1");
      target.setAttribute("tabindex", "0");
      (target as HTMLElement | SVGElement).focus();
    });
  });
}
