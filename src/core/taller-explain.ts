/**
 * Plain words for a Taller variant, as if to a ten-year-old: a title that says what the chart is and what each
 * mark stands for, and one or two sentences on how to read it (what bigger, further right, stronger or warmer
 * means). Plain chart words, the same on every page.
 *
 * One function on purpose: a general `explainChart(spec, rows)` can replace it without touching the engine.
 *
 * @module
 */
import { fieldLabel } from "./display.ts";
import type { WidgetSpec } from "./types.ts";

/** A plain title and a short "how to read it" for a chart spec. */
export function explainVariant(spec: WidgetSpec, chartTitle: string, rowName?: string): { title: string; explain: string } {
  const view = spec.view ?? { type: "table" };
  const name = (field: unknown) => (typeof field === "string" ? fieldLabel(field, spec.fields).toLowerCase() : "value");
  const first = (field: unknown) => (Array.isArray(field) ? field[0] : field);
  const list = (field: unknown) => {
    const names = (Array.isArray(field) ? field : [field]).map(name);
    return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "value");
  };
  const lollipop = view.mark === "lollipop";
  let form = "a chart";
  let mark = "";
  let read = "";
  switch (view.type) {
    case "hbar":
      form = lollipop ? "lollipops" : "sideways bars";
      mark = `each ${lollipop ? "dot" : "bar"} is one ${name(view.label)}`;
      read = `${lollipop ? "A dot further right" : "A longer bar"} means more ${name(view.value)}.`;
      break;
    case "bar":
      form = lollipop ? "lollipops" : "bars";
      mark = `each ${lollipop ? "dot on a stick" : "bar"} is one ${name(view.x)}`;
      read = `${lollipop ? "A higher dot" : "A taller bar"} means more ${list(view.y)}.`;
      break;
    case "line":
      form = view.curve === "step" ? "steps" : "a line";
      mark = `the line follows ${list(view.y)} over ${name(view.x)}`;
      read = view.curve === "step" ? `Each step holds the value until the next ${name(view.x)}; higher means more.` : "Higher means more; a steep climb means a fast change.";
      break;
    case "area":
      if (view.stacked === "stream") {
        form = "a streamgraph";
        mark = "each colored band is one series";
        read = `A thicker band means more at that ${name(view.x)}; the bands are ${list(view.y)}.`;
      } else if (view.stacked === "percent") {
        form = "shares over time";
        mark = "each band is a share of the whole";
        read = `At every ${name(view.x)} the bands add up to 100%; a wider band is a bigger share.`;
      } else {
        form = "a filled line";
        mark = `the shape follows ${list(view.y)} over ${name(view.x)}`;
        read = "Higher means more; the fill helps you see how much there is.";
      }
      break;
    case "donut":
      form = "a donut";
      mark = `each slice is one ${name(view.label)}`;
      read = `A bigger slice is a bigger share of all the ${name(view.value)}.`;
      break;
    case "waffle":
      form = "a grid of 100 squares";
      mark = "each square is 1% of the total";
      read = `More squares of one color means a bigger share of ${name(view.value)} for that ${name(view.label)}.`;
      break;
    case "treemap":
      form = "tiles";
      mark = `each tile is one ${name(view.label)}`;
      read = `A bigger tile means more ${name(view.value)}.`;
      break;
    case "pareto":
      form = "a biggest-first chart";
      mark = `each bar is one ${name(view.label)}, biggest first`;
      read = "The line adds the bars up, so you can see the few that make most of the total.";
      break;
    case "table":
      form = "a table";
      mark = `each row is one ${rowName ? name(rowName) : "item"}`;
      read = "The bar inside a cell shows how big that number is next to the biggest one.";
      break;
    case "list":
      form = "a short list";
      mark = `each line is one ${name(view.label)}`;
      read = `Read down the list to compare ${name(view.value)}.`;
      break;
    case "kpi":
      form = "one big number";
      mark = `the number is the latest ${name(view.value)}`;
      read = "The little line underneath shows how it moved before.";
      break;
    case "kpis":
      form = "a row of numbers";
      mark = "each tile is one number";
      read = "Read each tile on its own; the small text says what it counts.";
      break;
    case "variance":
      form = "above-or-below bars";
      mark = `each bar is one ${name(view.label)}`;
      read = `A bar to the right means ${name(view.value)} beat its target; to the left means it fell short.`;
      break;
    case "bullet":
      form = "bars against a target";
      mark = `each row is one ${name(view.label)}`;
      read = "The dark bar is the value, the thin mark is the target, and the shaded bands show poor, fair and good.";
      break;
    case "dumbbell":
      form = "dumbbells";
      mark = `each line joins two values for one ${name(view.label)}`;
      read = `One end is ${name(view.from)}, the other ${name(view.to)}; a longer line means a bigger gap.`;
      break;
    case "slope":
      form = "slopes";
      mark = `each line is one ${name(view.label)}`;
      read = `The line goes from ${name(view.from)} on the left to ${name(view.to)} on the right; going up means it grew.`;
      break;
    case "radar":
      form = "a web";
      mark = `each spoke is one ${name(view.label)}`;
      read = "A point further from the center means more; the shape shows the overall profile.";
      break;
    case "scatter":
      form = "a scatter";
      mark = `each dot is one ${view.label ? name(view.label) : rowName ? name(rowName) : "item"}`;
      read = `Further right means more ${name(view.x)}, higher means more ${name(view.y)}.`;
      break;
    case "histogram":
      form = "a histogram";
      mark = `each bar is a range of ${name(view.value)}`;
      read = "A taller bar means more items fall in that range.";
      break;
    case "beeswarm":
      form = "a dot swarm";
      mark = `each dot is one ${view.label ? name(view.label) : rowName ? name(rowName) : "row"}`;
      read = `Dots further right have more ${name(view.value)}; where they pile up, many values are alike.`;
      break;
    case "boxplot":
      form = "boxes and whiskers";
      mark = `each box is one ${name(view.group)}`;
      read = `The box holds the middle half of ${name(view.value)}; the line inside is the middle value, and lone dots are unusual ones.`;
      break;
    case "sunburst":
      form = "rings";
      mark = `the inner ring shows each ${list(first(view.levels))}, the outer ring splits every slice`;
      read = `A wider slice means more ${name(view.value)}.`;
      break;
    case "icicle":
      form = "columns of blocks";
      mark = "each column is one level, each block one group";
      read = `A taller block means more ${name(view.value)}; blocks to the right are parts of the block on their left.`;
      break;
    case "heatmap":
      form = "a grid of colored cells";
      mark = `each cell is one ${name(view.y)} and ${name(view.x)}`;
      read = `A stronger color means more ${name(view.value)}.`;
      break;
    case "marimekko":
      form = "a size and mix chart";
      mark = `each column is one ${name(view.x)}`;
      read = `A wider column is a bigger ${name(view.x)}; taller pieces inside are bigger shares of ${name(view.series)}.`;
      break;
    case "calendar":
      form = "a calendar";
      mark = "each square is one day";
      read = `A stronger color means more ${name(view.value)} that day.`;
      break;
    case "rose":
      form = "a clock dial";
      mark = `each wedge is one ${name(view.label)}`;
      read = "A bigger wedge means more; going round the dial is going round the cycle.";
      break;
    case "horizon":
      form = "thin folded rows";
      mark = "each row is one series";
      read = "Shapes rising from a row's foot are above zero and shapes hanging from its top are below; a stronger shade means further from zero.";
      break;
    case "bump":
      form = "a ranking race";
      mark = `each line is one ${name(view.series)}`;
      read = `Higher means a better rank at that ${name(view.x)}.`;
      break;
    default:
      form = `a ${String(view.type)} chart`;
      mark = `each mark is one ${rowName ? name(rowName) : "item"}`;
      read = "Hover a mark to see its numbers.";
  }
  const facet = (spec.facet as { field?: string } | undefined)?.field;
  const extras: string[] = [];
  if (facet) extras.push(`There is one small chart per ${name(facet)}, all on the same scale.`);
  if (view.highlight) extras.push("One item is in color and the rest are grey, so it stands out.");
  if (Array.isArray(view.reference) && view.reference.length) extras.push("The dashed line is the average.");
  if (view.lines) extras.push(`The line across the bars is the ${name(view.lines)}.`);
  if (view.forecast) extras.push("The dashed part is a forecast, not real yet.");
  if (spec.headline) extras.push("The big number on top sums it up.");
  const title = `${chartTitle} as ${form}${facet ? ` per ${name(facet)}` : ""}: ${mark}`;
  return { title, explain: [read, ...extras].slice(0, 2).join(" ") };
}
