// ============================================================================
// staffDashboard.js — DOM/event wiring for staff-dashboard.html
// ============================================================================

function initStaffDashboard() {
  if (!guardStaffDashboard()) return;

  document.getElementById("staffWelcome").textContent = "Welcome back, " + currentUser.fullName + "!";
  document.getElementById("currentUserLabelStaff").textContent = currentUser.fullName + " (Staff)";

  document.getElementById("profileFullName").textContent = currentUser.fullName;
  document.getElementById("profileUsername").textContent = currentUser.username;
  document.getElementById("profileDuty").textContent = dutyLabelDash(currentUser.assignedDuty);
  document.getElementById("profileDateCreated").textContent = currentUser.dateCreated;

  let customerStats = getCustomerAccountStats();
  document.getElementById("statTotalCustomersStaff").textContent = customerStats.totalCustomers;
  document.getElementById("statActiveCustomersStaff").textContent = customerStats.activeCustomers;

  let myActivity = getMyRecentActivity(currentUser.userId, ACTOR_TYPES.STAFF, 8);
  renderActivityFeed("staffActivityFeed", myActivity, "No activity recorded for your account yet.");

  wireDashboardLogout("logoutBtnStaff");
}

// Local copy of the duty label lookup (accountManagement.js's dutyLabel()
// isn't loaded on this page) so this file has no dependency on a module
// staff dashboards otherwise never load.
function dutyLabelDash(duty) {
  if (duty === DUTY_ASSIGNMENT.RUSH) return "Rush Orders";
  if (duty === DUTY_ASSIGNMENT.WALK_IN) return "Walk-In Orders";
  if (duty === DUTY_ASSIGNMENT.BOTH) return "Both";
  return duty;
}

document.addEventListener("DOMContentLoaded", initStaffDashboard);
