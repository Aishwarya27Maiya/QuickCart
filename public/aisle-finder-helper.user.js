// ==UserScript==
// @name         Aisle Finder - Walmart aisle helper
// @namespace    aislefinder.local
// @version      4.4.2
// @description  Saves Walmart aisle notes to your local Quick Cart.
// @downloadURL  https://aishwarya27maiya.github.io/QuickCart/aisle-finder-helper.user.js
// @updateURL    https://aishwarya27maiya.github.io/QuickCart/aisle-finder-helper.user.js
// @match        https://www.walmart.com/*
// @match        https://walmart.com/*
// @match        http://localhost/*
// @match        http://127.0.0.1/*
// @match        https://aishwarya27maiya.github.io/QuickCart/*
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// ==/UserScript==
(() => { "use strict";
const CHANNEL = "cartpath-browser-v3";
const JOB_KEY = "cartpath.job";
const REPORT_KEY = "cartpath.report";
const MANUAL_KEY = "cartpath.manual-aisles";
const isWalmart = ["www.walmart.com", "walmart.com"].includes(location.hostname);
const isQuickCart =
  (location.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(location.hostname)) ||
  (location.protocol === "https:" &&
    location.hostname === "aishwarya27maiya.github.io" &&
    location.pathname.startsWith("/QuickCart/"));
if (isWalmart) {
function startManual() {
(function () {
  "use strict";
  if (document.getElementById("af-panel")) return;

  var AISLE_RE = /\baisle[s]?\s*[:#-]?\s*([A-Z]{0,2}-?\s?\d{1,3}[A-Z]?)\b/i;
  var SECTION_RE = /\b(dairy|produce|bakery|frozen|grocery|meat|seafood|deli|health|beauty|pharmacy|pets|baby|toys|electronics|sporting goods|household|paper goods|cleaning|beverages|snacks|cereal|international|garden|automotive|apparel)\b/i;
  var FIELD = "width:100%;padding:6px;border-radius:6px;border:1px solid #2f4a3d;background:#0a1310;color:#f4f1ea;font:12px system-ui,sans-serif";
  var BUTTON = "padding:7px;border-radius:8px;border:0;background:#1f7a52;color:#fff;font-weight:600;cursor:pointer";
  var GHOST = "padding:6px;border-radius:8px;border:1px solid #2f4a3d;background:transparent;color:#f4f1ea;cursor:pointer";

  var added = [];

  var panel = document.createElement("div");
  panel.id = "af-panel";
  panel.setAttribute(
    "style",
    "position:fixed;right:16px;bottom:16px;z-index:2147483647;width:280px;padding:12px;" +
      "border-radius:14px;background:#101c17;color:#f4f1ea;font:13px/1.4 system-ui,sans-serif;" +
      "box-shadow:0 12px 32px rgba(0,0,0,.4)",
  );
  panel.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
    '<strong style="font-size:13px">Aisle Finder helper</strong>' +
    '<button id="af-toggle" style="background:none;border:0;color:#f4f1ea;cursor:pointer">-</button>' +
    "</div>" +
    '<div id="af-body">' +
    '<label style="display:block;margin-bottom:6px">Item<br><input id="af-item" type="text" style="' + FIELD + '" /></label>' +
    '<label style="display:block;margin-bottom:6px">Aisle<br><input id="af-aisle" type="text" style="' + FIELD + '" /></label>' +
    '<div style="display:flex;gap:6px;margin-bottom:8px">' +
    '<label style="flex:1">Section<br><input id="af-section" type="text" style="' + FIELD + '" /></label>' +
    '<label style="flex:1">Shelf<br><input id="af-shelf" type="text" style="' + FIELD + '" /></label>' +
    "</div>" +
    '<button id="af-add" style="width:100%;' + BUTTON + '">Add to my list</button>' +
    '<div id="af-count" style="margin:8px 0 4px;opacity:.7"></div>' +
    '<div style="display:flex;gap:6px">' +
    '<button id="af-copy" style="flex:1;' + GHOST + '">Copy all</button>' +
    '<button id="af-clear" style="' + GHOST + '">Clear</button>' +
    "</div>" +
    '<div id="af-status" style="margin-top:6px;opacity:.8"></div>' +
    "</div>";
  document.body.appendChild(panel);

  var itemInput = document.getElementById("af-item");
  var aisleInput = document.getElementById("af-aisle");
  var sectionInput = document.getElementById("af-section");
  var shelfInput = document.getElementById("af-shelf");
  var countLine = document.getElementById("af-count");
  var statusLine = document.getElementById("af-status");

  function findAisleText() {
    var node = document.querySelector('[data-testid*="aisle" i], [class*="aisle" i]');
    var hit = node && node.textContent ? node.textContent.match(AISLE_RE) : null;
    if (hit) return hit[1];
    var bodyText = document.body ? document.body.innerText : "";
    var match = bodyText.match(AISLE_RE);
    return match ? match[1] : "";
  }

  function findSection() {
    var node = document.querySelector('[data-testid*="aisle" i], [class*="aisle" i]');
    var text = node && node.textContent ? node.textContent : "";
    var match = text.match(SECTION_RE);
    return match ? match[1] : "";
  }

  function findItemName() {
    var heading = document.querySelector("h1");
    var name = heading && heading.textContent ? heading.textContent : document.title;
    return name.replace(/\s+/g, " ").replace(/ - Walmart\.com.*$/i, "").trim().slice(0, 120);
  }

  function prefill() {
    itemInput.value = findItemName();
    var aisle = findAisleText();
    if (aisle) {
      aisleInput.value = aisle.replace(/\s+/g, "").toUpperCase();
      statusLine.textContent = "Aisle read from this page - check it before adding.";
    } else {
      aisleInput.value = "";
      statusLine.textContent = "No aisle printed on this page. Open the item and its store aisle, or type it in.";
    }
    var section = findSection();
    if (section) sectionInput.value = section;
  }

  function renderCount() {
    countLine.textContent = added.length === 0 ? "Nothing added yet." : added.length + " item(s) ready to copy.";
  }

  document.getElementById("af-add").addEventListener("click", function () {
    var item = itemInput.value.trim();
    if (!item) {
      statusLine.textContent = "Add an item name first.";
      return;
    }
    var entry = {
      item: item,
      aisle: aisleInput.value.trim(),
      section: sectionInput.value.trim(),
      shelf: shelfInput.value.trim(),
    };
    added.push(entry);
    var queuedEntries = GM_getValue(MANUAL_KEY, []);
    if (!Array.isArray(queuedEntries)) queuedEntries = [];
    queuedEntries.push({
      id: typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(36).slice(2),
      ...entry,
      createdAt: Date.now(),
    });
    GM_setValue(MANUAL_KEY, queuedEntries.slice(-500));
    statusLine.textContent = "Sent to Quick Cart. Items with a valid aisle will appear in Saved aisles; use Copy all for the full helper list.";
    aisleInput.value = "";
    shelfInput.value = "";
    renderCount();
  });

  document.getElementById("af-copy").addEventListener("click", function () {
    if (added.length === 0) {
      statusLine.textContent = "Add at least one item first.";
      return;
    }
    var text = added
      .map(function (entry) {
        return [entry.item, entry.aisle, entry.section, entry.shelf].join(" | ");
      })
      .join("\n");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        statusLine.textContent = "Copied " + added.length + " line(s). Paste them into Aisle Finder.";
      });
    } else {
      statusLine.textContent = "Copying is blocked here. Your lines: " + text;
    }
  });

  document.getElementById("af-clear").addEventListener("click", function () {
    added = [];
    renderCount();
    statusLine.textContent = "List cleared.";
  });

  document.getElementById("af-toggle").addEventListener("click", function () {
    var body = document.getElementById("af-body");
    var hidden = body.style.display === "none";
    body.style.display = hidden ? "block" : "none";
    document.getElementById("af-toggle").textContent = hidden ? "-" : "+";
  });

  var lastUrl = location.href;
  setInterval(function () {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    setTimeout(prefill, 1200);
  }, 1000);

  prefill();
  renderCount();
})();

}

  const visible = (node) => node && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
  const pageText = () => (document.body?.innerText || '').replace(document.getElementById('cartpath-auto')?.innerText || '', '');
  const blocked = () => /verify you are human|robot or human|press\s*(and|&)\s*hold|unusual traffic|access denied|sign in to your account/i.test(pageText()) || /\/blocked|\/account\/login/.test(location.pathname);
  const words = (text) => text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((word) => word.length > 2 && !['the', 'and', 'for'].includes(word)).map((word) => word.replace(/s$/, ''));
  function productLink(query) {
    const tokens = words(query);
    if (!tokens.length) return null;
    const candidates = [...document.querySelectorAll('main a[href*="/ip/"], [data-testid="maincontent"] a[href*="/ip/"]')].filter(visible);
    return candidates.find((link) => {
      const title = link.querySelector('[data-automation-id="product-title"], [data-testid="product-title"]');
      const text = words(title?.innerText || link.getAttribute('aria-label') || link.innerText);
      const url = new URL(link.href, location.origin);
      return url.origin === 'https://www.walmart.com' && url.pathname.startsWith('/ip/') && tokens.every((token) => text.includes(token));
    });
  }
  function productAisle() {
    if (!location.pathname.startsWith('/ip/')) return null;
    const heading = document.querySelector('h1');
    if (!heading || !visible(heading)) return null;
    const scopes = [...document.querySelectorAll('main, [role="dialog"]')].filter(visible);
    const values = new Set();
    for (const scope of scopes) {
      for (const node of scope.querySelectorAll('[data-testid*="aisle" i], [data-automation-id*="aisle" i], button, span, div')) {
        if (!visible(node) || node.closest('#cartpath-auto, #af-panel, [data-testid*="recommend" i], [data-testid*="sponsor" i], [data-dca-ctx*="carousel" i]')) continue;
        const text = node.innerText || '';
        if (text.length > 160) continue;
        const match = text.match(/\baisle\s*[:#-]?\s*([A-Z]{1,3}\s?-?\s?\d{1,3}[A-Z]?|\d{1,3})\b/i);
        if (match) values.add(match[1].replace(/\s/g, '').toUpperCase());
      }
    }
    return values.size === 1 ? { aisle: [...values][0], product_name: heading.innerText.trim().slice(0, 240), product_url: location.origin + location.pathname } : null;
  }
  function openStoreLocation() {
    const button = [...document.querySelectorAll('main button')].find((node) => visible(node) && /^(find in store|view aisle|in-store location)$/i.test(node.innerText.trim()));
    button?.click();
  }


  const incoming = new URLSearchParams(location.hash.slice(1)).get('cartpath');
  if (incoming) sessionStorage.setItem(JOB_KEY, incoming);
  const requestId = incoming || sessionStorage.getItem(JOB_KEY);
  let job = GM_getValue(JOB_KEY, null);
  if (!job || job.requestId !== requestId || ['done', 'cancelled'].includes(job.stage) || job.expiresAt < Date.now()) { startManual(); return; }
  document.getElementById('af-panel')?.remove();
  const panel = document.createElement('section');
  panel.id = 'cartpath-auto';
  panel.setAttribute('role', 'status');
  Object.assign(panel.style, { position: 'fixed', bottom: '20px', right: '20px', zIndex: '2147483647', width: '320px', maxWidth: '90vw', padding: '18px', borderRadius: '14px', background: '#fff', color: '#17251d', font: '14px/1.5 system-ui', boxShadow: '0 5px 30px #0004' });
  const title = document.createElement('strong'); title.textContent = 'Find my Walmart aisles';
  const description = document.createElement('p');
  const action = document.createElement('button');
  action.textContent = 'I’m signed in at this store — start';
  Object.assign(action.style, { padding: '10px', border: '0', borderRadius: '8px', background: '#17603f', color: '#fff', cursor: 'pointer' });
  panel.append(title, description, action); document.body.append(panel);
  const report = (status, message) => GM_setValue(REPORT_KEY, { requestId, status, message, results: status === 'done' ? job.results : undefined });
  const persist = () => GM_setValue(JOB_KEY, job);
  let navigating = false;
  const go = (url) => {
    navigating = true;
    const target = new URL(url);
    if (target.pathname === location.pathname && target.search === location.search) location.reload();
    else location.assign(url);
  };
  const navigateSearch = () => {
    job.stage = 'search'; persist();
    go('https://www.walmart.com/search?q=' + encodeURIComponent(job.items[job.index].name) + '#cartpath=' + requestId);
  };
  const finishItem = (details) => {
    job.results.push({ item_id: job.items[job.index].id, aisle: null, product_name: '', product_url: '', reason: 'not_displayed', ...details });
    job.index += 1;
    if (job.index === job.items.length) {
      job.stage = 'done'; persist(); report('done', 'Search finished. Results were sent to your checklist.');
      description.textContent = 'Finished — switch back to your checklist to see the results.'; action.hidden = true;
    } else navigateSearch();
  };
  let startedAt = Date.now(), openedLocation = false, paused = false;
  action.onclick = () => {
    if (job.stage === 'confirm') { navigateSearch(); return; }
    paused = false; startedAt = Date.now(); action.hidden = true;
  };
  if (job.stage === 'confirm') {
    description.textContent = 'Sign in on Walmart and select ' + job.store.name + ', ' + (job.store.address || '') + '. This search uses Walmart’s selected store. Confirm it matches before starting.';
  } else action.hidden = true;
  const timer = setInterval(() => {
    if (job.stage === 'done') { clearInterval(timer); return; }
    const current = GM_getValue(JOB_KEY, null);
    if (current?.requestId !== requestId || current.stage === 'cancelled') {
      clearInterval(timer); description.textContent = 'Search stopped. Return to your checklist to start again.'; action.hidden = true; return;
    }
    if (job.expiresAt < Date.now()) {
      clearInterval(timer);
      description.textContent = 'This search expired. Return to Quick Cart and start again.';
      report('error', 'The Walmart search expired before it finished. Start again from Quick Cart.');
      return;
    }
    if (navigating || job.stage === 'confirm' || paused) return;
    if (blocked()) {
      paused = true; action.textContent = 'Continue after signing in or verification'; action.hidden = false;
      description.textContent = 'Walmart needs your attention. Complete its sign-in or verification yourself, then continue.';
      report('progress', 'Walmart needs sign-in or verification. Continue in the Walmart tab.'); return;
    }
    const item = job.items[job.index];
    description.textContent = 'Searching ' + (job.index + 1) + ' of ' + job.items.length + ': ' + item.name;
    if (Date.now() - startedAt < 4000) return;
    if (job.stage === 'search') {
      const link = productLink(item.name);
      if (link) {
        job.stage = 'product'; persist();
        report('progress', 'Checking ' + (job.index + 1) + ' of ' + job.items.length + ': ' + item.name);
        go(new URL(link.href).origin + new URL(link.href).pathname + '#cartpath=' + requestId); return;
      }
      if (Date.now() - startedAt > 20000) finishItem({ reason: 'no_match' });
    } else if (job.stage === 'product') {
      const found = productAisle();
      if (found) { finishItem({ ...found, reason: 'found' }); return; }
      if (!openedLocation) { openStoreLocation(); openedLocation = true; }
      if (Date.now() - startedAt > 20000) finishItem({ reason: 'not_displayed', product_name: (document.querySelector('h1')?.innerText || '').slice(0, 240), product_url: location.pathname.startsWith('/ip/') ? location.origin + location.pathname : '' });
    }
  }, 1000);

} else {

  let pendingId = null;
  document.documentElement.setAttribute('data-cartpath-helper', '4');
  if (!isQuickCart) return;
  const announce = (message) => window.postMessage({ channel: CHANNEL, ...message }, location.origin);
  const forwardManual = () => {
    const entries = GM_getValue(MANUAL_KEY, []);
    if (Array.isArray(entries) && entries.length) {
      announce({ type: 'manual_entries', entries });
    }
  };
  const forward = () => {
    const report = GM_getValue(REPORT_KEY, null);
    if (report && report.requestId === pendingId) announce({ type: 'report', report });
  };
  GM_addValueChangeListener(REPORT_KEY, forward);
  GM_addValueChangeListener(MANUAL_KEY, forwardManual);
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.data?.channel !== CHANNEL) return;
    if (!document.documentElement.hasAttribute('data-cartpath-app')) return;
    const message = event.data;
    if (message.type === 'manual_pull') { forwardManual(); return; }
    if (message.type === 'manual_ack' && Array.isArray(message.recordIds)) {
      const acknowledged = new Set(message.recordIds);
      const entries = GM_getValue(MANUAL_KEY, []);
      if (Array.isArray(entries)) {
        GM_setValue(MANUAL_KEY, entries.filter((entry) => !acknowledged.has(entry.id)));
      }
      return;
    }
    if (message.type === 'ping') { announce({ type: 'ready', version: 4, requestId: message.requestId }); return; }
    if (['cancel', 'ack'].includes(message.type) && message.requestId === pendingId) {
      const job = GM_getValue(JOB_KEY, null);
      if (job?.requestId === pendingId) GM_deleteValue(JOB_KEY);
      pendingId = null;
      GM_deleteValue(REPORT_KEY);
      return;
    }
    if (message.type !== 'start') return;
    const input = message.job;
    if (!input || !/^[a-f0-9-]{36}$/.test(input.requestId) || !Array.isArray(input.items) || !input.items.length || input.items.length > 30) return;
    if (!input.store?.id || input.items.some((item) => !Number.isInteger(item.id) || typeof item.name !== 'string' || item.name.length > 120)) return;
    pendingId = input.requestId;
    const job = { ...input, index: 0, results: [], stage: 'confirm', expiresAt: Date.now() + 30 * 60 * 1000 };
    GM_deleteValue(REPORT_KEY);
    GM_setValue(JOB_KEY, job);
    GM_setValue(REPORT_KEY, { requestId: pendingId, status: 'progress', message: 'In the Walmart tab, sign in and confirm the store, then start the search.' });
    forward();
  });

}
})();