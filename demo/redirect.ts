/**
 * A page that moved: the address it now lives at is on the root element (data-moved-to). The board's own state in the
 * hash (section, filters, period, click filter) comes along, so an old shared link opens the same view.
 */
const to = document.documentElement.dataset.movedTo;
if (to) location.replace(`${to}${location.hash}`);
