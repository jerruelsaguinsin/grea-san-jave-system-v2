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

  document.getElementById("currentUserLabel").textContent = currentUserLabel;
  document.getElementById("dashboardNav").href = getDashboardUrlForCurrentUser();
  document.getElementById("profileName").value = isStaff
    ? currentUser.fullName
    : currentUser.customerName;
  document.getElementById("profileUsername").value = currentUser.username;
  document.getElementById("profileEmail").value = currentUser.email || "";
  document.getElementById("profileMessenger").value = isStaff
    ? ""
    : currentUser.messengerHandle || "";
  document.getElementById("messengerGroup").style.display = isStaff
    ? "none"
    : "block";

  if (isStaff && currentUser.role === USER_ROLES.CO_OWNER) {
    document.getElementById("adminNav").style.display = "inline-block";
    document.getElementById("auditNav").style.display = "inline-block";
  }
  if (isStaff && currentUser.role === USER_ROLES.STAFF) {
    document.getElementById("customerNav").style.display = "inline-block";
  }

  document.getElementById("profileForm").addEventListener("submit", function (e) {
    e.preventDefault(); clearFieldErrors(["profileName", "profileUsername", "profileEmail"]);
    let result = updateOwnProfile({
      name: document.getElementById("profileName").value,
      username: document.getElementById("profileUsername").value,
      email: document.getElementById("profileEmail").value,
      messengerHandle: document.getElementById("profileMessenger").value,
    });

    if (!result.success) {
      if (result.errors) {
        let fieldNames = {
          name: "Name",
          username: "Username",
          email: "Email",
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

    showToast("Profile updated successfully.", "success");
    document.getElementById("currentUserLabel").textContent = isStaff
      ? currentUser.fullName +
        " (" +
        (currentUser.role === USER_ROLES.CO_OWNER ? "Co-Owner" : "Staff") +
        ")"
      : currentUser.customerName + " (Customer)";
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

    if (!currentUser.email || !isValidEmailFormat(currentUser.email)) {
      showToast("A registered email is required to change your password.", "error");
      return;
    }

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

  document.getElementById("logoutBtn").addEventListener("click", function () {
    logoutCurrentUser();
    window.location.href = "login-signup.html";
  });
}

document.addEventListener("DOMContentLoaded", initProfilePage);
