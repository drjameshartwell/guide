/* ═══════════════════════════════════════════════════════════════════════
   Dr. James Hartwell — tracking
   ═══════════════════════════════════════════════════════════════════════

   This file answers one question: is the funnel working?
   Facebook post  →  site  →  guide downloaded  →  review left / book bought

   Everything here is free forever. There is no server to pay for and no
   server to maintain. Read SETUP-TRACKING.md for the five-minute setup.

   NOTHING BREAKS IF YOU LEAVE THE IDS BELOW EMPTY. With empty IDs the site
   behaves exactly as it did before — no scripts load, no requests go out.
   Fill them in when you're ready and tracking simply starts working.
   ═══════════════════════════════════════════════════════════════════════ */

window.TRACKING = {

  // ── 1. GOOGLE ANALYTICS 4 ────────────────────────────────────────────
  // The numbers. How many people, from where, and how many downloaded.
  // Get this at analytics.google.com — it looks like  G-XXXXXXXXXX
  GA4_ID: 'G-WDS8RL6FEC',

  // ── 2. MICROSOFT CLARITY ─────────────────────────────────────────────
  // The behaviour. Screen recordings and heatmaps — you watch a real
  // reader scroll past the download button. Free, no limits.
  // Get this at clarity.microsoft.com — it's a short code like  a1b2c3d4e5
  CLARITY_ID: 'y3ztk648zq',

  // ── 3. YOUR OWN LOG (optional) ───────────────────────────────────────
  // A Google Sheet you own, one row per event. Only needed if you want the
  // raw data in your hands rather than inside Google's dashboard.
  // This is the same URL the notify form uses. See SETUP-TRACKING.md.
  LOG_ENDPOINT: 'https://script.google.com/macros/s/AKfycbxsUvII-t0FLs5ptHeVg95i3XG4awB5w9E04sOD9u8yJy-EuiIec4MM3xb2YsFfZPiEGw/exec',

  // Set true while testing to print every event to the browser console.
  DEBUG: false
};

(function initTracking() {
  'use strict';

  const CFG = window.TRACKING;

  // Never record yourself editing the site on your own machine.
  const IS_LOCAL = /^(localhost|127\.|192\.168\.|\[::1\])/.test(location.hostname)
                || location.protocol === 'file:';

  // ── WHERE DID THIS READER COME FROM? ──────────────────────────────────
  // Worked out once per visit and attached to every event afterwards, so a
  // download can be traced back to the Facebook post that caused it.
  const visitSource = (function () {
    const KEY = 'jh_src';

    try {
      const stored = sessionStorage.getItem(KEY);
      if (stored) return stored;
    } catch (_) {}

    const params = new URLSearchParams(location.search);
    const utm    = params.get('utm_source') || params.get('fbclid') && 'facebook';
    const ref    = document.referrer || '';

    let src;
    if (utm) {
      src = utm === 'facebook' ? 'facebook' : utm.toLowerCase();
    } else if (/facebook\.com|fb\.me|m\.facebook/i.test(ref)) {
      src = 'facebook';
    } else if (/instagram\.com/i.test(ref)) {
      src = 'instagram';
    } else if (/google\./i.test(ref)) {
      src = 'google';
    } else if (/amazon\./i.test(ref)) {
      src = 'amazon';
    } else if (ref && !ref.includes(location.hostname)) {
      try { src = new URL(ref).hostname.replace(/^www\./, ''); } catch (_) { src = 'other'; }
    } else {
      src = 'direct';
    }

    try { sessionStorage.setItem(KEY, src); } catch (_) {}
    return src;
  })();

  // Facebook's in-app browser is a real leak on this site: downloads cannot
  // work there. Knowing how much traffic arrives inside it is the difference
  // between "my guide is unpopular" and "my guide is unreachable".
  const inAppBrowser = /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|Twitter/i
    .test(navigator.userAgent || '');

  // ── LOADING WITHOUT SLOWING THE SITE DOWN ─────────────────────────────
  // Measured, not guessed: Google's gtag.js is 169 KB over the wire and
  // Clarity is another 27 KB. Everything this site has written itself — the
  // page, the stylesheet, all its behaviour, this file — is 50 KB gzipped
  // put together. Left to load normally, the trackers would be four times
  // the weight of the site and would be competing with the guide covers for
  // a reader's bandwidth at the exact moment they are deciding whether this
  // page is worth waiting for.
  //
  // So nothing third-party is fetched until the page has fully loaded AND
  // the browser reports itself idle. Until then only the queue stubs exist,
  // which cost nothing and touch no network: events fired early are held and
  // replayed the moment the real scripts arrive, so none are lost.
  //
  // The honest cost of this: somebody who leaves in the first second or two
  // is never counted. That slightly understates the bounce rate — and it is
  // a trade worth making, because every event this site actually cares about
  // (a download, a review click) happens long after the page has settled.

  // Queue stubs. Local objects only — no requests leave the browser here.
  function stubGA4(id) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      // Sent with every hit so the funnel can be split by source in GA4.
      traffic_origin: visitSource,
      in_app_browser: inAppBrowser
    });
  }

  function stubClarity() {
    // Same shape Clarity's own loader builds. When the real tag arrives it
    // finds this queue already here, keeps it, and replays what's inside.
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
  }

  function fetchScript(src) {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  // Runs the callback once the page is loaded and the browser has a spare
  // moment — never while the reader is still waiting to see the page.
  function whenIdle(callback) {
    function go() {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(callback, { timeout: 4000 });
      } else {
        setTimeout(callback, 1200);
      }
    }
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', () => setTimeout(go, 300));
  }

  if (!IS_LOCAL) {
    if (CFG.GA4_ID)     stubGA4(CFG.GA4_ID);
    if (CFG.CLARITY_ID) stubClarity();

    whenIdle(function () {
      if (CFG.GA4_ID) {
        fetchScript('https://www.googletagmanager.com/gtag/js?id=' +
                    encodeURIComponent(CFG.GA4_ID));
      }
      if (CFG.CLARITY_ID) {
        fetchScript('https://www.clarity.ms/tag/' + encodeURIComponent(CFG.CLARITY_ID));
      }
    });
  }

  // ── THE ONE FUNCTION THE REST OF THE SITE CALLS ───────────────────────
  // track('guide_download', { guide: 'bp-turnaround' })
  //
  // Safe to call anywhere, at any time, whether or not anything is
  // configured. It never throws, and it never blocks what the reader was
  // actually trying to do.
  window.track = function track(event, params) {
    const data = Object.assign({
      source: visitSource,
      in_app: inAppBrowser
    }, params || {});

    if (CFG.DEBUG) console.log('[track]', event, data);
    if (IS_LOCAL) return;

    // GA4
    try { if (window.gtag) window.gtag('event', event, data); } catch (_) {}

    // Clarity — custom events plus a filterable tag, so you can jump
    // straight to "show me recordings of people who downloaded".
    try {
      if (window.clarity) {
        window.clarity('event', event);
        if (data.guide) window.clarity('set', 'guide', String(data.guide));
        window.clarity('set', 'source', String(data.source));
      }
    } catch (_) {}

    // Your own sheet — queued, not sent. See the batching notes below.
    if (CFG.LOG_ENDPOINT) {
      queueRow(Object.assign({
        type: 'event',
        event: event,
        // `origin` is this site; `referrer` is wherever they came from before
        // it. The sheet checks origin against its allowlist — checking
        // referrer would reject every reader arriving from Facebook.
        origin: location.origin,
        page: location.pathname + location.hash,
        referrer: document.referrer || '',
        screen: window.innerWidth + 'x' + window.innerHeight,
        language: navigator.language || '',
        time_local: new Date().toString()
      }, data));
    }
  };

  // ── BATCHING THE SHEET WRITES ─────────────────────────────────────────
  // A typical visit fires six or more events: the landing, reaching the
  // guides, four scroll depths. Sent one at a time that is six separate
  // connections to script.google.com — and the first of them has to pay for
  // a DNS lookup and a TLS handshake to a domain the reader has never
  // contacted, which on a weak mobile connection costs far more than the
  // few hundred bytes being sent.
  //
  // So rows are collected and sent together: one connection instead of six.
  // Nothing here is on the critical path — sendBeacon hands the data to the
  // browser, which delivers it in the background at its own pace, and the
  // page never waits for a reply.
  const queue = [];
  let flushTimer = null;

  function queueRow(row) {
    queue.push(row);

    // Don't let the queue grow without limit on a very long session.
    if (queue.length >= 10) { flush(); return; }

    if (!flushTimer) flushTimer = setTimeout(flush, 5000);
  }

  function flush() {
    clearTimeout(flushTimer);
    flushTimer = null;
    if (!queue.length || !CFG.LOG_ENDPOINT) return;

    const payload = JSON.stringify({ batch: queue.splice(0, queue.length) });

    try {
      // text/plain keeps this a "simple" request, so the browser skips the
      // CORS preflight that Apps Script has no way to answer.
      const blob = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
      if (!navigator.sendBeacon || !navigator.sendBeacon(CFG.LOG_ENDPOINT, blob)) {
        fetch(CFG.LOG_ENDPOINT, {
          method: 'POST', body: payload, keepalive: true, mode: 'no-cors'
        });
      }
    } catch (_) {}
  }

  // The reader closing the tab, switching apps, or tapping through to Amazon
  // is exactly when the last and most valuable rows are still waiting.
  // pagehide is the one event that fires reliably on mobile Safari, where
  // unload does not.
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flush();
  });

  // ── AUTOMATIC EVENTS ──────────────────────────────────────────────────
  // These need no hooks anywhere else in the code.

  // Every click that leaves the site for Amazon. This is the money step, and
  // it is the one thing GA4 will not record on its own.
  document.addEventListener('click', function (e) {
    const link = e.target.closest && e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    if (/amazon\.|amzn\.|a\.co\//i.test(href)) {
      window.track('amazon_click', {
        destination: href,
        label: (link.textContent || '').trim().slice(0, 60)
      });
    } else if (/facebook\.com/i.test(href)) {
      window.track('facebook_click', { destination: href });
    }
  }, true);

  // How far down the page people actually get. Fires once per depth.
  (function initScrollDepth() {
    const marks = [25, 50, 75, 100];
    let hit = 0;

    function onScroll() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) return;

      const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      while (hit < marks.length && pct >= marks[hit]) {
        window.track('scroll_depth', { depth: marks[hit] });
        hit++;
      }
      if (hit >= marks.length) window.removeEventListener('scroll', onScroll);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  })();

  // Did they actually reach the guides? A reader who never sees the section
  // cannot download from it, and that is a completely different problem to
  // fix than a reader who sees it and walks away.
  (function initGuidesSeen() {
    const section = document.getElementById('guides');
    if (!section || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        window.track('guides_section_seen', {});
        io.disconnect();
      });
    }, { threshold: 0.25 });

    io.observe(section);
  })();

  // One landing event per visit, carrying the source.
  window.track('page_view_custom', { title: document.title });
})();
