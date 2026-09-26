// ============================================================================
// activityLog.js — MODULE 3: ACTIVITY LOG / AUDIT TRAIL
// 15. ACTIVITY LOGGING 
// Logs RECORD-CHANGING actions only — never passive browsing (opening this
// page, viewing a dashboard). This is a deliberate data-privacy scope limit
// per the schema's Module 3 notes, not an oversight: it keeps the audit
// trail aligned with what the client actually needs (who changed what) and
// out of general behavioral surveillance territory.
//
// Audit records are treated as historical/immutable. No edit or
// delete function is exposed for existing log entries anywhere in this file
// or in pageActivityLog.js.
// ============================================================================

function logActivity(actorId, actorType, actionType, targetId, details) {
  let newLog = {
    logId: generateNextId(activityLogs, "logId"),
    actorId: actorId,
    actorType: actorType,
    actorRole: resolveActorLabel(actorId, actorType),
    actionType: actionType,
    targetId: targetId === undefined ? null : targetId,
    details: isBlank(details) ? null : details,
    timestamp: nowIsoDateTime(),
  };
  insertRecord(activityLogs, newLog);
  saveStateToSession(); // persist users/customers/activityLogs — see data.js
  return newLog;
}

// ---------------------------------------------------------------------------
// Manual search — by actor ID or free-text keyword across actionType/details.
// ---------------------------------------------------------------------------
function searchActivityLogsByActorId(actorId) {
  return filterByPredicate(activityLogs, function (log) {
    return log.actorId === actorId;
  });
}

function searchActivityLogsByKeyword(keyword) {
  if (isBlank(keyword)) {
    return copyArray(activityLogs);
  }

  return searchRecordsByKeyword(
    activityLogs,
    ["actionType", "details", "actorType", "actorRole"],
    keyword
  );
}

// ---------------------------------------------------------------------------
// Manual filtering by actionType and/or actorType (used by the filter
// dropdowns on activity-log.html).
// ---------------------------------------------------------------------------
function filterActivityLogs(actionTypeFilter, actorTypeFilter) {
  return filterByPredicate(activityLogs, function (log) {
    let matchesAction =
      isBlank(actionTypeFilter) ||
      actionTypeFilter === "ALL" ||
      log.actionType === actionTypeFilter;
    let matchesActor =
      isBlank(actorTypeFilter) ||
      actorTypeFilter === "ALL" ||
      resolveActivityActorLabel(log) === actorTypeFilter;

    return matchesAction && matchesActor;
  });
}

// ---------------------------------------------------------------------------
// Manual sort — newest first by default (timestamp is an ISO string, so
// plain > / < comparison sorts correctly chronologically).
// ---------------------------------------------------------------------------
function sortActivityLogsByTimestamp(logArray, direction) {
  return bubbleSortByField(logArray, "timestamp", direction || "desc");
}

// ---------------------------------------------------------------------------
// Manual array copy helper (used instead of .slice()/spread when a caller
// needs an independent snapshot array to sort/filter without mutating the
// original activityLogs[]).
// ---------------------------------------------------------------------------
function copyArray(sourceArray) {
  let copy = [];
  for (let i = 0; i < sourceArray.length; i++) {
    copy[i] = sourceArray[i];
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Resolves a human-readable actor label for display (looks up the name from
// users[]/customers[] by actorId + actorType — read-only, does not touch
// either array).
// ---------------------------------------------------------------------------
function resolveActorName(actorId, actorType) {
  if (actorType === ACTOR_TYPES.STAFF) {
    let index = findIndexByField(users, "userId", actorId);
    return index === -1 ? "Unknown staff (#" + actorId + ")" : users[index].fullName;
  }
  if (actorType === ACTOR_TYPES.CUSTOMER) {
    let index = findIndexByField(customers, "customerId", actorId);
    return index === -1 ? "Unknown customer (#" + actorId + ")" : customers[index].customerName;
  }
  return "Unknown";
}

function resolveActorLabel(actorId, actorType) {
  if (actorType === ACTOR_TYPES.CUSTOMER) return "Customer";
  if (actorType === ACTOR_TYPES.STAFF) {
    let index = findIndexByField(users, "userId", actorId);
    if (index !== -1 && users[index].role === USER_ROLES.CO_OWNER) return "Owner";
    return "Staff";
  }
  return "Unknown";
}

function resolveActivityActorLabel(log) {
  return isBlank(log.actorRole)
    ? resolveActorLabel(log.actorId, log.actorType)
    : log.actorRole;
}