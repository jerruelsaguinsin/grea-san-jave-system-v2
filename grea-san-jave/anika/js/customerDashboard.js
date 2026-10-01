let mockCustomerOrders = [];
let currentTrackingTab = "all";

function loadMockCustomerOrders() {
  try {
    let storedOrders = sessionStorage.getItem("gsj_mock_orders");
    if (storedOrders === null) {
      mockCustomerOrders = copyArray(sampleOrders);
    } else {
      mockCustomerOrders = JSON.parse(storedOrders);
    }
    if (!Array.isArray(mockCustomerOrders)) mockCustomerOrders = copyArray(sampleOrders);

    let addedSampleOrder = storedOrders === null;
    for (let i = 0; i < sampleOrders.length; i++) {
      let alreadyLoaded = false;
      for (let j = 0; j < mockCustomerOrders.length; j++) {
        if (String(mockCustomerOrders[j].orderId) === String(sampleOrders[i].orderId)) {
          alreadyLoaded = true;
          break;
        }
      }
      if (!alreadyLoaded) {
        mockCustomerOrders[mockCustomerOrders.length] = sampleOrders[i];
        addedSampleOrder = true;
      }
    }
    if (addedSampleOrder) saveMockCustomerOrders();
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
  if (status === ORDER_STATUS.QUEUED) return "Processing";
  if (status === ORDER_STATUS.PRINTING) return "Processing";
  if (status === ORDER_STATUS.DONE) return "Ready for Claiming";
  if (status === ORDER_STATUS.UNCLAIMED) return "Unclaimed";
  if (status === ORDER_STATUS.CANCELLED) return "Cancelled";
  return status;
}

function renderCustomerOrders() {
  let container = document.getElementById("customerOrders");
  if (!container) {
    return;
  }

  let orders = filterByPredicate(getMyMockOrders(), function (order) {
    return order.status === ORDER_STATUS.QUEUED ||
      order.status === ORDER_STATUS.PRINTING ||
      order.status === ORDER_STATUS.DONE ||
      order.status === ORDER_STATUS.UNCLAIMED;
  });
  container.innerHTML = "";

  if (orders.length === 0) {
    container.innerHTML = '<p class="field-hint order-empty">No orders are processing or waiting to be claimed.</p>';
    return;
  }

  bubbleSortByField(orders, "createdAt", "desc");
  for (let i = 0; i < orders.length; i++) {
    let order = orders[i];
    let card = document.createElement("article");
    card.className = "order-card";
    let statusIndex = order.status === ORDER_STATUS.DONE || order.status === ORDER_STATUS.UNCLAIMED ? 1 : 0;
    let stages = ["Processing", "Ready for Claiming"];
    let stageMarkup = "";
    for (let j = 0; j < stages.length; j++) {
      let stageClass = j < statusIndex ? "complete" : j === statusIndex ? "current" : "";
      stageMarkup += '<li class="' + stageClass + '">' + stages[j] + "</li>";
    }
    card.innerHTML =
      '<div class="order-card-header"><div><span class="order-id">' + escapeHtmlDash(order.orderId) + '</span>' +
      '<span class="badge badge-role">' + escapeHtmlDash(mockOrderStatusLabel(order.status)) + '</span></div>' +
      '<span class="order-date">' + escapeHtmlDash(formatTimestampDash(order.createdAt)) + '</span></div>' +
      '<p class="order-service">' + escapeHtmlDash(order.serviceType) + '</p>' +
      '<p class="order-summary">' + escapeHtmlDash(order.pages + " pages · " + order.copies + " " + (order.copies === 1 ? "copy" : "copies") + " · " + order.colorTier + " · " + order.binding) + '</p>' +
      '<ol class="order-progress">' + stageMarkup + '</ol>';
    container.appendChild(card);
  }
}

function renderActiveCustomerPromotions() {
  let container = document.getElementById("customerPromotions");
  if (!container) return;

  let promos = [];
  try {
    let storedPromotions = localStorage.getItem("gsj_promotions");
    if (storedPromotions !== null) {
      let parsedPromotions = JSON.parse(storedPromotions);
      if (Array.isArray(parsedPromotions)) promos = parsedPromotions;
    }
  } catch (e) {
    promos = [];
  }

  let today = new Date();
  let todayIso = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");
  let markup = "";
  let visibleCount = 0;

  for (let i = 0; i < promos.length; i++) {
    let promo = promos[i];
    if (!promo || promo.isActive !== true ||
        (promo.startDate && promo.startDate > todayIso) ||
        (promo.endDate && promo.endDate < todayIso)) continue;

    let discount = promo.discountType === DISCOUNT_TYPE.PERCENTAGE
      ? promo.discountValue + "% off"
      : "₱" + promo.discountValue + " off";
    let eligibility = promo.eligibility === PROMO_ELIGIBILITY.SUKI_ONLY
      ? "Suki customers"
      : promo.eligibility === PROMO_ELIGIBILITY.BULK_ORDER_ONLY
        ? "Bulk orders"
        : "All customers";
    markup += '<li><strong class="customer-promo-discount">' + escapeHtmlDash(discount) +
      '</strong><span>' + escapeHtmlDash(promo.description || "Promotion") +
      '</span><small>' + escapeHtmlDash(eligibility) +
      (promo.endDate ? " · Valid through " + escapeHtmlDash(promo.endDate) : "") +
      '</small></li>';
    visibleCount++;
  }

  container.innerHTML = visibleCount
    ? markup
    : '<li class="field-hint">No active promotions right now.</li>';
}

function renderCustomerNotificationPanel() {
  syncCustomerNotifications(currentUser.customerId, getMyMockOrders());
  let unread = getUnreadCustomerNotifications(currentUser.customerId);
  let count = document.getElementById("customerNotificationCount");
  let bell = document.getElementById("customerNotificationBell");
  let summary = document.getElementById("customerNotificationSummary");
  let list = document.getElementById("customerNotificationList");
  let markAllButton = document.getElementById("markAllCustomerNotificationsRead");

  count.textContent = unread.length > 99 ? "99+" : String(unread.length);
  count.hidden = unread.length === 0;
  bell.setAttribute("aria-label", "Notifications, " + unread.length + " unread");
  summary.textContent = unread.length === 1
    ? "1 unread notification"
    : unread.length + " unread notifications";
  markAllButton.hidden = unread.length === 0;

  if (unread.length === 0) {
    list.innerHTML = '<li class="notification-empty">You are all caught up.</li>';
    return;
  }

  let markup = "";
  for (let i = 0; i < unread.length; i++) {
    let notification = unread[i];
    markup += '<li><button type="button" class="customer-notification-item"' +
      ' data-notification-id="' + escapeHtmlDash(notification.notificationId) + '"' +
      ' data-notification-type="' + escapeHtmlDash(notification.type) + '">' +
      '<strong>' + escapeHtmlDash(customerNotificationTypeLabel(notification.type)) + '</strong>' +
      '<span>' + escapeHtmlDash(notification.message) + '</span>' +
      '<small>' + escapeHtmlDash(formatTimestampDash(notification.dateCreated)) + '</small>' +
      '</button></li>';
  }
  list.innerHTML = markup;
}

function refreshCustomerNotificationCount() {
  let unread = getUnreadCustomerNotifications(currentUser.customerId);
  let count = document.getElementById("customerNotificationCount");
  let bell = document.getElementById("customerNotificationBell");
  count.textContent = unread.length > 99 ? "99+" : String(unread.length);
  count.hidden = unread.length === 0;
  bell.setAttribute("aria-label", "Notifications, " + unread.length + " unread");
}

function positionCustomerNotificationPanel() {
  let bell = document.getElementById("customerNotificationBell");
  let panel = document.getElementById("customerNotificationPanel");
  let viewportPadding = 12;
  let gap = 12;
  let bellRect = bell.getBoundingClientRect();
  let panelWidth = Math.min(390, window.innerWidth - viewportPadding * 2);
  panel.style.width = panelWidth + "px";
  panel.style.right = "auto";

  let panelRect = panel.getBoundingClientRect();
  let left = bellRect.right + gap;
  if (left + panelRect.width > window.innerWidth - viewportPadding) {
    left = bellRect.left - panelRect.width - gap;
  }
  left = Math.max(viewportPadding, Math.min(left, window.innerWidth - panelRect.width - viewportPadding));

  let top = bellRect.top + (bellRect.height - panelRect.height) / 2;
  top = Math.max(viewportPadding, Math.min(top, window.innerHeight - panelRect.height - viewportPadding));
  panel.style.left = left + "px";
  panel.style.top = top + "px";
}

function closeCustomerNotificationPanel() {
  let panel = document.getElementById("customerNotificationPanel");
  panel.hidden = true;
  document.getElementById("customerNotificationBell").setAttribute("aria-expanded", "false");
}

function wireCustomerNotifications() {
  let bell = document.getElementById("customerNotificationBell");
  let panel = document.getElementById("customerNotificationPanel");
  let list = document.getElementById("customerNotificationList");
  bell.addEventListener("click", function () {
    if (panel.hidden) {
      renderCustomerNotificationPanel();
      panel.hidden = false;
      bell.setAttribute("aria-expanded", "true");
      positionCustomerNotificationPanel();
    } else {
      closeCustomerNotificationPanel();
    }
  });

  document.getElementById("closeCustomerNotifications").addEventListener("click", closeCustomerNotificationPanel);
  document.getElementById("markAllCustomerNotificationsRead").addEventListener("click", function () {
    markAllCustomerNotificationsRead(currentUser.customerId);
    renderCustomerNotificationPanel();
  });

  list.addEventListener("click", function (event) {
    let item = event.target.closest(".customer-notification-item");
    if (!item) return;

    let type = item.getAttribute("data-notification-type");
    markCustomerNotificationRead(currentUser.customerId, item.getAttribute("data-notification-id"));
    refreshCustomerNotificationCount();
    if (type === NOTIFICATION_TYPES.ORDER_READY || type === NOTIFICATION_TYPES.UNCLAIMED_ORDER) {
      currentTrackingTab = type === NOTIFICATION_TYPES.ORDER_READY ? "completed" : "ready";
      let trackingTabs = document.getElementsByClassName("order-tracking-tab");
      for (let i = 0; i < trackingTabs.length; i++) {
        trackingTabs[i].classList.toggle("active", trackingTabs[i].getAttribute("data-order-tab") === currentTrackingTab);
      }
      closeCustomerNotificationPanel();
      window.location.hash = "my-orders";
      showCustomerOrdersView();
      return;
    }
    renderCustomerNotificationPanel();
  });

  document.addEventListener("click", function (event) {
    if (!panel.hidden && !panel.contains(event.target) && !bell.contains(event.target)) {
      closeCustomerNotificationPanel();
    }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) closeCustomerNotificationPanel();
  });
  window.addEventListener("resize", function () {
    if (!panel.hidden) positionCustomerNotificationPanel();
  });
  window.addEventListener("scroll", function () {
    if (!panel.hidden) positionCustomerNotificationPanel();
  }, true);
}

function trackingStatusLabel(status) {
  if (status === ORDER_STATUS.QUEUED || status === ORDER_STATUS.PRINTING) return "Processing";
  if (status === ORDER_STATUS.DONE) return "Ready for Claiming";
  if (status === ORDER_STATUS.UNCLAIMED) return "Unclaimed";
  if (status === ORDER_STATUS.CANCELLED) return "Cancelled";
  return "Unknown";
}

function trackingTabMatches(order, tab) {
  if (tab === "all") return true;
  if (tab === "processing") {
    return order.status === ORDER_STATUS.QUEUED || order.status === ORDER_STATUS.PRINTING;
  }
  if (tab === "ready") return order.status === ORDER_STATUS.DONE || order.status === ORDER_STATUS.UNCLAIMED;
  if (tab === "completed") return order.status === ORDER_STATUS.DONE;
  if (tab === "cancelled") return order.status === ORDER_STATUS.CANCELLED;
  return false;
}

function trackingSearchMatches(order, query) {
  if (query === "") return true;
  let searchableValues = [
    order.orderId,
    order.subject,
    order.fileName,
    order.serviceType,
    trackingStatusLabel(order.status),
    order.colorTier,
    order.notes,
  ];
  for (let i = 0; i < searchableValues.length; i++) {
    let value = searchableValues[i];
    if (value !== null && value !== undefined && String(value).toLowerCase().indexOf(query) !== -1) {
      return true;
    }
  }
  return false;
}

function trackingProgressMarkup(order) {
  if (order.status === ORDER_STATUS.CANCELLED) return "";

  let currentStage = 0;
  if (order.status === ORDER_STATUS.UNCLAIMED || order.status === ORDER_STATUS.DONE) currentStage = 1;

  let stages = ["Processing", "Ready for Claiming"];
  let markup = '<p class="tracking-progress-title">Order progress</p><ol class="order-progress">';
  for (let i = 0; i < stages.length; i++) {
    let stageClass = i < currentStage ? "complete" : i === currentStage ? "current" : "";
    markup += '<li class="' + stageClass + '">' + stages[i] + "</li>";
  }
  return markup + "</ol>";
}

function getUnclaimedDaysPassed(order) {
  let completedAt = new Date(order.dateCompleted).getTime();
  if (isNaN(completedAt)) return Math.max(0, Number(order.daysUnclaimed) || 0);
  return Math.max(0, Math.floor((Date.now() - completedAt) / (24 * 60 * 60 * 1000)));
}

function unclaimedDaysText(order) {
  let days = getUnclaimedDaysPassed(order);
  return days + (days === 1 ? " day" : " days");
}

function renderMyOrders() {
  let container = document.getElementById("myOrdersList");
  if (!container) return;

  let searchInput = document.getElementById("myOrdersSearch");
  let searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : "";
  let orders = getMyMockOrders();
  let counts = { all: 0, processing: 0, ready: 0, completed: 0, cancelled: 0 };
  for (let i = 0; i < orders.length; i++) {
    counts.all++;
    if (trackingTabMatches(orders[i], "processing")) counts.processing++;
    if (trackingTabMatches(orders[i], "ready")) counts.ready++;
    if (trackingTabMatches(orders[i], "completed")) counts.completed++;
    if (trackingTabMatches(orders[i], "cancelled")) counts.cancelled++;
  }

  document.getElementById("trackingCountAll").textContent = counts.all;
  document.getElementById("trackingCountProcessing").textContent = counts.processing;
  document.getElementById("trackingCountReady").textContent = counts.ready;
  document.getElementById("trackingCountCompleted").textContent = counts.completed;
  document.getElementById("trackingCountCancelled").textContent = counts.cancelled;

  bubbleSortByField(orders, "createdAt", "desc");
  let visibleCount = 0;
  let markup = "";
  for (let i = 0; i < orders.length; i++) {
    let order = orders[i];
    if (!trackingTabMatches(order, currentTrackingTab)) continue;
    if (!trackingSearchMatches(order, searchQuery)) continue;
    visibleCount++;

    let orderId = escapeHtmlDash(order.orderId);
    let orderTitle = !isBlank(order.subject)
      ? order.subject
      : !isBlank(order.fileName)
        ? order.fileName
        : order.serviceType;
    let status = escapeHtmlDash(order.status);
    let expandedId = "trackingOrderBody-" + i;
    markup += '<article class="tracking-order-card">';
    markup += '<div class="tracking-order-header">';
    markup += '<div class="tracking-order-heading"><strong>' + escapeHtmlDash(orderTitle) + '</strong><span>Order #' + orderId + " · " + escapeHtmlDash(formatTimestampDash(order.createdAt)) + "</span></div>";
    markup += '<div class="tracking-order-status-actions">';
    if (order.status === ORDER_STATUS.UNCLAIMED) {
      markup += '<span class="tracking-unclaimed-flag">Unclaimed · ' + unclaimedDaysText(order) + '</span>';
    } else {
      markup += '<span class="tracking-status ' + status + '">' + escapeHtmlDash(trackingStatusLabel(order.status)) + '</span>';
    }
    markup += '<button type="button" class="tracking-order-toggle" data-body-id="' + expandedId + '" aria-controls="' + expandedId + '" aria-expanded="false" aria-label="Show order details"><span class="tracking-order-chevron" aria-hidden="true"></span></button>';
    markup += '</div>';
    markup += '</div>';
    markup += '<div class="tracking-order-body" id="' + expandedId + '" hidden>';
    if (order.status === ORDER_STATUS.UNCLAIMED) {
      markup += '<div class="tracking-unclaimed-notice"><span class="tracking-unclaimed-flag">Unclaimed · ' + unclaimedDaysText(order) + '</span><span>' +
        escapeHtmlDash(order.unclaimedReason || "This order has not been collected yet.") + '</span></div>';
    }
    markup += '<div class="tracking-order-details">';
    markup += '<div><span class="tracking-detail-label">Service</span><span class="tracking-detail-value">' + escapeHtmlDash(order.serviceType) + '</span></div>';
    markup += '<div><span class="tracking-detail-label">Add-on</span><span class="tracking-detail-value">' + escapeHtmlDash(order.binding) + '</span></div>';
    markup += '<div><span class="tracking-detail-label">Pages × Copies</span><span class="tracking-detail-value">' + escapeHtmlDash(order.pages) + ' × ' + escapeHtmlDash(order.copies) + '</span></div>';
    markup += '<div><span class="tracking-detail-label">Print type</span><span class="tracking-detail-value">' + escapeHtmlDash(order.colorTier) + '</span></div>';
    markup += '<div><span class="tracking-detail-label">Priority</span><span class="tracking-detail-value">' + (order.isRush ? "Rush" : "Regular") + '</span></div>';
    markup += '<div><span class="tracking-detail-label">Order date</span><span class="tracking-detail-value">' + escapeHtmlDash(formatTimestampDash(order.createdAt)) + '</span></div>';
    markup += '</div>';
    if (!isBlank(order.notes)) {
      markup += '<p class="order-notes">' + escapeHtmlDash(order.notes) + '</p>';
    }
    markup += trackingProgressMarkup(order);
    markup += '<div class="tracking-order-actions"><button type="button" class="btn tracking-view-order" data-order-id="' + orderId + '">View Details</button></div>';
    markup += '</div></article>';
  }

  if (visibleCount === 0) {
    let emptyText = searchQuery !== ""
      ? "Try a different order ID, subject, file, or service."
      : currentTrackingTab === "all"
        ? "Your placed orders will appear here."
        : "There are no orders in this status.";
    markup = '<div class="tracking-empty"><strong>No orders found</strong><span>' + emptyText + '</span></div>';
  }
  container.innerHTML = markup;
}

function trackingSafeValue(value) {
  return escapeHtmlDash(value === null || value === undefined || value === "" ? "—" : value);
}

function trackingDate(value) {
  if (value === null || value === undefined || value === "") return "—";
  return formatTimestampDash(value);
}

function trackingMoney(value) {
  if (value === null || value === undefined || value === "") return "—";
  let amount = Number(value);
  return isNaN(amount) ? "—" : "₱" + amount.toFixed(2);
}

function trackingModalRow(label, value) {
  return '<div><span class="tracking-detail-label">' + label + '</span><span class="tracking-detail-value">' + trackingSafeValue(value) + '</span></div>';
}

function openTrackingModal(orderId) {
  let order = null;
  let orders = getMyMockOrders();
  for (let i = 0; i < orders.length; i++) {
    if (String(orders[i].orderId) === String(orderId)) {
      order = orders[i];
      break;
    }
  }
  if (!order) return;

  let content = '<div class="tracking-modal-grid">';
  content += trackingModalRow("Status", trackingStatusLabel(order.status));
  content += trackingModalRow("Order date", trackingDate(order.dateAdded || order.createdAt));
  content += trackingModalRow("Completed", trackingDate(order.dateCompleted));
  content += trackingModalRow("Service", order.serviceType);
  content += trackingModalRow("Add-on", order.serviceOption || order.binding);
  content += trackingModalRow("File", order.fileName);
  content += trackingModalRow("File count", order.fileCount);
  content += trackingModalRow("Subject", order.subject);
  content += trackingModalRow("Paper size", order.paperSize);
  content += trackingModalRow("Pages", order.pages);
  content += trackingModalRow("Copies", order.copies);
  content += trackingModalRow("Print type", order.colorTier);
  content += trackingModalRow("Rush order", order.isRush === true ? "Yes" : "No");
  content += trackingModalRow("Base price", trackingMoney(order.baseTotalPrice));
  content += trackingModalRow("Discount", trackingMoney(order.discountAmount));
  content += trackingModalRow("Total", trackingMoney(order.totalPrice));
  content += trackingModalRow("Payment method", order.paymentMethod);
  content += trackingModalRow("Payment status", order.paymentStatus);
  if (!isBlank(order.notes)) content += trackingModalRow("Notes", order.notes);
  if (order.status === ORDER_STATUS.UNCLAIMED && getUnclaimedDaysPassed(order) >= 2) {
    content += trackingModalRow("Days unclaimed", getUnclaimedDaysPassed(order));
    content += trackingModalRow("Reason", order.unclaimedReason);
  }
  content += '</div>';

  document.getElementById("trackingModalTitle").textContent = "Order #" + order.orderId;
  document.getElementById("trackingModalContent").innerHTML = content;
  let backdrop = document.getElementById("trackingModalBackdrop");
  backdrop.hidden = false;
  document.getElementById("trackingModalClose").focus();
}

function closeTrackingModal() {
  document.getElementById("trackingModalBackdrop").hidden = true;
}

function showCustomerOrdersView() {
  let overview = document.getElementById("dashboardOverview");
  let profile = document.getElementById("customerProfileSection");
  let placement = document.getElementById("orderPlacementSection");
  let orders = document.getElementById("myOrdersSection");
  if (overview) overview.hidden = true;
  if (profile) profile.hidden = true;
  if (placement) placement.hidden = true;
  if (orders) orders.hidden = false;
  loadMockCustomerOrders();
  document.getElementById("dashboardHomeLink").classList.remove("active");
  document.getElementById("showCustomerProfileBtn").classList.remove("active");
  document.getElementById("showCustomerOrdersBtn").classList.add("active");
  document.getElementById("showOrderPlacementBtn").classList.remove("active");
  renderMyOrders();
}

function showCustomerProfileView() {
  let overview = document.getElementById("dashboardOverview");
  let profile = document.getElementById("customerProfileSection");
  let orders = document.getElementById("myOrdersSection");
  let placement = document.getElementById("orderPlacementSection");
  if (overview) overview.hidden = true;
  if (orders) orders.hidden = true;
  if (placement) placement.hidden = true;
  document.getElementById("dashboardHomeLink").classList.remove("active");
  document.getElementById("showCustomerProfileBtn").classList.add("active");
  document.getElementById("showCustomerOrdersBtn").classList.remove("active");
  document.getElementById("showOrderPlacementBtn").classList.remove("active");

  if (profile.dataset.loaded === "true") {
    profile.hidden = false;
    return;
  }

  fetch("profile.html")
    .then(function (response) {
      if (!response.ok) throw new Error("Profile page could not be loaded.");
      return response.text();
    })
    .then(function (html) {
      let profileDocument = new DOMParser().parseFromString(html, "text/html");
      let profileMain = profileDocument.querySelector("main");
      if (!profileMain) throw new Error("Profile content is unavailable.");
      profile.innerHTML = profileMain.innerHTML;
      profile.dataset.loaded = "true";
      profile.hidden = false;
      initProfilePage();
    })
    .catch(function () {
      profile.innerHTML = '<div class="card"><p class="field-hint">Unable to load your profile.</p></div>';
      profile.hidden = false;
    });
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

function showOrderPlacementView() {
  let overview = document.getElementById("dashboardOverview");
  let placement = document.getElementById("orderPlacementSection");
  let profile = document.getElementById("customerProfileSection");
  let orders = document.getElementById("myOrdersSection");
  if (overview) {
    overview.hidden = true;
  }
  if (orders) orders.hidden = true;
  if (profile) profile.hidden = true;
  document.getElementById("dashboardHomeLink").classList.remove("active");
  document.getElementById("showCustomerProfileBtn").classList.remove("active");
  document.getElementById("showCustomerOrdersBtn").classList.remove("active");
  document.getElementById("showOrderPlacementBtn").classList.add("active");
  if (placement) {
    fetch("../../jerr/order-placement-page.html")
      .then(function (response) {
        return response.text();
      })
      .then(function (html) {
        placement.innerHTML = html;
        placement.hidden = false;
        if (typeof initOrderPlacement === "function") {
          initOrderPlacement();
        }
      })
      .catch(function () {
        placement.innerHTML = '<div class="card"><p class="field-hint">Unable to load the order form.</p></div>';
        placement.hidden = false;
      });
  }
}

function showDashboardOverviewView() {
  let overview = document.getElementById("dashboardOverview");
  let placement = document.getElementById("orderPlacementSection");
  let profile = document.getElementById("customerProfileSection");
  let orders = document.getElementById("myOrdersSection");
  if (overview) {
    overview.hidden = false;
  }
  loadMockCustomerOrders();
  renderCustomerOrders();
  if (orders) orders.hidden = true;
  if (profile) profile.hidden = true;
  document.getElementById("dashboardHomeLink").classList.add("active");
  document.getElementById("showCustomerProfileBtn").classList.remove("active");
  document.getElementById("showCustomerOrdersBtn").classList.remove("active");
  document.getElementById("showOrderPlacementBtn").classList.remove("active");
  if (placement) {
    placement.hidden = true;
    placement.innerHTML = "";
  }
}

function initCustomerDashboard() {
  if (!guardCustomerDashboard()) {
    return;
  }

  loadMockCustomerOrders();

  if (window.location.hash === "#create-order") {
    showOrderPlacementView();
  } else if (window.location.hash === "#my-orders") {
    showCustomerOrdersView();
  } else if (window.location.hash === "#profile") {
    showCustomerProfileView();
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

  renderCustomerOrders();
  renderActiveCustomerPromotions();
  syncCustomerNotifications(currentUser.customerId, getMyMockOrders());
  refreshCustomerNotificationCount();
  wireCustomerNotifications();

  let viewAllOrdersBtn = document.getElementById("viewAllCustomerOrdersBtn");
  if (viewAllOrdersBtn) {
    viewAllOrdersBtn.addEventListener("click", function () {
      window.location.hash = "my-orders";
      showCustomerOrdersView();
    });
  }

  let createOrderBtn = document.getElementById("showOrderPlacementBtn");
  if (createOrderBtn) {
    createOrderBtn.addEventListener("click", function () {
      window.location.hash = "create-order";
      showOrderPlacementView();
    });
  }

  let profileBtn = document.getElementById("showCustomerProfileBtn");
  if (profileBtn) {
    profileBtn.addEventListener("click", function () {
      window.location.hash = "profile";
      showCustomerProfileView();
    });
  }

  let myOrdersBtn = document.getElementById("showCustomerOrdersBtn");
  if (myOrdersBtn) {
    myOrdersBtn.addEventListener("click", function () {
      window.location.hash = "my-orders";
      showCustomerOrdersView();
    });
  }

  let dashboardHomeLink = document.getElementById("dashboardHomeLink");
  if (dashboardHomeLink) {
    dashboardHomeLink.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.hash = "";
      showDashboardOverviewView();
    });
  }

  let trackingTabs = document.getElementsByClassName("order-tracking-tab");
  for (let i = 0; i < trackingTabs.length; i++) {
    trackingTabs[i].addEventListener("click", function () {
      currentTrackingTab = this.getAttribute("data-order-tab");
      for (let j = 0; j < trackingTabs.length; j++) {
        trackingTabs[j].classList.toggle("active", trackingTabs[j] === this);
      }
      renderMyOrders();
    });
  }

  let myOrdersSearch = document.getElementById("myOrdersSearch");
  if (myOrdersSearch) {
    myOrdersSearch.addEventListener("input", renderMyOrders);
  }

  document.getElementById("myOrdersList").addEventListener("click", function (event) {
    let detailsButton = event.target.closest(".tracking-view-order");
    if (detailsButton) {
      openTrackingModal(detailsButton.getAttribute("data-order-id"));
      return;
    }
    let button = event.target.closest(".tracking-order-toggle");
    if (!button) return;
    let body = document.getElementById(button.getAttribute("data-body-id"));
    let expanded = button.getAttribute("aria-expanded") === "true";
    body.hidden = expanded;
    button.setAttribute("aria-expanded", String(!expanded));
    button.setAttribute("aria-label", expanded ? "Show order details" : "Hide order details");
  });

  document.getElementById("trackingModalClose").addEventListener("click", closeTrackingModal);
  document.getElementById("trackingModalBackdrop").addEventListener("click", function (event) {
    if (event.target === this) closeTrackingModal();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeTrackingModal();
  });

  let backToDashboardBtn = document.getElementById("backToDashboardBtn");
  if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener("click", function () {
      window.location.hash = "";
      showDashboardOverviewView();
    });
  }

  wireDashboardLogout("logoutBtnCustomer");
}

document.addEventListener("DOMContentLoaded", initCustomerDashboard);
