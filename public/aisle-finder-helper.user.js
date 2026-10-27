// ==UserScript==
// @name         Aisle Finder - Walmart aisle helper
// @namespace    aislefinder.local
// @version      4.4.8
// @description  Saves Walmart aisle notes to your local Quick Cart.
// @downloadURL  https://aishwarya27maiya.github.io/QuickCart/aisle-finder-helper.user.js
// @updateURL    https://aishwarya27maiya.github.io/QuickCart/aisle-finder-helper.user.js
// @match        https://www.walmart.com/*
// @match        https://walmart.com/*
// @match        http://localhost/*
// @match        http://127.0.0.1/*
// @match        https://aishwarya27maiya.github.io/QuickCart/*
// @run-at       document-idle
// @inject-into  content
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// ==/UserScript==
(() => { "use strict";
const CHANNEL = "cartpath-browser-v3";
const JOB_KEY = "cartpath.job";
const REPORT_KEY = "cartpath.report";
const MANUAL_KEY = "cartpath.manual-aisles";
const QUICK_CART_URL = "https://aishwarya27maiya.github.io/QuickCart/";
const getValue = async (key, fallback) => {
  if (typeof globalThis.GM?.getValue === "function") return globalThis.GM.getValue(key, fallback);
  if (typeof GM_getValue === "function") return GM_getValue(key, fallback);
  throw new Error("This userscript manager does not provide storage read access.");
};
const setValue = async (key, value) => {
  if (typeof globalThis.GM?.setValue === "function") return globalThis.GM.setValue(key, value);
  if (typeof GM_setValue === "function") return GM_setValue(key, value);
  throw new Error("This userscript manager does not provide storage write access.");
};
const deleteValue = async (key) => {
  if (typeof globalThis.GM?.deleteValue === "function") return globalThis.GM.deleteValue(key);
  if (typeof GM_deleteValue === "function") return GM_deleteValue(key);
  throw new Error("This userscript manager does not provide storage delete access.");
};
const isWalmart = ["www.walmart.com", "walmart.com"].includes(location.hostname);
const isQuickCart =
  (location.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(location.hostname)) ||
  (location.protocol === "https:" &&
    location.hostname === "aishwarya27maiya.github.io" &&
    location.pathname.startsWith("/QuickCart/"));
if (isWalmart) {
function startManual() {
return (function () {
  "use strict";
  if (document.getElementById("af-panel")) {
    return document.getElementById("af-status");
  }

  var AISLE_RE = /\baisle(?:\s*(?:no\.?|number))?\s*[:#-]?\s*([A-Z]{1,3}\s*-?\s*\d{1,3}[A-Z]?|\d{1,3}[A-Z]?)\b/i;
  var SECTION_RE = /\b(dairy|produce|bakery|frozen|grocery|meat|seafood|deli|health|beauty|pharmacy|pets|baby|toys|electronics|sporting goods|household|paper goods|cleaning|beverages|snacks|cereal|international|garden|automotive|apparel)\b/i;
  var FIELD = "width:100%;padding:6px;border-radius:6px;border:1px solid #2f4a3d;background:#0a1310;color:#f4f1ea;font:12px system-ui,sans-serif";
  var BUTTON = "padding:7px;border-radius:8px;border:0;background:#1f7a52;color:#fff;font-weight:600;cursor:pointer";
  var GHOST = "padding:6px;border-radius:8px;border:1px solid #2f4a3d;background:transparent;color:#f4f1ea;cursor:pointer";

  var added = [];
  var lastAutoFilledAisle = "";
  var addedOnCurrentPage = false;

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
    '<button id="af-return" style="width:100%;margin-top:8px;' + BUTTON + '">Return to Quick Cart</button>' +
    '<div id="af-status" style="margin-top:6px;opacity:.8"></div>' +
    "</div>";
  document.body.appendChild(panel);

  var itemInput = document.getElementById("af-item");
  var aisleInput = document.getElementById("af-aisle");
  var sectionInput = document.getElementById("af-section");
  var shelfInput = document.getElementById("af-shelf");
  var countLine = document.getElementById("af-count");
  var statusLine = document.getElementById("af-status");
  document.getElementById("af-return").addEventListener("click", function () {
    location.href = QUICK_CART_URL;
  });

  function findAisleText() {
    var nodes = document.querySelectorAll(
      '[data-testid*="aisle" i], [data-automation-id*="aisle" i], [class*="aisle" i], [aria-label*="aisle" i]',
    );
    for (var index = 0; index < nodes.length; index += 1) {
      var node = nodes[index];
      if (node.closest("#af-panel") || !node.getClientRects().length) continue;
      var text = [
        node.innerText,
        node.textContent,
        node.getAttribute("aria-label"),
      ]
        .filter(Boolean)
        .join(" ");
      var match = text.match(AISLE_RE);
      if (match) return match[1].replace(/\s/g, "").toUpperCase();
    }

    var bodyText = document.body ? document.body.innerText : "";
    var bodyMatch = bodyText.match(AISLE_RE);
    return bodyMatch ? bodyMatch[1].replace(/\s/g, "").toUpperCase() : "";
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
    if (!itemInput.value.trim()) itemInput.value = findItemName();
    var aisle = findAisleText();
    if (
      aisle &&
      (!aisleInput.value.trim() ||
        aisleInput.value.replace(/\s/g, "").toUpperCase() ===
          lastAutoFilledAisle)
    ) {
      aisleInput.value = aisle;
      lastAutoFilledAisle = aisle;
      statusLine.textContent = "Aisle read from this page - check it before adding.";
    } else if (!aisleInput.value.trim()) {
      statusLine.textContent = "No aisle printed on this page. Open the item and its store aisle, or type it in.";
    }
    var section = findSection();
    if (section) sectionInput.value = section;
  }

  function renderCount() {
    countLine.textContent = added.length === 0 ? "Nothing added yet." : added.length + " item(s) ready to copy.";
  }

  document.getElementById("af-add").addEventListener("click", async function () {
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
    renderCount();
    statusLine.textContent = "Saving this item to Quick Cart…";
    try {
      var queuedEntries = await getValue(MANUAL_KEY, []);
      if (!Array.isArray(queuedEntries)) queuedEntries = [];
      queuedEntries.push({
        id: typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now() + "-" + Math.random().toString(36).slice(2),
        ...entry,
        createdAt: Date.now(),
      });
      await setValue(MANUAL_KEY, queuedEntries.slice(-500));
      statusLine.textContent = "Sent to Quick Cart. Items with a valid aisle will appear in Saved aisles; use Copy all for the full helper list.";
      aisleInput.value = "";
      lastAutoFilledAisle = "";
      addedOnCurrentPage = true;
      shelfInput.value = "";
      renderCount();
    } catch (error) {
      console.error("Quick Cart aisle helper storage error:", error);
      statusLine.textContent =
        "Could not send this item to Quick Cart: " +
        (error instanceof Error ? error.message : String(error));
    }
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
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      lastAutoFilledAisle = "";
      addedOnCurrentPage = false;
      setTimeout(prefill, 1200);
      return;
    }
    if (!addedOnCurrentPage) prefill();
  }, 1000);

  prefill();
  renderCount();
  return statusLine;
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


  const manualStatus = startManual();
  (async () => {
  const incoming = new URLSearchParams(location.hash.slice(1)).get('cartpath');
  if (incoming) sessionStorage.setItem(JOB_KEY, incoming);
  const requestId = incoming || sessionStorage.getItem(JOB_KEY);
  let job = await getValue(JOB_KEY, null);
  const isActiveJob = (candidate) =>
    candidate?.requestId === requestId &&
    !['done', 'cancelled'].includes(candidate.stage) &&
    candidate.expiresAt >= Date.now();
  if (incoming && !isActiveJob(job)) {
    const waitUntil = Date.now() + 12_000;
    while (Date.now() < waitUntil && !isActiveJob(job)) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      job = await getValue(JOB_KEY, null);
    }
  }
  if (!isActiveJob(job)) return;
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
  const returnButton = document.createElement('button');
  returnButton.type = 'button';
  returnButton.textContent = 'Return to Quick Cart';
  Object.assign(returnButton.style, { display: 'block', marginTop: '10px', padding: '10px', border: '1px solid #17603f', borderRadius: '8px', background: '#fff', color: '#17603f', cursor: 'pointer' });
  returnButton.hidden = true;
  returnButton.onclick = () => { location.href = QUICK_CART_URL; };
  panel.append(title, description, action, returnButton); document.body.append(panel);
  const report = (status, message) => setValue(REPORT_KEY, { requestId, status, message, results: status === 'done' ? job.results : undefined });
  const persist = () => setValue(JOB_KEY, job);
  let navigating = false;
  const go = (url) => {
    navigating = true;
    const target = new URL(url);
    if (target.pathname === location.pathname && target.search === location.search) location.reload();
    else location.assign(url);
  };
  const navigateSearch = async () => {
    job.stage = 'search'; await persist();
    go('https://www.walmart.com/search?q=' + encodeURIComponent(job.items[job.index].name) + '#cartpath=' + requestId);
  };
  const finishItem = async (details) => {
    job.results.push({ item_id: job.items[job.index].id, aisle: null, product_name: '', product_url: '', reason: 'not_displayed', ...details });
    job.index += 1;
    if (job.index === job.items.length) {
      job.stage = 'done'; await persist(); await report('done', 'Search finished. Results were sent to your checklist.');
      description.textContent = 'Finished — return to Quick Cart to see the results.'; action.hidden = true; returnButton.hidden = false;
    } else await navigateSearch();
  };
  let startedAt = Date.now(), openedLocation = false, paused = false;
  action.onclick = async () => {
    if (job.stage === 'confirm') { await navigateSearch(); return; }
    paused = false; startedAt = Date.now(); action.hidden = true;
  };
  if (job.stage === 'confirm') {
    description.textContent = 'Sign in on Walmart and select ' + job.store.name + ', ' + (job.store.address || '') + '. This search uses Walmart’s selected store. Confirm it matches before starting.';
  } else action.hidden = true;
  let checking = false;
  const timer = setInterval(async () => {
    if (checking) return;
    checking = true;
    try {
    if (job.stage === 'done') { clearInterval(timer); return; }
    const current = await getValue(JOB_KEY, null);
    if (current?.requestId !== requestId || current.stage === 'cancelled') {
      clearInterval(timer); description.textContent = 'Search stopped. Return to your checklist to start again.'; action.hidden = true; return;
    }
    if (job.expiresAt < Date.now()) {
      clearInterval(timer);
      description.textContent = 'This search expired. Return to Quick Cart and start again.';
      await report('error', 'The Walmart search expired before it finished. Start again from Quick Cart.');
      return;
    }
    if (navigating || job.stage === 'confirm' || paused) return;
    if (blocked()) {
      paused = true; action.textContent = 'Continue after signing in or verification'; action.hidden = false;
      description.textContent = 'Walmart needs your attention. Complete its sign-in or verification yourself, then continue.';
      await report('progress', 'Walmart needs sign-in or verification. Continue in the Walmart tab.'); return;
    }
    const item = job.items[job.index];
    description.textContent = 'Searching ' + (job.index + 1) + ' of ' + job.items.length + ': ' + item.name;
    if (Date.now() - startedAt < 4000) return;
    if (job.stage === 'search') {
      const link = productLink(item.name);
      if (link) {
        job.stage = 'product'; await persist();
        await report('progress', 'Checking ' + (job.index + 1) + ' of ' + job.items.length + ': ' + item.name);
        go(new URL(link.href).origin + new URL(link.href).pathname + '#cartpath=' + requestId); return;
      }
      if (Date.now() - startedAt > 20000) await finishItem({ reason: 'no_match' });
    } else if (job.stage === 'product') {
      const found = productAisle();
      if (found) { await finishItem({ ...found, reason: 'found' }); return; }
      if (!openedLocation) { openStoreLocation(); openedLocation = true; }
      if (Date.now() - startedAt > 20000) await finishItem({ reason: 'not_displayed', product_name: (document.querySelector('h1')?.innerText || '').slice(0, 240), product_url: location.pathname.startsWith('/ip/') ? location.origin + location.pathname : '' });
    }
    } catch (error) {
      console.error("Quick Cart aisle helper storage error:", error);
      description.textContent = "The userscript manager could not access shared storage. Check its permissions and reload.";
      clearInterval(timer);
    } finally {
      checking = false;
    }
  }, 1000);
  })().catch((error) => {
    console.error("Quick Cart aisle helper startup error:", error);
    if (manualStatus) {
      manualStatus.textContent =
        "The helper loaded, but Userscripts storage could not be read. Check the extension permissions and reload.";
    }
  });

} else {

  let pendingId = null;
  document.documentElement.setAttribute('data-cartpath-helper', '4');
  if (!isQuickCart) return;
  const announce = (message) => window.postMessage({ channel: CHANNEL, ...message }, location.origin);
  const forwardManual = async () => {
    const entries = await getValue(MANUAL_KEY, []);
    if (Array.isArray(entries) && entries.length) {
      announce({ type: 'manual_entries', entries });
    }
  };
  const forward = async () => {
    const report = await getValue(REPORT_KEY, null);
    if (report && report.requestId === pendingId) announce({ type: 'report', report });
  };
  const pollTimer = setInterval(async () => {
    try {
      await forward();
      await forwardManual();
    } catch (error) {
      console.error("Quick Cart aisle helper storage error:", error);
      clearInterval(pollTimer);
    }
  }, 1000);
  window.addEventListener('message', async (event) => {
    if (event.origin !== location.origin || event.data?.channel !== CHANNEL) return;
    if (!document.documentElement.hasAttribute('data-cartpath-app')) return;
    const message = event.data;
    if (message.type === 'manual_pull') { await forwardManual(); return; }
    if (message.type === 'manual_ack' && Array.isArray(message.recordIds)) {
      const acknowledged = new Set(message.recordIds);
      const entries = await getValue(MANUAL_KEY, []);
      if (Array.isArray(entries)) {
        await setValue(MANUAL_KEY, entries.filter((entry) => !acknowledged.has(entry.id)));
      }
      return;
    }
    if (message.type === 'ping') { announce({ type: 'ready', version: 4, requestId: message.requestId }); return; }
    if (['cancel', 'ack'].includes(message.type) && message.requestId === pendingId) {
      const job = await getValue(JOB_KEY, null);
      if (job?.requestId === pendingId) await deleteValue(JOB_KEY);
      pendingId = null;
      await deleteValue(REPORT_KEY);
      return;
    }
    if (message.type !== 'start') return;
    const input = message.job;
    if (!input || !/^[a-f0-9-]{36}$/.test(input.requestId) || !Array.isArray(input.items) || !input.items.length || input.items.length > 30) return;
    if (!input.store?.id || input.items.some((item) => !Number.isInteger(item.id) || typeof item.name !== 'string' || item.name.length > 120)) return;
    pendingId = input.requestId;
    const job = { ...input, index: 0, results: [], stage: 'confirm', expiresAt: Date.now() + 30 * 60 * 1000 };
    await deleteValue(REPORT_KEY);
    await setValue(JOB_KEY, job);
    await setValue(REPORT_KEY, { requestId: pendingId, status: 'progress', message: 'In the Walmart tab, sign in and confirm the store, then start the search.' });
    await forward();
  });

}
})();