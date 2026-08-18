/* ═══════════════════════════════════════════════════════════════════════
   Dr. James Hartwell — site behaviour
   ═══════════════════════════════════════════════════════════════════════ */

// Respect the OS "reduce motion" setting everywhere below.
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH = window.matchMedia('(hover: none)').matches;

// Tracking lives in analytics.js and is entirely optional. This wrapper means
// every call site below can fire and forget: if that file is missing, or the
// reader blocks it, nothing here notices and nothing breaks.
//
// Deliberately NOT called `track` — a top-level `function track()` in a plain
// script becomes window.track and would overwrite the real one in analytics.js.
const sendEvent = (function () {
  return function sendEvent(event, params) {
    try { if (window.track) window.track(event, params || {}); } catch (_) {}
  };
})();

// ── LOADER ──────────────────────────────────────────────────────────────
// Must never trap the page. Three independent ways out: the load event, a
// hard 3s ceiling, and the <noscript> rule in the head.
(function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    loader.classList.add('done');
  };

  window.addEventListener('load', () => setTimeout(dismiss, REDUCED_MOTION ? 0 : 1400));
  setTimeout(dismiss, 3000);           // safety net if `load` never fires
  window.addEventListener('error', dismiss, true);
})();

// ── TOAST ───────────────────────────────────────────────────────────────
// Single reusable notice. Announced to screen readers via aria-live.
const showToast = (function () {
  let host = null;
  let hideTimer = null;

  return function showToast(message, type = 'info', duration = 4200) {
    if (!host) {
      host = document.createElement('div');
      host.className = 'toast-host';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }

    host.innerHTML = '';
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    host.appendChild(toast);

    // force reflow so the entry transition actually runs
    void toast.offsetWidth;
    toast.classList.add('is-visible');

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => { if (host) host.innerHTML = ''; }, 400);
    }, duration);
  };
})();

// ── CURSOR ──────────────────────────────────────────────────────────────
// Skipped entirely on touch devices — it was running a rAF loop forever on
// phones where the CSS already hides it.
if (!IS_TOUCH && !REDUCED_MOTION) {
  const cursor = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');

  if (cursor && ring) {
    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      cursor.style.left = mx + 'px';
      cursor.style.top = my + 'px';
    }, { passive: true });

    (function animRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(animRing);
    })();

    const grow = () => {
      cursor.style.width = '18px';  cursor.style.height = '18px';
      ring.style.width = '54px';    ring.style.height = '54px';
      ring.style.opacity = '0.7';
    };
    const shrink = () => {
      cursor.style.width = '10px';  cursor.style.height = '10px';
      ring.style.width = '36px';    ring.style.height = '36px';
      ring.style.opacity = '1';
    };

    // Delegated, so it also covers the guide cards added to the DOM later.
    document.addEventListener('mouseover', e => {
      if (e.target.closest('a, button, .series-card, .book-float, .asset-card')) grow();
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest('a, button, .series-card, .book-float, .asset-card')) shrink();
    });
  }
}

// ── NAV SCROLL ──────────────────────────────────────────────────────────
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
}

// ── MOBILE MENU ─────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

function closeMobileMenu() {
  if (!hamburger || !mobileMenu) return;
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-label', 'Open menu');
  mobileMenu.classList.remove('open');
  document.body.style.overflow = '';
}

if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const willOpen = !mobileMenu.classList.contains('open');
    hamburger.classList.toggle('open', willOpen);
    mobileMenu.classList.toggle('open', willOpen);
    hamburger.setAttribute('aria-expanded', String(willOpen));
    hamburger.setAttribute('aria-label', willOpen ? 'Close menu' : 'Open menu');
    document.body.style.overflow = willOpen ? 'hidden' : '';
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) closeMobileMenu();
  });
}

// ── SCROLL REVEAL ────────────────────────────────────────────────────────
(function initReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  if (REDUCED_MOTION) {
    revealEls.forEach(el => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => io.observe(el));
})();

// ── PARALLAX BOOKS ───────────────────────────────────────────────────────
if (!REDUCED_MOTION) {
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrolled = window.scrollY;
      const stage = document.getElementById('booksStage');
      if (stage && scrolled < window.innerHeight) {
        stage.style.transform = `translateY(${scrolled * 0.08}px)`;
      }
      ticking = false;
    });
  }, { passive: true });
}

// ── BOOK 3D MOUSE TILT ────────────────────────────────────────────────────
(function initTilt() {
  const stage = document.getElementById('booksStage');
  if (!stage || IS_TOUCH || REDUCED_MOTION) return;

  stage.addEventListener('mousemove', e => {
    const rect = stage.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    stage.style.transition = 'transform 0.1s';
    stage.style.transform = `rotateY(${dx * 6}deg) rotateX(${-dy * 4}deg)`;
  });
  stage.addEventListener('mouseleave', () => {
    stage.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
    stage.style.transform = '';
  });
})();

// ── FREE GUIDES: DOWNLOAD, LOCKED STATE, SHARE ───────────────────────────
// No email gate and no fake success message. A guide either downloads or
// honestly says it isn't ready.
//
// THE ONE RULE HERE: never navigate the current tab to the PDF.
// A lot of this traffic arrives from a Facebook link, which opens inside
// Facebook's own in-app browser. That browser keeps no history of its own,
// so if the PDF replaces the page, "back" returns the reader to Facebook —
// the site is simply gone. Every path below either downloads silently or
// opens the PDF in a NEW tab, leaving the site sitting untouched behind it.
(function initGuides() {
  const grid = document.querySelector('.premium-asset-grid');
  if (!grid) return;

  // Facebook / Instagram / TikTok in-app browsers cannot save files at all.
  // The download attribute is ignored there and fetch-to-blob fails silently,
  // so we don't pretend — we open the PDF and say how to keep it.
  const IN_APP_BROWSER =
    /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|Twitter|TikTok|Snapchat|Pinterest|LinkedInApp/i
      .test(navigator.userAgent);

  const seenKey = id => `djh:guide-saved:${id}`;

  // ── Open in a new tab, never in this one ──────────────────────────────
  // `message` overrides the default notice so a caller can say something
  // more useful without a second toast wiping the first.
  function openInNewTab(file, title, message) {
    if (!file) return false;
    const win = window.open(file, '_blank', 'noopener,noreferrer');
    if (!win) {
      showToast('Your browser blocked the new tab. Please allow pop-ups for this site and tap again.', 'error', 7000);
      return false;
    }
    showToast(
      message || `“${title}” is open in a new tab — this page is still here behind it.`,
      'success',
      message ? 8000 : 4200
    );
    return true;
  }

  // ── The real download ─────────────────────────────────────────────────
  // Fetching to a Blob first is what makes this a genuine save rather than a
  // navigation: the browser is handed bytes it already has, so it writes a
  // file instead of deciding to render the PDF in the viewport.
  function triggerDownload(card, btn) {
    const file  = card.getAttribute('data-file');
    const title = card.getAttribute('data-title') || 'the guide';
    const name  = file ? file.split('/').pop() : '';

    const guideId = card.getAttribute('data-guide') || card.id;

    sendEvent('guide_download_click', { guide: guideId, title: title });

    if (!file) {
      showToast('This guide isn’t attached yet. Please try again shortly.', 'error');
      sendEvent('guide_download_failed', { guide: guideId, reason: 'no_file' });
      return;
    }

    // In-app browser: a download is impossible, so don't fake one.
    if (IN_APP_BROWSER) {
      const opened = openInNewTab(file, title,
        `“${title}” is open in a new tab. To keep it, use your browser’s share button and choose Save to Files.`);
      if (opened) markSaved(card, btn, 'opened');
      // The single most useful number on this site. Every one of these is a
      // reader who came from a Facebook link and physically cannot save the
      // file — a traffic problem wearing the mask of a conversion problem.
      sendEvent('guide_blocked_in_app', { guide: guideId, opened: !!opened });
      return;
    }

    if (btn) { btn.disabled = true; btn.classList.add('is-working'); }

    fetch(file, { credentials: 'same-origin' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        // Revoke late — Safari needs the URL alive for a moment after click.
        setTimeout(() => URL.revokeObjectURL(url), 30000);

        showToast(`“${title}” has been saved to your device.`, 'success');
        markSaved(card, btn, 'saved');
        sendEvent('guide_download', { guide: guideId, title: title, outcome: 'saved' });
      })
      .catch(() => {
        // Offline, or the file moved. Fall back to a new tab so the reader
        // still gets the guide, and the site still isn't replaced.
        const opened = openInNewTab(file, title);
        if (opened) markSaved(card, btn, 'opened');
        sendEvent('guide_download', {
          guide: guideId, title: title,
          outcome: opened ? 'opened_fallback' : 'failed'
        });
      })
      .finally(() => {
        if (btn) { btn.disabled = false; btn.classList.remove('is-working'); }
      });
  }

  // ── "You already have this one" state ─────────────────────────────────
  // Once a reader has the guide, offering "Download the guide" again is just
  // confusing. The button becomes a way back into what they already saved.
  // `mode` is 'saved' when the file really landed on their device, and
  // 'opened' when we could only show it. Saying "saved" to someone in the
  // Facebook browser, who has nothing on disk, would be a lie.
  function markSaved(card, btn, mode) {
    const id = card.getAttribute('data-guide') || card.id;
    try { localStorage.setItem(seenKey(id), mode); } catch (_) {}
    applySavedState(card, btn, mode);
  }

  function applySavedState(card, btn, mode) {
    if (card.classList.contains('is-saved')) return;
    card.classList.add('is-saved');

    const button = btn || card.querySelector('[data-action="download"], [data-action="open"]');
    if (!button) return;

    button.setAttribute('data-action', 'open');
    button.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>' +
      '<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>' +
      'Read the guide';

    const status = card.querySelector('.asset-status');
    if (status) status.textContent = mode === 'saved' ? 'Saved' : 'Opened';

    if (!card.querySelector('.asset-saved-note')) {
      const note = document.createElement('p');
      note.className = 'asset-saved-note';
      note.textContent = mode === 'saved'
        ? 'Already saved to your device. Opens in a new tab.'
        : 'You’ve opened this one. It opens again in a new tab.';
      const actions = card.querySelector('.asset-actions');
      if (actions) actions.insertAdjacentElement('beforebegin', note);
    }
  }

  // Restore the state on every visit, so a returning reader isn't told to
  // download something already sitting on their phone.
  document.querySelectorAll('.asset-card.is-live').forEach(card => {
    const id = card.getAttribute('data-guide') || card.id;
    let mode = null;
    try { mode = localStorage.getItem(seenKey(id)); } catch (_) {}
    // '1' is the value an earlier build wrote — treat it as a real save.
    if (mode === '1') mode = 'saved';
    if (mode === 'saved' || mode === 'opened') applySavedState(card, null, mode);
  });

  // "What's inside" disclosure. Mobile-only in CSS, but the handler is
  // harmless on desktop where the button is display:none and unclickable.
  grid.addEventListener('click', e => {
    const toggle = e.target.closest('.asset-inside-toggle');
    if (!toggle) return;
    const wrap = toggle.closest('.asset-inside');
    if (!wrap) return;
    const open = wrap.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const card = btn.closest('.asset-card');
    if (!card) return;

    const action = btn.getAttribute('data-action');
    const title = card.getAttribute('data-title') || 'This guide';

    const guideId = card.getAttribute('data-guide') || card.id;

    if (action === 'download') {
      triggerDownload(card, btn);

    } else if (action === 'open') {
      openInNewTab(card.getAttribute('data-file'), title);
      sendEvent('guide_reopen', { guide: guideId, title: title });

    } else if (action === 'notify') {
      // The guide isn't written yet, so there is nothing to give them now.
      // Offer to bring it to them instead of asking them to remember us.
      if (typeof openNotifyModal === 'function') {
        openNotifyModal(card, btn);
      } else {
        showToast(`"${title}" is still being written. Please check back soon — it’s coming.`, 'info');
      }

    } else if (action === 'locked') {
      showToast(`"${title}" is still being written. Please check back soon — it’s coming.`, 'info');
      sendEvent('guide_locked_click', { guide: guideId, title: title });

    } else if (action === 'share') {
      shareGuide(title, '#' + card.id);
      sendEvent('guide_share', { guide: guideId, title: title });
    }
  });
})();

// ── NATIVE WEB SHARE ──────────────────────────────────────────────────────
// The shared URL carries the card's anchor, so whoever opens it gets scrolled
// gently down to the guides section (see initDeepLinkScroll below).
function shareGuide(title, anchorId) {
  const fullUrl = window.location.origin + window.location.pathname + anchorId;
  const text = `Free clinical guide from Dr. James Hartwell: ${title}`;

  if (navigator.share) {
    navigator.share({ title, text, url: fullUrl }).catch(err => {
      if (err && err.name !== 'AbortError') copyLink(fullUrl);
    });
  } else {
    copyLink(fullUrl);
  }
}

function copyLink(url) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url)
      .then(() => showToast('Link copied to your clipboard.', 'success'))
      .catch(() => fallbackCopy(url));
  } else {
    fallbackCopy(url);
  }
}

// clipboard API needs HTTPS; this covers plain-http and older browsers
function fallbackCopy(url) {
  const ta = document.createElement('textarea');
  ta.value = url;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
  ta.remove();
  showToast(ok ? 'Link copied to your clipboard.' : url, ok ? 'success' : 'info', ok ? 4200 : 8000);
}

// ── DEEP LINK: SLOW GLIDE TO THE SHARED GUIDE ────────────────────────────
// Someone opens a shared link and gets eased down to the guides section,
// with the specific card briefly highlighted so they know which one.
(function initDeepLinkScroll() {
  const GUIDE_HASHES = ['#guides'];

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function glideTo(target, duration = 2200) {
    const navH = 90;
    const endY = Math.max(0, target.getBoundingClientRect().top + window.scrollY - navH);

    if (REDUCED_MOTION) { window.scrollTo(0, endY); return Promise.resolve(); }

    const startY = window.scrollY;
    const delta = endY - startY;
    if (Math.abs(delta) < 4) return Promise.resolve();

    // our own easing must not fight CSS scroll-behavior:smooth
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    return new Promise(resolve => {
      const start = performance.now();
      (function step(now) {
        const t = Math.min(1, (now - start) / duration);
        window.scrollTo(0, startY + delta * easeInOutCubic(t));
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          root.style.scrollBehavior = prevBehavior;
          resolve();
        }
      })(start);
    });
  }

  function handleHash() {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    let card = null;
    let target = null;

    if (GUIDE_HASHES.includes(hash)) {
      target = document.getElementById('guides');
    } else {
      const el = document.getElementById(hash.slice(1));
      if (el && el.classList.contains('asset-card')) {
        card = el;
        target = document.getElementById('guides') || el;
      }
    }
    if (!target) return;

    // Wait out the loader so the glide isn't hidden behind the overlay.
    setTimeout(() => {
      glideTo(target).then(() => {
        if (!card) return;
        card.classList.add('is-highlighted');
        card.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth', block: 'center' });
        setTimeout(() => card.classList.remove('is-highlighted'), 2600);
      });
    }, REDUCED_MOTION ? 0 : 1900);
  }

  // Browsers jump to the anchor instantly on load; undo that, then glide.
  if (window.location.hash) {
    const h = window.location.hash;
    const known = GUIDE_HASHES.includes(h) || !!document.getElementById(h.slice(1));
    if (known && !REDUCED_MOTION) {
      window.scrollTo(0, 0);
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    }
  }

  window.addEventListener('DOMContentLoaded', handleHash);
})();

// ── INERT PLACEHOLDER LINKS ──────────────────────────────────────────────
// Any <a data-pending> has no real URL yet. Rather than dumping the visitor
// at "#" or a 404, tell them the truth. Delete data-pending once the real
// href is in place and the link works normally again.
document.addEventListener('click', e => {
  const link = e.target.closest('a[data-pending]');
  if (!link) return;
  e.preventDefault();
  const label = (link.getAttribute('data-book') || link.textContent || 'This link').trim();
  showToast(`${label} isn’t linked up yet — it’s coming very soon.`, 'info');
});

// ── FOOTER YEAR ──────────────────────────────────────────────────────────
(function () {
  const y = document.getElementById('footerYear');
  if (y) y.textContent = new Date().getFullYear();
})();

// ── FLASHCARD STACK ANIMATION ─────────────────────────────────────────────
function initBookStacks() {
  if (REDUCED_MOTION) return;

  document.querySelectorAll('.series-stack').forEach(stack => {
    const cards = Array.from(stack.querySelectorAll('.stack-cover'));
    if (cards.length <= 1) return;

    let currentIndex = 0;

    function cycleStack() {
      cards.forEach((card, i) => {
        const offset = (i - currentIndex + cards.length) % cards.length;

        if (offset === 0) {
          card.style.transform = 'translateZ(0px) translateX(0px) translateY(0px) scale(1)';
          card.style.zIndex = 10;
          card.style.opacity = 1;
        } else if (offset === 1) {
          card.style.transform = 'translateZ(-40px) translateX(20px) translateY(15px) scale(0.9)';
          card.style.zIndex = 9;
          card.style.opacity = 0.8;
        } else if (offset === 2) {
          card.style.transform = 'translateZ(-80px) translateX(40px) translateY(30px) scale(0.8)';
          card.style.zIndex = 8;
          card.style.opacity = 0.5;
        } else {
          card.style.transform = 'translateZ(-120px) translateX(0px) translateY(45px) scale(0.7)';
          card.style.zIndex = Math.max(1, 7 - offset);
          card.style.opacity = 0;
        }
      });
      currentIndex = (currentIndex + 1) % cards.length;
    }

    cycleStack();
    // Pause when the tab is hidden — this used to run forever in background tabs.
    setInterval(() => { if (!document.hidden) cycleStack(); }, 3500);
  });
}
document.addEventListener('DOMContentLoaded', initBookStacks);

// ── AUTO-PANNING PILLS (MOBILE) ───────────────────────────────────────────
function initPillScroller() {
  if (REDUCED_MOTION) return;

  document.querySelectorAll('.series-books').forEach(container => {
    let direction = 1;
    let isTouching = false;
    let resumeTimer = null;

    container.addEventListener('touchstart', () => {
      isTouching = true;
      clearTimeout(resumeTimer);
    }, { passive: true });

    container.addEventListener('touchend', () => {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { isTouching = false; }, 1500);
    }, { passive: true });

    setInterval(() => {
      if (document.hidden || window.innerWidth > 900 || isTouching) return;
      if (container.scrollWidth <= container.clientWidth) return;

      container.scrollLeft += direction;

      if (Math.ceil(container.scrollLeft) >= (container.scrollWidth - container.clientWidth)) {
        direction = -1;
      } else if (container.scrollLeft <= 0) {
        direction = 1;
      }
    }, 30);
  });
}
document.addEventListener('DOMContentLoaded', initPillScroller);

// ── AUTO-BOUNCE PRINCIPLES MARQUEE ───────────────────────────────────────
function initPrinciplesScroller() {
  const track = document.getElementById('principlesTrack');
  if (!track || REDUCED_MOTION) return;

  let direction = 1;
  const speed = 1;
  let isPaused = false;
  let resumeTimer = null;

  track.addEventListener('mouseenter', () => { isPaused = true; });
  track.addEventListener('mouseleave', () => { isPaused = false; });
  track.addEventListener('touchstart', () => {
    isPaused = true;
    clearTimeout(resumeTimer);
  }, { passive: true });
  track.addEventListener('touchend', () => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { isPaused = false; }, 1500);
  }, { passive: true });

  setInterval(() => {
    if (document.hidden || isPaused || window.innerWidth > 900) return;

    const container = track.parentElement;
    if (!container) return;
    const maxScroll = track.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return;

    container.scrollLeft += direction * speed;

    if (Math.ceil(container.scrollLeft) >= maxScroll) direction = -1;
    else if (container.scrollLeft <= 0) direction = 1;
  }, 30);
}
document.addEventListener('DOMContentLoaded', initPrinciplesScroller);

// ── HERO BOOK 3D CAROUSEL SWAPPER ─────────────────────────────────────────
function initHeroSwapper() {
  const books = ['book1', 'book2', 'book3', 'book4', 'book5']
    .map(id => document.getElementById(id))
    .filter(Boolean);

  if (books.length < 5) return;

  const getPositions = () => {
    const isMobile = window.innerWidth <= 900;
    if (isMobile) {
      return [
        { transform: 'translate(-50px, -75px) scale(1.4)', zIndex: 5, opacity: 1 },
        { transform: 'translate(10px, -90px) rotate(8deg) scale(1.15)', zIndex: 4, opacity: 0.85 },
        { transform: 'translate(40px, -60px) rotate(15deg) scale(0.95)', zIndex: 3, opacity: 0.5 },
        { transform: 'translate(-140px, -60px) rotate(-15deg) scale(0.95)', zIndex: 2, opacity: 0.5 },
        { transform: 'translate(-110px, -90px) rotate(-8deg) scale(1.15)', zIndex: 4, opacity: 0.85 }
      ];
    }
    return [
      { transform: 'translate(-80px, -110px) scale(1.15)', zIndex: 5, opacity: 1 },
      { transform: 'translate(30px, -130px) rotate(8deg) scale(0.9)', zIndex: 4, opacity: 0.85 },
      { transform: 'translate(90px, -80px) rotate(15deg) scale(0.75)', zIndex: 3, opacity: 0.5 },
      { transform: 'translate(-250px, -80px) rotate(-15deg) scale(0.75)', zIndex: 2, opacity: 0.5 },
      { transform: 'translate(-190px, -130px) rotate(-8deg) scale(0.9)', zIndex: 4, opacity: 0.85 }
    ];
  };

  let currentIndex = 0;

  function cycleHeroBooks() {
    const positions = getPositions();

    books.forEach((book, i) => {
      const pos = positions[(i - currentIndex + books.length) % books.length];

      book.style.animation = 'none';
      book.style.transition = REDUCED_MOTION
        ? 'none'
        : 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
      book.style.left = '50%';
      book.style.top = '50%';
      book.style.marginLeft = '0';
      book.style.marginTop = '0';
      book.style.transform = pos.transform;
      book.style.zIndex = pos.zIndex;
      book.style.opacity = pos.opacity;
    });

    currentIndex = (currentIndex + 1) % books.length;
  }

  cycleHeroBooks();
  if (REDUCED_MOTION) return;                // lay them out once, then stop
  setInterval(() => { if (!document.hidden) cycleHeroBooks(); }, 3000);

  // Positions are breakpoint-dependent, so re-lay-out on resize.
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      currentIndex = (currentIndex - 1 + books.length) % books.length;
      cycleHeroBooks();
    }, 200);
  });
}
document.addEventListener('DOMContentLoaded', initHeroSwapper);

/* ═══════════════════════════════════════════════════════════════════════
   LEAVE-A-REVIEW MODAL
   ═══════════════════════════════════════════════════════════════════════
   Step 1 — the reader picks a series.
   Step 2 — they pick the exact book, which opens that book's Amazon
            "write a review" page in a new tab.

   ┌─ THE ONLY THING YOU EVER NEED TO EDIT ────────────────────────────┐
   │ REVIEW_SERIES below. Everything on screen is built from it — the  │
   │ series rows, the cover stacks, the book grid, the counts.         │
   │                                                                    │
   │ TO CONNECT A BOOK, put its ASIN in `asin`. The ASIN is the 10-     │
   │ character code in the book's Amazon URL, e.g.                      │
   │     amazon.com/dp/B0H5YJSCNH  ->  asin: 'B0H5YJSCNH'              │
   │ A full URL works too — paste it in and it's used as-is.            │
   │                                                                    │
   │ A book left with asin: '' is NOT broken. It shows greyed out with  │
   │ a "Link coming soon" badge and an honest message when tapped,      │
   │ rather than sending a reader to a dead Amazon page.                │
   └────────────────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════════════ */

const REVIEW_SERIES = [
  {
    id: 'heart',
    name: 'The Heart Health Beginners Series',
    accentRgb: '192,57,43',                 // --heart, matches the site's series card
    books: [
      { title: 'Reducing High Blood Pressure for Beginners', cover: 'books/h1.webp', asin: 'B0H61Y5XHK' },
      { title: 'The DASH Diet for Beginners',                cover: 'books/h2.webp', asin: 'B0H6Z89F3B' },
      { title: 'Heart-Healthy Meal Prep for Beginners',      cover: 'books/h3.webp', asin: 'B0H87D57K8' },
      { title: 'Managing Diabetes & Blood Pressure Together', cover: 'books/h4.webp', asin: 'B0H8DJB2WB' },
      { title: 'Stress-Free Living for a Healthier Heart',   cover: 'books/h5.webp', asin: 'B0H8DDDWG4' }
    ]
  },
  {
    id: 'mediterranean',
    name: 'The Mediterranean Diet Series',
    accentRgb: '26,107,60',                 // --dash
    // Titles for books 2–5 are placeholders taken from the cover numbering —
    // swap them for the real Amazon titles when the series goes live.
    books: [
      { title: 'The Mediterranean Diet for Beginners', cover: 'books/m1.webp', asin: 'B0HDHYT1LW' },
      { title: 'Mediterranean Series — Book 2',        cover: 'books/m2.webp', asin: '' },
      { title: 'Mediterranean Series — Book 3',        cover: 'books/m3.webp', asin: '' },
      { title: 'Mediterranean Series — Book 4',        cover: 'books/m4.webp', asin: '' },
      { title: 'Mediterranean Series — Book 5',        cover: 'books/m5.webp', asin: '' }
    ]
  },
  {
    id: 'trackers',
    name: 'Clinical Trackers & Logbooks',
    accentRgb: '8,145,178',                 // --ai
    books: [
      { title: 'Blood Pressure Home Monitor Guide',    cover: 'books/log1.webp', asin: 'B0HDBDHJCJ' },
      { title: 'Daily Blood Pressure 52-Week Log Book', cover: 'books/log1.webp', asin: '' }
    ]
  },
  {
    id: 'journals',
    name: 'Mental Health Journals',
    accentRgb: '107,63,160',                // --mind
    // `cover` may be left out entirely — the tile falls back to a lettered
    // card in the house colours, so a book can be listed before its art exists.
    books: [
      { title: 'The Anxiety Relief Journal', cover: 'books/a1.webp', asin: '' }
    ]
  }
];

// An ASIN becomes Amazon's review composer; a full URL is trusted as given.
function amazonReviewUrl(asin) {
  const v = String(asin || '').trim();
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  return `https://www.amazon.com/review/create-review?asin=${encodeURIComponent(v)}`;
}

document.addEventListener('DOMContentLoaded', function initReviewModal() {
  const modal    = document.getElementById('reviewModal');
  const openBtn  = document.getElementById('openReviewBtn');
  const closeBtn = document.getElementById('rvClose');
  if (!modal || !openBtn || !closeBtn) return;

  const dialog     = modal.querySelector('.rv-dialog');
  const titleEl    = document.getElementById('rvTitle');
  const subEl      = document.getElementById('rvSub');
  const stepEls    = modal.querySelectorAll('.rv-step');
  const paneSeries = document.getElementById('rvPaneSeries');
  const paneBooks  = document.getElementById('rvPaneBooks');
  const body       = document.getElementById('rvBody');

  const COPY = {
    1: { title: 'Which series did you read?', sub: 'Pick the series first — then the exact guide.' },
    2: { title: 'Which guide exactly?',       sub: 'Tap a cover and Amazon opens on its review page.' }
  };

  let lastFocused = null;
  let currentStep = 1;

  const escapeHtml = str => String(str).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const starsMarkup = () =>
    '<span class="rv-stars" aria-hidden="true">' +
    Array.from({ length: 5 }, () =>
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z"/></svg>'
    ).join('') + '</span>';

  // ── STEP 1 ─────────────────────────────────────────────────────────────
  function renderSeries() {
    paneSeries.innerHTML =
      '<div class="rv-series-list">' +
      REVIEW_SERIES.map(s => {
        const live  = s.books.filter(b => amazonReviewUrl(b.asin)).length;
        const count = s.books.length;
        const note  = count === 0
          ? 'Not published yet'
          : (live > 0
              ? `${count} ${count === 1 ? 'guide' : 'guides'} · ready to review`
              : `${count} ${count === 1 ? 'guide' : 'guides'} · links coming soon`);

        // Up to three covers, fanned out behind each other.
        const covers = s.books.slice(0, 3).filter(b => b.cover).map(b =>
          `<img src="${escapeHtml(b.cover)}" alt="" loading="lazy" decoding="async">`
        ).join('');

        return `
          <button class="rv-series" type="button" data-series="${escapeHtml(s.id)}"
                  style="--accent:rgb(${s.accentRgb})">
            <span class="rv-series-covers" aria-hidden="true">${covers}</span>
            <span class="rv-series-text">
              <span class="rv-series-name">${escapeHtml(s.name)}</span>
              <span class="rv-series-note"><span class="rv-dot"></span>${escapeHtml(note)}</span>
            </span>
            <svg class="rv-series-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>`;
      }).join('') +
      '</div>';
  }

  // ── STEP 2 ─────────────────────────────────────────────────────────────
  function renderBooks(series) {
    const back = `
      <button class="rv-back" type="button" data-action="back">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${escapeHtml(series.name)}
      </button>`;

    if (!series.books.length) {
      paneBooks.innerHTML = back +
        '<p class="rv-empty">This series isn’t published yet, so there’s nothing to review just now.<br>Thank you for wanting to.</p>';
      return;
    }

    const tiles = series.books.map(b => {
      const url     = amazonReviewUrl(b.asin);
      const pending = !url;
      const label   = pending
        ? `${b.title} — review link coming soon`
        : `Write a review for ${b.title} on Amazon`;

      const art = b.cover
        ? `<img src="${escapeHtml(b.cover)}" alt="" loading="lazy" decoding="async">`
        : `<span class="rv-book-blank" aria-hidden="true">${escapeHtml(b.title.trim().charAt(0))}</span>`;

      return `
        <button class="rv-book${pending ? ' is-pending' : ''}" type="button"
                data-url="${escapeHtml(url)}" data-title="${escapeHtml(b.title)}"
                aria-label="${escapeHtml(label)}" style="--accent:rgb(${series.accentRgb})">
          <span class="rv-book-cover">
            ${pending ? '<span class="rv-badge">Soon</span>' : ''}
            ${art}
            <span class="rv-book-veil">
              ${starsMarkup()}
              <span class="rv-veil-label">${pending ? 'Not linked yet' : 'Write a review'}</span>
            </span>
          </span>
          <span class="rv-book-title">${escapeHtml(b.title)}</span>
        </button>`;
    }).join('');

    paneBooks.innerHTML = back + `<div class="rv-books">${tiles}</div>`;
  }

  // ── STEP SWITCHING ─────────────────────────────────────────────────────
  // The dialog's height is animated across the swap so the box grows and
  // shrinks instead of snapping.
  function goToStep(step, series) {
    if (step === currentStep) return;
    const from = dialog.getBoundingClientRect().height;

    if (step === 2) renderBooks(series);

    const entering = step === 2 ? paneBooks  : paneSeries;
    const leaving  = step === 2 ? paneSeries : paneBooks;

    leaving.hidden = true;
    leaving.classList.remove('rv-from-right', 'rv-from-left');
    entering.hidden = false;
    entering.classList.remove('rv-from-right', 'rv-from-left');
    void entering.offsetWidth;                       // restart the animation
    entering.classList.add(step === 2 ? 'rv-from-right' : 'rv-from-left');

    titleEl.textContent = COPY[step].title;
    subEl.textContent   = COPY[step].sub;
    stepEls.forEach((el, i) => el.classList.toggle('is-active', i < step));

    body.scrollTop = 0;
    currentStep = step;

    if (!REDUCED_MOTION && dialog.animate) {
      const to = dialog.getBoundingClientRect().height;
      if (Math.abs(to - from) > 4) {
        dialog.animate(
          [{ height: from + 'px' }, { height: to + 'px' }],
          { duration: 420, easing: 'cubic-bezier(0.25,1,0.5,1)' }
        );
      }
    }

    const firstBtn = entering.querySelector('button');
    if (firstBtn) firstBtn.focus({ preventScroll: true });
  }

  // ── OPEN / CLOSE ───────────────────────────────────────────────────────
  function openModal(e) {
    if (e) e.preventDefault();
    lastFocused = document.activeElement;
    sendEvent('review_modal_open', {});

    // Reset to step 1 without animating — the dialog isn't visible yet.
    currentStep = 1;
    paneBooks.hidden = true;
    paneSeries.hidden = false;
    paneSeries.classList.remove('rv-from-right', 'rv-from-left');
    titleEl.textContent = COPY[1].title;
    subEl.textContent   = COPY[1].sub;
    stepEls.forEach((el, i) => el.classList.toggle('is-active', i < 1));
    body.scrollTop = 0;

    // Padding stops the page shifting sideways when the scrollbar is hidden.
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
    document.body.style.overflow = 'hidden';

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => closeBtn.focus({ preventScroll: true }), 60);
  }

  function closeModal() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }

  // ── EVENTS ─────────────────────────────────────────────────────────────
  renderSeries();

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  paneSeries.addEventListener('click', e => {
    const btn = e.target.closest('.rv-series');
    if (!btn) return;
    const series = REVIEW_SERIES.find(s => s.id === btn.getAttribute('data-series'));
    if (series) {
      sendEvent('review_series_pick', { series: series.id });
      goToStep(2, series);
    }
  });

  paneBooks.addEventListener('click', e => {
    if (e.target.closest('[data-action="back"]')) { goToStep(1); return; }

    const tile = e.target.closest('.rv-book');
    if (!tile) return;

    const url   = tile.getAttribute('data-url');
    const title = tile.getAttribute('data-title') || 'This guide';

    if (!url) {
      showToast(`“${title}” isn’t linked to Amazon yet — it’s coming very soon.`, 'info');
      sendEvent('review_book_unlinked', { title: title });
      return;
    }

    // The end of the funnel. Opened with window.open rather than a link, so
    // the automatic outbound-link tracking in analytics.js can't see it.
    sendEvent('review_amazon_open', { title: title, destination: url });

    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`Opening Amazon so you can review “${title}”. Thank you.`, 'success');
    closeModal();
  });

  // Escape closes; Tab is trapped inside the dialog while it's open.
  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('is-open')) return;

    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;

    const focusables = modal.querySelectorAll(
      'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
});


/* ═══════════════════════════════════════════════════════════════════════
   "TELL ME WHEN IT'S READY"
   ─────────────────────────────────────────────────────────────────────
   The only place on this site that asks for an email address — and it asks
   about a guide that does not exist yet, so it can never stand between a
   reader and a file they came here to download. The live guide stays free
   and ungated.

   Two rules carried over from the download code, for the same reason:
     • Never fake success. If the address didn't reach the sheet, say so.
     • Never replace the page. Everything happens in the dialog.
   ═══════════════════════════════════════════════════════════════════════ */

// Called by the guides grid. Global on purpose — the grid handler above runs
// in its own IIFE and looks this up by name.
var openNotifyModal;

document.addEventListener('DOMContentLoaded', function initNotifyModal() {
  const modal = document.getElementById('notifyModal');
  if (!modal) return;

  const dialog    = modal.querySelector('.nt-dialog');
  const closeBtn  = document.getElementById('ntClose');
  const paneForm  = document.getElementById('ntPaneForm');
  const paneDone  = document.getElementById('ntPaneDone');
  const form      = document.getElementById('ntForm');
  const nameInput = document.getElementById('ntName');
  const mailInput = document.getElementById('ntEmail');
  const errorEl   = document.getElementById('ntError');
  const submitBtn = document.getElementById('ntSubmit');
  const titleEl   = document.getElementById('ntTitle');
  const subEl     = document.getElementById('ntSub');
  const doneSubEl = document.getElementById('ntDoneSub');
  const coverEl   = document.getElementById('ntCover');

  if (!form || !mailInput) return;

  let currentGuide = { id: '', title: '' };
  let lastFocused  = null;
  let sending      = false;

  const listKey = id => 'jh_notify_' + id;

  // analytics.js works out where this visit came from and parks it here, so
  // a sign-up row can say "this address came from the Facebook post".
  // Private browsing throws on sessionStorage, hence the guard.
  function visitSource() {
    try { return sessionStorage.getItem('jh_src') || ''; } catch (_) { return ''; }
  }

  // ── WHO ALREADY SIGNED UP ─────────────────────────────────────────────
  // Asking a second time for a guide that still hasn't shipped reads as
  // "you didn't listen", so the button changes once they're on the list.
  function alreadyOnList(id) {
    try { return !!localStorage.getItem(listKey(id)); } catch (_) { return false; }
  }

  function markOnList(card, btn) {
    try { localStorage.setItem(listKey(currentGuide.id), new Date().toISOString()); } catch (_) {}
    applyOnListState(card, btn);
  }

  function applyOnListState(card, btn) {
    const button = btn || (card && card.querySelector('[data-action="notify"]'));
    if (!button) return;
    button.innerHTML =
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<polyline points="20 6 9 17 4 12"></polyline></svg> You\'re on the list';
    button.classList.add('is-on-list');
  }

  document.querySelectorAll('.asset-card [data-action="notify"]').forEach(btn => {
    const card = btn.closest('.asset-card');
    if (!card) return;
    const id = card.getAttribute('data-guide') || card.id;
    if (alreadyOnList(id)) applyOnListState(card, btn);
  });

  // ── OPEN / CLOSE ──────────────────────────────────────────────────────
  openNotifyModal = function (card, btn) {
    const id    = card.getAttribute('data-guide') || card.id;
    const title = card.getAttribute('data-title') || 'this guide';
    currentGuide = { id: id, title: title, card: card, btn: btn };

    sendEvent('notify_modal_open', { guide: id, title: title });

    // Someone already signed up re-opening the dialog gets the confirmation
    // back, not an empty form asking for the same address again.
    const done = alreadyOnList(id);
    showPane(done ? 'done' : 'form');

    titleEl.textContent = title;
    if (doneSubEl) {
      doneSubEl.textContent = done
        ? `Your address is already down next to “${title}”. It comes to you the day it's finished.`
        : `I've written your address down next to “${title}”. When it's finished, it comes to you.`;
    }

    // Reuse the card's own cover so the reader can see what they signed up for.
    const thumb = card.querySelector('.asset-thumb');
    if (coverEl && thumb && thumb.getAttribute('src')) {
      coverEl.src = thumb.getAttribute('src');
      coverEl.alt = 'Cover of ' + title;
      coverEl.hidden = false;
    } else if (coverEl) {
      coverEl.hidden = true;
    }

    clearError();
    form.reset();

    lastFocused = document.activeElement;

    const sbw = window.innerWidth - document.documentElement.clientWidth;
    if (sbw > 0) document.body.style.paddingRight = sbw + 'px';
    document.body.style.overflow = 'hidden';

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');

    // Don't autofocus the email field: on a phone that throws the keyboard up
    // over the dialog before the reader has read a word of it.
    setTimeout(() => closeBtn && closeBtn.focus({ preventScroll: true }), 60);
  };

  function closeNotify() {
    if (!modal.classList.contains('is-open')) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function showPane(which) {
    const toDone = which === 'done';
    paneForm.hidden = toDone;
    paneDone.hidden = !toDone;
    paneForm.classList.toggle('is-active', !toDone);
    paneDone.classList.toggle('is-active', toDone);

    if (!REDUCED_MOTION && dialog && dialog.animate) {
      const from = dialog.getBoundingClientRect().height;
      requestAnimationFrame(() => {
        const to = dialog.getBoundingClientRect().height;
        if (Math.abs(to - from) > 4) {
          dialog.animate(
            [{ height: from + 'px' }, { height: to + 'px' }],
            { duration: 420, easing: 'cubic-bezier(0.25,1,0.5,1)' }
          );
        }
      });
    }
  }

  // ── VALIDATION ────────────────────────────────────────────────────────
  // Deliberately loose. A regex strict enough to be "correct" rejects real
  // addresses, and every rejection here is a reader lost for no reason.
  function looksLikeEmail(value) {
    return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(value);
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.hidden = false;
    mailInput.classList.add('is-invalid');
    mailInput.setAttribute('aria-invalid', 'true');
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.hidden = true;
    errorEl.textContent = '';
    mailInput.classList.remove('is-invalid');
    mailInput.removeAttribute('aria-invalid');
  }

  mailInput.addEventListener('input', clearError);

  function setSending(on) {
    sending = on;
    submitBtn.disabled = on;
    submitBtn.classList.toggle('is-working', on);
  }

  // ── SUBMIT ────────────────────────────────────────────────────────────
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    const email = (mailInput.value || '').trim();
    const name  = (nameInput ? nameInput.value : '').trim();

    if (!email) {
      showError('Please enter your email address so I know where to send it.');
      mailInput.focus();
      return;
    }

    if (!looksLikeEmail(email)) {
      showError('That address doesn’t look quite right — please check it over.');
      mailInput.focus();
      sendEvent('notify_invalid_email', { guide: currentGuide.id });
      return;
    }

    const endpoint = (window.TRACKING && window.TRACKING.LOG_ENDPOINT) || '';

    // No endpoint means the sheet was never connected. Say that plainly
    // rather than showing a thank-you for an address going nowhere.
    if (!endpoint) {
      showError('Sign-ups aren’t open just yet. Please follow the Facebook page — I announce every guide there the day it lands.');
      sendEvent('notify_no_endpoint', { guide: currentGuide.id });
      return;
    }

    clearError();
    setSending(true);
    sendEvent('notify_submit', { guide: currentGuide.id, title: currentGuide.title });

    const payload = JSON.stringify({
      type: 'signup',
      guide: currentGuide.id,
      guide_title: currentGuide.title,
      name: name,
      email: email,
      source: visitSource(),
      origin: location.origin,
      page: location.pathname + location.hash,
      referrer: document.referrer || '',
      language: navigator.language || '',
      time_local: new Date().toString()
    });

    // A plain string body makes the browser send Content-Type: text/plain,
    // which keeps this a "simple" request — Google Apps Script cannot answer
    // the CORS preflight that any other content type would trigger.
    const controller = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => { if (controller) controller.abort(); }, 15000);

    fetch(endpoint, {
      method: 'POST',
      body: payload,
      signal: controller ? controller.signal : undefined
    })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(() => {
        clearTimeout(timer);
        setSending(false);
        markOnList(currentGuide.card, currentGuide.btn);
        showPane('done');
        sendEvent('notify_success', { guide: currentGuide.id, title: currentGuide.title });
      })
      .catch(() => {
        clearTimeout(timer);
        setSending(false);
        showError('That didn’t go through — it may be your connection. Please try once more, and if it still fails, message me on Facebook and I’ll add you myself.');
        sendEvent('notify_failed', { guide: currentGuide.id });
      });
  });

  // ── EVENTS ────────────────────────────────────────────────────────────
  if (closeBtn) closeBtn.addEventListener('click', closeNotify);
  modal.addEventListener('click', e => { if (e.target === modal) closeNotify(); });

  paneDone.addEventListener('click', e => {
    if (e.target.closest('[data-action="nt-close"]')) closeNotify();
  });

  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('is-open')) return;

    if (e.key === 'Escape') { closeNotify(); return; }
    if (e.key !== 'Tab') return;

    const focusables = modal.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const visible = Array.prototype.filter.call(focusables, el => el.offsetParent !== null);
    if (!visible.length) return;

    const first = visible[0];
    const last  = visible[visible.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
});
