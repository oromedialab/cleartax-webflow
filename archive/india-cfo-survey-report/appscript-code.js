/**
 * Google Apps Script: Lead Capture Form Handler
 * Captures submissions from the India CFO Survey Report page.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this code into Code.gs (replace everything)
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as" to "Me (your email)"
 * 7. Set "Who has access" to "Anyone"
 * 8. Copy the Web App URL and paste it into `index-gsheet.html` (APP_SCRIPT_URL)
 */

function doPost(e) {
  // 1. Safety check to prevent errors if run manually in the script editor
  if (typeof e === 'undefined' || typeof e.parameter === 'undefined') {
    return ContentService.createTextOutput("Error: No data received. Please test by submitting the actual form.")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    var spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    var data = e.parameter;
    
    // 2. Identify the Region/Tab (defaults to "India")
    var region = data.region || "India"; 
    
    // 3. Select the regional tab or create it if it doesn't exist
    var sheet = spreadSheet.getSheetByName(region);
    if (!sheet) {
      sheet = spreadSheet.insertSheet(region);
      // Initialize Header Row if new sheet
      var headers = ["Timestamp", "Email", "Form Type", "Lead Source Page", "Lead Source URL", "UTM Source", "UTM Medium", "UTM Campaign"];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
    
    // 4. Construct the row data based on incoming parameters
    var rowData = [
      new Date(),                      // Timestamp
      data.email || "",               // Email
      data.form_type || "",           // Form Type
      data.lead_source_page || "",    // Source Page
      data.lead_source_url || "",     // Source URL
      data.utm_source || "",          // UTM Source
      data.utm_medium || "",          // UTM Medium
      data.utm_campaign || ""         // UTM Campaign
    ];
    
    // 5. Append to the next empty row
    sheet.appendRow(rowData);
    
    // 6. Return a successful CORS-enabled response
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    // Return error information
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle CORS Preflight requests if needed
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
