// ============================================================================
// pageAccounts.js — OWNER/ADMIN account management page
// ============================================================================
let staffSortField = "fullName";
let staffSortDirection = "asc";
let customerSortField = "customerName";
let customerSortDirection = "asc";
let editingUserId = null;

function guardOwnerOnly() {
  if (!currentUser || currentActorType !== ACTOR_TYPES.STAFF || currentUser.role !== USER_ROLES.CO_OWNER) {
    window.location.href = getDashboardUrlForCurrentUser();
    return false;
  }
  return true;
}

function renderStaffTable(list) {
  let tbody = document.getElementById("staffTableBody");
  tbody.innerHTML = "";
  if (list.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No staff accounts found.</td></tr>';
    return;
  }
  for (let i = 0; i < list.length; i++) {
    let u = list[i];
    let row = document.createElement("tr");
    row.innerHTML =
      '<td data-label="ID">' + u.userId + '</td>' +
      '<td data-label="Full Name">' + escapeHtml(u.fullName) + '</td>' +
      '<td data-label="Username">' + escapeHtml(u.username) + '</td>' +
      '<td data-label="Email">' + escapeHtml(u.email || "—") + '</td>' +
      '<td data-label="Role"><span class="badge badge-role">' + roleLabel(u.role) + '</span></td>' +
      '<td data-label="Duty">' + dutyLabel(u.assignedDuty) + '</td>' +
      '<td data-label="Actions"></td>';
    let actionsCell = row.children[6];
    let editBtn = document.createElement("button");
    editBtn.className = "btn btn-secondary btn-small";
    editBtn.textContent = "Edit Role / Duty";
    editBtn.addEventListener("click", function () { openEditStaffModal(u.userId); });
    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(createAccountStatusButton("users", u));
    tbody.appendChild(row);
  }
}

function renderCustomerTable(list) {
  let tbody = document.getElementById("customerTableBody");
  tbody.innerHTML = "";
  if (list.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">No customer accounts found.</td></tr>';
    return;
  }
  for (let i = 0; i < list.length; i++) {
    let c = list[i];
    let row = document.createElement("tr");
    row.innerHTML =
      '<td data-label="ID">' + c.customerId + '</td>' +
      '<td data-label="Name">' + escapeHtml(c.customerName) + '</td>' +
      '<td data-label="Username">' + escapeHtml(c.username) + '</td>' +
      '<td data-label="Email">' + escapeHtml(c.email || "—") + '</td>' +
      '<td data-label="Messenger">' + escapeHtml(c.messengerHandle || "—") + '</td>' +
      '<td data-label="Status">' + (c.isActive ? "Active" : "Suspended") + '</td>' +
      '<td data-label="Admin Action"></td>';
    row.children[6].appendChild(createAccountStatusButton("customers", c));
    tbody.appendChild(row);
  }
}

function createAccountStatusButton(accountArrayName, account) {
  let button = document.createElement("button");
  button.className = account.isActive ? "btn btn-danger btn-small" : "btn btn-secondary btn-small";
  button.textContent = account.isActive ? "Deactivate" : "Reactivate";
  button.addEventListener("click", function () {
    let accountId = accountArrayName === "users" ? account.userId : account.customerId;
    let wasActive = account.isActive;
    let action = wasActive ? "deactivate" : "reactivate";
    let confirmed = window.confirm("Are you sure you want to " + action + " the account for " + account.username + "?");
    if (!confirmed) return;
    let result = setAccountActiveStatus(accountArrayName, accountId, !wasActive);
    if (!result.success) {
      showToast(result.message, "error");
      return;
    }
    refreshAccountTables();
    showToast(wasActive ? "Account deactivated." : "Account reactivated.", "success");
  });
  return button;
}

function roleLabel(role) {
  if (role === USER_ROLES.CO_OWNER) return "Co-Owner";
  if (role === USER_ROLES.STAFF) return "Staff";
  return role;
}
function dutyLabel(duty) {
  if (duty === DUTY_ASSIGNMENT.RUSH) return "Rush Orders";
  if (duty === DUTY_ASSIGNMENT.WALK_IN) return "Walk-In Orders";
  if (duty === DUTY_ASSIGNMENT.BOTH) return "Both";
  return duty;
}
function escapeHtml(text) { let div = document.createElement("div"); div.textContent = text; return div.innerHTML; }

function refreshAccountTables() {
  let keyword = document.getElementById("accountSearchInput").value.trim();
  let result = searchAccountsByKeyword(keyword);
  bubbleSortByField(result.matchedUsers, staffSortField, staffSortDirection);
  bubbleSortByField(result.matchedCustomers, customerSortField, customerSortDirection);
  renderStaffTable(result.matchedUsers);
  renderCustomerTable(result.matchedCustomers);
}

function handleSortClick(tableType, fieldName) {
  if (tableType === "staff") {
    staffSortDirection = staffSortField === fieldName && staffSortDirection === "asc" ? "desc" : "asc";
    staffSortField = fieldName;
  } else {
    customerSortDirection = customerSortField === fieldName && customerSortDirection === "asc" ? "desc" : "asc";
    customerSortField = fieldName;
  }
  refreshAccountTables();
}

function openAddStaffModal() {
  editingUserId = null;
  document.getElementById("staffModalTitle").textContent = "Add Staff Account";
  document.getElementById("staffForm").reset();
  document.getElementById("staffEmail").disabled = false;
  document.getElementById("staffUsername").disabled = false;
  document.getElementById("staffFullName").disabled = false;
  document.getElementById("staffPasswordGroup").style.display = "none";
  document.getElementById("staffPasswordGeneratedNote").textContent = "A temporary password will be generated automatically after creation.";
  clearFieldErrors(["staffFullName", "staffUsername", "staffEmail", "staffRole", "staffDuty"]);
  document.getElementById("staffModalOverlay").classList.add("open");
}

function openEditStaffModal(userId) {
  let index = searchStaffAccountById(userId);
  if (index === -1) return;
  let u = users[index];
  editingUserId = userId;
  document.getElementById("staffModalTitle").textContent = "Edit Staff Role / Duty";
  clearFieldErrors(["staffRole", "staffDuty"]);
  document.getElementById("staffFullName").value = u.fullName;
  document.getElementById("staffUsername").value = u.username;
  document.getElementById("staffEmail").value = u.email || "";
  document.getElementById("staffFullName").disabled = true;
  document.getElementById("staffUsername").disabled = true;
  document.getElementById("staffEmail").disabled = true;
  document.getElementById("staffPasswordGroup").style.display = "none";
  document.getElementById("staffPasswordGeneratedNote").textContent = "Name, username, email, and password are controlled by the staff member's own profile.";
  document.getElementById("staffRole").value = u.role;
  document.getElementById("staffDuty").value = u.assignedDuty;
  document.getElementById("staffModalOverlay").classList.add("open");
}

function closeStaffModal() {
  document.getElementById("staffModalOverlay").classList.remove("open");
  document.getElementById("staffFullName").disabled = false;
  document.getElementById("staffUsername").disabled = false;
  document.getElementById("staffEmail").disabled = false;
}

function showTemporaryPassword(password, username) {
  document.getElementById("generatedUsername").textContent = username;
  document.getElementById("generatedPassword").textContent = password;
  document.getElementById("generatedPasswordOverlay").classList.add("open");
}

function handleStaffFormSubmit(event) {
  event.preventDefault();
  clearFieldErrors(["staffFullName", "staffUsername", "staffEmail", "staffRole", "staffDuty"]);
  let formData = {
    fullName: document.getElementById("staffFullName").value,
    username: document.getElementById("staffUsername").value,
    email: document.getElementById("staffEmail").value,
    role: document.getElementById("staffRole").value,
    assignedDuty: document.getElementById("staffDuty").value,
  };
  let result = editingUserId === null ? addStaffAccount(formData) : editStaffAccount(editingUserId, formData);
  if (!result.success) {
    if (result.errors) {
      for (let field in result.errors) setFieldError("staff" + fieldToInputSuffix(field), result.errors[field]);
    } else showToast(result.message, "error");
    return;
  }
  let wasAdding = editingUserId === null;
  closeStaffModal();
  refreshAccountTables();
  if (wasAdding) showTemporaryPassword(result.temporaryPassword, result.user.username);
  else showToast("Staff role and duty updated.", "success");
}

function fieldToInputSuffix(fieldKey) {
  let map = { fullName: "FullName", username: "Username", email: "Email", role: "Role", assignedDuty: "Duty" };
  return map[fieldKey] || fieldKey;
}

function initAccountsPage() {
  if (!guardOwnerOnly()) return;
  document.getElementById("currentUserLabel").textContent = currentUser.fullName + " (Co-Owner)";
  document.getElementById("dashboardNavLink").setAttribute("href", getDashboardUrlForCurrentUser());
  document.getElementById("accountSearchInput").addEventListener("input", refreshAccountTables);
  document.getElementById("addStaffBtn").addEventListener("click", openAddStaffModal);
  document.getElementById("staffForm").addEventListener("submit", handleStaffFormSubmit);
  document.getElementById("staffModalCancelBtn").addEventListener("click", closeStaffModal);
  document.getElementById("generatedPasswordCloseBtn").addEventListener("click", function () {
    document.getElementById("generatedPasswordOverlay").classList.remove("open");
  });
  document.getElementById("logoutBtn").addEventListener("click", function () {
    logoutCurrentUser(); window.location.href = "login-signup.html";
  });
  let sortHeaders = document.querySelectorAll("[data-sort-table][data-sort-field]");
  for (let i = 0; i < sortHeaders.length; i++) {
    sortHeaders[i].addEventListener("click", function () { handleSortClick(this.getAttribute("data-sort-table"), this.getAttribute("data-sort-field")); });
  }
  refreshAccountTables();
}

document.addEventListener("DOMContentLoaded", initAccountsPage);
