(function () {
  "use strict";

  var selectedOrderId = null;
  var feedbackRecords = [];
  var feedbackSection = document.getElementById("customerFeedbackSection");
  var feedbackFrame = document.getElementById("customerFeedbackFrame");
  var feedbackButton = document.getElementById("showCustomerFeedbackBtn");
  var ordersList = document.getElementById("myOrdersList");
  var overviewOrders = document.getElementById("customerOrders");

  try {
    var storedFeedback = sessionStorage.getItem("gsj_customer_feedback");
    var parsedFeedback = storedFeedback === null ? [] : JSON.parse(storedFeedback);
    feedbackRecords = Array.isArray(parsedFeedback) ? parsedFeedback : [];
  } catch (error) {
    feedbackRecords = [];
  }

  function signedInCustomer() {
    return typeof currentUser === "undefined" ? null : currentUser;
  }

  function customerOrders() {
    var customer = signedInCustomer();
    if (!customer || typeof mockCustomerOrders === "undefined") return [];
    var result = [];
    for (var i = 0; i < mockCustomerOrders.length; i++) {
      if (mockCustomerOrders[i].customerId === customer.customerId) {
        result[result.length] = mockCustomerOrders[i];
      }
    }
    return result;
  }

  function hasFeedback(orderId) {
    for (var i = 0; i < feedbackRecords.length; i++) {
      if (String(feedbackRecords[i].orderId) === String(orderId)) return true;
    }
    return false;
  }

  function sendContext() {
    var customer = signedInCustomer();
    if (!customer || !feedbackFrame.contentWindow) return;
    feedbackFrame.contentWindow.postMessage({
      type: "gsj-customer-feedback-context",
      customer: { customerId: customer.customerId, customerName: customer.customerName },
      orders: customerOrders(),
      feedbacks: feedbackRecords,
      selectedOrderId: selectedOrderId,
    }, "*");
  }

  function openFeedback(orderId) {
    selectedOrderId = orderId == null ? null : String(orderId);
    document.getElementById("dashboardOverview").hidden = true;
    document.getElementById("customerProfileSection").hidden = true;
    document.getElementById("myOrdersSection").hidden = true;
    document.getElementById("orderPlacementSection").hidden = true;
    feedbackSection.hidden = false;

    document.getElementById("dashboardHomeLink").classList.remove("active");
    document.getElementById("showCustomerProfileBtn").classList.remove("active");
    document.getElementById("showCustomerOrdersBtn").classList.remove("active");
    document.getElementById("showOrderPlacementBtn").classList.remove("active");
    feedbackButton.classList.add("active");

    var feedbackUrl = new URL("../../aerica/html/customer_Feedback.html", window.location.href).href;
    if (feedbackFrame.src !== feedbackUrl) feedbackFrame.src = feedbackUrl;
    else sendContext();
  }

  function insertRateAction(container, orderId) {
    var existing = container.querySelector(".tracking-rate-order, .tracking-rated-label");
    if (hasFeedback(orderId)) {
      if (existing && existing.classList.contains("tracking-rate-order")) existing.remove();
      if (!container.querySelector(".tracking-rated-label")) {
        var rated = document.createElement("span");
        rated.className = "field-hint tracking-rated-label";
        rated.textContent = "Rated";
        container.appendChild(rated);
      }
      return;
    }
    if (existing) return;
    var button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-primary btn-small tracking-rate-order";
    button.setAttribute("data-rate-order-id", orderId);
    button.textContent = "Rate";
    container.appendChild(button);
  }

  function updateRateActions() {
    if (ordersList) {
      var cards = ordersList.querySelectorAll(".tracking-order-card");
      for (var i = 0; i < cards.length; i++) {
        if (!cards[i].querySelector(".tracking-status.done")) continue;
        var details = cards[i].querySelector(".tracking-view-order");
        var actions = cards[i].querySelector(".tracking-order-status-actions");
        if (details && actions) insertRateAction(actions, details.getAttribute("data-order-id"));
      }
    }

    if (overviewOrders) {
      var overviewCards = overviewOrders.querySelectorAll(".order-card");
      var currentOrders = customerOrders();
      for (var j = 0; j < overviewCards.length; j++) {
        var idElement = overviewCards[j].querySelector(".order-id");
        if (!idElement) continue;
        var overviewOrderId = idElement.textContent.trim();
        var completed = false;
        for (var k = 0; k < currentOrders.length; k++) {
          if (String(currentOrders[k].orderId) === overviewOrderId && currentOrders[k].status === "done") completed = true;
        }
        if (completed) insertRateAction(overviewCards[j], overviewOrderId);
      }
    }
  }

  if (!feedbackButton || !feedbackSection || !feedbackFrame) return;

  feedbackButton.addEventListener("click", function () { openFeedback(null); });
  feedbackFrame.addEventListener("load", sendContext);
  document.addEventListener("click", function (event) {
    var rateButton = event.target.closest(".tracking-rate-order");
    if (rateButton) openFeedback(rateButton.getAttribute("data-rate-order-id"));
  });
  window.addEventListener("message", function (event) {
    if (event.source !== feedbackFrame.contentWindow || !event.data || event.data.type !== "gsj-customer-feedback-submitted") return;
    feedbackRecords = Array.isArray(event.data.feedbacks) ? event.data.feedbacks : [];
    try {
      sessionStorage.setItem("gsj_customer_feedback", JSON.stringify(feedbackRecords));
    } catch (error) {}
    updateRateActions();
    if (typeof showToast === "function") showToast("Your feedback was submitted.", "success");
  });

  if (typeof MutationObserver !== "undefined") {
    var rateObserver = new MutationObserver(updateRateActions);
    if (ordersList) rateObserver.observe(ordersList, { childList: true, subtree: true });
    if (overviewOrders) rateObserver.observe(overviewOrders, { childList: true, subtree: true });
  }

  updateRateActions();
})();
