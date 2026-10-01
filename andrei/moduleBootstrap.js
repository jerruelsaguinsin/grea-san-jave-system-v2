(function () {
  "use strict";

  function postState() {
    var state = {
      type: "gsj-owner-module-state",
      orders: window.gsOrders || (window.GSJ && window.GSJ.orders) || [],
      expenses: window.ExpensesModule ? window.ExpensesModule.getAllExpenses() : [],
      payments: window.PaymentsModule ? window.PaymentsModule.getPayments() : [],
    };
    window.parent.postMessage(state, "*");
  }

  window.GSJ = window.GSJ || {};
  window.gsEscapeHtml = function (value) {
    var element = document.createElement("span");
    element.textContent = value == null ? "" : String(value);
    return element.innerHTML;
  };
  window.gsFormatPeso = function (value) {
    var amount = Number(value || 0);
    return "₱" + (isFinite(amount) ? amount : 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };
  window.gsShortMoney = function (value) {
    return window.gsFormatPeso(value);
  };
  window.gsTodayKey = function () {
    var date = new Date();
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  };
  window.gsOffsetKey = function (days) {
    var date = new Date();
    date.setDate(date.getDate() + Number(days || 0));
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  };
  window.gsDateTime = function (value) {
    var date = new Date(value);
    return isNaN(date.getTime()) ? String(value || "—") : date.toLocaleString();
  };
  window.gsValue = function (id) {
    var element = document.getElementById(id);
    return element ? element.value : "";
  };
  window.gsSetError = function (id, message) {
    var element = document.getElementById(id);
    if (element) element.textContent = message || "";
  };
  window.gsEmptyRow = function (columns, message) {
    return '<tr><td colspan="' + Number(columns) + '">' + window.gsEscapeHtml(message) + "</td></tr>";
  };
  window.gsFail = function (message) {
    return { ok: false, error: message };
  };
  window.gsToast = function (message, type) {
    window.parent.postMessage({ type: "gsj-owner-module-toast", message: message, toastType: type }, "*");
  };
  window.gsNotifyOrdersChanged = postState;

  function initializeModules(context) {
    window.GSJ.currentUser = context.currentUser || null;
    window.GSJ.orders = context.orders || [];
    window.gsOrders = window.GSJ.orders;

    if (window.PaymentsModule) {
      window.PaymentsModule.init(window.gsOrders);
    }
    if (window.ExpensesModule) {
      window.ExpensesModule.init(context.expenses || []);
      window.ExpensesModule.setUsers(window.GSJ.currentUser ? [window.GSJ.currentUser] : []);
    }
    if (window.SalesModule) {
      if (window.PaymentsModule) {
        window.SalesModule.setPaymentProvider(function () {
          return window.PaymentsModule.getPayments();
        });
      }
      if (window.ExpensesModule) {
        window.SalesModule.setExpenseProvider(function () {
          return window.ExpensesModule.getAllExpenses();
        });
      }
      window.SalesModule.init(window.gsOrders);
    }
    postState();
  }

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent || !event.data) return;
    if (event.data.type === "gsj-owner-module-context") {
      initializeModules(event.data);
    }
  });

  document.addEventListener("submit", function (event) {
    if (event.target && event.target.id === "exForm") {
      window.setTimeout(postState, 0);
    }
  }, true);
  document.addEventListener("click", function (event) {
    var target = event.target;
    if (target && (target.getAttribute("data-archive-expense") || target.id === "btnArchivePaymentDay")) {
      window.setTimeout(postState, 0);
    }
  }, true);
})();
