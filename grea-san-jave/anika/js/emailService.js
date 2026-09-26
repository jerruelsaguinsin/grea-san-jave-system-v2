// EmailJS configuration. These values are safe to expose in browser code.
const EMAILJS_PUBLIC_KEY = "K3uz49B6Yju80pPL_";
const EMAILJS_SERVICE_ID = "service_3z5qrw6";
const EMAILJS_TEMPLATE_ID = "template_7a2yr1r";

let emailServiceReady = false;

function initializeEmailService() {
  if (typeof emailjs === "undefined") return false;
  if (containsText(EMAILJS_PUBLIC_KEY, "replace-with-") === 0) return false;
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
  emailServiceReady = true;
  return true;
}

function sendVerificationEmail(email, name, code, expiresInMinutes) {
  if (!emailServiceReady && !initializeEmailService()) {
    return Promise.reject(new Error("EmailJS is not configured. Add the EmailJS public key, service ID, and template ID."));
  }
  return emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: email,
    to_name: name || "there",
    otp_code: code,
    expires_in_minutes: expiresInMinutes || 2,
  });
}
