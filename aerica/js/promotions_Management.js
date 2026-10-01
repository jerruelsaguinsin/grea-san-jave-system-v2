'use strict';

/* ============================================================================
   module-10-promotions.js
   Grea San Jave Printing Services
   MODULE 10 — Promotions & Discount Management (owner-facing)

   Owns: Promotion records (create / activate / deactivate / auto-expire).
   Interacts with (in the full system):
     - Module 5 (Order Management) reads active promos at pricing time.
     - Module 16 (Notifications) is called to broadcast a PROMO notification
       when a new promo goes live — simulated below by inserting straight
       into a local `notifications` array, since Module 16 isn't wired in.
     - Module 3 (Activity Log) is called on promo creation — simulated
       below with `activityLogMock`.

   IMPLEMENTATION NOTES
   - No built-in Array.prototype methods are used anywhere in this file
     (no map/filter/find/forEach/reduce/sort/includes/push/pop/splice/
     indexOf/some/every/join/concat/slice). Every search, filter, insert,
     remove, and sort is a manual for-loop over arr.length / arr[i].
   - Data lives in plain in-memory arrays — no real database.
============================================================================ */

// =========================== CONSTANTS =====================================

var PROMO_TYPES = {
  BULK_DISCOUNT: "Bulk Discount",
  REGULAR_CUSTOMER_DISCOUNT: "Regular Customer Discount",
  SEASONAL_PROMO: "Seasonal Promo"
};

var DISCOUNT_TYPE = {
  PERCENTAGE: "percentage",
  FIXED_AMOUNT: "fixedAmount"
};

var PROMO_ELIGIBILITY = {
  ALL_CUSTOMERS: "allCustomers",
  SUKI_ONLY: "sukiOnly",
  BULK_ORDER_ONLY: "bulkOrderOnly"
};

var NOTIFICATION_TYPES = {
  PROMO: "Promo"
};

var ACTION_TYPES = {
  PROMO_CREATED: "PromoCreated"
};

var ACTOR_TYPES = {
  STAFF: "Staff"
};

// =========================== MOCK "DATABASE" ARRAYS ========================

// Module 10 owns this one for real.
var promotions = [
  {
    promoId: 1, promoType: PROMO_TYPES.SEASONAL_PROMO,
    description: "Exam week rush — 10% off all rush orders",
    discountType: DISCOUNT_TYPE.PERCENTAGE, discountValue: 10,
    eligibility: PROMO_ELIGIBILITY.ALL_CUSTOMERS,
    startDate: "2026-09-01", endDate: "2026-10-15", isActive: true
  },
  {
    promoId: 2, promoType: PROMO_TYPES.REGULAR_CUSTOMER_DISCOUNT,
    description: "Suki appreciation — ₱50 off any order",
    discountType: DISCOUNT_TYPE.FIXED_AMOUNT, discountValue: 50,
    eligibility: PROMO_ELIGIBILITY.SUKI_ONLY,
    startDate: "2026-08-01", endDate: "2026-08-31", isActive: true
  }
];

// Stand-in for Module 16 (Notifications) — Module 10 would call into it
// instead of writing here directly, in the integrated system.
var notifications = [];

// Stand-in for Module 3 (Activity Log).
var activityLogMock = [];

// =========================== MANUAL ARRAY HELPERS ===========================
// No Array.prototype methods used below — everything is a plain for-loop.

function nextId(arr, idField) {
  var maxId = 0;
  for (var i = 0; i < arr.length; i++) {
    if (arr[i][idField] > maxId) {
      maxId = arr[i][idField];
    }
  }
  return maxId + 1;
}

function insertItem(arr, item) {
  arr[arr.length] = item;
}

function removeAt(arr, index) {
  if (index < 0 || index >= arr.length) return;
  for (var i = index; i < arr.length - 1; i++) {
    arr[i] = arr[i + 1];
  }
  arr.length = arr.length - 1;
}

function linearFind(arr, matchFn) {
  for (var i = 0; i < arr.length; i++) {
    if (matchFn(arr[i])) return arr[i];
  }
  return null;
}

function linearFindIndex(arr, matchFn) {
  for (var i = 0; i < arr.length; i++) {
    if (matchFn(arr[i])) return i;
  }
  return -1;
}

// Bubble sort, descending by whatever key value keyFn returns.
function bubbleSortDesc(arr, keyFn) {
  var n = arr.length;
  for (var i = 0; i < n - 1; i++) {
    for (var j = 0; j < n - i - 1; j++) {
      if (keyFn(arr[j]) < keyFn(arr[j + 1])) {
        var temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}

function buildOptionsHtml(valueLabelPairs) {
  var html = "";
  for (var i = 0; i < valueLabelPairs.length; i++) {
    html += '<option value="' + valueLabelPairs[i][0] + '">' + valueLabelPairs[i][1] + '</option>';
  }
  return html;
}

function objectValuesAsPairs(obj) {
  // manual replacement for Object.values()/Object.entries() + array iteration
  var pairs = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      insertItem(pairs, [obj[key], obj[key]]);
    }
  }
  return pairs;
}

function todayIsoDate() {
  var d = new Date();
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  var mStr = m < 10 ? "0" + m : "" + m;
  var dStr = day < 10 ? "0" + day : "" + day;
  return y + "-" + mStr + "-" + dStr;
}

function formatDate(iso) {
  if (!iso) return "—";
  var parts = iso.split("-");
  return parts[1] + "/" + parts[2] + "/" + parts[0];
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  var out = "";
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    if (ch === "&") out += "&amp;";
    else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (ch === '"') out += "&quot;";
    else out += ch;
  }
  return out;
}

function logActivityMock(actorId, actorType, actionType, targetId, details) {
  insertItem(activityLogMock, {
    logId: nextId(activityLogMock, "logId"),
    actorId: actorId,
    actorType: actorType,
    actionType: actionType,
    targetId: targetId,
    details: details,
    timestamp: new Date().toISOString()
  });
}

// ============================================================================
// MODULE 10 LOGIC
// ============================================================================

function isPromoExpiredToday(promo) {
  return promo.endDate < todayIsoDate();
}

// Owner action: sweep all promos and auto-expire ones past their endDate.
function checkAndExpirePromos() {
  for (var i = 0; i < promotions.length; i++) {
    if (promotions[i].isActive && isPromoExpiredToday(promotions[i])) {
      promotions[i].isActive = false;
    }
  }
}

function validatePromoInput(data) {
  if (!data.description || data.description.length === 0) {
    return "Description is required.";
  }
  if (!(data.discountValue > 0)) {
    return "Discount value must be greater than 0.";
  }
  if (data.discountType === DISCOUNT_TYPE.PERCENTAGE && data.discountValue > 100) {
    return "Percentage discount cannot exceed 100.";
  }
  if (!data.startDate || !data.endDate) {
    return "Start date and end date are required.";
  }
  if (data.endDate < data.startDate) {
    return "End date cannot be before the start date.";
  }
  return null;
}

// Creates a promotion. If it's active immediately, this is where Module 10
// would call into Module 16 to broadcast a PROMO notification — simulated
// here by inserting directly into the local `notifications` array.
function createPromotion(data) {
  var error = validatePromoInput(data);
  if (error) {
    return { ok: false, error: error };
  }

  var isActiveNow = data.startDate <= todayIsoDate() && data.endDate >= todayIsoDate();

  var promo = {
    promoId: nextId(promotions, "promoId"),
    promoType: data.promoType,
    description: data.description,
    discountType: data.discountType,
    discountValue: data.discountValue,
    eligibility: data.eligibility,
    startDate: data.startDate,
    endDate: data.endDate,
    isActive: isActiveNow
  };

  insertItem(promotions, promo);

  if (promo.isActive) {
    insertItem(notifications, {
      notificationId: nextId(notifications, "notificationId"),
      type: NOTIFICATION_TYPES.PROMO,
      relatedOrderId: null,
      relatedItemId: null,
      isBroadcast: true,
      recipientType: "Customer",
      message: "New promo: " + promo.description,
      isRead: false,
      dateCreated: new Date().toISOString()
    });
  }

  logActivityMock(0, ACTOR_TYPES.STAFF, ACTION_TYPES.PROMO_CREATED, promo.promoId,
    "Created promo \"" + promo.description + "\"");

  return { ok: true, promo: promo };
}

function togglePromoActive(promoId) {
  var promo = linearFind(promotions, function (p) { return p.promoId === promoId; });
  if (!promo) return;
  promo.isActive = !promo.isActive;
}

function deletePromotion(promoId) {
  var index = linearFindIndex(promotions, function (p) { return p.promoId === promoId; });
  if (index === -1) return;
  removeAt(promotions, index);
}

// ============================================================================
// RENDERING / UI WIRING
// ============================================================================

function renderPromoTypeOptions() {
  document.getElementById("promoType").innerHTML = buildOptionsHtml(objectValuesAsPairs(PROMO_TYPES));
  document.getElementById("promoEligibility").innerHTML = buildOptionsHtml([
    [PROMO_ELIGIBILITY.ALL_CUSTOMERS, "All Customers"],
    [PROMO_ELIGIBILITY.SUKI_ONLY, "Suki Only"],
    [PROMO_ELIGIBILITY.BULK_ORDER_ONLY, "Bulk Order Only"]
  ]);
  document.getElementById("promoDiscountType").innerHTML = buildOptionsHtml([
    [DISCOUNT_TYPE.PERCENTAGE, "Percentage"],
    [DISCOUNT_TYPE.FIXED_AMOUNT, "Fixed Amount"]
  ]);
}

function renderPromotions() {
  checkAndExpirePromos();

  var sorted = [];
  for (var i = 0; i < promotions.length; i++) {
    insertItem(sorted, promotions[i]);
  }
  bubbleSortDesc(sorted, function (p) { return p.startDate; });

  var grid = document.getElementById("promoGrid");

  if (sorted.length === 0) {
    grid.innerHTML = '<tr class="empty-row"><td colspan="8">No promotions yet.</td></tr>';
    return;
  }

  var html = "";
  for (var j = 0; j < sorted.length; j++) {
    var p = sorted[j];
    var expired = isPromoExpiredToday(p);
    var badgeClass = p.isActive ? "badge-active" : "badge-inactive";
    var badgeText = p.isActive ? "Active" : (expired ? "Expired" : "Inactive");
    var discountText = p.discountType === DISCOUNT_TYPE.PERCENTAGE
      ? p.discountValue + "% off"
      : "₱" + p.discountValue + " off";
    var eligibilityText = p.eligibility === PROMO_ELIGIBILITY.ALL_CUSTOMERS
      ? "All Customer"
      : p.eligibility === PROMO_ELIGIBILITY.SUKI_ONLY
        ? "Suki Only"
        : "Bulk Order Only";

    html += '<tr' + (expired ? ' class="expired"' : '') + '>';
    html += '  <td>' + escapeHtml(p.promoType) + '</td>';
    html += '  <td>' + escapeHtml(p.description) + '</td>';
    html += '  <td>' + discountText + '</td>';
    html += '  <td>' + escapeHtml(eligibilityText) + '</td>';
    html += '  <td>' + formatDate(p.startDate) + '</td>';
    html += '  <td>' + formatDate(p.endDate) + '</td>';
    html += '  <td><span class="badge ' + badgeClass + '">' + badgeText + '</span></td>';
    html += '  <td>';
    html += '    <button class="btn btn-secondary btn-small" onclick="handleTogglePromo(' + p.promoId + ')">'
          + (p.isActive ? 'Deactivate' : 'Activate') + '</button> ';
    html += '    <button class="btn btn-danger btn-small" onclick="handleDeletePromo(' + p.promoId + ')">Delete</button>';
    html += '  </td>';
    html += '</tr>';
  }

  grid.innerHTML = html;
}

function handleTogglePromo(promoId) {
  togglePromoActive(promoId);
  renderPromotions();
}

function handleDeletePromo(promoId) {
  deletePromotion(promoId);
  renderPromotions();
}

function handlePromoFormSubmit(evt) {
  evt.preventDefault();

  var startDate = document.getElementById("promoStartDate").value;
  var endDate = document.getElementById("promoEndDate").value;
  var errorEl = document.getElementById("promoFormError");

  var data = {
    promoType: document.getElementById("promoType").value,
    eligibility: document.getElementById("promoEligibility").value,
    description: document.getElementById("promoDescription").value.trim(),
    discountType: document.getElementById("promoDiscountType").value,
    discountValue: Number(document.getElementById("promoDiscountValue").value),
    startDate: startDate,
    endDate: endDate
  };

  var result = createPromotion(data);

  if (!result.ok) {
    errorEl.textContent = result.error;
    errorEl.style.display = "block";
    return;
  }

  errorEl.style.display = "none";
  document.getElementById("promoForm").reset();
  renderPromoTypeOptions();
  renderPromotions();
}

function initApp() {
  renderPromoTypeOptions();
  document.getElementById("promoForm").addEventListener("submit", handlePromoFormSubmit);
  renderPromotions();
}

document.addEventListener("DOMContentLoaded", initApp);