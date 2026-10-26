import type { ViewContext } from "../../core/view-context.ts";
import { html, svg } from "./shared.ts";
import { WORDS, wordsFor } from "./words.ts";
import type { Words } from "./words.ts";

/**
 * Where a value stands against its target, in target words a ten-year-old can follow: "Target met", or how far
 * it has to go ("€22K to go"), in the value's own format. Empty text when either number is missing.
 */
export function standing(ctx: ViewContext<{ type: string }>, value: number | null, target: number | null, field: string, write?: (amount: number) => string): { met: boolean; text: string } {
  if (value === null || target === null || target === 0) return { met: false, text: "" };
  const met = value >= target;
  return { met, text: met ? wordsFor(ctx).met : wordsFor(ctx).leftToGo(write ? write(target - value) : ctx.format(target - value, field)) };
}

/** A small check mark for a met target, beside its percentage. Decorative: the words say it too. */
export function checkMark(doc: Document): SVGElement {
  const check = svg(doc, "svg", { class: "fft-check", viewBox: "0 0 16 16", "aria-hidden": "true" });
  check.append(svg(doc, "path", { d: "M3.5 8.5l3 3 6-7" }));
  return check;
}

/**
 * One plain line for a headline number against its target, in the number's own format: a check and "Target met:
 * €1.2M", "€50K to go to the €1.3M target", or when lower is better, "0.1 above the 3 target". Null without both.
 */
export function targetLine(doc: Document, className: string, now: number | null, goal: number | null, goodWhen: "up" | "down", show: (v: number) => string, words: Words = WORDS): HTMLElement | null {
  if (now === null || goal === null) return null;
  const met = goodWhen === "down" ? now <= goal : now >= goal;
  const line = html(doc, "div", className);
  if (met) {
    line.dataset.met = "true";
    line.append(checkMark(doc), words.targetMetBy(show(goal)));
  } else line.append(goodWhen === "down" ? words.aboveTarget(show(now - goal), show(goal)) : words.toGoToTarget(show(goal - now), show(goal)));
  return line;
}

