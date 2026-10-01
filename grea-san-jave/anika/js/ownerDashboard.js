// ============================================================================
// ownerDashboard.js — DOM/event wiring for owner-dashboard.html
// ============================================================================

function renderOwnerDashboard() {
  document.getElementById("ownerWelcome").textContent = "Welcome back, " + currentUser.fullName + "!";
  document.getElementById("currentUserLabelOwner").textContent = currentUser.fullName + " (Co-Owner)";

  let staffStats = getStaffAccountStats();
  let customerStats = getCustomerAccountStats();

  document.getElementById("statTotalStaff").textContent = staffStats.totalStaff;
  document.getElementById("statActiveStaff").textContent = staffStats.activeStaff;
  document.getElementById("statTotalCustomers").textContent = customerStats.totalCustomers;
  document.getElementById("statActiveCustomers").textContent = customerStats.activeCustomers;
  document.getElementById("statSukiCustomers").textContent = customerStats.sukiCustomers;
  document.getElementById("statPendingVerification").textContent = customerStats.pendingVerification;

  renderActivityFeed("ownerActivityFeed", getRecentActivity(8), "No recorded activity yet.");
}

function showOwnerContent(url) {
  let dashboardPanel = document.getElementById("ownerDashboardPanel");
  let contentFrame = document.getElementById("ownerContentFrame");
  let requestedUrl = new URL(url, window.location.href);
  let dashboardUrl = new URL("owner-dashboard.html", window.location.href);

  if (requestedUrl.pathname === dashboardUrl.pathname) {
    dashboardPanel.hidden = false;
    contentFrame.hidden = true;
  } else {
    dashboardPanel.hidden = true;
    contentFrame.hidden = false;
    if (contentFrame.src !== requestedUrl.href) {
      contentFrame.src = requestedUrl.href;
    }
  }

  let navLinks = document.querySelectorAll(".app-nav a");
  for (let i = 0; i < navLinks.length; i++) {
    let linkUrl = new URL(navLinks[i].href, window.location.href);
    navLinks[i].classList.toggle("active", linkUrl.pathname === requestedUrl.pathname);
  }
}

function wireOwnerContentNavigation() {
  document.addEventListener("click", function (event) {
    let link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

    let requestedUrl = new URL(link.href, window.location.href);
    if (requestedUrl.origin !== window.location.origin) return;

    event.preventDefault();
    showOwnerContent(requestedUrl.href);
  });

  let contentFrame = document.getElementById("ownerContentFrame");
  contentFrame.addEventListener("load", function () {
    try {
      let embeddedDocument = contentFrame.contentDocument;
      let embeddedStyle = embeddedDocument.createElement("style");
      embeddedStyle.textContent =
        "header.app-header{display:none!important}main{margin:0!important;max-width:none!important;min-height:100vh;padding:1rem!important}body{overflow-x:hidden}";
      embeddedDocument.head.appendChild(embeddedStyle);
    } catch (error) {}
  });
}

function initOwnerDashboard() {
  if (!guardOwnerDashboard()) return;

  renderOwnerDashboard();
  wireOwnerContentNavigation();
  wireDashboardLogout("logoutBtnOwner");
}

document.addEventListener("DOMContentLoaded", initOwnerDashboard);
