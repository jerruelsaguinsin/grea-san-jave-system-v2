// order-placement-page.js — Module 14 (Customer Order Placement)
// Same style as the customer home page: globals from constants.js, currentUser,
// guardCustomerDashboard, showToast. No built-in array methods (push, map, filter,
// join, forEach, Object.values...): only for loops and index assignment.

let placementFiles = [];
let placementProof = null;
let placementAnalysisVersion = 0;
let placementPageCountEdited = false;
let placementPaperSizeEdited = false;
let placementPromotions = [];

function getDefaultPlacementPromotions() {
  return [
    {
      promoId: 1,
      promoType: PROMO_TYPES.SEASONAL_PROMO,
      description: "Exam week rush — 10% off all rush orders",
      discountType: DISCOUNT_TYPE.PERCENTAGE,
      discountValue: 10,
      eligibility: PROMO_ELIGIBILITY.ALL_CUSTOMERS,
      startDate: "2026-09-01",
      endDate: "2026-10-15",
      isActive: true,
    },
    {
      promoId: 2,
      promoType: PROMO_TYPES.REGULAR_CUSTOMER_DISCOUNT,
      description: "Suki appreciation — ₱50 off any order",
      discountType: DISCOUNT_TYPE.FIXED_AMOUNT,
      discountValue: 50,
      eligibility: PROMO_ELIGIBILITY.SUKI_ONLY,
      startDate: "2026-08-01",
      endDate: "2026-08-31",
      isActive: true,
    },
  ];
}

function loadPlacementPromotions() {
  try {
    let storedPromotions = localStorage.getItem("gsj_promotions");
    if (storedPromotions === null) {
      placementPromotions = getDefaultPlacementPromotions();
      localStorage.setItem("gsj_promotions", JSON.stringify(placementPromotions));
    } else {
      let parsedPromotions = JSON.parse(storedPromotions);
      placementPromotions = Array.isArray(parsedPromotions) ? parsedPromotions : [];
    }
  } catch (error) {
    placementPromotions = getDefaultPlacementPromotions();
  }
}

function isPromotionCurrent(promotion) {
  let today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth() + 1;
  let day = today.getDate();
  let todayIso = year + "-" + (month < 10 ? "0" : "") + month + "-" + (day < 10 ? "0" : "") + day;
  return promotion.isActive === true && promotion.startDate <= todayIso && promotion.endDate >= todayIso;
}

function isPromotionEligible(promotion) {
  if (!isPromotionCurrent(promotion)) return false;
  if (promotion.eligibility === PROMO_ELIGIBILITY.ALL_CUSTOMERS) return true;
  if (promotion.eligibility === PROMO_ELIGIBILITY.SUKI_ONLY) {
    return currentUser.isRegular === true;
  }
  if (promotion.eligibility === PROMO_ELIGIBILITY.BULK_ORDER_ONLY) {
    return Number(document.getElementById("orderCopies").value) > 1;
  }
  return false;
}

function promotionDiscountLabel(promotion) {
  if (promotion.discountType === DISCOUNT_TYPE.PERCENTAGE) {
    return promotion.discountValue + "% off";
  }
  return "₱" + Number(promotion.discountValue).toFixed(2) + " off";
}

function renderEligiblePromotions() {
  let select = document.getElementById("orderPromo");
  let hint = document.getElementById("orderPromoHint");
  let previousPromoId = select.value;
  let selectedStillEligible = false;
  select.innerHTML = '<option value="">No promotion</option>';

  let eligibleCount = 0;
  for (let i = 0; i < placementPromotions.length; i++) {
    let promotion = placementPromotions[i];
    if (!isPromotionEligible(promotion)) continue;

    let option = document.createElement("option");
    option.value = String(promotion.promoId);
    option.textContent = promotion.description + " (" + promotionDiscountLabel(promotion) + ")";
    select.appendChild(option);
    eligibleCount++;
    if (option.value === previousPromoId) selectedStillEligible = true;
  }

  select.value = selectedStillEligible ? previousPromoId : "";
  hint.textContent = eligibleCount === 0
    ? "No promotions are currently eligible for this order."
    : "Only active promotions eligible for your account and order are shown.";
}

function getSelectedPromotion() {
  let selectedId = document.getElementById("orderPromo").value;
  if (selectedId === "") return null;
  for (let i = 0; i < placementPromotions.length; i++) {
    if (
      String(placementPromotions[i].promoId) === selectedId &&
      isPromotionEligible(placementPromotions[i])
    ) {
      return placementPromotions[i];
    }
  }
  return null;
}

function calculatePromotionDiscount(promotion, baseTotal) {
  if (!promotion) return 0;
  let discount = promotion.discountType === DISCOUNT_TYPE.PERCENTAGE
    ? baseTotal * Number(promotion.discountValue) / 100
    : Number(promotion.discountValue);
  discount = Math.min(baseTotal, Math.max(0, discount));
  return Math.round(discount * 100) / 100;
}

function fillSelectFromConstants(selectId, constantsObject) {
  let select = document.getElementById(selectId);
  select.innerHTML = "";
  for (let key in constantsObject) {
    let option = document.createElement("option");
    option.value = constantsObject[key];
    option.textContent = constantsObject[key];
    select.appendChild(option);
  }
}

function fillColorTierOptions() {
  let select = document.getElementById("orderColorTier");
  select.innerHTML = "";
  for (let key in COLOR_TIERS) {
    let tier = COLOR_TIERS[key];
    let option = document.createElement("option");
    option.value = tier;
    option.textContent = tier + " — ₱" + PRICE_PER_PAGE[tier] + " / page";
    select.appendChild(option);
  }
}

function refreshBindingOptions() {
  let serviceType = document.getElementById("orderServiceType").value;
  let select = document.getElementById("orderBinding");
  let choices =
    serviceType === SERVICE_TYPES.BOOKBINDING
      ? [SERVICE_OPTIONS.SPIRAL_BINDING, SERVICE_OPTIONS.PERFECT_BINDING]
      : [SERVICE_OPTIONS.NONE, SERVICE_OPTIONS.LAMINATION];
  select.innerHTML = "";
  for (let i = 0; i < choices.length; i++) {
    let option = document.createElement("option");
    option.value = choices[i];
    option.textContent = choices[i] === SERVICE_OPTIONS.NONE ? "No add-on" : choices[i];
    select.appendChild(option);
  }
}

function refreshPaymentProofField() {
  let isCash = document.getElementById("orderPaymentMethod").value === PAYMENT_METHODS.CASH;
  document.getElementById("orderProofWrap").hidden = isCash;
  document.getElementById("orderCashHint").hidden = !isCash;
}

function updateOrderEstimate() {
  let pages = Number(document.getElementById("orderPages").value);
  let copies = Number(document.getElementById("orderCopies").value);
  let colorTier = document.getElementById("orderColorTier").value;
  if (!Number.isInteger(pages) || pages < 1) pages = 0;
  if (!Number.isInteger(copies) || copies < 1) copies = 0;
  let pricePerPage = PRICE_PER_PAGE[colorTier];
  let baseTotal = pages * copies * pricePerPage;
  let selectedPromotion = getSelectedPromotion();
  let discountAmount = calculatePromotionDiscount(selectedPromotion, baseTotal);
  let total = baseTotal - discountAmount;
  document.getElementById("orderEstimateTotal").textContent = "₱" + total.toFixed(2);
  let detail = pages + " pages × " + copies + (copies === 1 ? " copy" : " copies") + " × ₱" + pricePerPage + " (" + colorTier + ")";
  if (selectedPromotion) {
    detail += " · " + selectedPromotion.description + ": −₱" + discountAmount.toFixed(2);
  }
  document.getElementById("orderEstimateDetail").textContent = detail;
}

function renderPlacementFiles() {
  let list = document.getElementById("orderFileList");
  list.innerHTML = "";
  for (let i = 0; i < placementFiles.length; i++) {
    let item = document.createElement("li");
    let name = document.createElement("span");
    name.textContent = placementFiles[i].name + " ";
    let removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", function () {
      let kept = [];
      for (let j = 0; j < placementFiles.length; j++) {
        if (j !== i) kept[kept.length] = placementFiles[j];
      }
      placementFiles = kept;
      renderPlacementFiles();
      analyzePlacementFiles();
    });
    item.appendChild(name);
    item.appendChild(removeBtn);
    list.appendChild(item);
  }
}

function getPdfPaperSize(width, height) {
  let shortSide = Math.min(width, height);
  let longSide = Math.max(width, height);
  let standardSizes = [
    { name: "A4", shortSide: 595.28, longSide: 841.89 },
    { name: "A3", shortSide: 841.89, longSide: 1190.55 },
    { name: "Short", shortSide: 612, longSide: 792 },
    { name: "Long", shortSide: 612, longSide: 936 },
    { name: "Legal", shortSide: 612, longSide: 1008 },
    { name: "Tabloid", shortSide: 792, longSide: 1224 },
  ];

  for (let i = 0; i < standardSizes.length; i++) {
    if (
      Math.abs(shortSide - standardSizes[i].shortSide) <= 3 &&
      Math.abs(longSide - standardSizes[i].longSide) <= 3
    ) {
      return standardSizes[i].name;
    }
  }

  return "Custom (" + (shortSide / 72).toFixed(1) + " x " + (longSide / 72).toFixed(1) + " in)";
}

async function analyzePlacementFiles() {
  let analysisVersion = ++placementAnalysisVersion;
  let pageField = document.getElementById("orderPages");
  let paperSizeField = document.getElementById("orderPaperSize");
  let analysisMessage = document.getElementById("orderFileAnalysis");

  if (placementFiles.length === 0) {
    if (!placementPageCountEdited) pageField.value = "";
    if (!placementPaperSizeEdited) paperSizeField.value = "";
    analysisMessage.textContent = "Page count and paper size will be detected from your PDFs. You can edit either value.";
    updateOrderEstimate();
    return;
  }

  if (typeof pdfjsLib === "undefined") {
    analysisMessage.textContent = "PDF detection is unavailable. Enter the page count and paper size manually.";
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  analysisMessage.textContent = "Reading PDF pages...";

  let totalPages = 0;
  let detectedPaperSize = "";
  let mixedPaperSizes = false;

  try {
    for (let fileIndex = 0; fileIndex < placementFiles.length; fileIndex++) {
      let pdfDocument = await pdfjsLib.getDocument({
        data: new Uint8Array(await placementFiles[fileIndex].arrayBuffer()),
      }).promise;

      totalPages += pdfDocument.numPages;

      for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
        if (analysisVersion !== placementAnalysisVersion) {
          await pdfDocument.destroy();
          return;
        }

        let page = await pdfDocument.getPage(pageNumber);
        let viewport = page.getViewport({ scale: 1 });
        let pagePaperSize = getPdfPaperSize(viewport.width, viewport.height);
        if (detectedPaperSize === "") {
          detectedPaperSize = pagePaperSize;
        } else if (detectedPaperSize !== pagePaperSize) {
          mixedPaperSizes = true;
        }
        page.cleanup();
      }

      await pdfDocument.destroy();
    }

    if (analysisVersion !== placementAnalysisVersion) return;

    let updatedFieldSummary = "";
    if (!placementPageCountEdited) {
      pageField.value = totalPages;
      updatedFieldSummary = "page count";
    }
    if (!placementPaperSizeEdited) {
      paperSizeField.value = mixedPaperSizes ? "Mixed sizes" : detectedPaperSize;
      updatedFieldSummary += (updatedFieldSummary === "" ? "" : " and ") + "paper size";
    }

    let sizeDescription = mixedPaperSizes ? "mixed page sizes" : detectedPaperSize;
    let detectionSummary = "Detected " + totalPages + " page(s), " + sizeDescription + ". ";
    if (updatedFieldSummary !== "") {
      detectionSummary += "Updated " + updatedFieldSummary + "; both remain editable.";
    } else {
      detectionSummary += "Your manually entered values were kept.";
    }
    analysisMessage.textContent = detectionSummary;
    updateOrderEstimate();
  } catch (error) {
    if (analysisVersion !== placementAnalysisVersion) return;
    if (!placementPageCountEdited) pageField.value = "";
    if (!placementPaperSizeEdited) paperSizeField.value = "";
    updateOrderEstimate();
    analysisMessage.textContent =
      "Could not read a PDF. Check that the file is not damaged or password-protected, then enter the page count and paper size manually.";
  }
}

function handleOrderFilesChange(event) {
  let picked = event.target.files;
  let rejectedFiles = 0;
  for (let i = 0; i < picked.length; i++) {
    let fileName = picked[i].name.toLowerCase();
    if (picked[i].type === "application/pdf" || fileName.slice(-4) === ".pdf") {
      placementFiles[placementFiles.length] = picked[i];
    } else {
      rejectedFiles++;
    }
  }
  event.target.value = "";
  if (rejectedFiles > 0) {
    showToast("Only PDF files can be added to an order.", "error");
  }
  renderPlacementFiles();
  analyzePlacementFiles();
}

function handleOrderProofChange(event) {
  placementProof = event.target.files.length > 0 ? event.target.files[0] : null;
}

function loadPlacementOrders() {
  try {
    let stored = sessionStorage.getItem("gsj_mock_orders");
    return stored === null ? [] : JSON.parse(stored);
  } catch (e) {
    return [];
  }
}

function handleOrderPlacementSubmit(event) {
  event.preventDefault();
  let subject = document.getElementById("orderSubject").value.trim();
  let paperSize = document.getElementById("orderPaperSize").value.trim();
  let pages = Number(document.getElementById("orderPages").value);
  let copies = Number(document.getElementById("orderCopies").value);
  let paymentMethod = document.getElementById("orderPaymentMethod").value;
  renderEligiblePromotions();

  if (placementFiles.length === 0) {
    showToast("Upload at least one file.", "error");
    return;
  }
  if (subject === "") {
    showToast("Add a subject, e.g. Thesis printing.", "error");
    return;
  }
  if (paperSize === "") {
    showToast("Enter the paper size.", "error");
    return;
  }
  if (!Number.isInteger(pages) || pages < 1 || !Number.isInteger(copies) || copies < 1) {
    showToast("Enter a valid number of pages and copies.", "error");
    return;
  }
  if (paymentMethod !== PAYMENT_METHODS.CASH && placementProof === null) {
    showToast("Upload your " + paymentMethod + " proof of payment.", "error");
    return;
  }

  let fileNames = "";
  for (let i = 0; i < placementFiles.length; i++) {
    fileNames += (i === 0 ? "" : ", ") + placementFiles[i].name;
  }

  let colorTier = document.getElementById("orderColorTier").value;
  let binding = document.getElementById("orderBinding").value;
  let pricePerPage = PRICE_PER_PAGE[colorTier];
  let baseTotalPrice = pages * copies * pricePerPage;
  let selectedPromotion = getSelectedPromotion();
  let discountAmount = calculatePromotionDiscount(selectedPromotion, baseTotalPrice);
  let now = new Date().toISOString();

  let orders = loadPlacementOrders();
  let orderId = "GSJ-" + (orders.length + 1001);
  let newOrder = {
    orderId: orderId,
    customerId: currentUser.customerId,
    customerName: currentUser.customerName,
    fileName: fileNames,
    fileChannel: ORDER_CHANNELS.CUSTOMER_PORTAL,
    fileCount: placementFiles.length,
    subject: subject,
    notes: document.getElementById("orderNotes").value.trim(),
    fileDisposed: false,
    dateDisposed: null,
    serviceType: document.getElementById("orderServiceType").value,
    serviceOption: binding,
    paperSize: paperSize,
    pages: pages,
    copies: copies,
    colorTier: colorTier,
    isRush: document.getElementById("orderRush").checked,
    queueType: QUEUE_TYPES.ADVANCE,
    priorityLevel: null,
    pricePerPage: pricePerPage,
    baseTotalPrice: baseTotalPrice,
    promoId: selectedPromotion === null ? null : selectedPromotion.promoId,
    discountAmount: discountAmount,
    totalPrice: baseTotalPrice - discountAmount,
    requiresDownPayment: false,
    downPaymentAmount: 0,
    paymentMethod: paymentMethod,
    paymentStatus: PAYMENT_STATUS.PENDING,
    proofOfPaymentFile: placementProof === null ? null : placementProof.name,
    status: ORDER_STATUS.QUEUED,
    dateAdded: now,
    dateCompleted: null,
    unclaimedReason: null,
    daysUnclaimed: null,
    // kept so the existing home page order list can render this order unchanged
    binding: binding,
    createdAt: now,
  };
  orders[orders.length] = newOrder;
  try {
    sessionStorage.setItem("gsj_mock_orders", JSON.stringify(orders));
  } catch (e) {
    // The page still works for this visit if sessionStorage is unavailable.
  }

  // TODO: log ACTION_TYPES.ORDER_SUBMITTED (Module 3) and fire NOTIFICATION_TYPES.NEW_ORDER /
  // RUSH_ORDER (Module 16) here, using your existing activity-log and notification functions.

  document.getElementById("customerOrderForm").reset();
  document.getElementById("orderCopies").value = "1";
  placementFiles = [];
  placementAnalysisVersion++;
  placementPageCountEdited = false;
  placementPaperSizeEdited = false;
  placementProof = null;
  renderPlacementFiles();
  refreshBindingOptions();
  refreshPaymentProofField();
  renderEligiblePromotions();
  updateOrderEstimate();
  showToast("Order " + orderId + " placed successfully.", "success");
}

function initOrderPlacement() {
  if (!guardCustomerDashboard()) {
    return;
  }

  fillSelectFromConstants("orderServiceType", SERVICE_TYPES);
  fillColorTierOptions();
  fillSelectFromConstants("orderPaymentMethod", PAYMENT_METHODS);
  loadPlacementPromotions();
  refreshBindingOptions();
  refreshPaymentProofField();
  renderEligiblePromotions();
  updateOrderEstimate();

  document.getElementById("orderServiceType").addEventListener("change", refreshBindingOptions);
  document.getElementById("orderPaymentMethod").addEventListener("change", function () {
    placementProof = null;
    document.getElementById("orderProofFile").value = "";
    refreshPaymentProofField();
  });
  document.getElementById("orderPages").addEventListener("input", updateOrderEstimate);
  document.getElementById("orderPages").addEventListener("input", function () {
    placementPageCountEdited = true;
  });
  document.getElementById("orderPaperSize").addEventListener("input", function () {
    placementPaperSizeEdited = true;
  });
  document.getElementById("orderCopies").addEventListener("input", function () {
    renderEligiblePromotions();
    updateOrderEstimate();
  });
  document.getElementById("orderColorTier").addEventListener("change", updateOrderEstimate);
  document.getElementById("orderPromo").addEventListener("change", updateOrderEstimate);
  document.getElementById("orderFiles").addEventListener("change", handleOrderFilesChange);
  document.getElementById("orderProofFile").addEventListener("change", handleOrderProofChange);
  document.getElementById("customerOrderForm").addEventListener("submit", handleOrderPlacementSubmit);
}

document.addEventListener("DOMContentLoaded", initOrderPlacement);
