# India CFO Survey Report — Email Test Build

Duplicate of `archive/india-cfo-survey-report` with email-on-submit added via Google Apps Script `GmailApp`. Lives separately so prod page is untouched while we test.

---

## Data flow

```
┌─────────────────────────┐
│ User on Webflow page    │
│ (hero form OR modal)    │
│  enters work email      │
└───────────┬─────────────┘
            │  POST (URLSearchParams, mode: 'no-cors')
            │  payload: email, form_type, lead_source_page,
            │           lead_source_url, region, utm_*
            ▼
┌─────────────────────────────────────────────┐
│ Google Apps Script Web App                  │
│ (appscript-code.js → doPost)                │
│                                             │
│  1. Parse e.parameter                       │
│  2. Open Sheet → tab = region ("India")     │
│     (auto-create tab + headers if missing)  │
│  3. sendReportEmail(email)  ← NEW           │
│       └─ GmailApp.sendEmail(...)            │
│           subject + HTML body + replyTo     │
│           sender = script-owner account     │
│  4. appendRow([timestamp, email, ...,       │
│                emailStatus])                │
│  5. Return JSON {status, email}             │
└──────┬──────────────────────────┬───────────┘
       │                          │
       ▼                          ▼
┌──────────────────┐      ┌────────────────────┐
│ Google Sheet     │      │ User inbox         │
│ tab "India"      │      │ HTML email with    │
│ row appended     │      │ "Download PDF"     │
│ + email status   │      │ button → Drive PDF │
└──────────────────┘      └────────────────────┘

       (frontend ignores response — fire-and-forget)
       Success modal opens immediately on submit.
```

### Why fire-and-forget

Frontend uses `mode: 'no-cors'` so `response.ok` is unreliable. Code already assumes success. Sheet write + email both happen server-side. Failures are logged in the **Apps Script Executions** tab and the new "Email Sent" sheet column — not shown to user.

### Sender identity

`From:` shows the Google account that **owns the script**. Not configurable from JS. For prod we want a Workspace account on `@cleartax.com` (e.g. `reports@cleartax.com`) to own it. For testing your own dev Gmail is fine.

### Quotas

| Account                | Mail/day |
|------------------------|----------|
| Workspace (paid)       | 1,500    |
| Free `@gmail.com`      | 100      |

~67/day expected. Workspace plenty. Resets ~midnight Pacific.

---

## User action items

### A — Setup (one-time, before testing)

- [ ] **Pick the script-owner Google account.** For test: any Gmail. For prod: cleartax Workspace account (ask product/IT to provision `reports@cleartax.com` or similar).
- [ ] **Duplicate the prod Google Sheet** into a fresh "TEST — India CFO Survey" sheet so test rows dont pollute prod data. Open it.
- [ ] In that test sheet → **Extensions > Apps Script**. Paste contents of `appscript-code.js`. Save.
- [ ] Edit the **CONFIG block** at the top of the script:
  - `PDF_FILE_ID` — confirm it matches the Drive file ID for the report PDF.
  - `SENDER_NAME` — display name (default `ClearTax`).
  - `REPLY_TO` — set to a monitored cleartax inbox (or your test address).
- [ ] In the script editor, set `TEST_RECIPIENT` (near bottom) to your own email.
- [ ] Run `testEmail` once from the editor. Google will prompt for permissions (Gmail send, Drive read, Sheets write). **Approve all.**
- [ ] Confirm the test email landed in your inbox. Check spam folder too.
- [ ] Run `testFullFlow` once. Verify a row appears in the sheet and a second email arrives.
- [ ] Run `checkQuota` and note the number — sanity check.

### B — Deploy + wire to test page

- [ ] Apps Script editor → **Deploy > New deployment > Web app**.
  - Execute as: **Me**
  - Who has access: **Anyone**
- [ ] Copy the new Web App URL.
- [ ] Open `index-gsheet.html` in this folder. Find `PASTE_NEW_TEST_DEPLOYMENT_URL_HERE` (line ~620). Paste the URL.
- [ ] In Webflow, create a duplicate of the live page (e.g. URL slug `india-cfo-survey-report-email`). Set to **draft / staging only** so it doesnt get indexed.
- [ ] Paste each section's HTML from `index-gsheet.html` into the matching Embed elements on the duplicated page (same workflow as prod page).
- [ ] Publish the staging page to Webflow's `*.webflow.io` subdomain only — NOT the live `cleartax.com` domain.

### C — Test on staging

- [ ] Submit the form 3-4 times with different test addresses (your own + a colleague's gmail + an outlook + an o365 if possible).
- [ ] For each: confirm sheet row appears with `emailStatus = "sent"` and email arrives.
- [ ] Check spam folder on each provider. First few sends from a new sender often land there — note which providers flag it.
- [ ] Open Apps Script **Executions** tab — confirm zero failures.
- [ ] Click the "Download PDF Report" button in the email — confirm the Drive link still serves the PDF.

### D — Things to confirm with cleartax product/marketing before going live

- [ ] **Sender account:** which Workspace account should own the prod script? (`reports@cleartax.com`? `noreply@cleartax.com`? marketing's existing one?)
- [ ] **Reply-to inbox:** if user hits reply, who reads it?
- [ ] **Existing transactional email API:** ask product team if cleartax already has an internal email service (likely SES/SendGrid behind an API). If yes, prefer that for prod — better deliverability, branded `@cleartax.com` domain, central logs. Apps Script remains the fallback.
- [ ] **Subject line + body copy:** marketing approval on the email template in `buildEmailHtml()`.
- [ ] **PDF — link vs attachment:** current build sends a Drive link. Confirm marketing OK with that vs attached PDF (link is lighter, lower spam, future-trackable).
- [ ] **Privacy / compliance:** OK to send a marketing email to anyone who downloads? Any unsubscribe footer required?

### E — Promote to prod (after sign-off)

- [ ] Move script ownership to the cleartax Workspace account (or recreate it there).
- [ ] Repoint script to the **prod Google Sheet** (not the test one).
- [ ] Deploy as new version. Copy URL.
- [ ] Replace `APP_SCRIPT_URL` in the **prod** `archive/india-cfo-survey-report/index-gsheet.html` with the new URL. (Or just merge sheet logic into prod and swap the prod URL — same effect.)
- [ ] Republish prod Webflow page.
- [ ] Monitor Apps Script Executions tab + sheet's Email Sent column for first 24-48 hours.

---

## Files in this folder

| File | Purpose |
|------|---------|
| `index.html` | Original copy of the page (untouched, reference). |
| `index-gsheet.html` | Embed-ready HTML, **APP_SCRIPT_URL placeholder needs deployment URL**. |
| `appscript-code.js` | Apps Script with sheet append + email send. Paste into Google Apps Script editor. |
| `README.md` | This file. |

---

## Known gotchas

1. **Double-submit = 2 emails.** User clicks button twice fast → two sends. Cheap fix: cache last email in `PropertiesService` for 60s. Skip unless we see it in logs.
2. **Bounces are silent.** Bad emails fail without notifying user. Workspace admin gets bounce reports.
3. **Quota burst.** Past 1500/day, sends silently drop. Add a `MailApp.getRemainingDailyQuota()` guard if a campaign spike is expected.
4. **Sender warm-up.** First sends from a fresh sender often land in spam. Have 5-10 cleartax folks mark "not spam" in week 1.
5. **Script owner leaves.** If the owner's Workspace account is deactivated, sends stop. Use a shared service account, not a person.
