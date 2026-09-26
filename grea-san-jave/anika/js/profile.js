// ============================================================================
// profile.js — personal profile + password changes for the authenticated user
// ============================================================================

function getCurrentProfileRecord() {
  if (!currentUser || !currentActorType) {
    return null;
  }
  return currentUser;
}

function updateOwnProfile(formData) {
  if (!currentUser || !currentActorType) {
    return { success: false, message: "You are not signed in." };
  }

  let errors = {};
  if (isBlank(formData.name)) {
    errors.name = "Name is required.";
  }
  if (isBlank(formData.username)) {
    errors.username = "Username is required.";
  }
  if (isBlank(formData.email) || !isValidEmailFormat(formData.email)) {
    errors.email = "A valid email is required.";
  }

  let usernameIndexUsers = findIndexByFieldCaseInsensitive(
    users,
    "username",
    formData.username
  );
  let usernameIndexCustomers = findIndexByFieldCaseInsensitive(
    customers,
    "username",
    formData.username
  );
  let ownUsernameIndex =
    currentActorType === ACTOR_TYPES.STAFF
      ? findIndexByField(users, "userId", currentUser.userId)
      : findIndexByField(customers, "customerId", currentUser.customerId);

  if (
    (usernameIndexUsers !== -1 &&
      !(
        currentActorType === ACTOR_TYPES.STAFF &&
        users[usernameIndexUsers].userId === currentUser.userId
      )) ||
    (usernameIndexCustomers !== -1 &&
      !(
        currentActorType === ACTOR_TYPES.CUSTOMER &&
        customers[usernameIndexCustomers].customerId === currentUser.customerId
      ))
  ) {
    errors.username = "That username is already taken.";
  }

  let emailIndexUsers = findIndexByFieldCaseInsensitive(
    users,
    "email",
    formData.email
  );
  let emailIndexCustomers = findIndexByFieldCaseInsensitive(
    customers,
    "email",
    formData.email
  );
  if (
    (emailIndexUsers !== -1 &&
      !(
        currentActorType === ACTOR_TYPES.STAFF &&
        users[emailIndexUsers].userId === currentUser.userId
      )) ||
    (emailIndexCustomers !== -1 &&
      !(
        currentActorType === ACTOR_TYPES.CUSTOMER &&
        customers[emailIndexCustomers].customerId === currentUser.customerId
      ))
  ) {
    errors.email = "That email is already in use.";
  }

  if (hasObjectProperties(errors)) {
    return { success: false, errors: errors };
  }

  if (currentActorType === ACTOR_TYPES.STAFF) {
    currentUser.fullName = formData.name.trim();
    currentUser.username = formData.username.trim();
    currentUser.email = formData.email.trim();
  } else {
    currentUser.customerName = formData.name.trim();
    currentUser.username = formData.username.trim();
    currentUser.email = formData.email.trim();
    currentUser.messengerHandle = formData.messengerHandle.trim();
  }

  saveStateToSession();
  saveSessionPointer();
  logActivity(
    currentActorType === ACTOR_TYPES.STAFF
      ? currentUser.userId
      : currentUser.customerId,
    currentActorType,
    ANIKA_ACTION_TYPES_EXTENSION.ACCOUNT_UPDATED,
    null,
    "Personal profile updated."
  );
  return { success: true };
}

function validateOwnPasswordChange(currentPassword, newPassword, confirmPassword) {
  if (!currentUser || !currentActorType) {
    return { success: false, message: "You are not signed in." };
  }
  if (
    isBlank(currentPassword) ||
    !verifyPasswordPlaceholder(currentPassword, currentUser.passwordHash)
  ) {
    return { success: false, message: "Current password is incorrect." };
  }
  if (isBlank(newPassword) || newPassword.length < 8) {
    return {
      success: false,
      message: "New password must be at least 8 characters.",
    };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, message: "New passwords do not match." };
  }
  if (newPassword === currentPassword) {
    return {
      success: false,
      message: "New password must be different from the current password.",
    };
  }

  return { success: true };
}

function changeOwnPassword(currentPassword, newPassword, confirmPassword) {
  let validation = validateOwnPasswordChange(
    currentPassword,
    newPassword,
    confirmPassword
  );
  if (!validation.success) {
    return validation;
  }

  currentUser.passwordHash = simpleHashPlaceholder(newPassword);
  if (currentActorType === ACTOR_TYPES.STAFF) {
    currentUser.mustChangePassword = false;
  }
  saveStateToSession();
  saveSessionPointer();
  logActivity(
    currentActorType === ACTOR_TYPES.STAFF
      ? currentUser.userId
      : currentUser.customerId,
    currentActorType,
    ANIKA_ACTION_TYPES_EXTENSION.PASSWORD_CHANGED,
    null,
    "Password changed."
  );
  return { success: true };
}

function forceSetNewStaffPassword(currentPassword, newPassword, confirmPassword) {
  if (
    !currentUser ||
    currentActorType !== ACTOR_TYPES.STAFF ||
    currentUser.mustChangePassword !== true
  ) {
    return {
      success: false,
      message: "A forced password change is not required.",
    };
  }
  if (isBlank(newPassword) || newPassword.length < 8) {
    return {
      success: false,
      message: "New password must be at least 8 characters.",
    };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, message: "New passwords do not match." };
  }

  currentUser.passwordHash = simpleHashPlaceholder(newPassword);
  currentUser.mustChangePassword = false;
  saveStateToSession();
  saveSessionPointer();
  logActivity(
    currentUser.userId,
    ACTOR_TYPES.STAFF,
    ANIKA_ACTION_TYPES_EXTENSION.PASSWORD_CHANGED,
    null,
    "Required first-login password change completed."
  );
  return { success: true };
}
