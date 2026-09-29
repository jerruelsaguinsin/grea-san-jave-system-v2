'use strict';

/* ============================================================================
   module-12-feedback.js
   Grea San Jave Printing Services
   MODULE 12 — Customer Feedback & Ratings

   Owns: Feedback records. Reads Order.status from Module 5 (only orders
   with status "Done" are eligible, and only once per order). Calls into
   Module 3 (Activity Log) on submission — simulated below with
   `activityLogMock`, since Module 3 isn't wired in here.

   `customers` and `orders` are stand-ins for Modules 1/13 and 5 — seeded
   locally so this module has something realistic to read from. Swap them
   for the real shared data sources once those modules are integrated.

   IMPLEMENTATION NOTES
   - No built-in Array.prototype methods are used anywhere in this file
     (no map/filter/find/forEach/reduce/sort/includes/push/pop/splice/
     indexOf/some/every/join/concat/slice). Every search, filter, insert,
     and sort is a manual for-loop over arr.length / arr[i].
   - Data lives in plain in-memory arrays — no real database.
============================================================================ */

// =========================== CONSTANTS =====================================

var ORDER_STATUS = {
  QUEUED: "queued",
  PRINTING: "printing",
  DONE: "done",
  UNCLAIMED: "unclaimed",
  CANCELLED: "cancelled"
};

var ACTION_TYPES = {
  FEEDBACK_SUBMITTED: "FeedbackSubmitted"
};

var ACTOR_TYPES = {
  CUSTOMER: "Customer"
};

// =========================== MOCK "DATABASE" ARRAYS ========================
// Stand-ins for data owned by Modules 1/13 and 5. Seeded locally for demo
// only — see the file header note above.

var customers = [
  { customerId: 1, customerName: "Juan Dela Cruz" },
  { customerId: 2, customerName: "Maria Santos" }
];

// orderId increases in step with when the order would've been placed,
// matching how nextId() would actually assign ids in a real system —
// and matching the same order set used by Module 11's dashboard.
var orders = [
  {
    orderId: 101, customerId: 2, subject: "Handout Printing",
    status: ORDER_STATUS.DONE, dateCompleted: "2026-08-20T16:00:00.000Z"
  },
  {
    orderId: 102, customerId: 1, subject: "Group Project Bookbinding",
    status: ORDER_STATUS.DONE, dateCompleted: "2026-09-02T14:00:00.000Z"
  },
  {
    orderId: 103, customerId: 1, subject: "Thesis Final Printing",
    status: ORDER_STATUS.DONE, dateCompleted: "2026-09-11T15:00:00.000Z"
  },
  {
    orderId: 104, customerId: 1, subject: "Reviewer Bookbinding",
    status: ORDER_STATUS.QUEUED, dateCompleted: null
  },
  {
    orderId: 105, customerId: 2, subject: "Case Digest Printing",
    status: ORDER_STATUS.PRINTING, dateCompleted: null
  }
];

// Module 12 owns this one for real.
var feedbacks = [
  {
    feedbackId: 1, orderId: 101, customerId: 2, rating: 5,
    comment: "Fast service, clean print quality!",
    dateSubmitted: "2026-08-21T09:00:00.000Z"
  }
];

// Stand-in for Module 3 (Activity Log).
var activityLogMock = [];

var currentCustomerId = 1; // simulates whoever is logged in

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
      insertItem(result, arr[i]);
    }
  }
  return result;
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

function averageOf(arr, keyFn) {
  if (arr.length === 0) return 0;
  var sum = 0;
  for (var i = 0; i < arr.length; i++) {
    sum += keyFn(arr[i]);
  }
  return sum / arr.length;
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
// MODULE 12 LOGIC
// ============================================================================

function getCurrentCustomer() {
  return linearFind(customers, function (c) { return c.customerId === currentCustomerId; });
}

function hasFeedbackForOrder(orderId) {
  return linearFind(feedbacks, function (f) { return f.orderId === orderId; }) !== null;
}

function getDoneOrdersWithoutFeedback(customerId) {
  return linearFilter(orders, function (o) {
    return o.customerId === customerId &&
      o.status === ORDER_STATUS.DONE &&
      !hasFeedbackForOrder(o.orderId);
  });
}

function getFeedbackHistoryForCustomer(customerId) {
  var list = linearFilter(feedbacks, function (f) { return f.customerId === customerId; });
  bubbleSortDesc(list, function (f) { return f.dateSubmitted; });
  return list;
}

function submitFeedback(orderId, customerId, rating, comment) {
  if (rating < 1 || rating > 5) {
    return { ok: false, error: "Rating must be between 1 and 5 stars." };
  }
  var order = linearFind(orders, function (o) { return o.orderId === orderId; });
  if (!order || order.status !== ORDER_STATUS.DONE) {
    return { ok: false, error: "Feedback can only be left once the order is Done." };
  }
  if (hasFeedbackForOrder(orderId)) {
    return { ok: false, error: "Feedback was already submitted for this order." };
  }

  var feedback = {
    feedbackId: nextId(feedbacks, "feedbackId"),
    orderId: orderId,
    customerId: customerId,
    rating: rating,
    comment: comment && comment.length > 0 ? comment : null,
    dateSubmitted: new Date().toISOString()
  };

  insertItem(feedbacks, feedback);

  logActivityMock(customerId, ACTOR_TYPES.CUSTOMER, ACTION_TYPES.FEEDBACK_SUBMITTED, orderId,
    "Submitted " + rating + "-star feedback for order #" + orderId);

  return { ok: true, feedback: feedback };
}

// ============================================================================
// RENDERING / UI WIRING
// ============================================================================

function buildStarRatingHtml(currentValue, orderId, readonly) {
  var html = '<div class="star-rating' + (readonly ? " readonly" : "") + '" data-order-id="' + orderId + '">';
  for (var i = 1; i <= 5; i++) {
    var filled = i <= currentValue ? " filled" : "";
    if (readonly) {
      html += '<span class="star' + filled + '">&#9733;</span>';
    } else {
      html += '<span class="star' + filled + '" data-value="' + i + '" onclick="handleStarClick(' + orderId + ',' + i + ')">&#9733;</span>';
    }
  }
  html += '</div>';
  return html;
}

// Tracks the in-progress (not-yet-submitted) rating per order while the
// user is picking stars before hitting "Submit".
var pendingRatings = {};

function handleStarClick(orderId, value) {
  pendingRatings[orderId] = value;
  renderFeedbackModule();
}

function handleFeedbackSubmit(orderId) {
  var customer = getCurrentCustomer();
  var rating = pendingRatings[orderId] || 0;
  var commentEl = document.getElementById("comment-" + orderId);
  var comment = commentEl ? commentEl.value.trim() : "";

  var result = submitFeedback(orderId, customer.customerId, rating, comment);
  var errorEl = document.getElementById("feedback-error-" + orderId);

  if (!result.ok) {
    if (errorEl) {
      errorEl.textContent = result.error;
      errorEl.style.display = "block";
    }
    return;
  }

  delete pendingRatings[orderId];
  renderFeedbackModule();
}

function renderCustomerSwitcher() {
  var select = document.getElementById("customerSwitcher");
  var html = "";
  for (var i = 0; i < customers.length; i++) {
    var c = customers[i];
    html += '<option value="' + c.customerId + '">' + escapeHtml(c.customerName) + '</option>';
  }
  select.innerHTML = html;
  select.value = currentCustomerId;
}

function handleCustomerSwitch(evt) {
  currentCustomerId = Number(evt.target.value);
  pendingRatings = {};
  renderFeedbackModule();
}

function renderFeedbackModule() {
  var customer = getCurrentCustomer();
  if (!customer) return;

  var eligible = getDoneOrdersWithoutFeedback(customer.customerId);
  var eligibleEl = document.getElementById("feedbackEligibleList");

  if (eligible.length === 0) {
    eligibleEl.innerHTML = '<p class="empty-state">No orders waiting for feedback right now.</p>';
  } else {
    var html = "";
    for (var i = 0; i < eligible.length; i++) {
      var o = eligible[i];
      var currentRating = pendingRatings[o.orderId] || 0;

      html += '<div class="order-feedback-row" style="display:block;">';
      html += '  <div class="order-feedback-info">';
      html += '    <div><span class="order-id">Order #' + o.orderId + '</span> — ' + escapeHtml(o.subject) + '</div>';
      html += '    <div style="color:var(--text-muted);font-size:0.78rem;">Completed ' + formatDate(o.dateCompleted) + '</div>';
      html += '  </div>';
      html += '  <div class="feedback-form">';
      html += '    <label>Your rating</label>';
      html += buildStarRatingHtml(currentRating, o.orderId, false);
      html += '    <div class="form-group" style="margin-top:0.6rem;">';
      html += '      <label for="comment-' + o.orderId + '">Comment (optional)</label>';
      html += '      <textarea id="comment-' + o.orderId + '" rows="2" placeholder="How was the order?"></textarea>';
      html += '    </div>';
      html += '    <p id="feedback-error-' + o.orderId + '" class="form-error" style="display:none;"></p>';
      html += '    <button class="btn btn-primary btn-small" onclick="handleFeedbackSubmit(' + o.orderId + ')">Submit Feedback</button>';
      html += '  </div>';
      html += '</div>';
    }
    eligibleEl.innerHTML = html;
  }

  var history = getFeedbackHistoryForCustomer(customer.customerId);
  var historyEl = document.getElementById("feedbackHistoryList");

  if (history.length === 0) {
    historyEl.innerHTML = '<p class="empty-state">You haven\'t left any feedback yet.</p>';
  } else {
    var histHtml = "";
    for (var j = 0; j < history.length; j++) {
      var f = history[j];
      var relatedOrder = linearFind(orders, function (o) { return o.orderId === f.orderId; });
      var subjectText = relatedOrder ? relatedOrder.subject : ("Order #" + f.orderId);

      histHtml += '<div class="feedback-item">';
      histHtml += '  <div class="feedback-item-head">';
      histHtml += '    <span><strong>Order #' + f.orderId + '</strong> — ' + escapeHtml(subjectText) + '</span>';
      histHtml += '    ' + buildStarRatingHtml(f.rating, f.orderId, true);
      histHtml += '  </div>';
      if (f.comment) {
        histHtml += '  <p class="feedback-comment">' + escapeHtml(f.comment) + '</p>';
      }
      histHtml += '  <div class="feedback-date">' + formatDate(f.dateSubmitted) + '</div>';
      histHtml += '</div>';
    }
    historyEl.innerHTML = histHtml;
  }

  document.getElementById("avgRatingDisplay").textContent =
    history.length > 0 ? averageOf(history, function (f) { return f.rating; }).toFixed(1) + " / 5" : "";
}

function initApp() {
  renderCustomerSwitcher();
  document.getElementById("customerSwitcher").addEventListener("change", handleCustomerSwitch);
  renderFeedbackModule();
}

document.addEventListener("DOMContentLoaded", initApp);