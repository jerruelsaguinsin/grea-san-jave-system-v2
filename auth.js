// ============================================================================
// auth.js — MODULE 1: LOGIN & SIGN UP
// 11. LOGIN + 12. SIGN UP + 13. EMAIL VERIFICATION
// Registration here is CUSTOMER self-sign-up only. Per the module map,
// staff/co-owner (`User`) accounts are created by Module 2 (Account
// Management) — an owner adding a teammate, not public self-registration.
// Module 13 (Customer Account Management, owned by Jerr) calls into
// verifyPasswordPlaceholder()/simpleHashPlaceholder() from utils.js for
// in-account password changes rather than reimplementing hashing itself,
// per the "Module 13 depends on Module 1" note in Part III of the schema.
// ============================================================================

// ---------------------------------------------------------------------------
// REGISTRATION (Customer self-sign-up)
// ---------------------------------------------------------------------------
function registerCustomer(formData) {
  // formData: { customerName, contactNumber, email, messengerHandle, username, password, confirmPassword }
  let errors = {};

  if (isBlank(formData.customerName)) {
    errors.customerName = "Full name is required.";
  }
  if (isBlank(formData.username)) {
    errors.username = "Username is required.";
  }
  if (!/^[0-9]{11}$/.test(formData.contactNumber.trim())) {
    errors.contactNumber = "Contact number must contain exactly 11 digits.";
  }
  if (isBlank(formData.password)) {
    errors.password = "Password is required.";
  }
  if (!isBlank(formData.password) && formData.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  // email is optional per schema (Customer.email), but if the customer wants
  // to submit orders by Email (ORDER_CHANNELS.EMAIL) or needs verification,
  // format must still be valid when provided.
  if (!isBlank(formData.email) && !isValidEmailFormat(formData.email)) {
    errors.email = "Enter a valid email address.";
  }

  // Manual duplicate search — across BOTH customers[] and users[], since
  // usernames must be unique system-wide even though they live in two arrays.
  if (!isBlank(formData.username)) {
    let dupInCustomers = findIndexByFieldCaseInsensitive(
      customers,
      "username",
      formData.username
    );
    let dupInUsers = findIndexByFieldCaseInsensitive(
      users,
      "username",
      formData.username
    );
    if (dupInCustomers !== -1 || dupInUsers !== -1) {
      errors.username = "That username is already taken.";
    }
  }

  if (!isBlank(formData.email)) {
    let dupEmail = findIndexByFieldCaseInsensitive(
      customers,
      "email",
      formData.email
    );
    if (dupEmail !== -1) {
      errors.email = "An account already uses that email.";
    }
  }

  if (hasObjectProperties(errors)) {
    return { success: false, errors: errors };
  }

  let needsVerification = !isBlank(formData.email);
  let verificationToken = needsVerification ? generateVerificationCode() : null;

  let newCustomer = {
    customerId: generateNextId(customers, "customerId"),
    customerName: formData.customerName.trim(),
    contactNumber: isBlank(formData.contactNumber) ? "" : formData.contactNumber.trim(),
    email: isBlank(formData.email) ? "" : formData.email.trim(),
    messengerHandle: isBlank(formData.messengerHandle) ? "" : formData.messengerHandle.trim(),
    username: formData.username.trim(),
    passwordHash: simpleHashPlaceholder(formData.password),
    isRegular: false,
    isEmailVerified: !needsVerification, // no email on file -> nothing to verify
    emailVerificationToken: verificationToken,
    dateRegistered: todayIsoDate(),
    isActive: true, // see ACCOUNT_STATUS note in constants.js
  };

  insertRecord(customers, newCustomer);

  logActivity(
    newCustomer.customerId,
    ACTOR_TYPES.CUSTOMER,
    ANIKA_ACTION_TYPES_EXTENSION.SIGN_UP,
    null,
    "New customer account registered: " + newCustomer.username
  );

  return { success: true, customer: newCustomer, needsVerification: needsVerification };
}

// ---------------------------------------------------------------------------
// EMAIL VERIFICATION (front-end prototype — see brief §14)
// There is no backend email server in this project. The "code" below is
// generated and stored locally so the verification SCREEN and FLOW can be
// demonstrated; it is not actually emailed anywhere. This is clearly a
// classroom prototype/development mechanism, not a real delivery channel.
// ---------------------------------------------------------------------------
function verifyCustomerEmail(customerId, enteredCode) {
  let index = findIndexByField(customers, "customerId", customerId);
  if (index === -1) {
    return { success: false, message: "Account not found." };
  }

  let customer = customers[index];

  if (customer.isEmailVerified) {
    return { success: false, message: "This account is already verified." };
  }

  if (isBlank(enteredCode) || enteredCode !== customer.emailVerificationToken) {
    return { success: false, message: "Incorrect verification code." };
  }

  customer.isEmailVerified = true;
  customer.emailVerificationToken = null;

  logActivity(
    customer.customerId,
    ACTOR_TYPES.CUSTOMER,
    ANIKA_ACTION_TYPES_EXTENSION.EMAIL_VERIFIED,
    null,
    "Email verified for " + customer.username
  );

  return { success: true, customer: customer };
}

function resendVerificationCode(customerId) {
  let index = findIndexByField(customers, "customerId", customerId);
  if (index === -1) {
    return { success: false, message: "Account not found." };
  }

  let customer = customers[index];
  if (isBlank(customer.email)) {
    return { success: false, message: "No email on file for this account." };
  }
  customer.emailVerificationToken = generateVerificationCode();
  saveStateToSession(); // resendVerificationCode doesn't call logActivity, so save explicitly
  return { success: true, devCode: customer.emailVerificationToken };
}

// ---------------------------------------------------------------------------
// Sends the OTP verification email through EmailJS (see emailService.js /
// emailConfig.js). Returns a Promise so the caller (pageLogin.js) can show
// "sending..." / success / fallback-to-on-screen-code states. Module 1 owns
// deciding WHEN a verification email goes out; emailService.js owns the
// mechanics of actually talking to EmailJS.
// ---------------------------------------------------------------------------
function triggerVerificationEmailForCustomer(customerId) {
  let index = findIndexByField(customers, "customerId", customerId);
  if (index === -1) {
    return Promise.reject(new Error("Account not found."));
  }
  let customer = customers[index];
  if (isBlank(customer.email)) {
    return Promise.reject(new Error("No email on file for this account."));
  }
  return sendVerificationEmail(
    customer.email,
    customer.customerName,
    customer.emailVerificationToken
  );
}

function findAccountForPasswordReset(username) {
  let customerIndex = findIndexByFieldCaseInsensitive(customers, "username", username);
  if (customerIndex !== -1) {
    return { account: customers[customerIndex], actorType: ACTOR_TYPES.CUSTOMER };
  }
  let userIndex = findIndexByFieldCaseInsensitive(users, "username", username);
  if (userIndex !== -1) {
    return { account: users[userIndex], actorType: ACTOR_TYPES.STAFF };
  }
  return null;
}

function resetPasswordAfterOtp(account, newPassword, confirmPassword) {
  if (!account || isBlank(newPassword)) {
    return { success: false, message: "New password is required." };
  }
  if (newPassword.length < 8) {
    return { success: false, message: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, message: "New passwords do not match." };
  }

  account.passwordHash = simpleHashPlaceholder(newPassword);
  if (account.mustChangePassword === true) account.mustChangePassword = false;
  saveStateToSession();

  let actorType = account.customerId !== undefined ? ACTOR_TYPES.CUSTOMER : ACTOR_TYPES.STAFF;
  let actorId = actorType === ACTOR_TYPES.CUSTOMER ? account.customerId : account.userId;
  logActivity(actorId, actorType, ACTION_TYPES.PASSWORD_RESET, null, "Password reset after email OTP verification.");
  return { success: true };
}

// ---------------------------------------------------------------------------
// LOGIN
// Role must never be selected by the user or hardcoded by name/email — it
// is always read from the matched stored record, per brief §13.
// Search order: customers[] first, then users[] (a username collision
// across the two arrays is already prevented at registration time above,
// and staff usernames are assigned by the co-owner via Module 2, so this
// order is a safe, deterministic tie-breaker).
// ---------------------------------------------------------------------------
function loginWithCredentials(username, plainPassword) {
  if (isBlank(username) || isBlank(plainPassword)) {
    return { success: false, message: "Username and password are required." };
  }

  let customerIndex = findIndexByFieldCaseInsensitive(
    customers,
    "username",
    username
  );
  if (customerIndex !== -1) {
    return attemptCustomerLogin(customers[customerIndex], plainPassword);
  }

  let userIndex = findIndexByFieldCaseInsensitive(users, "username", username);
  if (userIndex !== -1) {
    return attemptStaffLogin(users[userIndex], plainPassword);
  }

  return { success: false, message: "No account found with that username." };
}

function validateLoginCredentials(username, plainPassword) {
  if (isBlank(username) || isBlank(plainPassword)) {
    return { success: false, message: "Username and password are required." };
  }

  let customerIndex = findIndexByFieldCaseInsensitive(
    customers,
    "username",
    username
  );
  if (customerIndex !== -1) {
    let customer = customers[customerIndex];
    if (!verifyPasswordPlaceholder(plainPassword, customer.passwordHash)) {
      return { success: false, message: "Incorrect password." };
    }
    if (!customer.isActive) {
      return {
        success: false,
        message: "This account has been deactivated. Contact the shop for help.",
      };
    }
    if (isBlank(customer.email)) {
      return {
        success: false,
        message: "A registered email is required for login verification.",
      };
    }
    return { success: true, actorType: ACTOR_TYPES.CUSTOMER, account: customer };
  }

  let userIndex = findIndexByFieldCaseInsensitive(users, "username", username);
  if (userIndex !== -1) {
    let user = users[userIndex];
    if (!verifyPasswordPlaceholder(plainPassword, user.passwordHash)) {
      return { success: false, message: "Incorrect password." };
    }
    if (!user.isActive) {
      return {
        success: false,
        message: "This staff account has been deactivated.",
      };
    }
    if (isBlank(user.email)) {
      return {
        success: false,
        message: "A registered email is required for login verification.",
      };
    }
    return { success: true, actorType: ACTOR_TYPES.STAFF, account: user };
  }

  return { success: false, message: "No account found with that username." };
}

function completeLoginAfterOtp(account, actorType) {
  if (actorType === ACTOR_TYPES.CUSTOMER) {
    currentUser = account;
    currentActorType = ACTOR_TYPES.CUSTOMER;

    saveSessionPointer();

    logActivity(
      account.customerId,
      ACTOR_TYPES.CUSTOMER,
      ACTION_TYPES.LOGIN,
      null,
      "Customer login: " + account.username
    );

    return {
      success: true,
      account: account,
      actorType: ACTOR_TYPES.CUSTOMER,
    };
  }

  if (actorType === ACTOR_TYPES.STAFF) {
    currentUser = account;
    currentActorType = ACTOR_TYPES.STAFF;

    saveSessionPointer();

    logActivity(
      account.userId,
      ACTOR_TYPES.STAFF,
      ACTION_TYPES.LOGIN,
      null,
      "Staff login: " + account.username
    );

    return {
      success: true,
      account: account,
      actorType: ACTOR_TYPES.STAFF,
    };
  }

  return {
    success: false,
    message: "Unable to determine account type.",
  };
}

function attemptCustomerLogin(customer, plainPassword) {
  if (!verifyPasswordPlaceholder(plainPassword, customer.passwordHash)) {
    return { success: false, message: "Incorrect password." };
  }
  if (!customer.isActive) {
    return { success: false, message: "This account has been deactivated. Contact the shop for help." };
  }
  // Verification only blocks login when an email was actually provided —
  // schema marks Customer.email optional, see registerCustomer() above.
  if (!isBlank(customer.email) && !customer.isEmailVerified) {
    return {
      success: false,
      message: "Please verify your email before logging in.",
      requiresVerification: true,
      customerId: customer.customerId,
    };
  }

  currentUser = customer;
  currentActorType = ACTOR_TYPES.CUSTOMER;
  saveSessionPointer(); // so the session survives navigating to another page

  logActivity(
    customer.customerId,
    ACTOR_TYPES.CUSTOMER,
    ACTION_TYPES.LOGIN,
    null,
    "Customer login: " + customer.username
  );

  return { success: true, actorType: ACTOR_TYPES.CUSTOMER, account: customer };
}

function attemptStaffLogin(user, plainPassword) {
  if (!verifyPasswordPlaceholder(plainPassword, user.passwordHash)) {
    return { success: false, message: "Incorrect password." };
  }
  if (!user.isActive) {
    return { success: false, message: "This staff account has been deactivated." };
  }

  currentUser = user;
  currentActorType = ACTOR_TYPES.STAFF;
  saveSessionPointer(); // so the session survives navigating to another page

  logActivity(
    user.userId,
    ACTOR_TYPES.STAFF,
    ACTION_TYPES.LOGIN,
    null,
    "Staff login: " + user.username + " (" + user.role + ")"
  );

  return {
    success: true,
    actorType: ACTOR_TYPES.STAFF,
    account: user,
    mustChangePassword: user.mustChangePassword === true,
  };
}

// ---------------------------------------------------------------------------
// LOGOUT
// ---------------------------------------------------------------------------
function logoutCurrentUser() {
  if (!currentUser) {
    return;
  }

  let actorId =
    currentActorType === ACTOR_TYPES.STAFF
      ? currentUser.userId
      : currentUser.customerId;
  logActivity(
    actorId,
    currentActorType,
    ANIKA_ACTION_TYPES_EXTENSION.LOGOUT,
    null,
    "Logged out"
  );

  currentUser = null;
  currentActorType = null;
  saveSessionPointer(); // clears the stored session so a refresh stays logged out
}

// ---------------------------------------------------------------------------
// DASHBOARD ROUTING (Module 11-style landing pages)
// One shared place that decides which dashboard file a signed-in account
// belongs on, based purely on the existing session (currentUser /
// currentActorType) and the existing `role` field on User records — no new
// role system, no separate "userType" field. Used by:
//   - pageLogin.js, right after a successful login
//   - initLoginPage(), to bounce an already-logged-in visitor off the login
//     screen
//   - each dashboard's own guard function, to redirect a signed-in account
//     away from a dashboard that isn't theirs
//   - the "Dashboard" nav link on account-management.html / activity-log.html
// ---------------------------------------------------------------------------
function getDashboardUrlForCurrentUser() {
  if (!currentUser || !currentActorType) {
    return "login-signup.html";
  }
  if (
    currentActorType === ACTOR_TYPES.STAFF &&
    currentUser.mustChangePassword === true
  ) {
    return "change-password.html";
  }
  if (currentActorType === ACTOR_TYPES.CUSTOMER) {
    return "customer-dashboard.html";
  }
  if (currentUser.role === USER_ROLES.CO_OWNER) {
    return "owner-dashboard.html";
  }
  return "staff-dashboard.html";
}