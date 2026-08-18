/**
 * ═══════════════════════════════════════════════════════════════════════
 * Dr. James Hartwell — the whole backend
 * ═══════════════════════════════════════════════════════════════════════
 *
 * This is not a server. It is a script attached to one Google Sheet, run by
 * Google, for free, with no account beyond the Gmail address you already
 * have. There is nothing to deploy, nothing to renew and nothing to pay.
 *
 * It does two jobs:
 *   1. Writes an email address to the "Signups" tab when a reader asks to be
 *      told about a guide that isn't finished.
 *   2. Writes a row to the "Events" tab every time something happens on the
 *      site — a download, a review click, a guide that couldn't be saved.
 *
 * SETUP IS IN  SETUP-TRACKING.md  — follow that, not this comment.
 *
 * Quotas, so you know where the ceiling is: Apps Script allows roughly
 * 20,000 web-app calls and 100 emails a day on a free Gmail account, and a
 * Sheet holds 10 million cells. For a site sending a few hundred readers a
 * day from Facebook, that is not a ceiling you will touch. If event logging
 * ever gets close, set LOG_EVENTS to false below and lean on Google
 * Analytics for the counting — the signup form will carry on working.
 * ═══════════════════════════════════════════════════════════════════════
 */

// ── SETTINGS ────────────────────────────────────────────────────────────

/** Email yourself the moment somebody signs up. Set to '' to switch off. */
var NOTIFY_ME_AT = '';

/** Write site events (downloads, clicks) to the Events tab. */
var LOG_EVENTS = true;

/** Only accept writes from your own site. Keeps other people's traffic and
 *  bored bots out of your sheet. Add any domain you serve the site from. */
var ALLOWED_REFERRERS = ['drjameshartwell.com', 'drjameshartwell.github.io'];

var SIGNUP_SHEET = 'Signups';
var EVENT_SHEET  = 'Events';


// ── ENTRY POINTS ────────────────────────────────────────────────────────

/**
 * Opening the web-app URL in a browser lands here. It exists so you can
 * confirm the deployment is live without having to use the site.
 */
function doGet() {
  return json({ ok: true, message: 'Hartwell endpoint is live.' });
}

/**
 * Every write from the site arrives here. The body is plain text rather than
 * application/json on purpose: it keeps the browser from sending a CORS
 * preflight, which Apps Script has no way to answer.
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'empty body' });
    }

    var data = JSON.parse(e.postData.contents);

    // A sign-up always arrives on its own, because the reader is waiting for
    // the answer and the form needs to know whether it worked.
    if (data.type === 'signup') return handleSignup(data);

    if (!LOG_EVENTS) return json({ ok: true, skipped: 'events off' });

    // Site events arrive in batches — the whole visit in one connection
    // rather than one connection per event, which matters a great deal to a
    // reader on a weak mobile signal. See the batching notes in analytics.js.
    if (data.batch && data.batch.length) return handleEventBatch(data.batch);

    return handleEvent(data);   // a single row, from an older cached page

  } catch (err) {
    // Never throw. A failure here must not turn into a broken form for a
    // reader who did nothing wrong.
    logFailure(err, e);
    return json({ ok: false, error: String(err) });
  }
}


// ── SIGNUPS ─────────────────────────────────────────────────────────────

function handleSignup(data) {
  var email = String(data.email || '').trim().toLowerCase();

  if (!email || email.indexOf('@') < 1 || email.length > 200) {
    return json({ ok: false, error: 'invalid email' });
  }
  if (!refererAllowed(data)) {
    return json({ ok: false, error: 'blocked' });
  }

  var sheet = getSheet(SIGNUP_SHEET, [
    'When', 'Name', 'Email', 'Guide', 'Guide title', 'Source', 'Notified?', 'Referrer'
  ]);

  // Same person, same guide, twice — usually a double tap or a second visit.
  // One row per person per guide keeps the list mailable.
  if (alreadySignedUp(sheet, email, String(data.guide || ''))) {
    return json({ ok: true, duplicate: true });
  }

  sheet.appendRow([
    new Date(),
    String(data.name || '').slice(0, 80),
    email,
    String(data.guide || '').slice(0, 60),
    String(data.guide_title || '').slice(0, 120),
    String(data.source || '').slice(0, 60),
    '',                                        // you tick this after sending
    String(data.referrer || '').slice(0, 300)
  ]);

  if (NOTIFY_ME_AT) {
    try {
      MailApp.sendEmail(
        NOTIFY_ME_AT,
        'New guide sign-up: ' + (data.guide_title || data.guide || 'a guide'),
        (data.name ? data.name + ' (' + email + ')' : email) +
        ' asked to be told when "' + (data.guide_title || data.guide) +
        '" is ready.\n\nThey came from: ' + (data.source || 'unknown') + '.'
      );
    } catch (mailErr) {
      // Over the daily mail quota, most likely. The row is already saved,
      // which is the part that actually matters.
    }
  }

  return json({ ok: true });
}

function alreadySignedUp(sheet, email, guide) {
  var rows = sheet.getLastRow();
  if (rows < 2) return false;

  // Columns C (email) and D (guide).
  var values = sheet.getRange(2, 3, rows - 1, 2).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === email &&
        String(values[i][1]).trim() === guide) {
      return true;
    }
  }
  return false;
}


// ── EVENTS ──────────────────────────────────────────────────────────────

/** One event. Kept for pages cached before batching existed. */
function handleEvent(data) {
  return handleEventBatch([data]);
}

/**
 * A whole visit's worth of events. Written with a single setValues() call
 * rather than appendRow() per event: appendRow re-opens and re-saves the
 * sheet every time, and on a batch of ten that is ten times the work for
 * the same result. Apps Script has a six-minute execution ceiling, and this
 * is the difference between comfortably inside it and occasionally not.
 */
function handleEventBatch(rows) {
  if (!rows.length) return json({ ok: true, written: 0 });
  if (!refererAllowed(rows[0])) return json({ ok: false, error: 'blocked' });

  var sheet = getSheet(EVENT_SHEET, [
    'When', 'Event', 'Guide', 'Source', 'In-app browser?',
    'Page', 'Screen', 'Language', 'Details'
  ]);

  // Anything not already given its own column is kept as JSON, so adding a
  // new field on the site never means touching this file.
  var known = {
    type: 1, event: 1, guide: 1, source: 1, in_app: 1, page: 1,
    screen: 1, language: 1, referrer: 1, time_local: 1, origin: 1
  };

  var now = new Date();
  var out = [];

  for (var i = 0; i < rows.length; i++) {
    var data  = rows[i];
    var extra = {};
    for (var key in data) {
      if (!known[key]) extra[key] = data[key];
    }

    out.push([
      now,
      String(data.event || 'unknown').slice(0, 60),
      String(data.guide || '').slice(0, 60),
      String(data.source || '').slice(0, 60),
      data.in_app ? 'yes' : 'no',
      String(data.page || '').slice(0, 200),
      String(data.screen || '').slice(0, 20),
      String(data.language || '').slice(0, 20),
      Object.keys(extra).length ? JSON.stringify(extra).slice(0, 500) : ''
    ]);
  }

  sheet.getRange(sheet.getLastRow() + 1, 1, out.length, out[0].length).setValues(out);

  return json({ ok: true, written: out.length });
}


// ── PLUMBING ────────────────────────────────────────────────────────────

/** Finds a tab, creating it with a frozen, bold header row if it's missing. */
function getSheet(name, headers) {
  var book  = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(name);

  if (!sheet) {
    sheet = book.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * The site sends `origin` — the address of the page the reader was actually
 * on. Note this is NOT data.referrer: that field holds where the reader came
 * from before arriving, which for most of your traffic is facebook.com.
 * Checking that one would reject exactly the readers you want.
 *
 * This is a nuisance filter, not security. Anything a browser sends can be
 * forged, so it exists only to keep the sheet readable if the endpoint URL
 * ever leaks. Nothing sensitive is stored either way.
 */
function refererAllowed(data) {
  if (!ALLOWED_REFERRERS.length) return true;

  var origin = String(data.origin || '');
  if (!origin) return true;   // older cached copies of the site send nothing

  for (var i = 0; i < ALLOWED_REFERRERS.length; i++) {
    if (origin.indexOf(ALLOWED_REFERRERS[i]) !== -1) return true;
  }
  return false;
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Keeps a short trail of anything that broke, in its own tab. */
function logFailure(err, e) {
  try {
    var sheet = getSheet('Errors', ['When', 'Error', 'Body']);
    sheet.appendRow([
      new Date(),
      String(err).slice(0, 400),
      (e && e.postData ? String(e.postData.contents).slice(0, 500) : '')
    ]);
  } catch (_) {}
}


// ── RUN THIS ONCE FROM THE EDITOR TO CHECK EVERYTHING WORKS ─────────────

function testItWorks() {
  var result = doPost({
    postData: {
      contents: JSON.stringify({
        type: 'signup',
        email: 'test@example.com',
        name: 'Test',
        guide: 'vagus',
        guide_title: 'The Vagus Nerve Reset',
        source: 'manual-test'
      })
    }
  });
  Logger.log(result.getContent());
}
