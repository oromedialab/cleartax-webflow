/**
 * Global E-Invoicing Tracker — Apps Script backend.
 *
 * Reads the source Google Sheet and returns fully-shaped JSON that the
 * front-end (index.html) renders directly. All data + mapping logic lives
 * here so nothing is hard-coded in the page except the /exec URL.
 *
 * DEPLOY:
 *   Deploy → New deployment → type "Web app"
 *     - Execute as:  Me
 *     - Who has access:  Anyone            <-- required so the site can fetch it
 *   Copy the /exec URL into APPS_SCRIPT_URL in index.html.
 *   Re-deploy (Manage deployments → edit → new version) after any change.
 */

var SHEET_ID = "1ip7zZW1dySC9fNJfj0K05Qaw9reeoEDVOKyX_1pm_aE";
var SHEET_GID = "2098498896";

// country_code (ISO-2) → page region bucket
var REGION = {
  AR: "LATAM", AU: "APAC", AT: "Europe", BE: "Europe", BR: "LATAM", BG: "Europe",
  CA: "North America", CN: "APAC", CR: "LATAM", HR: "Europe", CZ: "Europe",
  DK: "Europe", FI: "Europe", FR: "Europe", DE: "Europe", HK: "APAC", HU: "Europe",
  IN: "APAC", IE: "Europe", IL: "Middle East", IT: "Europe", JP: "APAC", LV: "Europe",
  LT: "Europe", LU: "Europe", MY: "APAC", MT: "Europe", MU: "Africa", MX: "LATAM",
  NL: "Europe", NZ: "APAC", NO: "Europe", PE: "LATAM", PH: "APAC", PL: "Europe",
  PT: "Europe", PR: "LATAM", QA: "Middle East", RO: "Europe", RU: "Europe",
  SA: "Middle East", SG: "APAC", SK: "Europe", ZA: "Africa", KR: "APAC", ES: "Europe",
  SE: "Europe", CH: "Europe", TW: "APAC", TR: "Europe", AE: "Middle East",
  GB: "Europe", US: "North America", OM: "Middle East"
};

function doGet() {
  var payload;
  try {
    payload = buildData();
  } catch (err) {
    payload = { error: String(err) };
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildData() {
  var sheet = getSheetByGid(SHEET_ID, SHEET_GID);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values.shift().map(function (h) {
    return String(h).trim().toLowerCase();
  });
  var idx = {};
  headers.forEach(function (h, i) { idx[h] = i; });

  function cell(row, name) {
    var i = idx[name];
    return i != null && row[i] != null ? String(row[i]).trim() : "";
  }

  return values
    .map(function (row) {
      var code = cell(row, "country_code");
      return {
        name: cell(row, "country"),
        code: code.toLowerCase(),
        flag: flagFromCode(code),
        region: REGION[code.toUpperCase()] || "Other",
        status: deriveStatus(cell(row, "go_live_date")),
        deadline: cell(row, "go_live_date"),
        format: cell(row, "format_standard"),
        model: cell(row, "einvoice_model"),
        scope: cell(row, "transactions_covered"),
        penalty: cell(row, "clearance_vs_reporting") || "—",
        tip: cell(row, "remarks")
      };
    })
    .filter(function (x) { return x.name; });
}

function getSheetByGid(id, gid) {
  var ss = SpreadsheetApp.openById(id);
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (String(sheets[i].getSheetId()) === String(gid)) return sheets[i];
  }
  return sheets[0];
}

// ISO-2 code → flag emoji (regional-indicator symbols)
function flagFromCode(cc) {
  if (!cc || cc.length !== 2) return "🏳️";
  return cc.toUpperCase().replace(/[A-Z]/g, function (c) {
    return String.fromCodePoint(127397 + c.charCodeAt(0));
  });
}

// derive live / 2025 / 2026 / 2027 / planned from the go-live text.
// Focus on the B2B obligation (this tracks B2B mandates); if the row splits
// "B2G: … ; B2B: …", only the B2B clause drives the status.
function deriveStatus(goLive) {
  var s = (goLive || "").toLowerCase();
  var b2b = s.split(/b2b\s*:/)[1];
  if (b2b !== undefined) s = b2b;
  // drop "(enacted/legislated/passed … <year>)" clauses — that's not the mandate date
  s = s.replace(/\([^)]*(enact|legislat|passed|approved|signed)[^)]*\)/g, " ");
  if (/\b2025\b/.test(s)) return "2025";
  if (/\b2026\b/.test(s)) return "2026";
  if (/\b2027\b/.test(s) || /\b2028\b/.test(s)) return "2027";
  if (/no mandate|voluntary|draft|no federal/.test(s)) return "planned";
  if (/since|mandatory|phased|live|all taxpayers|\b(19|20)\d{2}\b/.test(s))
    return "live";
  return "planned";
}
