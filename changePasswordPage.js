function initChangePasswordPage() {
  if (!currentUser || currentActorType !== ACTOR_TYPES.STAFF) {
    window.location.href = "login-signup.html";
    return;
  }

  if (currentUser.mustChangePassword !== true) {
    window.location.href = getDashboardUrlForCurrentUser();
    return;
  }

  document
    .getElementById("forcedPasswordForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();

      let r = forceSetNewStaffPassword(
        document.getElementById("temporaryPassword").value,
        document.getElementById("forcedNewPassword").value,
        document.getElementById("forcedConfirmPassword").value
      );

      if (!r.success) {
        showToast(r.message, "error");
        return;
      }

      showToast("Password changed. Redirecting to your dashboard...", "success");
      setTimeout(function () {
        window.location.href = getDashboardUrlForCurrentUser();
      }, 500);
    });

  document
    .getElementById("forcedLogoutBtn")
    .addEventListener("click", function () {
      logoutCurrentUser();
      window.location.href = "login-signup.html";
    });
}

document.addEventListener("DOMContentLoaded", initChangePasswordPage);
