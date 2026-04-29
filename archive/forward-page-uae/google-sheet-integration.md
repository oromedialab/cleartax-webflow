# Google Sheets Integration Guide

Follow these steps to connect your landing page form to a Google Sheet.

## 1. Create the Google Sheet
1. Create a new Google Sheet (or open an existing one).
2. Go to **Extensions > Apps Script**.

## 2. Add the Apps Script Code
Delete any existing code in the script editor and paste the following:

```javascript
function doPost(e) {
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    
    // Get the sheet name from the request, or default to "Sheet1"
    var sheetName = e.parameter.sheetName || "Sheet1";
    var sheet = doc.getSheetByName(sheetName);
    
    // If the sheet doesn't exist, create it automatically
    if (!sheet) {
      sheet = doc.insertSheet(sheetName);
    }
    
    // Setup headers if the sheet is entirely empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp", "Full Name", "Email", "Company", "Designation", "Phone", "UTM Source", "UTM Medium", "UTM Campaign", "UTM Term", "UTM Content"]);
    }
    
    // Extract parameters sent from the frontend form
    var rowData = [
      new Date(),
      e.parameter.name || "",
      e.parameter.email || "",
      e.parameter.company || "",
      e.parameter.designation || "",
      e.parameter.phone || "",
      e.parameter.utm_source || "",
      e.parameter.utm_medium || "",
      e.parameter.utm_campaign || "",
      e.parameter.utm_term || "",
      e.parameter.utm_content || ""
    ];

    // Append the row
    sheet.appendRow(rowData);
    
    // Return a success response
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success", "row": sheet.getLastRow(), "sheet": sheetName }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return an error response
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 3. Deploy the Script
1. Click the **Deploy** button at the top right and select **New deployment**.
2. Click the gear icon ⚙️ next to "Select type" and choose **Web app**.
3. Fill in the details:
   - **Description**: e.g., "Forward UAE Lead Capture"
   - **Execute as**: **Me** (your Google account)
   - **Who has access**: **Anyone** (This is required for the form to submit without requiring users to log in).
4. Click **Deploy**. (You may be prompted to review permissions. Click "Review permissions", select your account, click "Advanced", and proceed).
5. Once deployed, copy the **Web app URL**.

## 4. Connect to Your Landing Page
1. Open the `index.html` file.
2. Locate the `fwdSubmit` function at the bottom of the file.
3. Find the line: `const scriptURL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';`
4. Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with the Web app URL you copied in Step 3.
5. Save the file. Your form is now live and will send data directly to your Google Sheet!
