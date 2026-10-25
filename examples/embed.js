// Draws what the address names (?spec=, ?src= or ?board=) and posts the height to the parent page.
// The page loads the lite bundle, whose reading guides are English; a French or German chart first brings in
// martcharts-reading.iife.js, so its "How to read it" reads in its own language.
(function () {
  var params = new URLSearchParams(location.search);
  var packed = params.get("spec") || params.get("board");
  var locale = "";
  try {
    if (packed) {
      var text = atob(packed.replace(/-/g, "+").replace(/_/g, "/"));
      locale = JSON.parse(decodeURIComponent(escape(text))).locale || "";
    }
  } catch (error) {
    locale = "";
  }
  // Charts drawn in a frame on another site: their refs are their own here, apart from the same chart on the site.
  document.body.setAttribute("data-fft-place", "frame");
  var mount = function () {
    MartCharts.mountEmbed(document, location.search);
  };
  if (/^(fr|de)\b/i.test(locale)) {
    var reading = document.createElement("script");
    reading.src = "../dist/martcharts-reading.iife.js";
    reading.onload = mount;
    reading.onerror = mount;
    document.head.append(reading);
  } else mount();
})();
