let customerNotificationMemory = {};

function customerNotificationStorageKey(customerId) {
  return "gsj_notifications_customer_" + String(customerId);
}

function loadCustomerNotifications(customerId) {
  let storageKey = customerNotificationStorageKey(customerId);
  try {
    let storedNotifications = sessionStorage.getItem(storageKey);
    if (storedNotifications !== null) {
      let parsedNotifications = JSON.parse(storedNotifications);
      if (Array.isArray(parsedNotifications)) {
        customerNotificationMemory[storageKey] = parsedNotifications;
        return parsedNotifications;
      }
    }
  } catch (e) {
    // Keep the in-memory records available if sessionStorage is unavailable.
  }
  return customerNotificationMemory[storageKey] || [];
}

function saveCustomerNotifications(customerId, notifications) {
  let storageKey = customerNotificationStorageKey(customerId);
  customerNotificationMemory[storageKey] = notifications;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(notifications));
  } catch (e) {
    // Notifications remain available for the current page when storage is unavailable.
  }
}

function customerNotificationExists(notifications, type, relatedOrderId, message) {
  for (let i = 0; i < notifications.length; i++) {
    let notification = notifications[i];
    if (notification.type !== type) continue;
    if (relatedOrderId !== null && notification.relatedOrderId !== null &&
        String(notification.relatedOrderId) === String(relatedOrderId)) return true;
    if (message === notification.message) return true;
  }
  return false;
}

function nextCustomerNotificationId(notifications) {
  let maxId = 0;
  for (let i = 0; i < notifications.length; i++) {
    let notificationId = Number(notifications[i].notificationId);
    if (notificationId > maxId) maxId = notificationId;
  }
  return maxId + 1;
}

function addCustomerNotification(notifications, notificationData) {
  if (customerNotificationExists(
    notifications,
    notificationData.type,
    notificationData.relatedOrderId,
    notificationData.message
  )) return false;

  notifications[notifications.length] = {
    notificationId: nextCustomerNotificationId(notifications),
    type: notificationData.type,
    relatedOrderId: notificationData.relatedOrderId,
    relatedItemId: null,
    isBroadcast: notificationData.isBroadcast,
    recipientType: "Customer",
    message: notificationData.message,
    isRead: false,
    dateCreated: notificationData.dateCreated,
  };
  return true;
}

function loadActiveNotificationPromotions() {
  try {
    let storedPromotions = localStorage.getItem("gsj_promotions");
    if (storedPromotions !== null) {
      let parsedPromotions = JSON.parse(storedPromotions);
      if (Array.isArray(parsedPromotions)) return parsedPromotions;
    }
  } catch (e) {
    // A missing or unreadable promotion store simply produces no promo alerts.
  }
  return [];
}

function notificationPromotionIsCurrent(promo, todayIso) {
  return promo && promo.isActive === true &&
    (!promo.startDate || promo.startDate <= todayIso) &&
    (!promo.endDate || promo.endDate >= todayIso);
}

function syncCustomerNotifications(customerId, orders) {
  let notifications = loadCustomerNotifications(customerId);
  let changed = false;

  for (let i = 0; i < orders.length; i++) {
    let order = orders[i];
    let type = null;
    let message = "";
    if (order.status === ORDER_STATUS.DONE) {
      type = NOTIFICATION_TYPES.ORDER_READY;
      message = "Order #" + order.orderId + " is complete and ready for pickup.";
    } else if (order.status === ORDER_STATUS.UNCLAIMED) {
      type = NOTIFICATION_TYPES.UNCLAIMED_ORDER;
      message = "Order #" + order.orderId + " has not been collected and is ready for claiming.";
    }
    if (type === null) continue;

    let numericOrderId = Number(order.orderId);
    let relatedOrderId = isFinite(numericOrderId) ? numericOrderId : null;
    changed = addCustomerNotification(notifications, {
      type: type,
      relatedOrderId: relatedOrderId,
      isBroadcast: false,
      message: message,
      dateCreated: order.dateCompleted || order.dateAdded || order.createdAt || new Date().toISOString(),
    }) || changed;
  }

  let today = new Date();
  let todayIso = today.getFullYear() + "-" +
    String(today.getMonth() + 1).padStart(2, "0") + "-" +
    String(today.getDate()).padStart(2, "0");
  let promos = loadActiveNotificationPromotions();
  for (let i = 0; i < promos.length; i++) {
    let promo = promos[i];
    if (!notificationPromotionIsCurrent(promo, todayIso)) continue;
    changed = addCustomerNotification(notifications, {
      type: NOTIFICATION_TYPES.PROMO,
      relatedOrderId: null,
      isBroadcast: true,
      message: "Promotion: " + (promo.description || "An active promotion is available."),
      dateCreated: new Date().toISOString(),
    }) || changed;
  }

  if (changed) saveCustomerNotifications(customerId, notifications);
  return notifications;
}

function getUnreadCustomerNotifications(customerId) {
  let notifications = loadCustomerNotifications(customerId);
  let unread = [];
  for (let i = 0; i < notifications.length; i++) {
    let notification = notifications[i];
    let isForCustomer = notification.isBroadcast === true ||
      notification.recipientType === "Customer" ||
      notification.recipientType === "Both";
    if (isForCustomer && notification.isRead !== true) unread[unread.length] = notification;
  }
  bubbleSortByField(unread, "dateCreated", "desc");
  return unread;
}

function markCustomerNotificationRead(customerId, notificationId) {
  let notifications = loadCustomerNotifications(customerId);
  for (let i = 0; i < notifications.length; i++) {
    if (String(notifications[i].notificationId) === String(notificationId)) {
      notifications[i].isRead = true;
      saveCustomerNotifications(customerId, notifications);
      return;
    }
  }
}

function markAllCustomerNotificationsRead(customerId) {
  let notifications = loadCustomerNotifications(customerId);
  let changed = false;
  for (let i = 0; i < notifications.length; i++) {
    if (notifications[i].isRead !== true) {
      notifications[i].isRead = true;
      changed = true;
    }
  }
  if (changed) saveCustomerNotifications(customerId, notifications);
}

function customerNotificationTypeLabel(type) {
  if (type === NOTIFICATION_TYPES.ORDER_READY) return "Order completed";
  if (type === NOTIFICATION_TYPES.UNCLAIMED_ORDER) return "Unclaimed order";
  if (type === NOTIFICATION_TYPES.PROMO) return "Promotion";
  if (type === NOTIFICATION_TYPES.ANNOUNCEMENT) return "Announcement";
  return "Notification";
}