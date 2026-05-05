/**
 * Google Apps Script: Lead Capture + Email Delivery
 * India CFO Survey Report — TEST build with email send.
 *
 * SETUP:
 * 1. Open the Google Sheet (or duplicate the existing one for testing).
 * 2. Extensions > Apps Script. Paste this whole file into Code.gs.
 * 3. Edit the CONFIG block below (PDF_FILE_ID, SENDER_NAME, REPLY_TO).
 * 4. Run `sendReportEmail` once manually from the editor with your own email
 *    hardcoded — Google will prompt for Gmail/Drive/Sheets permissions. Approve.
 * 5. Deploy > New deployment > Web app.
 *      Execute as: Me        Who has access: Anyone
 * 6. Copy the new Web App URL into APP_SCRIPT_URL in index-gsheet.html
 *    (the URL is DIFFERENT from the prod script — keep them separate so the
 *     live page is not affected during testing).
 * 7. Submit the form from the test page. Check inbox + Apps Script Executions log.
 *
 * IMPORTANT — sender identity:
 *   Email "From" = the Google account that owns this script.
 *   For prod, deploy under a cleartax Workspace account (e.g. reports@cleartax.com)
 *   so the user sees a branded sender. Personal/dev account = bad look.
 *
 * QUOTAS:
 *   Workspace account: 1500 emails/day. Free Gmail: 100/day.
 *   2000/month (~67/day) is well within Workspace.
 *   Check remaining: MailApp.getRemainingDailyQuota()
 */

// ---------- CONFIG ----------
var PDF_FILE_ID  = '1s-8ODzsJzQGoPJ1p_8Qz9u9Pz0ojzzem';
var PDF_LINK     = 'https://drive.google.com/file/d/' + PDF_FILE_ID + '/view?usp=sharing';
var SENDER_NAME  = 'Team ClearTax';
var REPLY_TO     = 'support@cleartax.in'; 
var EMAIL_SUBJECT = '[Download] Your State of Tax Assurance 2026 Report is Here';
// ---------------------------


function doPost(e) {
  if (typeof e === 'undefined' || typeof e.parameter === 'undefined') {
    return ContentService.createTextOutput("Error: No data received. Test by submitting the actual form.")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    var data = e.parameter;

    // 1. Write to sheet (unchanged from prod)
    var spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    var region = data.region || "India";
    var sheet  = spreadSheet.getSheetByName(region);
    if (!sheet) {
      sheet = spreadSheet.insertSheet(region);
      var headers = ["Timestamp", "Email", "Form Type", "Lead Source Page", "Lead Source URL", "UTM Source", "UTM Medium", "UTM Campaign", "Email Sent"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }

    // 2. Send report email — fire-and-forget. Sheet write must not fail if mail fails.
    var emailStatus = "";
    try {
      sendReportEmail(data.email);
      emailStatus = "sent";
    } catch (mailErr) {
      emailStatus = "failed: " + mailErr.toString();
      console.error("mail fail for " + data.email + " -> " + mailErr);
    }

    // 3. Append row (with email-sent column appended at end)
    sheet.appendRow([
      new Date(),
      data.email || "",
      data.form_type || "",
      data.lead_source_page || "",
      data.lead_source_url || "",
      data.utm_source || "",
      data.utm_medium || "",
      data.utm_campaign || "",
      emailStatus
    ]);

    return ContentService.createTextOutput(JSON.stringify({ status: "success", email: emailStatus }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/**
 * Sends the report email to a single recipient.
 * Call manually with a hardcoded address to test + grant Gmail scope.
 */
function sendReportEmail(to) {
  if (!to) throw new Error("missing recipient email");

  try {
    // 1. Build the HTML (Using button instead of attachment to avoid size limits)
    var html = buildEmailHtml({
      download_link: PDF_LINK
    });

    // 2. Send the email
    GmailApp.sendEmail(to, EMAIL_SUBJECT, htmlToPlainText(), {
      htmlBody: html,
      name:    SENDER_NAME,
      replyTo: REPLY_TO
    });

    Logger.log("Email sent successfully with download button to: " + to);
  } catch (err) {
    Logger.log("ERROR: " + err.toString());
    throw err;
  }
}


/**
 * Inline HTML template. Uses {{var}} placeholders replaced from `vars` arg.
 *
 * To switch to a marketing-editable Gmail draft later:
 *   1. Create a draft in the script-owner Gmail account, subject prefix "TEMPLATE: Tax Report".
 *   2. Replace this function body with:
 *        var draft = GmailApp.getDrafts().find(function(d){
 *          return d.getMessage().getSubject().indexOf('TEMPLATE: Tax Report') === 0;
 *        });
 *        return draft.getMessage().getBody().replace(/{{download_link}}/g, vars.download_link);
 */
function buildEmailHtml(vars) {
  return ''
    + '<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,sans-serif;color:#333;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">'
    +   '<tr><td align="center">'
    +     '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:560px;width:100%;">'
    +       '<tr><td style="padding:40px 32px;">'
    +         '<p style="margin:0 0 16px;">Hello,</p>'
    +         '<p style="margin:0 0 16px;">Thank you for downloading <strong>The Readiness Illusion: State of Tax Assurance Report 2026</strong>.</p>'
    +         '<p style="margin:0 0 24px;">Please click the button below to download your copy of the report.</p>'
    +         '<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#8B5CF6;">'
    +           '<a href="' + vars.download_link + '" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">Download PDF Report</a>'
    +         '</td></tr></table>'
    +         '<p style="margin:32px 0 0;font-size:14px;"><a href="https://cleartax.in/s/contact-sales/lp?utm_source=Email&utm_medium=Organic&utm_campaign=India_CFO_Survey_State_of_Tax_Assurance_2026_Report_Thank_you_Email" style="color:#8B5CF6;text-decoration:none;font-weight:600;">Talk to an expert</a> to discuss how ClearTax can help automate your tax compliance and eliminate notices.</p>'
    +         '<p style="margin:32px 0 0;">Best,<br>Team ClearTax</p>'
    +       '</td></tr>'
    +     '</table>'
    +   '</td></tr>'
    + '</table>'
    + '</body></html>';
}


function htmlToPlainText() {
  return "Hello,\n\n"
       + "Thank you for downloading The Readiness Illusion: State of Tax Assurance Report 2026.\n\n"
       + "You can download your copy here: " + PDF_LINK + "\n\n"
       + "Talk to an expert (https://cleartax.in/s/contact-sales/lp) to discuss how ClearTax can help automate your tax compliance and eliminate notices.\n\n"
       + "Best,\n"
       + "Team ClearTax";
}


function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}


/* ============================================================
   MANUAL TEST HELPERS — run from Apps Script editor

   1) testEmail()        — sends one test email to TEST_RECIPIENT below.
   2) testFullFlow()     — simulates a doPost call end-to-end.
   3) checkQuota()       — logs remaining daily mail quota.
   ============================================================ */

var TEST_RECIPIENT = 'products@cleartaxmailer.com';   // <-- change before running

function testEmail() {
  sendReportEmail(TEST_RECIPIENT);
  Logger.log('sent test to ' + TEST_RECIPIENT);
}

function testFullFlow() {
  doPost({ parameter: {
    email: TEST_RECIPIENT,
    form_type: 'India CFO Survey Report (TEST)',
    lead_source_page: 'India CFO Survey Report',
    lead_source_url: 'https://example.com/test',
    region: 'India',
    utm_source: 'test', utm_medium: 'manual', utm_campaign: 'apps_script_test'
  }});
  Logger.log('full flow done — check sheet + inbox');
}

function checkQuota() {
  Logger.log('remaining today: ' + MailApp.getRemainingDailyQuota());
}
