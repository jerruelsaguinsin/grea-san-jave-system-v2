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

function initOwnerDashboard() {
  if (!guardOwnerDashboard()) return;

  renderOwnerDashboard();
  wireDashboardLogout("logoutBtnOwner");
}

document.addEventListener("DOMContentLoaded", initOwnerDashboard);
