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
  let email = isBlank(formData.email) ? "" : formData.email.trim();
  if (
    (currentActorType === ACTOR_TYPES.STAFF && email === "") ||
    (email !== "" && !isValidEmailFormat(email))
  ) {
    errors.email = currentActorType === ACTOR_TYPES.STAFF && email === ""
      ? "A valid email is required."
      : "Enter a valid email address or leave this field blank.";
  }
  let contactNumber = isBlank(formData.contactNumber) ? "" : formData.contactNumber.trim();
  if (
    currentActorType === ACTOR_TYPES.CUSTOMER &&
    contactNumber !== "" &&
    !/^[0-9]{11}$/.test(contactNumber)
  ) {
    errors.contactNumber = "Contact number must contain exactly 11 digits, or be left blank.";
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

  if (email !== "") {
    let emailIndexUsers = findIndexByFieldCaseInsensitive(users, "email", email);
    let emailIndexCustomers = findIndexByFieldCaseInsensitive(customers, "email", email);
    if (
      (emailIndexUsers !== -1 &&
        !(currentActorType === ACTOR_TYPES.STAFF && users[emailIndexUsers].userId === currentUser.userId)) ||
      (emailIndexCustomers !== -1 &&
        !(currentActorType === ACTOR_TYPES.CUSTOMER && customers[emailIndexCustomers].customerId === currentUser.customerId))
    ) {
      errors.email = "That email is already in use.";
    }
  }

  if (hasObjectProperties(errors)) {
    return { success: false, errors: errors };
  }

  let emailChanged =
    currentActorType === ACTOR_TYPES.CUSTOMER &&
    email !== (currentUser.email || "");

  if (currentActorType === ACTOR_TYPES.STAFF) {
    currentUser.fullName = formData.name.trim();
    currentUser.username = formData.username.trim();
    currentUser.email = email;
  } else {
    currentUser.customerName = formData.name.trim();
    currentUser.username = formData.username.trim();
    currentUser.contactNumber = contactNumber;
    currentUser.email = email;
    currentUser.messengerHandle = isBlank(formData.messengerHandle)
      ? ""
      : formData.messengerHandle.trim();
    if (emailChanged) {
      currentUser.isEmailVerified = email === "";
      currentUser.emailVerificationToken = email === "" ? null : generateVerificationCode();
    }
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
  return { success: true, emailChanged: emailChanged };
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
