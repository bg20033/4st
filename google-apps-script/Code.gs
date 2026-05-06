var SHEET_NAME = 'Devis Suite Leads'
var HEADERS = [
  'Created At',
  'Service',
  'First Name',
  'Last Name',
  'Phone',
  'Email',
  'Canton Number',
  'Canton Name',
  'Canton Abbreviation',
  'Source',
]

function doPost(event) {
  try {
    saveLead_(readPayload_(event))
    return json_({ ok: true })
  } catch (error) {
    return json_({ ok: false, error: String(error) })
  }
}

function doGet(event) {
  try {
    var payload = readPayload_(event)

    if (payload.action === 'submit') {
      saveLead_(payload)
      return jsonp_(payload.callback, { ok: true })
    }

    if (payload.action === 'ping') {
      return jsonp_(payload.callback, { ok: true })
    }

    var sheet = getLeadSheet_()
    ensureHeaders_(sheet)

    return HtmlService.createHtmlOutput(renderRows_(sheet)).setTitle('DEVIS SUITE Leads')
  } catch (error) {
    return jsonp_(
      event && event.parameter && event.parameter.callback,
      { ok: false, error: String(error) }
    )
  }
}

function testWrite() {
  var sheet = getLeadSheet_()
  ensureHeaders_(sheet)
  sheet.appendRow([
    new Date().toISOString(),
    'Test',
    'Arben',
    'Berisha',
    '+41 79 000 00 00',
    'arben@example.com',
    '25',
    'Genève',
    'GE',
    'DEVIS SUITE',
  ])
}

function getLeadSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()

  if (!spreadsheet) {
    throw new Error('Open this script from Extensions > Apps Script inside a Google Sheet.')
  }

  var sheet = spreadsheet.getSheetByName(SHEET_NAME)
  return sheet || spreadsheet.insertSheet(SHEET_NAME)
}

function ensureHeaders_(sheet) {
  var firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0]
  var hasHeaders = firstRow.join('').length > 0

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    sheet.setFrozenRows(1)
  }
}

function readPayload_(event) {
  if (event && event.parameter) {
    return event.parameter
  }

  return {}
}

function saveLead_(payload) {
  var sheet = getLeadSheet_()

  ensureHeaders_(sheet)
  sheet.appendRow([
    payload.submittedAt || new Date().toISOString(),
    payload.service || '',
    payload.firstName || '',
    payload.lastName || '',
    payload.phone || '',
    payload.email || '',
    payload.cantonNumber || '',
    payload.cantonName || '',
    payload.cantonAbbreviation || '',
    payload.source || 'DEVIS SUITE',
  ])
}

function renderRows_(sheet) {
  var values = sheet.getDataRange().getValues()
  var rows = values
    .map(function (row) {
      return (
        '<tr>' +
        row
          .map(function (cell) {
            return '<td>' + escapeHtml_(cell) + '</td>'
          })
          .join('') +
        '</tr>'
      )
    })
    .join('')

  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<style>body{font-family:Arial,sans-serif;margin:24px;color:#171717}' +
    'table{border-collapse:collapse;width:100%}td{border:1px solid #ddd;padding:8px}' +
    'tr:first-child{font-weight:700;background:#f5f5f5}</style></head><body>' +
    '<h1>DEVIS SUITE Leads</h1><table>' +
    rows +
    '</table></body></html>'
  )
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  )
}

function jsonp_(callback, data) {
  if (!callback) {
    return json_(data)
  }

  return ContentService.createTextOutput(
    String(callback) + '(' + JSON.stringify(data) + ');'
  ).setMimeType(ContentService.MimeType.JAVASCRIPT)
}
