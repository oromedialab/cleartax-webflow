function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Determine the sheet name: default to "German Round Table" if not provided
    const sheetName = data.sheetName || "German Round Table";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    // Dynamically create the sheet tab if it doesn't exist yet
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // Ensure header row exists on a new sheet
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "Email",
        "Name",
        "Position",
        "Company",
        "Q1: Bekanntheit Pflicht 2027",
        "Q2: Partner vorhanden",
        "Q3: Weitere Gesellschaften",
        "Q4: Zentralisierung gewünscht",
        "Q5: Zentralisierung Details",
        "UTM Source",
        "UTM Medium",
        "UTM Campaign",
        "UTM Term",
        "UTM Content"
      ]);
    }

    const email = data.email || "";
    const step = data.step;
    const utmSource = data.utm_source || "";
    const utmMedium = data.utm_medium || "";
    const utmCampaign = data.utm_campaign || "";
    const utmTerm = data.utm_term || "";
    const utmContent = data.utm_content || "";

    if (step === 1) {
      if (!email) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Email required" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // Check if email already exists to prevent duplicate rows
      const rows = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1].toString().toLowerCase() === email.toLowerCase()) {
          rowIndex = i + 1; // 1-based index
          break;
        }
      }

      const timestamp = new Date();
      if (rowIndex !== -1) {
        // Update existing row contact info
        sheet.getRange(rowIndex, 1).setValue(timestamp);
        sheet.getRange(rowIndex, 3).setValue(data.name || "");
        sheet.getRange(rowIndex, 4).setValue(data.position || "");
        sheet.getRange(rowIndex, 5).setValue(data.company || "");
        sheet.getRange(rowIndex, 11).setValue(utmSource);
        sheet.getRange(rowIndex, 12).setValue(utmMedium);
        sheet.getRange(rowIndex, 13).setValue(utmCampaign);
        sheet.getRange(rowIndex, 14).setValue(utmTerm);
        sheet.getRange(rowIndex, 15).setValue(utmContent);
      } else {
        // Append new row
        sheet.appendRow([
          timestamp,
          email,
          data.name || "",
          data.position || "",
          data.company || "",
          "", "", "", "", "", // Empty placeholders for Step 2
          utmSource,
          utmMedium,
          utmCampaign,
          utmTerm,
          utmContent
        ]);
      }

    } else if (step === 2) {
      // Find row by finding the email of the current session
      const targetEmail = data.email || "";
      if (!targetEmail) {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Email context missing for Step 2" }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const rows = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1].toString().toLowerCase() === targetEmail.toLowerCase()) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex !== -1) {
        // Update the Q1-Q5 columns
        sheet.getRange(rowIndex, 6).setValue(data.q1 || "");
        sheet.getRange(rowIndex, 7).setValue(data.q2 || "");
        sheet.getRange(rowIndex, 8).setValue(data.q3 || "");
        sheet.getRange(rowIndex, 9).setValue(data.q4 || "");
        sheet.getRange(rowIndex, 10).setValue(data.q5 || "");
        sheet.getRange(rowIndex, 11).setValue(utmSource);
        sheet.getRange(rowIndex, 12).setValue(utmMedium);
        sheet.getRange(rowIndex, 13).setValue(utmCampaign);
        sheet.getRange(rowIndex, 14).setValue(utmTerm);
        sheet.getRange(rowIndex, 15).setValue(utmContent);
      } else {
        // Fallback: If no row exists, append a new row
        sheet.appendRow([
          new Date(),
          targetEmail,
          "", "", "", // Contact details unknown
          data.q1 || "",
          data.q2 || "",
          data.q3 || "",
          data.q4 || "",
          data.q5 || "",
          utmSource,
          utmMedium,
          utmCampaign,
          utmTerm,
          utmContent
        ]);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
