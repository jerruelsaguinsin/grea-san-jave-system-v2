let mockCustomerOrders = [];

function loadMockCustomerOrders() {
  try {
    let storedOrders = sessionStorage.getItem("gsj_mock_orders");
    mockCustomerOrders = storedOrders === null ? [] : JSON.parse(storedOrders);
  } catch (e) {
    mockCustomerOrders = [];
  }
}

function saveMockCustomerOrders() {
  try {
    sessionStorage.setItem("gsj_mock_orders", JSON.stringify(mockCustomerOrders));
  } catch (e) {
    // The dashboard still works for the current page if sessionStorage is unavailable.
  }
}

function getMyMockOrders() {
  return filterByPredicate(mockCustomerOrders, function (order) {
    return order.customerId === currentUser.customerId;
  });
}

function mockOrderStatusLabel(status) {
  if (status === ORDER_STATUS.QUEUED) return "Order Received";
  if (status === ORDER_STATUS.PRINTING) return "Printing";
  if (status === ORDER_STATUS.DONE) return "Ready for Pickup";
  if (status === ORDER_STATUS.CANCELLED) return "Cancelled";
  return status;
}

function renderCustomerOrders() {
  let container = document.getElementById("customerOrders");
  let orders = getMyMockOrders();
  container.innerHTML = "";

  if (orders.length === 0) {
    container.innerHTML = '<p class="field-hint order-empty">Your placed orders will appear here.</p>';
    return;
  }

  bubbleSortByField(orders, "createdAt", "desc");
  for (let i = 0; i < orders.length; i++) {
    let order = orders[i];
    let card = document.createElement("article");
    card.className = "order-card";
    let statusIndex = order.status === ORDER_STATUS.PRINTING ? 1 : order.status === ORDER_STATUS.DONE ? 2 : 0;
    let stages = [ORDER_STATUS.QUEUED, ORDER_STATUS.PRINTING, ORDER_STATUS.DONE];
    let stageMarkup = "";
    for (let j = 0; j < stages.length; j++) {
      let stageClass = j < statusIndex ? "complete" : j === statusIndex ? "current" : "";
      stageMarkup += '<li class="' + stageClass + '">' + mockOrderStatusLabel(stages[j]) + "</li>";
    }
    card.innerHTML =
      '<div class="order-card-header"><div><span class="order-id">' + escapeHtmlDash(order.orderId) + '</span>' +
      '<span class="badge badge-role">' + escapeHtmlDash(mockOrderStatusLabel(order.status)) + '</span></div>' +
      '<span class="order-date">' + escapeHtmlDash(formatTimestampDash(order.createdAt)) + '</span></div>' +
      '<p class="order-service">' + escapeHtmlDash(order.serviceType) + '</p>' +
      '<p class="order-summary">' + escapeHtmlDash(order.pages + " pages · " + order.copies + " " + (order.copies === 1 ? "copy" : "copies") + " · " + order.colorTier + " · " + order.binding) + '</p>' +
      (isBlank(order.notes) ? "" : '<p class="order-notes">' + escapeHtmlDash(order.notes) + '</p>') +
      '<ol class="order-progress">' + stageMarkup + '</ol>';
    container.appendChild(card);
  }
}

function handleCustomerOrderSubmit(event) {
  event.preventDefault();
  let pages = Number(document.getElementById("orderPages").value);
  let copies = Number(document.getElementById("orderCopies").value);
  if (!Number.isInteger(pages) || pages < 1 || !Number.isInteger(copies) || copies < 1) {
    showToast("Enter a valid number of pages and copies.", "error");
    return;
  }

  let nextNumber = mockCustomerOrders.length + 1001;
  let newOrder = {
    orderId: "GSJ-" + nextNumber,
    customerId: currentUser.customerId,
    serviceType: document.getElementById("orderServiceType").value,
    pages: pages,
    copies: copies,
    colorTier: document.getElementById("orderColorTier").value,
    binding: document.getElementById("orderBinding").value,
    notes: document.getElementById("orderNotes").value.trim(),
    status: ORDER_STATUS.QUEUED,
    createdAt: new Date().toISOString(),
  };
  mockCustomerOrders[mockCustomerOrders.length] = newOrder;
  saveMockCustomerOrders();
  document.getElementById("customerOrderForm").reset();
  document.getElementById("orderCopies").value = "1";
  renderCustomerOrders();
  showToast("Order " + newOrder.orderId + " placed successfully.", "success");
}

function renderOrderStatusExplainer() {
  let track = document.getElementById("orderStatusTrack");
  if (!track) {
    return;
  }
  track.innerHTML = "";

  let mainStages = [
    ORDER_STATUS.QUEUED,
    ORDER_STATUS.PRINTING,
    ORDER_STATUS.DONE,
  ];
  for (let i = 0; i < mainStages.length; i++) {
    let li = document.createElement("li");
    li.textContent = orderStatusLabelDash(mainStages[i]);
    track.appendChild(li);
  }
}

function orderStatusLabelDash(status) {
  if (status === ORDER_STATUS.QUEUED) {
    return "Order Received";
  }
  if (status === ORDER_STATUS.PRINTING) {
    return "Printing";
  }
  if (status === ORDER_STATUS.DONE) {
    return "Ready / Completed";
  }
  if (status === ORDER_STATUS.UNCLAIMED) {
    return "Unclaimed";
  }
  if (status === ORDER_STATUS.CANCELLED) {
    return "Cancelled";
  }
  return status;
}

function initCustomerDashboard() {
  if (!guardCustomerDashboard()) {
    return;
  }

  document.getElementById("customerWelcome").textContent =
    "Welcome back, " + currentUser.customerName + "!";
  document.getElementById("currentUserLabelCustomer").textContent =
    currentUser.customerName;

  document.getElementById("statMembership").textContent = currentUser.isRegular
    ? "Suki (Regular)"
    : "Standard";
  document.getElementById("statEmailVerified").textContent =
    isBlank(currentUser.email)
      ? "No email on file"
      : currentUser.isEmailVerified
        ? "Verified"
        : "Not verified";
  document.getElementById("statDateRegistered").textContent =
    currentUser.dateRegistered;
  document.getElementById("statAccountStatus").textContent = currentUser.isActive
    ? "Active"
    : "Suspended";

  let myActivity = getMyRecentActivity(currentUser.customerId, ACTOR_TYPES.CUSTOMER, 8);
  renderActivityFeed("customerActivityFeed", myActivity, "No activity recorded for your account yet.");

  renderOrderStatusExplainer();
  loadMockCustomerOrders();
  renderCustomerOrders();
  document.getElementById("customerOrderForm").addEventListener("submit", handleCustomerOrderSubmit);

  wireDashboardLogout("logoutBtnCustomer");
}

document.addEventListener("DOMContentLoaded", initCustomerDashboard);
