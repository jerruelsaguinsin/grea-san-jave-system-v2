// ============================================================================
// accountManagement.js — OWNER/ADMIN ACCOUNT MANAGEMENT
// Personal profile changes are handled by profile.js. This module only allows
// the owner/co-owner to manage staff role/duty and create staff accounts.
// ============================================================================

function generateTemporaryPassword() {
  let chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function addStaffAccount(formData) {
  let errors = {};

  if (
    currentActorType !== ACTOR_TYPES.STAFF ||
    currentUser.role !== USER_ROLES.CO_OWNER
  ) {
    return { success: false, message: "Only the owner can create staff accounts." };
  }
  if (isBlank(formData.fullName)) {
    errors.fullName = "Full name is required.";
  }
  if (isBlank(formData.username)) {
    errors.username = "Username is required.";
  }
  if (isBlank(formData.email) || !isValidEmailFormat(formData.email)) {
    errors.email = "A valid email is required.";
  }
  if (
    isBlank(formData.role) ||
    (formData.role !== USER_ROLES.CO_OWNER && formData.role !== USER_ROLES.STAFF)
  ) {
    errors.role = "Select a valid role.";
  }
  if (
    isBlank(formData.assignedDuty) ||
    (formData.assignedDuty !== DUTY_ASSIGNMENT.RUSH &&
      formData.assignedDuty !== DUTY_ASSIGNMENT.WALK_IN &&
      formData.assignedDuty !== DUTY_ASSIGNMENT.BOTH)
  ) {
    errors.assignedDuty = "Select a valid duty assignment.";
  }

  if (!isBlank(formData.username)) {
    let existingUsernameIndex = findIndexByFieldCaseInsensitive(
      users,
      "username",
      formData.username
    );
    let existingUsernameRecord =
      existingUsernameIndex !== -1 ? users[existingUsernameIndex] : null;

    if (existingUsernameRecord === null) {
      existingUsernameIndex = findIndexByFieldCaseInsensitive(
        customers,
        "username",
        formData.username
      );
      existingUsernameRecord =
        existingUsernameIndex !== -1 ? customers[existingUsernameIndex] : null;
    }

    if (existingUsernameRecord !== null) {
      errors.username =
        existingUsernameRecord.isActive === false
          ? "An account with this username already exists. Contact an authorized owner to reactivate it."
          : "That username is already taken.";
    }
  }
  if (!isBlank(formData.email)) {
    if (
      findIndexByFieldCaseInsensitive(users, "email", formData.email) !== -1 ||
      findIndexByFieldCaseInsensitive(customers, "email", formData.email) !== -1
    ) {
      errors.email = "That email is already in use.";
    }
  }

  if (hasObjectProperties(errors)) {
    return { success: false, errors: errors };
  }

  let temporaryPassword = generateTemporaryPassword();
  let newUser = {
    userId: generateNextId(users, "userId"),
    fullName: formData.fullName.trim(),
    username: formData.username.trim(),
    email: formData.email.trim(),
    passwordHash: simpleHashPlaceholder(temporaryPassword),
    role: formData.role,
    assignedDuty: formData.assignedDuty,
    dateCreated: todayIsoDate(),
    isActive: true,
    mustChangePassword: true,
  };

  insertRecord(users, newUser);
  logAccountAction(
    ACTION_TYPES.ACCOUNT_CREATED,
    newUser.userId,
    "Staff account created: " + newUser.username + " (temporary password generated)"
  );

  return { success: true, user: newUser, temporaryPassword: temporaryPassword };
}

// Only role and duty may be changed by the owner. Personal identity,
// username, email and password are deliberately excluded.
function editStaffAccount(userId, formData) {
  if (
    currentActorType !== ACTOR_TYPES.STAFF ||
    currentUser.role !== USER_ROLES.CO_OWNER
  ) {
    return { success: false, message: "Only the owner can manage staff accounts." };
  }
  let index = findIndexByField(users, "userId", userId);
  if (index === -1) {
    return { success: false, message: "Staff account not found." };
  }

  let errors = {};
  if (
    isBlank(formData.role) ||
    (formData.role !== USER_ROLES.CO_OWNER && formData.role !== USER_ROLES.STAFF)
  ) {
    errors.role = "Select a valid role.";
  }
  if (
    isBlank(formData.assignedDuty) ||
    (formData.assignedDuty !== DUTY_ASSIGNMENT.RUSH &&
      formData.assignedDuty !== DUTY_ASSIGNMENT.WALK_IN &&
      formData.assignedDuty !== DUTY_ASSIGNMENT.BOTH)
  ) {
    errors.assignedDuty = "Select a valid duty assignment.";
  }
  if (hasObjectProperties(errors)) {
    return { success: false, errors: errors };
  }

  let account = users[index];
  account.role = formData.role;
  account.assignedDuty = formData.assignedDuty;

  logAccountAction(
    ANIKA_ACTION_TYPES_EXTENSION.ACCOUNT_UPDATED,
    account.userId,
    "Staff role/duty updated for: " + account.username
  );
  return { success: true, user: account };
}

// Status changes are owner-only and are exposed through the account tables.
function setAccountActiveStatus(accountArrayName, accountId, makeActive) {
  if (
    currentActorType !== ACTOR_TYPES.STAFF ||
    currentUser.role !== USER_ROLES.CO_OWNER
  ) {
    return { success: false, message: "Only the owner can manage account status." };
  }
  let array = accountArrayName === "users" ? users : customers;
  let idField = accountArrayName === "users" ? "userId" : "customerId";
  let index = findIndexByField(array, idField, accountId);
  if (index === -1) {
    return { success: false, message: "Account not found." };
  }
  array[index].isActive = makeActive;
  logAccountAction(
    makeActive
      ? ANIKA_ACTION_TYPES_EXTENSION.ACCOUNT_REACTIVATED
      : ANIKA_ACTION_TYPES_EXTENSION.ACCOUNT_DEACTIVATED,
    accountId,
    (makeActive ? "Reactivated: " : "Deactivated: ") + array[index].username
  );
  return { success: true, account: array[index] };
}

function logAccountAction(actionType, targetId, details) {
  let actorId = currentActorType === ACTOR_TYPES.STAFF ? currentUser.userId : null;
  logActivity(actorId, ACTOR_TYPES.STAFF, actionType, targetId, details);
}

function searchStaffAccountById(userId) {
  return findIndexByField(users, "userId", userId);
}

function searchCustomerAccountById(customerId) {
  return findIndexByField(customers, "customerId", customerId);
}

function searchAccountsByKeyword(keyword) {
  if (isBlank(keyword)) {
    return {
      matchedUsers: copyArray(users),
      matchedCustomers: copyArray(customers),
    };
  }

  return {
    matchedUsers: searchRecordsByKeyword(
      users,
      ["userId", "fullName", "username", "email", "role", "assignedDuty", "isActive"],
      keyword
    ),
    matchedCustomers: searchRecordsByKeyword(
      customers,
      [
        "customerId",
        "customerName",
        "contactNumber",
        "username",
        "email",
        "messengerHandle",
        "isRegular",
        "isActive",
      ],
      keyword
    ),
  };
}

function sortStaffAccounts(fieldName, direction) {
  return bubbleSortByField(users, fieldName, direction);
}

function sortCustomerAccounts(fieldName, direction) {
  return bubbleSortByField(customers, fieldName, direction);
}

function refreshSukiStatus(customerId, ordersArray) {
  let index = findIndexByField(customers, "customerId", customerId);
  if (index === -1) {
    return false;
  }
  let completedCount = countByPredicate(ordersArray, function (order) {
    return order.customerId === customerId && order.status === ORDER_STATUS.DONE;
  });
  let qualifiesNow = completedCount >= SUKI_ORDER_THRESHOLD;
  let changed = customers[index].isRegular !== qualifiesNow;
  customers[index].isRegular = qualifiesNow;
  if (changed) saveStateToSession();
  return changed;
}