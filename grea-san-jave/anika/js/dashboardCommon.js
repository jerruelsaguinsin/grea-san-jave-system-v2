// ============================================================================
// dashboardCommon.js — MODULE 11-style role dashboards (shared code)
// Loaded by owner-dashboard.html / staff-dashboard.html / customer-dashboard.html
// only. Holds everything the three dashboards have in common — role guards,
// stat calculations, and small render helpers — so each per-role dashboard
// script (ownerDashboard.js / staffDashboard.js / customerDashboard.js) only
// has to wire up the page-specific parts.
//
// Reuses the existing schema/constants/session/logging exactly as they are:
// users[], customers[], activityLogs[] (data.js), ACTOR_TYPES/USER_ROLES
// (constants.js), currentUser/currentActorType (data.js), logoutCurrentUser()
// and getDashboardUrlForCurrentUser() (auth.js), countByPredicate/
// filterByPredicate/bubbleSortByField/copyArray (utils.js/activityLog.js).
// No new arrays, no new global session keys, no duplicate business logic.
//
// There is currently no Order / Inventory / Payment data anywhere in this
// project (those belong to other modules that have not been uploaded here),
// so this file never fabricates figures for them — see the "coming soon"
// notes rendered on each dashboard instead of invented statistics.
// ============================================================================

// ---------------------------------------------------------------------------
// ROLE GUARDS — verified on every dashboard page load, not just hidden nav.
// Each returns true only when the current session belongs on that page;
// otherwise it redirects and returns false so the caller can stop rendering.
// ---------------------------------------------------------------------------
function guardOwnerDashboard() {
  if (!currentUser || !currentActorType) {
    window.location.href = "login-signup.html";
    return false;
  }
  if (currentActorType === ACTOR_TYPES.CUSTOMER) {
    window.location.href = "customer-dashboard.html";
    return false;
  }
  if (currentUser.role !== USER_ROLES.CO_OWNER) {
    window.location.href = "staff-dashboard.html";
    return false;
  }
  return true;
}

function guardStaffDashboard() {
  if (!currentUser || !currentActorType) {
    window.location.href = "login-signup.html";
    return false;
  }
  if (
    currentActorType === ACTOR_TYPES.STAFF &&
    currentUser.mustChangePassword === true
  ) {
    window.location.href = "change-password.html";
    return false;
  }
  if (currentActorType === ACTOR_TYPES.CUSTOMER) {
    window.location.href = "customer-dashboard.html";
    return false;
  }
  if (currentUser.role === USER_ROLES.CO_OWNER) {
    window.location.href = "owner-dashboard.html";
    return false;
  }
  return true;
}

function guardCustomerDashboard() {
  if (!currentUser || !currentActorType) {
    window.location.href = "login-signup.html";
    return false;
  }
  if (currentActorType === ACTOR_TYPES.STAFF) {
    window.location.href = getDashboardUrlForCurrentUser();
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// STAT CALCULATIONS — every number here is counted live from the existing
// users[]/customers[]/activityLogs[] arrays. Nothing is hardcoded.
// ---------------------------------------------------------------------------
function getStaffAccountStats() {
  return {
    totalStaff: users.length,
    activeStaff: countByPredicate(users, function (u) {
      return u.isActive;
    }),
    coOwnerCount: countByPredicate(users, function (u) {
      return u.role === USER_ROLES.CO_OWNER;
    }),
    staffCount: countByPredicate(users, function (u) {
      return u.role === USER_ROLES.STAFF;
    }),
  };
}

function getCustomerAccountStats() {
  return {
    totalCustomers: customers.length,
    activeCustomers: countByPredicate(customers, function (c) {
      return c.isActive;
    }),
    sukiCustomers: countByPredicate(customers, function (c) {
      return c.isRegular;
    }),
    pendingVerification: countByPredicate(customers, function (c) {
      return !isBlank(c.email) && !c.isEmailVerified;
    }),
  };
}

// Most recent N activity log entries, newest first. Uses the existing
// copyArray()/bubbleSortByField() helpers so activityLogs[] itself is never
// mutated by a dashboard render.
function getRecentActivity(limit) {
  let sorted = copyArray(activityLogs);
  bubbleSortByField(sorted, "timestamp", "desc");
  let result = [];
  for (let i = 0; i < sorted.length && i < limit; i++) {
    result[i] = sorted[i];
  }
  return result;
}

// Recent activity for one specific signed-in account only (their own login
// history, sign-up, verification, profile updates, etc.) — used by the
// staff and customer dashboards so an account never sees another account's
// log entries.
function getMyRecentActivity(actorId, actorType, limit) {
  let mine = filterByPredicate(activityLogs, function (log) {
    return log.actorId === actorId && log.actorType === actorType;
  });
  bubbleSortByField(mine, "timestamp", "desc");
  let result = [];
  for (let i = 0; i < mine.length && i < limit; i++) {
    result[i] = mine[i];
  }
  return result;
}

// ---------------------------------------------------------------------------
// SHARED RENDER HELPERS
// ---------------------------------------------------------------------------
function escapeHtmlDash(text) {
  let div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatTimestampDash(isoString) {
  let d = new Date(isoString);
  if (isNaN(d.getTime())) {
    return isoString;
  }
  return d.toLocaleString();
}

// Renders a list of activity-log entries into a container as a simple feed.
// Shared by all three dashboards (with different source arrays).
function renderActivityFeed(containerId, list, emptyMessage) {
  let container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  container.innerHTML = "";

  if (list.length === 0) {
    let empty = document.createElement("p");
    empty.className = "field-hint";
    empty.textContent = emptyMessage || "No activity yet.";
    container.appendChild(empty);
    return;
  }

  for (let i = 0; i < list.length; i++) {
    let log = list[i];
    let item = document.createElement("div");
    item.className = "activity-item";
    item.innerHTML =
      '<span class="badge ' +
      (log.actorType === ACTOR_TYPES.STAFF
        ? "badge-staff"
        : "badge-customer") +
      '">' +
      log.actorType +
      '</span>' +
      '<span class="activity-text">' +
      '<strong>' +
      escapeHtmlDash(resolveActorName(log.actorId, log.actorType)) +
      '</strong> — ' +
      escapeHtmlDash(log.actionType) +
      (log.details ? ": " + escapeHtmlDash(log.details) : "") +
      '</span>' +
      '<span class="activity-time">' +
      formatTimestampDash(log.timestamp) +
      "</span>";
    container.appendChild(item);
  }
}

// Sets up the Log Out button found on every dashboard header.
function wireDashboardLogout(buttonId) {
  let btn = document.getElementById(buttonId);
  if (!btn) {
    return;
  }
  btn.addEventListener("click", function () {
    logoutCurrentUser();
    window.location.href = "login-signup.html";
  });
}
