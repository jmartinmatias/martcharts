// The live example on drop-in.html: a spec set from JavaScript, with data that changes.
const el = document.getElementById("live");
el.spec = {
  title: "Requests per minute",
  data: { type: "fn", load: () => Array.from({ length: 12 }, (_, i) => ({ minute: `12:${String(i * 5).padStart(2, "0")}`, requests: 200 + Math.round(80 * Math.sin(i / 2)) })) },
  view: { type: "line", x: "minute", y: "requests" },
};
document.addEventListener("fft-select", (event) => console.log("selected", event.detail.row));
