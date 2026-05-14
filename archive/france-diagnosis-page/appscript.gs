/**
 * Google Apps Script: France Diagnosis Lead Handler
 * Captures diagnostic results and optional leads from the France Readiness Assessment.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code into Code.gs (replace everything).
 * 4. Click "Deploy" > "New deployment".
 * 5. Select type: "Web app".
 * 6. Set "Execute as" to "Me (your email)".
 * 7. Set "Who has access" to "Anyone".
 * 8. Copy the Web App URL and paste it into index.html (APP_SCRIPT_URL).
 */

function doPost(e) {
  // Prevent errors if run manually in script editor
  if (typeof e === 'undefined' || typeof e.parameter === 'undefined') {
    return ContentService.createTextOutput("Error: No data received. Please test by submitting from the diagnostic tool.")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    var spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = "France-Diagnosis-Leads";
    var sheet = spreadSheet.getSheetByName(sheetName);
    
    // Create sheet and headers if it doesn't exist
    if (!sheet) {
      sheet = spreadSheet.insertSheet(sheetName);
      var headers = [
        "Timestamp", 
        "Email", 
        "Overall Score", 
        "Data Score", 
        "Systems Score", 
        "Calendar Score", 
        "Result Bucket", 
        "Detailed Answers (JSON)", 
        "Page URL",
        "UTM Source",
        "UTM Medium",
        "UTM Campaign",
        "UTM Content",
        "UTM Term"
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    var data = e.parameter;
    
    // Construct row data
    var rowData = [
      new Date(),                      // Timestamp
      data.email || "Anonymous",       // Email
      data.overall || "0",             // Overall Score
      data.dataScore || "0",           // Data Score
      data.sysScore || "0",            // Systems Score
      data.timeScore || "0",           // Calendar Score
      data.bucketLabel || "",          // Result Bucket
      data.answers || "",              // Detailed Answers
      data.page_url || "",             // Page URL
      data.utm_source || "",           // UTM Source
      data.utm_medium || "",           // UTM Medium
      data.utm_campaign || "",         // UTM Campaign
      data.utm_content || "",          // UTM Content
      data.utm_term || ""              // UTM Term
    ];
    
    sheet.appendRow(rowData);

    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle CORS Preflight requests
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
