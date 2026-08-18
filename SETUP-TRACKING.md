# Turning on tracking

Everything here is free permanently. No card, no trial, no server.

The site works right now with none of this connected — tracking simply stays
switched off until you paste the IDs in. You can do these three parts in any
order, on different days, and stop after any one of them.

Everything you paste goes in **one file: `analytics.js`**, in the block at the
very top.

---

## Part 1 — Microsoft Clarity (10 minutes, do this one first)

This is the one that will actually change what you build. It records real
sessions: you watch a reader scroll past the download button, or tap it twice
because nothing seemed to happen. For an audience that is mostly over 55 and
mostly on a phone, that is worth more than any number.

1. Go to **clarity.microsoft.com** and sign in with your Microsoft or Google
   account.
2. Click **Add new project**.
   - Name: `Dr. James Hartwell`
   - Website: `drjameshartwell.com`
   - Category: Health
3. On the setup screen choose **Install manually**. You'll see a code block
   containing something like `"clarity", "script", "abcd1234ef"`.
4. Copy just that short code — `abcd1234ef` — not the whole block.
5. Open `analytics.js` and put it between the quotes:

   ```js
   CLARITY_ID: 'abcd1234ef',
   ```

6. Save, then push the site (see *Publishing* at the bottom).

Recordings start appearing within an hour or two of real traffic. Free with no
monthly limit.

**Where to look:** Clarity → Recordings, and filter by the tag `guide` to jump
straight to people who touched a guide.

---

## Part 2 — Google Analytics 4 (15 minutes)

Clarity shows you *why*. This shows you *how many*.

1. Go to **analytics.google.com** and sign in with your Gmail.
2. **Admin** (bottom left) → **Create** → **Property**.
   - Property name: `Dr. James Hartwell`
   - Time zone and currency: your own
3. Answer the business questions (Industry: Health; Size: Small).
4. On **Choose a platform**, pick **Web**.
   - Website URL: `https://drjameshartwell.com`
   - Stream name: `Website`
5. You'll land on a page showing a **Measurement ID** at the top right. It
   looks like `G-ABC1234XYZ`.
6. Copy it into `analytics.js`:

   ```js
   GA4_ID: 'G-ABC1234XYZ',
   ```

7. Save and push.

**Where to look:** Reports → Engagement → Events. The events this site sends
are listed at the bottom of this file.

---

## Part 3 — Your own Google Sheet (25 minutes)

Only needed for **email sign-ups**. The "Tell me when it's ready" popup on the
two unfinished guides will not work until this part is done — until then it
honestly tells readers that sign-ups aren't open yet, rather than pretending
to save an address.

It also gives you every site event as raw rows you own, which no dashboard
will ever take away from you.

### 3a. Make the sheet

1. Go to **sheets.google.com** and create a **Blank spreadsheet**.
2. Name it `Hartwell Site Data`.

You don't need to add any tabs or headings — the script builds them itself the
first time something arrives.

### 3b. Add the script

3. In that sheet, click **Extensions → Apps Script**. A code editor opens in a
   new tab.
4. Delete everything in the editor (it will have a small `myFunction` stub).
5. Open `backend/notify-endpoint.gs` from this folder, copy **all** of it, and
   paste it in.
6. Near the top of the pasted code, put your own address in so you get an email
   whenever somebody signs up:

   ```js
   var NOTIFY_ME_AT = 'you@example.com';
   ```

7. Just below that is `ALLOWED_REFERRERS`. It already lists
   `drjameshartwell.com` and `drjameshartwell.github.io`. **If you ever serve
   the site from another address, add it here** — anything arriving from a
   domain not on this list is thrown away, which is the point, but it will
   silently discard your own data if the list is out of date.
8. Click the **save icon**.

### 3c. Check it before going further

9. In the toolbar, pick **testItWorks** from the function dropdown and click
   **Run**.
10. Google will ask for permission the first time. Choose your account →
    **Advanced** → **Go to (project name)** → **Allow**. This is Google warning
    you about your own script; it is expected.
11. Go back to the spreadsheet tab. A **Signups** tab should now exist with one
    test row in it. Delete that row.

### 3d. Publish it

12. Back in the Apps Script editor, click **Deploy → New deployment**.
13. Click the gear next to *Select type* and choose **Web app**.
14. Set:
    - Description: `Hartwell site endpoint`
    - Execute as: **Me**
    - Who has access: **Anyone**  ← this must say Anyone, not "Anyone with a
      Google account", or readers will be asked to sign in
15. Click **Deploy**, then copy the **Web app URL**. It ends in `/exec`.
16. Paste it into `analytics.js`:

    ```js
    LOG_ENDPOINT: 'https://script.google.com/macros/s/AKfy..../exec',
    ```

17. Save and push.

> **Important, every time you edit the script later:** changes don't go live
> until you run **Deploy → Manage deployments → the pencil icon → Version: New
> version → Deploy**. The URL stays the same.

---

## Publishing

The site deploys itself when you push to GitHub. From this folder:

```
git add -A
git commit -m "Turn on tracking"
git push
```

Give it about a minute, then reload `drjameshartwell.com`.

---

## Checking it works

1. Open `drjameshartwell.com` on your phone, **not** on the computer you build
   on — the tracking deliberately ignores `localhost` so your own editing never
   pollutes the numbers.
2. Download the live guide.
3. Tap **Tell me when it's ready** on one of the unfinished guides and enter an
   address you can check.

Within a minute or two:

- your Google Sheet should have a new row under **Signups** and several under
  **Events**
- Clarity → Recordings should show your session (it can lag an hour)
- GA4 → Reports → **Realtime** should show one active user

If nothing arrives in the sheet, open the **Errors** tab in the same
spreadsheet — anything that broke is written there with the reason.

To debug in the browser, set `DEBUG: true` in `analytics.js`. Every event then
prints to the browser console as it fires.

---

## What gets recorded

| Event | What it tells you |
|---|---|
| `page_view_custom` | A visit, tagged with where it came from |
| `guides_section_seen` | They actually reached the guides |
| `guide_download_click` | They pressed the button |
| `guide_download` | The file really reached their device |
| `guide_blocked_in_app` | **They opened the site inside Facebook's browser, where downloading is impossible** |
| `guide_reopen` | Someone came back for a guide they already had |
| `guide_share` | They shared a guide |
| `notify_modal_open` | The sign-up popup was opened |
| `notify_submit` / `notify_success` | An address was entered / saved |
| `review_modal_open` | They opened the review picker |
| `review_amazon_open` | **They went to Amazon to leave a review** |
| `amazon_click` | Any other click through to Amazon |
| `scroll_depth` | How far down the page people get |

Every one of these carries the traffic source (`facebook`, `google`, `direct`
and so on) and whether the reader was inside an in-app browser.

**The two numbers to watch first:**

- `guides_section_seen` → `guide_download`. If lots see the section and few
  download, the problem is the card or the button.
- `guide_blocked_in_app`. If this is a large share of your traffic, your
  Facebook readers are tapping links inside Facebook's own browser, where the
  file physically cannot save. That is fixed with wording on the Facebook post
  ("open in your browser"), not with anything on the site.

---

## What this does not collect

Names and email addresses are collected **only** from the sign-up popup, where
the reader typed them in and was told what they're for. Nothing is ever taken
quietly.

Google Analytics and Clarity are never sent an address — their terms forbid it,
and the code here doesn't do it. From them you get country, device, browser,
referrer and behaviour, never an identity.

Before you send anything to the list, note that the footer's **Privacy** link
is still a placeholder (`data-pending` in `index.html`). Since you're now
storing addresses, that page should be written and linked.
