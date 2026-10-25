/*
 * For a page that shows martcharts embeds (iframes of embed.html) without loading the library: sets each iframe's
 * height from the height its chart posts, so a chart never scrolls inside its frame. The drop-in bundle does the same
 * by itself; this file is for pages that only hold iframes.
 */
(function () {
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.type !== "martcharts:height" || typeof data.height !== "number" || !(data.height > 0)) return;
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === event.source) frames[i].style.height = Math.ceil(data.height) + "px";
    }
  });
})();
