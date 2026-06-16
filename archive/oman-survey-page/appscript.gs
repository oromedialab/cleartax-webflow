/**
 * Google Apps Script: Multi-Region Form Handler
 * Routes submissions to different tabs based on the 'region' parameter.
 * Supports UPSERT (updates an existing row if work_email matches, otherwise appends).
 */

function doPost(e) {
  // 1. Safety check to prevent errors if run manually in the script editor
  if (typeof e === 'undefined') {
    return ContentService.createTextOutput("Error: No data received. Please test by submitting the actual form.")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    var spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
    var data = e.parameter;
    
    // 2. Identify the Region (e.g., "france", "KSA", "UAE")
    var region = data.region || "Main"; 
    
    // 3. Select the regional tab or create it if it doesn't exist
    var sheet = spreadSheet.getSheetByName(region);
    if (!sheet) {
      sheet = spreadSheet.insertSheet(region);
    }

    // 4. Standardized Column Headers (Matching your spreadsheet exact order)
    var headers = [
      'submitted_at', 'full_name', 'job_title', 'company', 'work_email', 
      'phone', 'industry_sector', 'annual_revenue', 'consent', 
      'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 
      'q12', 'q13', 'q14' , 'charity_selected', 'utm_source', 'utm_medium', 'utm_campaign', 
      'utm_term', 'utm_adgroup', 'page_url', 'form_type'
    ];

    // 5. If it's a new or empty sheet, add the headers first
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    // 6. Check if a row with this work_email already exists (CASE INSENSITIVE)
    var emailIndex = headers.indexOf('work_email');
    var emailToMatch = data['work_email'] ? String(data['work_email']).trim().toLowerCase() : "";
    var rowIndexToUpdate = -1;

    // Search for the email in the sheet (Start searching from row 2 to skip headers)
    if (emailToMatch && sheet.getLastRow() > 1) {
      // Get all emails in the email column
      var emailColumnValues = sheet.getRange(2, emailIndex + 1, sheet.getLastRow() - 1, 1).getValues();
      
      for (var i = 0; i < emailColumnValues.length; i++) {
        var existingEmail = emailColumnValues[i][0] ? String(emailColumnValues[i][0]).trim().toLowerCase() : "";
        
        // If the email matches perfectly, mark this row to be updated
        if (existingEmail === emailToMatch) {
          rowIndexToUpdate = i + 2; 
        }
      }
    }

    // 7A. UPDATE EXISTING ROW (Merge Charity Selection with Survey Answers)
    if (rowIndexToUpdate > -1) {
      // Fetch the data currently sitting in that row
      var existingData = sheet.getRange(rowIndexToUpdate, 1, 1, headers.length).getValues()[0];
      
      var updatedRow = headers.map(function(header, index) {
        // If the incoming payload has data for this field, use the new data.
        // Otherwise, keep whatever was already saved in the sheet.
        return data[header] ? data[header] : existingData[index];
      });
      
      // Overwrite the row with the newly merged data
      sheet.getRange(rowIndexToUpdate, 1, 1, headers.length).setValues([updatedRow]);
    } 
    // 7B. APPEND NEW ROW
    else {
      var row = headers.map(function(header) {
        return data[header] || '';
      });
      sheet.appendRow(row);
    }
    
    return ContentService.createTextOutput("Success")
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (error) {
    // Log errors for debugging in Apps Script console
    console.error('Submission Error:', error);
    return ContentService.createTextOutput("Error: " + error.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}
