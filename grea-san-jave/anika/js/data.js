// ============================================================================
// data.js
// 2. SHARED ARRAYS + 3. CURRENT USER  (see js organization list)
// isActive: Boolean is a flagged schema addition — see the ACCOUNT_STATUS
// comment in constants.js.
// ============================================================================

// ----- User (staff / co-owner) records -----
let users = [
  {
    userId: 1,
    fullName: "Margie Sarmiento",
    username: "grea.owner",
    email: "jerruelsaguinsin@gmail.com",
    // PROTOTYPE hash of "Owner123!" via simpleHash() in utils.js — never a
    // real password store, see utils.js header comment.
    passwordHash: simpleHashPlaceholder("Owner123!"),
    role: USER_ROLES.CO_OWNER,
    assignedDuty: DUTY_ASSIGNMENT.RUSH,
    dateCreated: "2026-01-05",
    isActive: true,
    mustChangePassword: false,
  },
  {
    userId: 2,
    fullName: "Javier San Pedro",
    username: "jave.owner",
    email: "nekahbei@gmail.com",
    passwordHash: simpleHashPlaceholder("Owner123!"),
    role: USER_ROLES.CO_OWNER,
    assignedDuty: DUTY_ASSIGNMENT.WALK_IN,
    dateCreated: "2026-01-05",
    isActive: true,
    mustChangePassword: false,
  },
  {
    userId: 3,
    fullName: "Marites Cruz",
    username: "marites.staff",
    email: "abtrzmrsgn@gmail.com",
    passwordHash: simpleHashPlaceholder("Staff123!"),
    role: USER_ROLES.STAFF,
    assignedDuty: DUTY_ASSIGNMENT.BOTH,
    dateCreated: "2026-02-10",
    isActive: true,
    mustChangePassword: false,
  },
];

// ----- Customer records -----
let customers = [
  {
    customerId: 1,
    customerName: "Marie Dizon",
    contactNumber: "09171234567",
    email: "jerruelsaguinsin@gmail.com",
    messengerHandle: "marie.dizon",
    username: "marie.customer",
    passwordHash: simpleHashPlaceholder("Customer123!"),
    isRegular: true,
    isEmailVerified: true,
    emailVerificationToken: null,
    dateRegistered: "2026-02-01",
    isActive: true,
  },
  {
    customerId: 2,
    customerName: "Ben Torres",
    contactNumber: "09989876543",
    email: "ben.torres@gmail.com",
    messengerHandle: "",
    username: "ben.customer",
    passwordHash: simpleHashPlaceholder("Customer123!"),
    isRegular: false,
    isEmailVerified: false,
    emailVerificationToken: "482913",
    dateRegistered: "2026-09-20",
    isActive: true,
  },
];

// Keep the demo's newly completed order inside the three-day claiming window.
let sampleReadyOrderDateAdded = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
let sampleReadyOrderDateCompleted = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

// ----- Sample Order records for Marie Dizon -----
let sampleOrders = [
  {
    orderId: 5001,
    customerId: 1,
    customerName: "Marie Dizon",
    fileName: "thesis-chapters-1-3.pdf",
    fileChannel: ORDER_CHANNELS.CUSTOMER_PORTAL,
    fileCount: 1,
    subject: "Thesis Chapters 1-3",
    notes: "Double-sided printing.",
    fileDisposed: false,
    dateDisposed: null,
    serviceType: SERVICE_TYPES.DOCUMENT_PRINTING,
    serviceOption: SERVICE_OPTIONS.NONE,
    paperSize: "A4",
    pages: 42,
    copies: 2,
    colorTier: COLOR_TIERS.BLACK_TEXT,
    isRush: false,
    queueType: QUEUE_TYPES.ADVANCE,
    priorityLevel: PRIORITY_LEVEL.LOW,
    pricePerPage: PRICE_PER_PAGE[COLOR_TIERS.BLACK_TEXT],
    baseTotalPrice: 252,
    promoId: null,
    discountAmount: 0,
    totalPrice: 252,
    requiresDownPayment: false,
    downPaymentAmount: 0,
    paymentMethod: PAYMENT_METHODS.CASH,
    paymentStatus: PAYMENT_STATUS.PENDING,
    proofOfPaymentFile: null,
    status: ORDER_STATUS.QUEUED,
    dateAdded: "2026-09-28T09:15:00.000Z",
    dateCompleted: null,
    unclaimedReason: null,
    daysUnclaimed: null,
    createdAt: "2026-09-28T09:15:00.000Z",
    binding: SERVICE_OPTIONS.NONE,
  },
  {
    orderId: 5002,
    customerId: 1,
    customerName: "Marie Dizon",
    fileName: "event-program.pdf",
    fileChannel: ORDER_CHANNELS.CUSTOMER_PORTAL,
    fileCount: 1,
    subject: "Event Program",
    notes: "Please keep the pages in order.",
    fileDisposed: false,
    dateDisposed: null,
    serviceType: SERVICE_TYPES.DOCUMENT_PRINTING,
    serviceOption: SERVICE_OPTIONS.LAMINATION,
    paperSize: "Short",
    pages: 8,
    copies: 5,
    colorTier: COLOR_TIERS.FULL_COLOR,
    isRush: true,
    queueType: QUEUE_TYPES.ADVANCE,
    priorityLevel: PRIORITY_LEVEL.HIGH,
    pricePerPage: PRICE_PER_PAGE[COLOR_TIERS.FULL_COLOR],
    baseTotalPrice: 800,
    promoId: null,
    discountAmount: 0,
    totalPrice: 800,
    requiresDownPayment: true,
    downPaymentAmount: 400,
    paymentMethod: PAYMENT_METHODS.GCASH,
    paymentStatus: PAYMENT_STATUS.DOWN_PAYMENT_PAID,
    proofOfPaymentFile: "event-program-payment.jpg",
    status: ORDER_STATUS.PRINTING,
    dateAdded: "2026-09-29T07:40:00.000Z",
    dateCompleted: null,
    unclaimedReason: null,
    daysUnclaimed: null,
    createdAt: "2026-09-29T07:40:00.000Z",
    binding: SERVICE_OPTIONS.LAMINATION,
  },
  {
    orderId: 5003,
    customerId: 1,
    customerName: "Marie Dizon",
    fileName: "research-poster.pdf",
    fileChannel: ORDER_CHANNELS.CUSTOMER_PORTAL,
    fileCount: 1,
    subject: "Research Poster",
    notes: "",
    fileDisposed: true,
    dateDisposed: "2026-09-26T10:00:00.000Z",
    serviceType: SERVICE_TYPES.DOCUMENT_PRINTING,
    serviceOption: SERVICE_OPTIONS.NONE,
    paperSize: "A3",
    pages: 1,
    copies: 1,
    colorTier: COLOR_TIERS.FULL_COLOR,
    isRush: false,
    queueType: QUEUE_TYPES.WALK_IN,
    priorityLevel: PRIORITY_LEVEL.LOW,
    pricePerPage: PRICE_PER_PAGE[COLOR_TIERS.FULL_COLOR],
    baseTotalPrice: 20,
    promoId: null,
    discountAmount: 0,
    totalPrice: 20,
    requiresDownPayment: false,
    downPaymentAmount: 0,
    paymentMethod: PAYMENT_METHODS.CASH,
    paymentStatus: PAYMENT_STATUS.FULLY_PAID,
    proofOfPaymentFile: null,
    status: ORDER_STATUS.UNCLAIMED,
    dateAdded: "2026-09-25T09:00:00.000Z",
    dateCompleted: "2026-09-26T10:00:00.000Z",
    unclaimedReason: "Customer has not collected the order.",
    daysUnclaimed: 3,
    createdAt: "2026-09-25T09:00:00.000Z",
    binding: SERVICE_OPTIONS.NONE,
  },
  {
    orderId: 5004,
    customerId: 1,
    customerName: "Marie Dizon",
    fileName: "biology-reviewer.pdf",
    fileChannel: ORDER_CHANNELS.CUSTOMER_PORTAL,
    fileCount: 1,
    subject: "Biology Reviewer",
    notes: "",
    fileDisposed: true,
    dateDisposed: sampleReadyOrderDateCompleted,
    serviceType: SERVICE_TYPES.DOCUMENT_PRINTING,
    serviceOption: SERVICE_OPTIONS.SPIRAL_BINDING,
    paperSize: "A4",
    pages: 24,
    copies: 1,
    colorTier: COLOR_TIERS.BLACK_TEXT,
    isRush: false,
    queueType: QUEUE_TYPES.ADVANCE,
    priorityLevel: PRIORITY_LEVEL.MEDIUM,
    pricePerPage: PRICE_PER_PAGE[COLOR_TIERS.BLACK_TEXT],
    baseTotalPrice: 72,
    promoId: null,
    discountAmount: 0,
    totalPrice: 72,
    requiresDownPayment: false,
    downPaymentAmount: 0,
    paymentMethod: PAYMENT_METHODS.CASH,
    paymentStatus: PAYMENT_STATUS.FULLY_PAID,
    proofOfPaymentFile: null,
    status: ORDER_STATUS.DONE,
    dateAdded: sampleReadyOrderDateAdded,
    dateCompleted: sampleReadyOrderDateCompleted,
    unclaimedReason: null,
    daysUnclaimed: 1,
    createdAt: sampleReadyOrderDateAdded,
    binding: SERVICE_OPTIONS.SPIRAL_BINDING,
  },
];

// ----- Activity log records -----
let activityLogs = [
  {
    logId: 1,
    actorId: 1,
    actorType: ACTOR_TYPES.STAFF,
    actionType: ACTION_TYPES.LOGIN,
    targetId: null,
    details: "Seed data — initial owner login (demo record)",
    timestamp: "2026-09-20T08:00:00.000Z",
  },
];

// ----- Session state (module 1/16 read this; no competing session system) -----
let currentUser = null; // the matched record object from users[] or customers[]
let currentActorType = null; // ACTOR_TYPES.STAFF or ACTOR_TYPES.CUSTOMER — read this to route UI

// ----------------------------------------------------------------------------
// SESSION / STATE PERSISTENCE
//
// This project is three separate HTML files (login-signup.html,
// account-management.html, activity-log.html). Navigating between them via
// window.location.href loads a brand-new page and wipes plain JS variables
// — including `currentUser` — which is why login previously appeared to
// just "refresh" instead of landing on account-management.html: the guard
// check on the next page always found `currentUser === null` and bounced
// straight back to login.
//
// sessionStorage is a native browser Web Storage API (not a backend, not a
// database, not a framework), so using it to carry the session — and the
// users[]/customers[]/activityLogs[] arrays themselves — across page loads
// keeps the project within the HTML5/CSS3/procedural-JS restriction while
// making navigation actually work. It is scoped to one browser tab and
// clears when that tab closes, which is the right lifetime for a login
// session in a prototype with no real backend.
// ----------------------------------------------------------------------------

function saveStateToSession() {
  try {
    sessionStorage.setItem("gsj_users", JSON.stringify(users));
    sessionStorage.setItem("gsj_customers", JSON.stringify(customers));
    sessionStorage.setItem("gsj_activityLogs", JSON.stringify(activityLogs));
  } catch (e) {
    // sessionStorage unavailable — the app still works within a single
    // page load, it just won't carry state to the next page.
  }
}

function saveSessionPointer() {
  try {
    if (currentUser === null || currentActorType === null) {
      sessionStorage.removeItem("gsj_session");
      return;
    }
    let idField =
      currentActorType === ACTOR_TYPES.STAFF ? "userId" : "customerId";
    let pointer = {
      actorId: currentUser[idField],
      actorType: currentActorType,
    };
    sessionStorage.setItem("gsj_session", JSON.stringify(pointer));
  } catch (e) {
    // sessionStorage unavailable — see saveStateToSession() note above.
  }
}

function loadStateFromSession() {
  try {
    let storedUsers = sessionStorage.getItem("gsj_users");
    let storedCustomers = sessionStorage.getItem("gsj_customers");
    let storedLogs = sessionStorage.getItem("gsj_activityLogs");

    if (storedUsers !== null) users = JSON.parse(storedUsers);
    if (storedCustomers !== null) customers = JSON.parse(storedCustomers);
    if (storedLogs !== null) activityLogs = JSON.parse(storedLogs);

    let storedSession = sessionStorage.getItem("gsj_session");
    if (storedSession !== null) {
      let pointer = JSON.parse(storedSession);
      if (pointer.actorType === ACTOR_TYPES.STAFF) {
        let index = findIndexByField(users, "userId", pointer.actorId);
        if (index !== -1) {
          currentUser = users[index];
          currentActorType = ACTOR_TYPES.STAFF;
        }
      } else if (pointer.actorType === ACTOR_TYPES.CUSTOMER) {
        let index = findIndexByField(customers, "customerId", pointer.actorId);
        if (index !== -1) {
          currentUser = customers[index];
          currentActorType = ACTOR_TYPES.CUSTOMER;
        }
      }
    }
  } catch (e) {
    // sessionStorage unavailable or corrupted — fall back to the seed
    // arrays and logged-out state already assigned above.
  }
}

// Restore whatever an earlier page in this tab already saved. Must run
// after the seed arrays above so it can overwrite them, and it runs
// synchronously at script-parse time (before DOMContentLoaded), so every
// page's init function always sees the correct, restored currentUser.
loadStateFromSession();