// ============================================================================
// pageLogin.js — DOM/event wiring for login-signup.html
// 16. RENDERING + 17. EVENT HANDLERS + 18. INITIALIZATION 
// ============================================================================

let pendingVerificationCustomerId = null;
let pendingLoginOtp = null;
let loginOtpChallenges = [];
let pendingPasswordReset = null;

function switchAuthTab(tabName) {
  let loginPanel = document.getElementById("loginPanel");
  let signupPanel = document.getElementById("signupPanel");
  let loginTabBtn = document.getElementById("loginTabBtn");
  let signupTabBtn = document.getElementById("signupTabBtn");

  if (tabName === "signup") {
    loginPanel.classList.remove("active");
    signupPanel.classList.add("active");
    loginTabBtn.classList.remove("active");
    signupTabBtn.classList.add("active");
  } else {
    signupPanel.classList.remove("active");
    loginPanel.classList.add("active");
    signupTabBtn.classList.remove("active");
    loginTabBtn.classList.add("active");
  }
  hideVerificationPanel();
  hideLoginOtpPanel();
}

function handleLoginSubmit(event) {
  event.preventDefault();
  clearFieldErrors(["loginUsername", "loginPassword"]);

  let username = document.getElementById("loginUsername").value.trim();
  let password = document.getElementById("loginPassword").value;

  let result = validateLoginCredentials(username, password);

  if (!result.success) {
    showToast(result.message, "error");
    return;
  }

  pendingLoginOtp = { account: result.account, actorType: result.actorType, challengeId: null };
  showLoginOtpPanel();
  requestLoginOtp();
}

function handleSignupSubmit(event) {
  event.preventDefault();
  clearFieldErrors(["signupName", "signupContact", "signupEmail", "signupMessenger", "signupUsername", "signupPassword", "signupConfirmPassword"]);

  let formData = {
    customerName: document.getElementById("signupName").value,
    contactNumber: document.getElementById("signupContact").value,
    email: document.getElementById("signupEmail").value,
    messengerHandle: document.getElementById("signupMessenger").value,
    username: document.getElementById("signupUsername").value,
    password: document.getElementById("signupPassword").value,
    confirmPassword: document.getElementById("signupConfirmPassword").value,
  };

  let result = registerCustomer(formData);

  if (!result.success) {
    for (let field in result.errors) {
      setFieldError("signup" + capitalize(field), result.errors[field]);
    }
    showToast("Please fix the highlighted fields.", "error");
    return;
  }

  showToast("Account created for " + result.customer.username + "!", "success");
  document.getElementById("signupForm").reset();

  if (result.needsVerification) {
    // switchAuthTab() internally calls hideVerificationPanel(), which
    // resets pendingVerificationCustomerId to null — so it must run BEFORE
    // the id is set and the panel is shown, not after.
    switchAuthTab("login");
    pendingVerificationCustomerId = result.customer.customerId;
    showVerificationPanel();
    sendVerificationEmailAndUpdatePanel(result.customer.customerId);
  } else {
    switchAuthTab("login");
  }
}

function restrictContactNumberInput(event) {
  event.target.value = event.target.value.replace(/[^0-9]/g, "").slice(0, 11);
}

// Signup field ids don't map 1:1 to formData keys via a fixed prefix rule
// (customerName -> signupName, not signupCustomerName), so a small manual
// lookup table replaces a blind string-concat guess.
function capitalize(fieldKey) {
  let map = {
    customerName: "Name",
    contactNumber: "Contact",
    email: "Email",
    messengerHandle: "Messenger",
    username: "Username",
    password: "Password",
    confirmPassword: "ConfirmPassword",
  };
  return map[fieldKey] || fieldKey;
}

function showVerificationPanel() {
  document.getElementById("verificationPanel").style.display = "block";
  setVerificationNote("Sending your verification email...");
}

function showLoginOtpPanel() {
  document.getElementById("loginOtpPanel").style.display = "block";
  document.getElementById("loginOtpInput").value = "";
  setLoginOtpNote("Sending a verification code to your registered email. It expires in 2 minutes.");
}

function hideLoginOtpPanel() {
  let panel = document.getElementById("loginOtpPanel");
  if (panel) panel.style.display = "none";
  loginOtpChallenges = [];
  pendingLoginOtp = null;
}

function setForgotPasswordNote(text) {
  document.getElementById("forgotPasswordNote").textContent = text;
}

function showForgotPasswordPanel() {
  document.getElementById("forgotPasswordPanel").style.display = "block";
  document.getElementById("forgotPasswordRequestForm").style.display = "block";
  document.getElementById("forgotPasswordOtpForm").style.display = "none";
  document.getElementById("resetPasswordForm").style.display = "none";
  setForgotPasswordNote("Enter your username to receive a verification code at your registered email.");
  document.getElementById("forgotPasswordUsername").focus();
}

function hideForgotPasswordPanel() {
  document.getElementById("forgotPasswordPanel").style.display = "none";
  document.getElementById("forgotPasswordRequestForm").reset();
  document.getElementById("forgotPasswordOtpForm").reset();
  document.getElementById("resetPasswordForm").reset();
  pendingPasswordReset = null;
}

function handleForgotPasswordRequest(event) {
  event.preventDefault();
  let username = document.getElementById("forgotPasswordUsername").value.trim();
  let match = findAccountForPasswordReset(username);
  if (!match || !match.account.isActive || isBlank(match.account.email)) {
    showToast("No active account with a registered email was found.", "error");
    return;
  }

  pendingPasswordReset = {
    account: match.account,
    code: generateVerificationCode(),
    expiresAt: Date.now() + 120000,
    attempts: 0,
  };
  document.getElementById("forgotPasswordRequestForm").style.display = "none";
  document.getElementById("forgotPasswordOtpForm").style.display = "block";
  setForgotPasswordNote("Sending a verification code to your registered email. It expires in 2 minutes.");
  sendVerificationEmail(match.account.email, match.account.fullName || match.account.customerName, pendingPasswordReset.code, 2)
    .then(function () {
      setForgotPasswordNote("A verification code was sent to your registered email. It expires in 2 minutes.");
      showToast("Password reset code sent.", "success");
    })
    .catch(function (error) {
      setForgotPasswordNote(error.message + " Fallback development code: " + pendingPasswordReset.code);
      showToast("Email delivery failed; use the displayed development code.", "error");
    });
}

function handleForgotPasswordOtp(event) {
  event.preventDefault();
  if (!pendingPasswordReset) return;
  if (Date.now() >= pendingPasswordReset.expiresAt) {
    showToast("This verification code has expired. Request a new code.", "error");
    hideForgotPasswordPanel();
    return;
  }
  pendingPasswordReset.attempts++;
  if (pendingPasswordReset.attempts > 5) {
    showToast("Too many incorrect attempts. Request a new code.", "error");
    hideForgotPasswordPanel();
    return;
  }
  if (document.getElementById("forgotPasswordOtp").value.trim() !== pendingPasswordReset.code) {
    showToast("Incorrect verification code.", "error");
    return;
  }
  document.getElementById("forgotPasswordOtpForm").style.display = "none";
  document.getElementById("resetPasswordForm").style.display = "block";
  setForgotPasswordNote("Email verified. Enter and confirm your new password.");
}

function handlePasswordReset(event) {
  event.preventDefault();
  if (!pendingPasswordReset) return;
  let result = resetPasswordAfterOtp(
    pendingPasswordReset.account,
    document.getElementById("resetNewPassword").value,
    document.getElementById("resetConfirmPassword").value
  );
  if (!result.success) {
    showToast(result.message, "error");
    return;
  }
  hideForgotPasswordPanel();
  switchAuthTab("login");
  showToast("Password reset successfully. Please log in again.", "success");
  setTimeout(function () {
    window.location.href = "login-signup.html";
  }, 600);
}

function setLoginOtpNote(text) {
  document.getElementById("loginOtpNote").textContent = text;
}

function requestLoginOtp() {
  if (!pendingLoginOtp) return;

  let account = pendingLoginOtp.account;
  let actorType = pendingLoginOtp.actorType;

  let challenge = {
    challengeId: String(Date.now()) + Math.random().toString(36),
    account: account,
    actorType: actorType,
    code: generateVerificationCode(),
    expiresAt: Date.now() + 120000,
    attempts: 0
  };

  loginOtpChallenges = [challenge];
  pendingLoginOtp = challenge;

  sendVerificationEmail(
    account.email,
    account.fullName || account.customerName,
    challenge.code,
    2
  )
    .then(function () {
      setLoginOtpNote(
        "A verification code was sent to your registered email. It expires in 2 minutes."
      );

      showToast("Verification code sent.", "success");
    })
    .catch(function (error) {
      setLoginOtpNote(error.message);
      showToast(error.message, "error");
    });
}
function handleLoginOtpSubmit(event) {
  event.preventDefault();
  if (!pendingLoginOtp || !containsReference(loginOtpChallenges, pendingLoginOtp)) {
    showToast("Request a verification code first.", "error");
    return;
  }
  if (Date.now() >= pendingLoginOtp.expiresAt) {
    loginOtpChallenges = [];
    pendingLoginOtp = null;
    showToast("This verification code has expired. Request a new code.", "error");
    return;
  }
  pendingLoginOtp.attempts++;
  if (pendingLoginOtp.attempts > 5) {
    loginOtpChallenges = [];
    pendingLoginOtp = null;
    showToast("Too many incorrect attempts. Request a new code.", "error");
    return;
  }
  let code = document.getElementById("loginOtpInput").value.trim();
  if (code !== pendingLoginOtp.code) {
    showToast("Incorrect verification code.", "error");
    return;
  }
  let loginResult = completeLoginAfterOtp(
    pendingLoginOtp.account,
    pendingLoginOtp.actorType
  );

  if (!loginResult.success) {
    showToast(
      loginResult.message || "Unable to complete login.",
      "error"
    );
    return;
  }

  let welcomeName =
    loginResult.actorType === ACTOR_TYPES.STAFF
      ? loginResult.account.fullName
      : loginResult.account.customerName;

  loginOtpChallenges = [];
  hideLoginOtpPanel();

  showToast(
    "Welcome back, " + welcomeName + "!",
    "success"
  );

  setTimeout(function () {
    window.location.href = getDashboardUrlForCurrentUser();
  }, 600); loginOtpChallenges = [];
  hideLoginOtpPanel();
  showToast("Welcome back, " + welcomeName + "!", "success");
  setTimeout(function () { window.location.href = getDashboardUrlForCurrentUser(); }, 600);
}

// Kicks off the real EmailJS send and reflects the outcome in the panel.
// On failure (not configured yet, offline, bad keys, EmailJS quota, etc.)
// this falls back to showing the code on-screen so the flow is still
// demonstrable — see the header comment in emailService.js.
function sendVerificationEmailAndUpdatePanel(customerId) {
  triggerVerificationEmailForCustomer(customerId)
    .then(function () {
      let index = findIndexByField(customers, "customerId", customerId);
      let email = index === -1 ? "your email" : customers[index].email;
      showToast("Verification email sent to " + email + ".", "success");
      setVerificationNote("A verification code was emailed to " + email + ". Didn't get it? Use Resend Code below.");
    })
    .catch(function (error) {
      let index = findIndexByField(customers, "customerId", customerId);
      let fallbackCode = index === -1 ? "unavailable" : customers[index].emailVerificationToken;
      showToast("Couldn't send the email automatically — showing the code here instead.", "error");
      setVerificationNote(error.message + " Fallback development code: " + fallbackCode);
    });
}

function setVerificationNote(text) {
  let devNote = document.getElementById("devVerificationCode");
  if (devNote) devNote.textContent = text;
}

function hideVerificationPanel() {
  document.getElementById("verificationPanel").style.display = "none";
  pendingVerificationCustomerId = null;
}

function handleVerifySubmit(event) {
  event.preventDefault();
  if (pendingVerificationCustomerId === null) return;

  let enteredCode = document.getElementById("verificationCodeInput").value.trim();
  let result = verifyCustomerEmail(pendingVerificationCustomerId, enteredCode);

  if (!result.success) {
    showToast(result.message, "error");
    return;
  }

  showToast("Email verified! You can now log in.", "success");
  hideVerificationPanel();
  document.getElementById("verificationCodeInput").value = "";
}

function handleResendCode() {
  if (pendingVerificationCustomerId === null) return;
  let result = resendVerificationCode(pendingVerificationCustomerId);
  if (!result.success) {
    showToast(result.message, "error");
    return;
  }
  setVerificationNote("Sending a new verification email...");
  sendVerificationEmailAndUpdatePanel(pendingVerificationCustomerId);
}

function initLoginPage() {
  if (currentUser && currentActorType) {
    window.location.href = getDashboardUrlForCurrentUser();
    return;
  }

  document.getElementById("loginTabBtn").addEventListener("click", function () { switchAuthTab("login"); });
  document.getElementById("signupTabBtn").addEventListener("click", function () { switchAuthTab("signup"); });
  document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
  document.getElementById("loginOtpForm").addEventListener("submit", handleLoginOtpSubmit);
  document.getElementById("resendLoginOtpBtn").addEventListener("click", requestLoginOtp);
  document.getElementById("signupForm").addEventListener("submit", handleSignupSubmit);
  document.getElementById("signupContact").addEventListener("input", restrictContactNumberInput);
  document.getElementById("verifyForm").addEventListener("submit", handleVerifySubmit);
  document.getElementById("resendCodeBtn").addEventListener("click", handleResendCode);
  document.getElementById("forgotPasswordBtn").addEventListener("click", showForgotPasswordPanel);
  document.getElementById("cancelForgotPasswordBtn").addEventListener("click", hideForgotPasswordPanel);
  document.getElementById("forgotPasswordRequestForm").addEventListener("submit", handleForgotPasswordRequest);
  document.getElementById("forgotPasswordOtpForm").addEventListener("submit", handleForgotPasswordOtp);
  document.getElementById("resetPasswordForm").addEventListener("submit", handlePasswordReset);
}

document.addEventListener("DOMContentLoaded", initLoginPage);