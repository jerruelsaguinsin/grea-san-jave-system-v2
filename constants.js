// ============================================================================
// constants.js
// Shared constants for the 16-module Grea San Jave Printing Services system.
// ============================================================================

// ===== Module 5: Order Management =====

const SERVICE_TYPES = {
  DOCUMENT_PRINTING: "Document Printing",
  BOOKBINDING: "Bookbinding",
};

const SERVICE_OPTIONS = {
  SPIRAL_BINDING: "Spiral Binding",
  PERFECT_BINDING: "Perfect Binding",
  LAMINATION: "Lamination",
  NONE: "None",
};

const COLOR_TIERS = {
  BLACK_TEXT: "Black Text",
  MINIMAL_COLOR: "Minimal Color",
  SMALL_IMAGE: "Small Image",
  FULL_COLOR: "Full Color",
};

const PRICE_PER_PAGE = {
  [COLOR_TIERS.BLACK_TEXT]: 3,
  [COLOR_TIERS.MINIMAL_COLOR]: 5,
  [COLOR_TIERS.SMALL_IMAGE]: 10,
  [COLOR_TIERS.FULL_COLOR]: 20,
};

const ORDER_CHANNELS = {
  MESSENGER: "Messenger",
  EMAIL: "Email",
  IN_PERSON: "In Person",
  BLUETOOTH: "Bluetooth",
  CUSTOMER_PORTAL: "Customer Portal",
};

const QUEUE_TYPES = {
  WALK_IN: "walkIn",
  ADVANCE: "advance",
};

const PRIORITY_LEVEL = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

const ORDER_STATUS = {
  QUEUED: "queued",
  PRINTING: "printing",
  DONE: "done",
  UNCLAIMED: "unclaimed",
  CANCELLED: "cancelled",
};

const UNCLAIMED_THRESHOLD_DAYS = 3;

// ===== Module 6: Inventory Management =====

const INVENTORY_CATEGORIES = {
  BOND_PAPER: "Bond Paper",
  PHOTO_PAPER: "Photo Paper",
  SPECIALTY_PAPER: "Specialty Paper",
  INK_TONER: "Ink/Toner",
  BINDING_MATERIALS: "Binding Materials",
  LAMINATION_MATERIALS: "Lamination Materials",
};

// ===== Module 7: Payments & Receipts =====

const PAYMENT_METHODS = {
  CASH: "Cash",
  GCASH: "GCash",
  BANK_TRANSFER: "Bank Transfer",
};

const PAYMENT_STATUS = {
  PENDING: "pending",
  DOWN_PAYMENT_PAID: "downPaymentPaid",
  FULLY_PAID: "fullyPaid",
};

// ===== Module 9: Expense Management =====

const EXPENSE_CATEGORIES = {
  RENT: "Rent",
  UTILITIES: "Utilities",
  SUPPLIES: "Supplies",
  EQUIPMENT_REPAIR: "Equipment Repair",
  OTHER: "Other",
};

// ===== Module 10: Promotions & Discount Management =====

const PROMO_TYPES = {
  BULK_DISCOUNT: "Bulk Discount",
  REGULAR_CUSTOMER_DISCOUNT: "Regular Customer Discount",
  SEASONAL_PROMO: "Seasonal Promo",
};

const DISCOUNT_TYPE = {
  PERCENTAGE: "percentage",
  FIXED_AMOUNT: "fixedAmount",
};

const PROMO_ELIGIBILITY = {
  ALL_CUSTOMERS: "allCustomers",
  SUKI_ONLY: "sukiOnly",
  BULK_ORDER_ONLY: "bulkOrderOnly",
};

const SUKI_ORDER_THRESHOLD = 5;

// ===== Module 2: Account Management (staff side) =====

const USER_ROLES = {
  CO_OWNER: "coOwner",
  STAFF: "staff",
};

const DUTY_ASSIGNMENT = {
  RUSH: "rush",
  WALK_IN: "walkIn",
  BOTH: "both",
};

// ===== Module 3: Activity Log / Audit Trail =====

const ACTOR_TYPES = {
  STAFF: "Staff",
  CUSTOMER: "Customer",
};

const ACTION_TYPES = {
  LOGIN: "Login",
  ACCOUNT_CREATED: "AccountCreated",
  PASSWORD_RESET: "PasswordReset",
  ORDER_SUBMITTED: "OrderSubmitted",
  ORDER_STATUS_CHANGED: "OrderStatusChanged",
  PAYMENT_SUBMITTED: "PaymentSubmitted",
  INVENTORY_UPDATED: "InventoryUpdated",
  PROMO_CREATED: "PromoCreated",
  FEEDBACK_SUBMITTED: "FeedbackSubmitted",
};

// ===== Module 16: Notifications & Alerts =====

const NOTIFICATION_TYPES = {
  NEW_ORDER: "NewOrder",
  RUSH_ORDER: "RushOrder",
  ORDER_READY: "OrderReady",
  UNCLAIMED_ORDER: "UnclaimedOrder",
  LOW_STOCK: "LowStock",
  PAYMENT: "Payment",
  PROMO: "Promo",
  ANNOUNCEMENT: "Announcement",
};

// ===== Module 1 / 2 — additions used only by Anika's modules =====
// These three action types are NOT part of the uploaded constants_new.txt
// ACTION_TYPES list (which only has LOGIN, not LOGOUT/SIGN_UP/EMAIL_VERIFIED/
// ACCOUNT_UPDATED/ACCOUNT_DEACTIVATED/ACCOUNT_REACTIVATED). Section 24 of the
// project brief calls for logging these events, so they are added here as a
// clearly-flagged extension rather than silently reused/renamed from
// ACTION_TYPES. Bring this list to the team so ACTION_TYPES in the shared
// constants.js can be updated to match before other modules rely on it.
const ANIKA_ACTION_TYPES_EXTENSION = {
  LOGOUT: "Logout",
  SIGN_UP: "SignUp",
  EMAIL_VERIFIED: "EmailVerified",
  ACCOUNT_UPDATED: "AccountUpdated",
  ACCOUNT_DEACTIVATED: "AccountDeactivated",
  ACCOUNT_REACTIVATED: "AccountReactivated",
  PASSWORD_CHANGED: "PasswordChanged",
};

// PLACEHOLDER / NEW — flagged for team schema update.
// The uploaded schema's User and Customer objects have no active/inactive
// status field, but Module 2 (section 17/21 of the brief, and the module map's
// "deactivate/reactivate accounts" responsibility) requires one. Following the
// same "NEW — confirm with team" convention already used elsewhere in
// constants.js/SCHEMA_AND_MODULE_MAP.md, this adds an isActive Boolean to both
// User and Customer (see data.js) rather than inventing an unrelated field
// name. Bring this addition to the team so SCHEMA_AND_MODULE_MAP.md can be
// updated to list `isActive: Boolean` on both objects.
const ACCOUNT_STATUS = {
  ACTIVE: true,
  INACTIVE: false,
};
