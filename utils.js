// ============================================================================
// utils.js
// 4. UTILITY FUNCTIONS + 5. VALIDATION 
// ============================================================================

// ---------------------------------------------------------------------------
// PROTOTYPE password "hashing"
// This is NOT real cryptography. There is no backend in this project, so a
// genuine hashing algorithm (bcrypt, SHA-256, etc.) cannot be safely
// implemented or verified client-side. This is a simple, deterministic,
// non-reversible-looking transform ONLY so that:
//   (a) plaintext passwords are never stored directly in `passwordHash`, and
//   (b) the login flow has something real to compare against.
// Clearly label this as a classroom prototype during the defense — do not
// present it as production-grade security 
// ---------------------------------------------------------------------------
function simpleHashPlaceholder(plainText) {
  let hash = 5381; // djb2-style seed, manual implementation, no crypto libs
  for (let i = 0; i < plainText.length; i++) {
    let charCode = plainText.charCodeAt(i);
    hash = (hash * 33 + charCode) % 4294967296; // keep within 32-bit range
  }
  return "proto$" + hash.toString(16);
}

function verifyPasswordPlaceholder(plainText, storedHash) {
  return simpleHashPlaceholder(plainText) === storedHash;
}

// ---------------------------------------------------------------------------
// Manual ID generation — scans the array for the current highest ID and
// returns the next integer with a manual maximum scan.
// ---------------------------------------------------------------------------
function generateNextId(array, idFieldName) {
  let highest = 0;
  for (let i = 0; i < array.length; i++) {
    if (array[i][idFieldName] > highest) {
      highest = array[i][idFieldName];
    }
  }
  return highest + 1;
}

// ---------------------------------------------------------------------------
// Manual sequential search helpers.
// Each returns the array INDEX (or -1)
// ---------------------------------------------------------------------------
function findIndexByField(array, fieldName, value) {
  for (let i = 0; i < array.length; i++) {
    if (array[i][fieldName] === value) {
      return i;
    }
  }
  return -1;
}

// Case-insensitive variant, used for username/email lookups so
// "Anika@Example.com" and "anika@example.com" are treated as the same
// account when checking duplicates.
function findIndexByFieldCaseInsensitive(array, fieldName, value) {
  let target = String(value).toLowerCase();
  for (let i = 0; i < array.length; i++) {
    let current = array[i][fieldName];
    if (current !== null && current !== undefined && String(current).toLowerCase() === target) {
      return i;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Manual filtering — copies matching records into a fresh result array
// using a manual loop.
// ---------------------------------------------------------------------------
function filterByPredicate(array, predicateFn) {
  let results = [];
  let resultCount = 0;
  for (let i = 0; i < array.length; i++) {
    if (predicateFn(array[i])) {
      results[resultCount] = array[i];
      resultCount++;
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Manual case-insensitive substring search across a small set of text
// fields (used by Account Management's account search box).
// ---------------------------------------------------------------------------
function searchRecordsByKeyword(array, fieldNames, keyword) {
  let lowerKeyword = keyword.toLowerCase();
  let results = [];
  let resultCount = 0;
  for (let i = 0; i < array.length; i++) {
    let matched = false;
    for (let f = 0; f < fieldNames.length; f++) {
      let fieldValue = array[i][fieldNames[f]];
      if (fieldValue !== null && fieldValue !== undefined) {
        if (containsText(String(fieldValue).toLowerCase(), lowerKeyword) !== -1) {
          matched = true;
        }
      }
    }
    if (matched) {
      results[resultCount] = array[i];
      resultCount++;
    }
  }
  return results;
}

function containsText(haystack, needle) {
  if (needle.length === 0) return 0;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let matched = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack.charAt(i + j) !== needle.charAt(j)) {
        matched = false;
        break;
      }
    }
    if (matched) return i;
  }
  return -1;
}

function hasObjectProperties(object) {
  for (let propertyName in object) {
    return true;
  }
  return false;
}

function containsReference(array, target) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === target) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Manual Bubble Sort — sorts an array IN PLACE by a given field name.
// direction: "asc" | "desc". 
// ---------------------------------------------------------------------------
function bubbleSortByField(array, fieldName, direction) {
  let ascending = direction !== "desc";
  for (let i = 0; i < array.length - 1; i++) {
    for (let j = 0; j < array.length - 1 - i; j++) {
      let a = array[j][fieldName];
      let b = array[j + 1][fieldName];
      let shouldSwap = ascending ? a > b : a < b;
      if (shouldSwap) {
        let temporary = array[j];
        array[j] = array[j + 1];
        array[j + 1] = temporary;
      }
    }
  }
  return array;
}

// ---------------------------------------------------------------------------
// Manual insertion / deletion 
// ---------------------------------------------------------------------------
function insertRecord(array, newRecord) {
  array[array.length] = newRecord;
}

function deleteRecordAtIndex(array, deleteIndex) {
  if (deleteIndex < 0 || deleteIndex >= array.length) return false;
  for (let i = deleteIndex; i < array.length - 1; i++) {
    array[i] = array[i + 1];
  }
  array.length = array.length - 1;
  return true;
}

// ---------------------------------------------------------------------------
// Manual counting — used for suki detection / dashboard aggregates.
// ---------------------------------------------------------------------------
function countByPredicate(array, predicateFn) {
  let total = 0;
  for (let i = 0; i < array.length; i++) {
    if (predicateFn(array[i])) {
      total += 1;
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function isBlank(value) {
  return value === null || value === undefined || String(value).trim().length === 0;
}

function isValidEmailFormat(email) {
  // Manual character scan for one "@" with at least one "." after it and
  // characters on both sides — intentionally simple, no regex engine
  // internals relied upon beyond a single test() call, kept readable for
  // the defense.
  let atIndex = -1;
  let atCount = 0;
  for (let i = 0; i < email.length; i++) {
    if (email.charAt(i) === "@") {
      atIndex = i;
      atCount++;
    }
  }
  if (atCount !== 1) return false;
  if (atIndex <= 0 || atIndex >= email.length - 1) return false;

  let domainPart = email.substring(atIndex + 1);
  let dotFound = false;
  for (let i = 1; i < domainPart.length - 1; i++) {
    if (domainPart.charAt(i) === ".") {
      dotFound = true;
    }
  }
  return dotFound;
}

function generateVerificationCode() {
  // Six-digit development-only code. Not sent anywhere real — see the
  // email verification UI comment in auth.js.
  let code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

function nowIsoDateTime() {
  return new Date().toISOString();
}

function todayIsoDate() {
  let d = new Date();
  let year = d.getFullYear();
  let month = String(d.getMonth() + 1).length === 1 ? "0" + (d.getMonth() + 1) : String(d.getMonth() + 1);
  let day = String(d.getDate()).length === 1 ? "0" + d.getDate() : String(d.getDate());
  return year + "-" + month + "-" + day;
}

// ---------------------------------------------------------------------------
// Toast / inline message helper — shared by every page in this module set.
// Expects a container element with id="toastContainer" to exist in the DOM.
// ---------------------------------------------------------------------------
function showToast(message, type) {
  // type: "success" | "error"
  let container = document.getElementById("toastContainer");
  if (!container) return;

  let toast = document.createElement("div");
  toast.className = type === "error" ? "toast toast-error" : "toast toast-success";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(function () {
    if (toast.parentNode === container) {
      container.removeChild(toast);
    }
  }, 4000);
}

function setFieldError(inputId, message) {
  let errorEl = document.getElementById(inputId + "Error");
  let inputEl = document.getElementById(inputId);
  if (errorEl) errorEl.textContent = message || "";
  if (inputEl) {
    if (message) {
      inputEl.classList.add("input-invalid");
    } else {
      inputEl.classList.remove("input-invalid");
    }
  }
}

function clearFieldErrors(fieldIds) {
  for (let i = 0; i < fieldIds.length; i++) {
    setFieldError(fieldIds[i], "");
  }
}
