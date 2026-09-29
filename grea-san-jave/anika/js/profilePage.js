function profileGuard() {
  if (!currentUser || !currentActorType) {
    window.location.href = "login-signup.html";
    return false;
  }
  if (
    currentActorType === ACTOR_TYPES.STAFF &&
    currentUser.mustChangePassword === true
  ) {
    window.location.href = "change-password.html";
    return false;
  }
  return true;
}

function initProfilePage() {
  if (!profileGuard()) return;

  let isStaff = currentActorType === ACTOR_TYPES.STAFF;
  let currentUserLabel = isStaff
    ? currentUser.fullName +
      " (" +
      (currentUser.role === USER_ROLES.CO_OWNER ? "Co-Owner" : "Staff") +
      ")"
    : currentUser.customerName + " (Customer)";

  let currentUserLabelElement = document.getElementById("currentUserLabel");
  if (currentUserLabelElement) currentUserLabelElement.textContent = currentUserLabel;
  let dashboardNav = document.getElementById("dashboardNav");
  if (dashboardNav) dashboardNav.href = getDashboardUrlForCurrentUser();
  document.getElementById("profileName").value = isStaff
    ? currentUser.fullName
    : currentUser.customerName;
  document.getElementById("profileUsername").value = currentUser.username;
  document.getElementById("profileEmail").value = currentUser.email || "";
  document.getElementById("profileEmail").required = isStaff;
  document.getElementById("profileEmailHint").hidden = isStaff;
  document.getElementById("contactNumberGroup").hidden = isStaff;
  if (!isStaff) {
    document.getElementById("profileContactNumber").value = currentUser.contactNumber || "";
  }
  document.getElementById("profileMessenger").value = isStaff
    ? ""
    : currentUser.messengerHandle || "";
  document.getElementById("messengerGroup").style.display = isStaff
    ? "none"
    : "block";

  let customerAccountSummary = document.getElementById("customerAccountSummary");
  if (customerAccountSummary) {
    customerAccountSummary.hidden = isStaff;
    if (!isStaff) {
      document.getElementById("profileMembershipStatus").textContent = currentUser.isRegular
        ? "Suki customer"
        : "Standard customer";
      document.getElementById("profileEmailStatus").textContent = isBlank(currentUser.email)
        ? "No email on file"
        : currentUser.isEmailVerified
          ? "Verified"
          : "Not verified";
      document.getElementById("profileRegisteredDate").textContent = currentUser.dateRegistered || "—";
    }
  }

  if (isStaff && currentUser.role === USER_ROLES.CO_OWNER) {
    let adminNav = document.getElementById("adminNav");
    let auditNav = document.getElementById("auditNav");
    if (adminNav) adminNav.style.display = "inline-block";
    if (auditNav) auditNav.style.display = "inline-block";
  }
  if (isStaff && currentUser.role === USER_ROLES.STAFF) {
    let customerNav = document.getElementById("customerNav");
    if (customerNav) customerNav.style.display = "inline-block";
  }

  document.getElementById("profileForm").addEventListener("submit", function (e) {
    e.preventDefault();
    clearFieldErrors(["profileName", "profileUsername", "profileEmail", "profileContactNumber"]);
    let result = updateOwnProfile({
      name: document.getElementById("profileName").value,
      username: document.getElementById("profileUsername").value,
      email: document.getElementById("profileEmail").value,
      contactNumber: isStaff ? "" : document.getElementById("profileContactNumber").value,
      messengerHandle: document.getElementById("profileMessenger").value,
    });

    if (!result.success) {
      if (result.errors) {
        let fieldNames = {
          name: "Name",
          username: "Username",
          email: "Email",
          contactNumber: "ContactNumber",
          messengerHandle: "Messenger",
        };
        for (let field in result.errors) {
          setFieldError(
            "profile" + (fieldNames[field] || field),
            result.errors[field]
          );
        }
      } else {
        showToast(result.message, "error");
      }
      return;
    }

    showToast(
      result.emailChanged && !isBlank(currentUser.email)
        ? "Profile saved. Verify your updated email the next time you sign in."
        : "Profile updated successfully.",
      "success"
    );
    if (currentUserLabelElement) {
      currentUserLabelElement.textContent = isStaff
        ? currentUser.fullName +
          " (" +
          (currentUser.role === USER_ROLES.CO_OWNER ? "Co-Owner" : "Staff") +
          ")"
        : currentUser.customerName + " (Customer)";
    }
    if (!isStaff) {
      document.getElementById("profileEmailHint").textContent =
        result.emailChanged && !isBlank(currentUser.email)
          ? "Verify this address the next time you sign in."
          : "Optional for customer accounts.";
      document.getElementById("profileMembershipStatus").textContent = currentUser.isRegular
        ? "Suki customer"
        : "Standard customer";
      document.getElementById("profileEmailStatus").textContent = isBlank(currentUser.email)
        ? "No email on file"
        : currentUser.isEmailVerified
          ? "Verified"
          : "Not verified";
    }
  });

  let pendingPasswordChange = null;

  function setPasswordOtpNote(text) {
    document.getElementById("passwordOtpNote").textContent = text;
  }

  function hidePasswordOtpPanel() {
    document.getElementById("passwordOtpPanel").style.display = "none";
    document.getElementById("passwordOtpForm").reset();
    pendingPasswordChange = null;
  }

  document.getElementById("passwordForm").addEventListener("submit", function (e) {
    e.preventDefault();
    let currentPassword = document.getElementById("currentPassword").value;
    let newPassword = document.getElementById("newPassword").value;
    let confirmPassword = document.getElementById("confirmPassword").value;
    let validation = validateOwnPasswordChange(
      currentPassword,
      newPassword,
      confirmPassword
    );
    if (!validation.success) {
      showToast(validation.message, "error");
      return;
    }

    if (isBlank(currentUser.email)) {
      let result = changeOwnPassword(currentPassword, newPassword, confirmPassword);
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      document.getElementById("passwordForm").reset();
      showToast("Password changed successfully.", "success");
      return;
    }
    if (!isValidEmailFormat(currentUser.email)) {
      showToast("Add a valid email to receive password verification codes.", "error");
      return;
    }

    pendingPasswordChange = {
      currentPassword: currentPassword,
      newPassword: newPassword,
      confirmPassword: confirmPassword,
      code: generateVerificationCode(),
      expiresAt: Date.now() + 120000,
      attempts: 0,
    };
    document.getElementById("passwordOtpPanel").style.display = "block";
    document.getElementById("passwordOtpInput").focus();
    setPasswordOtpNote("Sending a verification code to your registered email. It expires in 2 minutes.");

    sendVerificationEmail(
      currentUser.email,
      currentUser.fullName || currentUser.customerName,
      pendingPasswordChange.code,
      2
    )
      .then(function () {
        setPasswordOtpNote("A verification code was sent to your registered email. It expires in 2 minutes.");
        showToast("Password change verification code sent.", "success");
      })
      .catch(function (error) {
        setPasswordOtpNote(
          error.message + " Fallback development code: " + pendingPasswordChange.code
        );
        showToast("Email delivery failed; use the displayed development code.", "error");
      });
  });

  document.getElementById("passwordOtpForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!pendingPasswordChange) return;

    if (Date.now() >= pendingPasswordChange.expiresAt) {
      hidePasswordOtpPanel();
      showToast("This verification code has expired. Try changing your password again.", "error");
      return;
    }

    pendingPasswordChange.attempts++;
    if (pendingPasswordChange.attempts > 5) {
      hidePasswordOtpPanel();
      showToast("Too many incorrect attempts. Try changing your password again.", "error");
      return;
    }

    let enteredCode = document.getElementById("passwordOtpInput").value.trim();
    if (enteredCode !== pendingPasswordChange.code) {
      showToast("Incorrect verification code.", "error");
      return;
    }

    let result = changeOwnPassword(
      pendingPasswordChange.currentPassword,
      pendingPasswordChange.newPassword,
      pendingPasswordChange.confirmPassword
    );
    if (!result.success) {
      hidePasswordOtpPanel();
      showToast(result.message, "error");
      return;
    }

    hidePasswordOtpPanel();
    document.getElementById("passwordForm").reset();
    showToast("Password changed successfully.", "success");
  });

  document.getElementById("cancelPasswordOtpBtn").addEventListener("click", function () {
    hidePasswordOtpPanel();
  });

  let profileLogoutButton = document.getElementById("logoutBtn");
  if (profileLogoutButton) {
    profileLogoutButton.addEventListener("click", function () {
      logoutCurrentUser();
      window.location.href = "login-signup.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  if (document.getElementById("profileForm")) initProfilePage();
});
