'use strict';

/* ============================================================================
   module-11-dashboard.js
   Grea San Jave Printing Services
   MODULE 11 — Customer Dashboard / Home

   Owns no data of its own — purely an aggregation screen. In the full
   system it reads:
     - Order        (owned by Module 5)
     - Notification (owned by Module 16)
     - Promotion    (owned by Module 10)
   Since those modules aren't wired in here, this file seeds small local
   copies of `customers`, `orders`, `notifications`, and `promotions`
   purely so the dashboard has something realistic to aggregate. Swap
   these for the real shared data sources once the team's modules are
   integrated — the aggregation functions below (getActiveOrderForCustomer,
   getUnreadNotificationCountForCustomer, getActivePromosForCustomer,
   getLatestAnnouncement) are what actually belongs to Module 11.

   IMPLEMENTATION NOTES
   - No built-in Array.prototype methods are used anywhere in this file
     (no map/filter/find/forEach/reduce/sort/includes/push/pop/splice/
     indexOf/some/every/join/concat/slice). Every search, filter, insert,
     and sort is a manual for-loop over arr.length / arr[i].
   - Data lives in plain in-memory arrays — no real database.
============================================================================ */

// =========================== CONSTANTS =====================================

var DISCOUNT_TYPE = {
  PERCENTAGE: "percentage",
  FIXED_AMOUNT: "fixedAmount"
};

var PROMO_ELIGIBILITY = {
  ALL_CUSTOMERS: "allCustomers",
  SUKI_ONLY: "sukiOnly",
  BULK_ORDER_ONLY: "bulkOrderOnly"
};

var ORDER_STATUS = {
  QUEUED: "queued",
  PRINTING: "printing",
  DONE: "done",
  UNCLAIMED: "unclaimed",
  CANCELLED: "cancelled"
};

var NOTIFICATION_TYPES = {
  ORDER_READY: "OrderReady",
  PROMO: "Promo",
  ANNOUNCEMENT: "Announcement"
};

// =========================== MOCK "DATABASE" ARRAYS ========================
// Stand-ins for data owned by Modules 1/13, 5, 16, and 10. Seeded locally
// for demo only — see the file header note above.

var customers = [
  {
    customerId: 1, customerName: "Juan Dela Cruz", isRegular: true
  },
  {
    customerId: 2, customerName: "Maria Santos", isRegular: false
  }
];

// orderId increases in step with dateAdded, matching how nextId() would
// actually assign ids in a real system (order created = id assigned then).
var orders = [
  {
    orderId: 101, customerId: 2, subject: "Handout Printing",
    status: ORDER_STATUS.DONE, dateAdded: "2026-08-20T09:00:00.000Z"
  },
  {
    orderId: 102, customerId: 1, subject: "Group Project Bookbinding",
    status: ORDER_STATUS.DONE, dateAdded: "2026-09-01T09:00:00.000Z"
  },
  {
    orderId: 103, customerId: 1, subject: "Thesis Final Printing",
    status: ORDER_STATUS.DONE, dateAdded: "2026-09-10T09:00:00.000Z"
  },
  {
    orderId: 104, customerId: 1, subject: "Reviewer Bookbinding",
    status: ORDER_STATUS.PRINTING, dateAdded: "2026-09-29T08:30:00.000Z"
  },
  {
    orderId: 105, customerId: 2, subject: "Case Digest Printing",
    status: ORDER_STATUS.QUEUED, dateAdded: "2026-09-30T10:00:00.000Z"
  }
];

var notifications = [
  {
    notificationId: 1, type: NOTIFICATION_TYPES.ORDER_READY, relatedOrderId: 103,
    isBroadcast: false, recipientType: "Customer",
    message: "Your order #103 (Thesis Final Printing) is ready for pickup.",
    isRead: false, dateCreated: "2026-09-11T15:01:00.000Z"
  },
  {
    notificationId: 2, type: NOTIFICATION_TYPES.ANNOUNCEMENT, relatedOrderId: null,
    isBroadcast: true, recipientType: "Customer",
    message: "We'll be open until 9PM during exam week!",
    isRead: false, dateCreated: "2026-09-20T08:00:00.000Z"
  }
];

// Owned by Module 10 in the real system — mirrored here read-only.
var promotions = [
  {
    promoId: 1, description: "Exam week rush — 10% off all rush orders",
    discountType: DISCOUNT_TYPE.PERCENTAGE, discountValue: 10,
    eligibility: PROMO_ELIGIBILITY.ALL_CUSTOMERS, isActive: true
  },
  {
    promoId: 2, description: "Suki appreciation — ₱50 off any order",
    discountType: DISCOUNT_TYPE.FIXED_AMOUNT, discountValue: 50,
    eligibility: PROMO_ELIGIBILITY.SUKI_ONLY, isActive: true
  }
];

var currentCustomerId = 1; // simulates whoever is logged in

// =========================== MANUAL ARRAY HELPERS ===========================
// No Array.prototype methods used below — everything is a plain for-loop.

function linearFind(arr, matchFn) {
  for (var i = 0; i < arr.length; i++) {
    if (matchFn(arr[i])) return arr[i];
  }
  return null;
}

function linearFilter(arr, matchFn) {
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    if (matchFn(arr[i])) {
      result[result.length] = arr[i];
    }
  }
  return result;
}

function linearCount(arr, matchFn) {
  var count = 0;
  for (var i = 0; i < arr.length; i++) {
    if (matchFn(arr[i])) count++;
  }
  return count;
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

function formatDate(iso) {
  if (!iso) return "—";
  var d = new Date(iso);
  var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
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

// ============================================================================
// MODULE 11 LOGIC
// ============================================================================

function getCurrentCustomer() {
  return linearFind(customers, function (c) { return c.customerId === currentCustomerId; });
}

// "Active" order = not yet Done/Unclaimed/Cancelled. Picks the most
// recently added one if the customer somehow has more than one in flight.
function getActiveOrderForCustomer(customerId) {
  var candidates = linearFilter(orders, function (o) {
    return o.customerId === customerId &&
      (o.status === ORDER_STATUS.QUEUED || o.status === ORDER_STATUS.PRINTING);
  });
  if (candidates.length === 0) return null;
  bubbleSortDesc(candidates, function (o) { return o.dateAdded; });
  return candidates[0];
}

// A notification "belongs" to a customer if it's a shop-wide broadcast,
// or if it's targeted at Customers/Both and its related order is theirs.
function notificationBelongsToCustomer(notification, customerId) {
  if (notification.isBroadcast) return true;
  if (notification.recipientType !== "Customer" && notification.recipientType !== "Both") {
    return false;
  }
  if (notification.relatedOrderId === null || notification.relatedOrderId === undefined) {
    return false;
  }
  var relatedOrder = linearFind(orders, function (o) { return o.orderId === notification.relatedOrderId; });
  return relatedOrder !== null && relatedOrder.customerId === customerId;
}

function getUnreadNotificationCountForCustomer(customerId) {
  return linearCount(notifications, function (n) {
    return !n.isRead && notificationBelongsToCustomer(n, customerId);
  });
}

function getLatestAnnouncement() {
  var announcements = linearFilter(notifications, function (n) {
    return n.type === NOTIFICATION_TYPES.ANNOUNCEMENT && n.isBroadcast;
  });
  if (announcements.length === 0) return null;
  bubbleSortDesc(announcements, function (n) { return n.dateCreated; });
  return announcements[0];
}

function getActivePromosForCustomer(customerId) {
  var customer = linearFind(customers, function (c) { return c.customerId === customerId; });
  var isRegular = customer ? customer.isRegular : false;

  return linearFilter(promotions, function (p) {
    if (!p.isActive) return false;
    if (p.eligibility === PROMO_ELIGIBILITY.ALL_CUSTOMERS) return true;
    if (p.eligibility === PROMO_ELIGIBILITY.SUKI_ONLY) return isRegular;
    // BULK_ORDER_ONLY depends on order size at checkout (Module 5's job to
    // apply) — still shown here since it's technically "available".
    if (p.eligibility === PROMO_ELIGIBILITY.BULK_ORDER_ONLY) return true;
    return false;
  });
}

// ============================================================================
// RENDERING / UI WIRING
// ============================================================================

function renderCustomerSwitcher() {
  var select = document.getElementById("customerSwitcher");
  var html = "";
  for (var i = 0; i < customers.length; i++) {
    var c = customers[i];
    html += '<option value="' + c.customerId + '">' + escapeHtml(c.customerName) +
      (c.isRegular ? " (Suki)" : "") + '</option>';
  }
  select.innerHTML = html;
  select.value = currentCustomerId;
}

function handleCustomerSwitch(evt) {
  currentCustomerId = Number(evt.target.value);
  renderCustomerDashboard();
}

function renderCustomerDashboard() {
  var customer = getCurrentCustomer();
  if (!customer) return;

  document.getElementById("statUnread").textContent =
    getUnreadNotificationCountForCustomer(customer.customerId);

  var activePromos = getActivePromosForCustomer(customer.customerId);
  document.getElementById("statActivePromos").textContent = activePromos.length;
  document.getElementById("statSuki").textContent = customer.isRegular ? "Suki ⭐" : "Regular";

  var announcement = getLatestAnnouncement();
  var bannerEl = document.getElementById("announcementBanner");
  if (announcement) {
    bannerEl.innerHTML =
      '<div class="banner-announcement"><strong>Announcement</strong> ' +
      escapeHtml(announcement.message) + '</div>';
  } else {
    bannerEl.innerHTML = "";
  }

  var activeOrder = getActiveOrderForCustomer(customer.customerId);
  var teaserEl = document.getElementById("activeOrderTeaser");
  if (activeOrder) {
    teaserEl.innerHTML =
      '<div class="active-order-teaser">' +
      '  <div>' +
      '    <div style="font-weight:700;">Order #' + activeOrder.orderId + ' — ' + escapeHtml(activeOrder.subject) + '</div>' +
      '    <div style="font-size:0.8rem;color:var(--text-muted);">Placed ' + formatDate(activeOrder.dateAdded) + '</div>' +
      '  </div>' +
      '  <span class="badge badge-neutral">' + escapeHtml(activeOrder.status) + '</span>' +
      '</div>';
  } else {
    teaserEl.innerHTML = '<p class="empty-state">No active order right now.</p>';
  }

  var promoListEl = document.getElementById("dashboardPromoList");
  if (activePromos.length === 0) {
    promoListEl.innerHTML = '<tr class="empty-row"><td colspan="3">No promos available right now.</td></tr>';
  } else {
    var html = "";
    for (var i = 0; i < activePromos.length; i++) {
      var p = activePromos[i];
      var discountText = p.discountType === DISCOUNT_TYPE.PERCENTAGE
        ? p.discountValue + "% off"
        : "₱" + p.discountValue + " off";
      var eligibilityText = p.eligibility === PROMO_ELIGIBILITY.ALL_CUSTOMERS
        ? "All Customers"
        : p.eligibility === PROMO_ELIGIBILITY.SUKI_ONLY
          ? "Suki Only"
          : "Bulk Order Only";
      html += "<tr>";
      html += "<td data-label=\"Discount\" style=\"text-align:left;padding:0.75rem 1rem;vertical-align:top;\"><strong>" + discountText + "</strong></td>";
      html += "<td data-label=\"Description\" style=\"text-align:left;padding:0.75rem 1rem;vertical-align:top;\">" + escapeHtml(p.description) + "</td>";
      html += "<td data-label=\"Eligibility\" style=\"text-align:left;padding:0.75rem 1rem;vertical-align:top;\">" + eligibilityText + "</td>";
      html += "</tr>";
    }
    promoListEl.innerHTML = html;
  }
}

function handleNewOrderShortcut() {
  alert("This would open Module 14 (Customer Order Placement) for " + getCurrentCustomer().customerName + ".");
}

function initApp() {
  renderCustomerSwitcher();
  document.getElementById("customerSwitcher").addEventListener("change", handleCustomerSwitch);
  document.getElementById("newOrderShortcut").addEventListener("click", handleNewOrderShortcut);
  renderCustomerDashboard();
}

document.addEventListener("DOMContentLoaded", initApp);