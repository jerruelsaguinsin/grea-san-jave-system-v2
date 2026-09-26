// ============================================================================
// pageActivityLog.js — DOM/event wiring for activity-log.html
// 16. RENDERING + 17. EVENT HANDLERS + 18. INITIALIZATION
// ============================================================================

let logSortDirection = "desc";

function guardOwnerOnlyLog() {
  if (!currentUser || currentActorType !== ACTOR_TYPES.STAFF || currentUser.role !== USER_ROLES.CO_OWNER) {
    window.location.href = "login-signup.html";
    return false;
  }
  return true;
}

function renderActivityLogTable(list, tableBodyId, emptyMessage) {
  let tbody = document.getElementById(tableBodyId);
  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">' + emptyMessage + '</td></tr>';
    return;
  }

  for (let i = 0; i < list.length; i++) {
    let log = list[i];
    let actorLabel = resolveActivityActorLabel(log);
    let row = document.createElement("tr");
    if (isSuspiciousActivity(log)) row.className = "suspicious-row";
    row.innerHTML =
      '<td data-label="Log ID">' + log.logId + '</td>' +
      '<td data-label="Timestamp">' + formatTimestamp(log.timestamp) + '</td>' +
      '<td data-label="Actor"><span class="badge ' + (actorLabel === "Customer" ? "badge-customer" : "badge-role") + '">' + actorLabel + '</span> ' + escapeHtmlLog(resolveActorName(log.actorId, log.actorType)) + '</td>' +
      '<td data-label="Action">' + escapeHtmlLog(log.actionType) + '</td>' +
      '<td data-label="Target">' + (log.targetId === null ? "—" : "#" + log.targetId) + '</td>' +
      '<td data-label="Details">' + escapeHtmlLog(log.details || "—") + '</td>';
    tbody.appendChild(row);
  }
}

function isSuspiciousActivity(log) {
  if (log.actionType === ANIKA_ACTION_TYPES_EXTENSION.ACCOUNT_DEACTIVATED ||
      log.actionType === ANIKA_ACTION_TYPES_EXTENSION.ACCOUNT_REACTIVATED) return true;
  return log.actionType === ANIKA_ACTION_TYPES_EXTENSION.ACCOUNT_UPDATED &&
    !isBlank(log.details) && containsText(log.details, "role/duty") !== -1;
}

function escapeHtmlLog(text) {
  let div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatTimestamp(isoString) {
  let d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleString();
}

function refreshActivityLogTable() {
  let keyword = document.getElementById("logSearchInput").value.trim();
  let actionFilter = document.getElementById("logActionFilter").value;
  let actorFilter = document.getElementById("logActorFilter").value;

  let base = isBlank(keyword) ? copyArray(activityLogs) : searchActivityLogsByKeyword(keyword);
  let filtered = filterActivityLogs(actionFilter, actorFilter);

  // Intersect the keyword and dropdown results with a sequential scan.
  let combined = [];
  let combinedCount = 0;
  for (let i = 0; i < base.length; i++) {
    let isInFiltered = false;
    for (let j = 0; j < filtered.length; j++) {
      if (filtered[j].logId === base[i].logId) {
        isInFiltered = true;
        break;
      }
    }
    if (isInFiltered) {
      combined[combinedCount] = base[i];
      combinedCount++;
    }
  }

  sortActivityLogsByTimestamp(combined, logSortDirection);
  let suspicious = [];
  for (let i = 0; i < combined.length; i++) {
    if (isSuspiciousActivity(combined[i])) insertRecord(suspicious, combined[i]);
  }
  renderActivityLogTable(suspicious, "suspiciousLogTableBody", "No suspicious activity found.");
  renderActivityLogTable(combined, "logTableBody", "No matching activity found.");
}

function populateActionFilterOptions() {
  let select = document.getElementById("logActionFilter");
  let allActionTypes = [];
  let count = 0;

  for (let key in ACTION_TYPES) {
    allActionTypes[count] = ACTION_TYPES[key];
    count++;
  }
  for (let key in ANIKA_ACTION_TYPES_EXTENSION) {
    allActionTypes[count] = ANIKA_ACTION_TYPES_EXTENSION[key];
    count++;
  }

  for (let i = 0; i < allActionTypes.length; i++) {
    let option = document.createElement("option");
    option.value = allActionTypes[i];
    option.textContent = allActionTypes[i];
    select.appendChild(option);
  }
}

function populateExportActionFilterOptions() {
  let source = document.getElementById("logActionFilter");
  let target = document.getElementById("exportActionFilter");
  for (let i = 1; i < source.options.length; i++) {
    let option = document.createElement("option");
    option.value = source.options[i].value;
    option.textContent = source.options[i].textContent;
    target.appendChild(option);
  }
}

function openExportAuditModal() {
  document.getElementById("exportAuditModalOverlay").classList.add("open");
}

function closeExportAuditModal() {
  document.getElementById("exportAuditModalOverlay").classList.remove("open");
}

function getExportLogs() {
  let startDate = document.getElementById("exportStartDate").value;
  let endDate = document.getElementById("exportEndDate").value;
  let actorFilter = document.getElementById("exportActorFilter").value;
  let actionFilter = document.getElementById("exportActionFilter").value;
  let filtered = [];

  for (let i = 0; i < activityLogs.length; i++) {
    let log = activityLogs[i];
    let logDate = new Date(log.timestamp);
    let matchesStart = isBlank(startDate) || logDate >= new Date(startDate + "T00:00:00");
    let matchesEnd = isBlank(endDate) || logDate <= new Date(endDate + "T23:59:59.999");
    let matchesActor = actorFilter === "ALL" || resolveActivityActorLabel(log) === actorFilter;
    let matchesAction = actionFilter === "ALL" || log.actionType === actionFilter;
    if (matchesStart && matchesEnd && matchesActor && matchesAction) insertRecord(filtered, log);
  }

  sortActivityLogsByTimestamp(filtered, "desc");
  return filtered;
}

function drawPdfTableHeader(pdf, yPosition, columnWidths) {
  let headers = ["ID", "Timestamp", "Actor", "Action", "Target", "Details"];
  let xPosition = 12;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.setFillColor(108, 78, 227);
  pdf.setDrawColor(227, 223, 243);
  pdf.setTextColor(255, 255, 255);
  for (let i = 0; i < headers.length; i++) {
    pdf.setFillColor(108, 78, 227);
    pdf.setTextColor(255, 255, 255);
    pdf.rect(xPosition, yPosition, columnWidths[i], 10, "FD");
    pdf.text(headers[i], xPosition + 2, yPosition + 6.5);
    xPosition += columnWidths[i];
  }
  pdf.setTextColor(38, 37, 48);
  return yPosition + 10;
}

function drawPdfLogRow(pdf, log, yPosition, columnWidths, rowIndex, isSuspicious) {
  let values = [
    String(log.logId),
    formatTimestamp(log.timestamp),
    resolveActivityActorLabel(log) + " - " + resolveActorName(log.actorId, log.actorType),
    log.actionType,
    log.targetId === null ? "None" : "#" + log.targetId,
    log.details || "No details",
  ];
  let linesByCell = [];
  let rowHeight = 7;
  for (let i = 0; i < values.length; i++) {
    linesByCell[i] = pdf.splitTextToSize(values[i], columnWidths[i] - 4);
    let cellHeight = (linesByCell[i].length * 3.8) + 4;
    if (cellHeight > rowHeight) rowHeight = cellHeight;
  }

  let fillColor = isSuspicious ? [253, 236, 236] : (rowIndex % 2 === 0 ? [255, 255, 255] : [250, 249, 252]);
  let textColor = isSuspicious ? [226, 59, 59] : [38, 37, 48];
  let xPosition = 12;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  for (let i = 0; i < values.length; i++) {
    pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    pdf.setDrawColor(227, 223, 243);
    pdf.rect(xPosition, yPosition, columnWidths[i], rowHeight, "FD");
    pdf.text(linesByCell[i], xPosition + 2, yPosition + 4.2);
    xPosition += columnWidths[i];
  }
  pdf.setTextColor(38, 37, 48);
  return yPosition + rowHeight;
}

function exportAuditLogsToPdf() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast("The PDF library could not be loaded.", "error");
    return;
  }
  let logs = getExportLogs();
  let suspicious = [];
  let regular = [];
  for (let i = 0; i < logs.length; i++) {
    if (isSuspiciousActivity(logs[i])) insertRecord(suspicious, logs[i]);
    else insertRecord(regular, logs[i]);
  }

  let orderedLogs = [];
  for (let i = 0; i < suspicious.length; i++) insertRecord(orderedLogs, suspicious[i]);
  for (let i = 0; i < regular.length; i++) insertRecord(orderedLogs, regular[i]);
  let pdf = new window.jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let columnWidths = [12, 36, 40, 42, 20, 123];
  let yPosition = 14;
  let rowIndex = 0;

  function drawPdfPageHeading() {
    pdf.setFillColor(108, 78, 227);
    pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 10, "F");
    pdf.setFont("times", "bold");
    pdf.setFontSize(17);
    pdf.setTextColor(46, 46, 51);
    pdf.text("Grea San Jave Audit Trail", 12, 19);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(107, 104, 118);
    pdf.text("Generated: " + new Date().toLocaleString(), 12, 25);
    pdf.text("Suspicious activities are listed first and highlighted in red.", 12, 30);
    pdf.setTextColor(38, 37, 48);
  }

  drawPdfPageHeading();
  yPosition = drawPdfTableHeader(pdf, 35, columnWidths);
  if (orderedLogs.length === 0) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text("No audit activities match the selected filters.", 14, yPosition + 8);
  } else {
    for (let i = 0; i < orderedLogs.length; i++) {
      let isSuspicious = isSuspiciousActivity(orderedLogs[i]);
      let rowHeightEstimate = 12;
      if (yPosition + rowHeightEstimate > 195) {
        pdf.addPage();
        drawPdfPageHeading();
        yPosition = drawPdfTableHeader(pdf, 35, columnWidths);
        rowIndex = 0;
      }
      yPosition = drawPdfLogRow(pdf, orderedLogs[i], yPosition, columnWidths, rowIndex, isSuspicious);
      rowIndex++;
    }
  }
  pdf.save("grea-san-jave-audit-log.pdf");
  closeExportAuditModal();
  showToast("Audit log PDF downloaded.", "success");
}

function initActivityLogPage() {
  if (!guardOwnerOnlyLog()) return;

  document.getElementById("currentUserLabelLog").textContent = currentUser.fullName;
  document.getElementById("dashboardNavLinkLog").setAttribute("href", getDashboardUrlForCurrentUser());

  populateActionFilterOptions();
  populateExportActionFilterOptions();

  document.getElementById("logSearchInput").addEventListener("input", refreshActivityLogTable);
  document.getElementById("logActionFilter").addEventListener("change", refreshActivityLogTable);
  document.getElementById("logActorFilter").addEventListener("change", refreshActivityLogTable);
  document.getElementById("openExportAuditBtn").addEventListener("click", openExportAuditModal);
  document.getElementById("cancelExportAuditBtn").addEventListener("click", closeExportAuditModal);
  document.getElementById("exportAuditForm").addEventListener("submit", function (event) {
    event.preventDefault();
    exportAuditLogsToPdf();
  });
  document.getElementById("logSortToggleBtn").addEventListener("click", function () {
    logSortDirection = logSortDirection === "desc" ? "asc" : "desc";
    document.getElementById("logSortToggleBtn").textContent =
      logSortDirection === "desc" ? "Newest First ▾" : "Oldest First ▴";
    refreshActivityLogTable();
  });
  document.getElementById("logoutBtnLog").addEventListener("click", function () {
    logoutCurrentUser();
    window.location.href = "login-signup.html";
  });

  refreshActivityLogTable();
}

document.addEventListener("DOMContentLoaded", initActivityLogPage);
