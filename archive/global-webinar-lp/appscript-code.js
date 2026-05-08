/**
 * ClearTax Global Webinar Integration
 * Handles: Google Sheets logging & Demio Registration
 * 
 * SETUP:
 * 1. Open the Google Sheet (ID: 1D9mHWjzZ0JwIIumA-XVrQM4nl8890dKEdqSJioCghSA)
 * 2. Extensions > Apps Script. Paste this whole file.
 * 3. Deploy > New Deployment > Web App (Me / Anyone).
 * 4. Update the WEB_APP_URL in index.html with the new URL.
 */

const CONFIG = {
  SPREADSHEET_ID: '1D9mHWjzZ0JwIIumA-XVrQM4nl8890dKEdqSJioCghSA',
  SHEET_NAME: 'Leads',
  DEMIO_API_KEY: '60sc1dmG7W4KYnLnvJSjhM1XbCFMEmMB',
  DEMIO_API_SECRET: 'pRG42r0ltWbat607',
  DEMIO_EVENT_ID: 991386 // Fixed Numeric ID for May 20 Webinar
};

/**
 * Main entry point for the Web App
 */
function doPost(e) {
  const timestamp = new Date();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No data received");
    }

    const data = JSON.parse(e.postData.contents);
    console.log("Processing lead: " + data.email);

    // 1. SAVE TO GOOGLE SHEETS
    let sheetStatus = saveToSheet(data, timestamp);

    // 2. REGISTER IN DEMIO
    let demioStatus = registerInDemio(data);

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      sheet: sheetStatus,
      demio: demioStatus
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error("Critical doPost Error: " + err.message);
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Makes the API call to Demio
 */
function registerInDemio(userData) {
  try {
    const url = "https://my.demio.com/api/v1/event/register";
    
    const payload = {
      "id": CONFIG.DEMIO_EVENT_ID,
      "name": (userData.firstName || "") + " " + (userData.lastName || ""),
      "email": userData.email,
      "last_name": userData.lastName || "",
      "phone_number": userData.full_phone || "",
      "company": userData.company || "",
      "fields": {
        "Job title": userData.role || "" // Exactly as required by Demio Dashboard
      }
    };

    const options = {
      "method": "put",
      "contentType": "application/json",
      "headers": {
        "Api-Key": CONFIG.DEMIO_API_KEY,
        "Api-Secret": CONFIG.DEMIO_API_SECRET
      },
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };

    const response = UrlFetchApp.fetch(url, options);
    const resCode = response.getResponseCode();
    const resBody = response.getContentText();
    
    console.log(`Demio Response [${resCode}]: ${resBody}`);
    return resCode >= 200 && resCode < 300 ? "Success" : `Failed (${resCode}): ${resBody}`;
  } catch (e) {
    console.error("Demio API Call Failed: " + e.message);
    return "Failed: " + e.message;
  }
}

/**
 * Saves data to the specified Google Sheet
 */
function saveToSheet(data, timestamp) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
    
    if (sheet.getLastRow() === 0) {
      const headers = ["Timestamp", "First Name", "Last Name", "Email", "Phone", "Company", "Role", "UTM Source", "UTM Medium", "UTM Campaign"];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    }

    sheet.appendRow([
      timestamp,
      data.firstName || "",
      data.lastName || "",
      data.email || "",
      data.full_phone || "",
      data.company || "",
      data.role || "",
      data.utm_source || "",
      data.utm_medium || "",
      data.utm_campaign || ""
    ]);
    return "Success";
  } catch (e) {
    console.error("Sheet Write Failed: " + e.message);
    return "Failed: " + e.message;
  }
}

/** 
 * MANUAL TEST HELPERS
 */
function testDemio() {
  const result = registerInDemio({
    firstName: "Test",
    lastName: "User",
    email: "test-" + Math.floor(Math.random()*1000) + "@cleartax.in",
    full_phone: "+919999999999",
    company: "ClearTax Test",
    role: "Director of Tax"
  });
  Logger.log("Demio Test Result: " + result);
}
