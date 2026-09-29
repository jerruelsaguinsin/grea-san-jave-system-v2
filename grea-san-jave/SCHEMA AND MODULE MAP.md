# SCHEMA_AND_MODULE_MAP.md — Grea San Jave Printing Services
**Version 2 — replaces the original 15-module structure.** This reflects the
final 16-module list after restructuring: Price Calculation and Receipt
Generation are no longer standalone (absorbed into Order Management and
Payments & Receipts); Print Job/Printer tracking was dropped entirely
(no real hardware integration); the system is split into Shared/System,
Owner End, and Customer End; and Notifications is its own module (16),
triggered by five other modules but displayed on both Owner and Customer
dashboards.

Every module reads/writes these exact field names — no one renames or
restructures these locally. If a module needs a new field, add it here
first, then use it in code.

---

# PART I — SHARED DATA SCHEMA

## 1. Customer
> From Q7, Q21–24 — currently tracked informally via Messenger; system replaces that.
> Now includes login credentials directly, since customers self-register (Module 1/13).

```js
{
  customerId: Number,
  customerName: String,
  contactNumber: String,       // optional, for follow-up on unclaimed orders (Q32)
  email: String,                // optional — supports Email as an order channel (Q6)
  messengerHandle: String,     // optional — most orders still come via Messenger (Q6)
  username: String,
  passwordHash: String,        // NEVER store plain-text passwords — hash before saving
  isRegular: Boolean,          // "suki" — auto-set by Module 2, see SUKI_ORDER_THRESHOLD
  isEmailVerified: Boolean,     // false until the verification link/code is confirmed (Module 1)
  emailVerificationToken: String, // nullable — token/code sent to the customer at sign-up
  dateRegistered: String,      // ISO date
}
```

## 2. User (Staff / Co-Owner)
> From business profile — 2 co-owners currently split rush vs. walk-in duties (Q13).

```js
{
  userId: Number,
  fullName: String,
  username: String,
  passwordHash: String,        // NEVER store plain-text passwords
  role: String,                // see USER_ROLES below
  assignedDuty: String,        // see DUTY_ASSIGNMENT below — mirrors Q13 division of labor
  dateCreated: String,         // ISO date
}
```

## 3. Order
> From Q5–14, Q29–32 — the core object almost every module touches.
> No `printerId` field — printer/hardware tracking was dropped entirely.

```js
{
  orderId: Number,
  customerId: Number,
  customerName: String,        // denormalized for quick display (Q23)

  // File submission (Q6, Q14) — read/written by Module 4 (File Handling)
  fileName: String,
  fileChannel: String,         // see ORDER_CHANNELS below
  fileCount: Number,           // e.g. 10-15 separate PDFs mentioned in Q14
  subject: String,             // e.g. "Thesis printing" — used when file names repeat (Q24)
  notes: String,               // e.g. binding instructions, special requests
  fileDisposed: Boolean,       // Module 4 — true once files are deleted post-completion
  dateDisposed: String,        // ISO datetime, nullable

  // Print specs (Q1, Q7, Q15, Q16) — set by Module 5 or Module 14 (customer intake)
  serviceType: String,         // see SERVICE_TYPES below (Q1)
  serviceOption: String,       // see SERVICE_OPTIONS below
  paperSize: String,           // explicitly the one thing they always ask (Q7)
  pages: Number,
  copies: Number,
  colorTier: String,           // see COLOR_TIERS below (Q15)

  // Priority (Q9, Q11, Q13) — owned by Module 5
  isRush: Boolean,              // source of truth for queue-lane assignment
  queueType: String,           // see QUEUE_TYPES below
  priorityLevel: String,        // nullable — see PRIORITY_LEVEL below; display/sort only

  // Pricing & payment (Q15-18, Q29) — pricing calculated in Module 5,
  // payment recorded in Module 7
  pricePerPage: Number,        // derived from colorTier at calc time
  baseTotalPrice: Number,      // price before any discount/promo is applied
  promoId: Number,             // nullable — references Promotion.promoId (Module 10)
  discountAmount: Number,      // amount subtracted from baseTotalPrice
  totalPrice: Number,          // baseTotalPrice - discountAmount = final amount charged
  requiresDownPayment: Boolean, // true for first-time/long-timeline orders (Q29)
  downPaymentAmount: Number,
  paymentMethod: String,       // see PAYMENT_METHODS below (Q17)
  paymentStatus: String,       // see PAYMENT_STATUS below
  proofOfPaymentFile: String,  // file reference — required for GCash/Bank Transfer

  // Status & lifecycle (Q9, Q32) — owned by Module 5
  status: String,              // see ORDER_STATUS below
  dateAdded: String,           // ISO datetime
  dateCompleted: String,       // ISO datetime, nullable
  unclaimedReason: String,     // e.g. "did not show up" (Q32), nullable
  daysUnclaimed: Number,       // nullable — elapsed days since dateCompleted
}
```

## 4. Receipt
> From Q9, Q30 — generated at print time. Owned by Module 7 alongside Payment.

```js
{
  receiptId: Number,
  orderId: Number,
  customerName: String,
  fileName: String,
  pages: Number,
  copies: Number,
  colorTier: String,
  totalPrice: Number,
  isRush: Boolean,
  dateIssued: String,          // ISO datetime
}
```

## 5. Payment
> From Q17–20 — currently recorded manually in Excel; no refund tracking exists (Q18).

```js
{
  paymentId: Number,
  orderId: Number,
  amount: Number,
  paymentMethod: String,       // see PAYMENT_METHODS below
  isDownPayment: Boolean,
  proofOfPaymentFile: String,  // nullable — screenshot for GCash/Bank Transfer
  dateReceived: String,        // ISO datetime
}
```

## 6. InventoryItem
> From Q25–26 — currently monitored by eye ("pag isa isang box nalang").

```js
{
  itemId: Number,
  itemName: String,
  category: String,            // see INVENTORY_CATEGORIES below
  quantityOnHand: Number,
  unit: String,                 // e.g. "reams", "boxes", "sheets", "bottles"
  reorderThreshold: Number,    // triggers low-stock notification
  lastRestocked: String,       // ISO date
}
```

## 7. MaterialUsage
> From Q27–28 — links a completed order to the inventory it consumed.

```js
{
  usageId: Number,
  orderId: Number,
  itemId: Number,
  quantityUsed: Number,
  dateUsed: String,            // ISO datetime
}
```

## 8. SalesReportEntry
> From Q19–20, Q33 — daily/seasonal income tracking, currently Excel; business is
> seasonal (busy exam weeks, slow otherwise — Q4, Q33). Now includes expense
> fields to support a net-profit view alongside Module 9 (Expense Management).

```js
{
  reportDate: String,          // ISO date
  totalOrders: Number,
  totalRevenue: Number,
  totalRushOrders: Number,
  totalExpenses: Number,       // nullable — pulled from Expense records for the same period
  netProfit: Number,           // nullable — totalRevenue - totalExpenses
  isExamWeek: Boolean,         // flags peak-season days (Q4)
}
```

## 9. Expense
> NEW — not from the interview (client discussed revenue tracking only, never a
> separate expense log). PLACEHOLDER categories — confirm with client.

```js
{
  expenseId: Number,
  category: String,            // see EXPENSE_CATEGORIES below
  amount: Number,
  description: String,
  dateIncurred: String,        // ISO date
  recordedBy: Number,          // userId of the staff member who logged it
}
```

## 10. Promotion
> NEW — replaces the old "PROMO_TYPES placeholder with no owning object" design.
> Owned by Module 10. `Order.promoId` references this when a discount is applied.

```js
{
  promoId: Number,
  promoType: String,           // see PROMO_TYPES below
  description: String,
  discountType: String,        // see DISCOUNT_TYPE below — "percentage" | "fixedAmount"
  discountValue: Number,       // e.g. 10 (for 10%) or 50 (for ₱50 off)
  eligibility: String,         // see PROMO_ELIGIBILITY below
  startDate: String,           // ISO date
  endDate: String,             // ISO date
  isActive: Boolean,
}
```

## 11. Feedback
> NEW — supports Module 12 (Customer Feedback & Ratings).

```js
{
  feedbackId: Number,
  orderId: Number,
  customerId: Number,
  rating: Number,               // 1-5
  comment: String,              // nullable
  dateSubmitted: String,        // ISO datetime
}
```

## 12. ActivityLog
> NEW — supports Module 3. Logs record-changing actions only (see Module 3 notes
> in Part II) — never passive browsing, to keep this in line with the client's
> data-privacy requirement rather than becoming behavioral surveillance.

```js
{
  logId: Number,
  actorId: Number,              // userId or customerId, depending on actorType
  actorType: String,            // see ACTOR_TYPES below — "Staff" | "Customer"
  actionType: String,           // see ACTION_TYPES below
  targetId: Number,             // nullable — e.g. the orderId an action relates to
  details: String,              // nullable — short human-readable context
  timestamp: String,            // ISO datetime
}
```

## 13. Notification
> Owned by Module 16. Triggered by Modules 5, 6, 7, 9, and 10; displayed on
> both the Owner Dashboard (within Module 5) and Customer Dashboard (Module 11).

```js
{
  notificationId: Number,
  type: String,                 // see NOTIFICATION_TYPES below
  relatedOrderId: Number,       // nullable
  relatedItemId: Number,        // nullable — for LOW_STOCK
  isBroadcast: Boolean,         // true for shop-wide announcements (no single recipient)
  recipientType: String,        // "Staff" | "Customer" | "Both" — who this notification is for
  message: String,
  isRead: Boolean,
  dateCreated: String,          // ISO datetime
}
```

---

## Naming rules everyone follows
- **camelCase** for all variables and object fields — no snake_case, no PascalCase for data.
- **`*Id` suffix** for all identifiers (`orderId`, not `order_id` or `orderID`).
- **`date*` prefix**, ISO 8601 strings, for all timestamps (`dateAdded`, not `createdAt`).
- Never invent a new string value for a status/category/method field — use the constants in `constants.js` instead of retyping strings.

---

# PART II — MODULE MAP (16 modules)

## Shared / System

**1. Login & Sign Up**
- Schema: `User`, `Customer` — `username`, `passwordHash`, plus `Customer` sign-up fields (`customerName`, `contactNumber`, `email`, `messengerHandle`)
- Constants: `USER_ROLES`
- Owns: authentication mechanics (hashing, verifying), forgot-password reset, email verification — sends `emailVerificationToken`, sets `isEmailVerified = true` once confirmed. Called into by Module 13 for in-account password changes — Module 13 never re-implements hashing itself.

**2. Account Management** *(staff-facing — full oversight of all accounts)*
- Schema: `User` (create/edit/deactivate), `Customer` (view/suspend, not edit — customers edit their own via Module 13)
- Constants: `USER_ROLES`, `DUTY_ASSIGNMENT`, `SUKI_ORDER_THRESHOLD`
- Owns: automated suki detection — counts a customer's completed orders and sets `Customer.isRegular = true` once `SUKI_ORDER_THRESHOLD` is met.

**3. Activity Log / Audit Trail** *(staff-facing only — customers never see this)*
- Schema: `ActivityLog` (owns/creates)
- Constants: `ACTOR_TYPES`, `ACTION_TYPES`
- Logs record-changing actions only — login, account creation, password reset, order submitted, order status changed, payment submitted, inventory updated, promo created, feedback submitted. Does NOT log passive browsing (viewing a dashboard, opening a tracker) — this scope limit is intentional, to align with the client's data-privacy requirement rather than collecting more behavioral data than needed.

**4. File Handling & Disposal**
- Schema: `Order` (reads/writes) — `fileName`, `fileChannel`, `fileCount`, `notes`, `fileDisposed`, `dateDisposed`
- Constants: `ORDER_CHANNELS`
- Validates uploads, flags missing/corrupted files, **auto-disposes stored files once `Order.status === ORDER_STATUS.DONE`** — core data-privacy requirement.

---

## Owner End

**5. Order Management** *(absorbs Price Calculation, Queue & Priority, Order Status Tracking, Owner Dashboard)*
- Schema: `Order` (creates/reads/updates nearly every field), `Promotion` (reads, to apply a discount)
- Constants: `SERVICE_TYPES`, `SERVICE_OPTIONS`, `COLOR_TIERS`, `PRICE_PER_PAGE`, `QUEUE_TYPES`, `PRIORITY_LEVEL`, `ORDER_STATUS`, `UNCLAIMED_THRESHOLD_DAYS`
- Responsibilities:
  1. **Intake:** validate specs, auto-calculate price by color tier, apply promo discount if present, generate `orderId`
  2. **Queue:** FIFO per lane (walk-in / rush); rush always precedes walk-in; **an order cannot be printed ahead of an earlier order within its own lane**
  3. **Status tracking:** Queued → Printing → Done → (Unclaimed | Cancelled); calculates `daysUnclaimed`
  4. **Owner Dashboard:** aggregates today's order count, revenue, queue size, low-stock count, unclaimed count — reads from Modules 6, 7, 16
  5. **Triggers Module 16** at four distinct moments: order created (`NEW_ORDER`, notifies owner), order created with `isRush = true` (`RUSH_ORDER`, notifies owner urgently), status becomes `DONE` (`ORDER_READY`, notifies customer to pick up), and `daysUnclaimed` exceeds `UNCLAIMED_THRESHOLD_DAYS` (`UNCLAIMED_ORDER`, notifies owner)

**6. Inventory Management** *(absorbs Material Usage & Order Costing)*
- Schema: `InventoryItem` (owns), `MaterialUsage` (owns), `Order` (reads `orderId` for usage linking)
- Constants: `INVENTORY_CATEGORIES`
- Deducts consumed materials per completed order; **triggers Module 16** when `quantityOnHand` crosses `reorderThreshold`

**7. Payments & Receipts** *(absorbs Receipt Generation)*
- Schema: `Payment` (owns), `Receipt` (owns), `Order` (reads `totalPrice`, updates `paymentStatus`, `proofOfPaymentFile`)
- Constants: `PAYMENT_METHODS`, `PAYMENT_STATUS`
- Requires proof-of-payment file for GCash/Bank Transfer; auto-generates the acknowledgment receipt once payment is confirmed; **triggers Module 16** on payment received

**8. Sales Reporting**
- Schema: `SalesReportEntry` (owns), `Order` (aggregates `totalPrice`, `isRush`, `dateAdded`), `Payment` (aggregates `amount`), `Expense` (reads, for `netProfit`)
- Constants: `ORDER_STATUS`
- Pulls `Expense` totals from Module 9 to compute `netProfit` alongside revenue

**9. Expense Management** *(NEW)*
- Schema: `Expense` (owns)
- Constants: `EXPENSE_CATEGORIES`
- Logs business expenses (rent, utilities, supplies, equipment repair); feeds Module 8's net-profit view

**10. Promotions & Discount Management** *(NEW — owns what was previously just a placeholder constant)*
- Schema: `Promotion` (owns)
- Constants: `PROMO_TYPES`, `DISCOUNT_TYPE`, `PROMO_ELIGIBILITY`
- Creates/activates/expires promo campaigns; Module 5 reads active promos at pricing time; **triggers Module 16** when a new promo goes live (as an announcement)

---

## Customer End

**11. Customer Dashboard / Home**
- Schema: reads across `Order` (active order snapshot), `Notification` (unread count), `Promotion` (active promos)
- Constants: none directly — displays values using Module 5/16's constants
- Aggregates only — owns no data itself. Shows: active order status teaser, unread notification count, active promos, announcement banner, "New Order" shortcut. Does NOT duplicate the full order list (that's Module 15) or a message thread (no messaging module exists in this design).

**12. Customer Feedback & Ratings**
- Schema: `Feedback` (owns), `Order` (reads `orderId`, only enabled once `status === DONE`)
- Constants: none
- **Triggers Module 3** (`ACTION_TYPES.FEEDBACK_SUBMITTED`) on submission

**13. Customer Account Management** *(scoped to the logged-in customer's own record only — never sees other customers)*
- Schema: `Customer` (reads/updates own record) — `contactNumber`, `email`, `messengerHandle`, and password changes (calls Module 1's hash function, never duplicates it)
- Constants: none
- Shows the customer their own `isRegular`/suki status (read-only — set by Module 2)

**14. Customer Order Placement**
- Schema: `Order` (creates, customer-facing path) — same fields as Module 5's intake, submitted by the customer rather than staff
- Constants: `SERVICE_TYPES`, `SERVICE_OPTIONS`, `COLOR_TIERS`, `ORDER_CHANNELS` (`CUSTOMER_PORTAL`)
- Uses the same pricing logic as Module 5; **triggers Module 3** (`ACTION_TYPES.ORDER_SUBMITTED`)

**15. Customer Order Tracking** *(absorbs Order History / "All Orders")*
- Schema: `Order` (reads, filtered to the logged-in `customerId`) — active orders get the live step tracker, past orders show as history
- Constants: `ORDER_STATUS`
- Reads the *same* order record Module 5 owns — never a duplicated copy

---

## Shared / System (cont.)

**16. Notifications & Alerts**
- Schema: `Notification` (owns/creates)
- Constants: `NOTIFICATION_TYPES`
- Called by Modules 5, 6, 7, 9, and 10 — each passes a trigger event; Module 16 creates the notification record and tags it by `recipientType`. Displayed inside Module 5's Owner Dashboard and Module 11's Customer Dashboard — those two modules read from Module 16, they don't generate their own separate notification logic.
- Full trigger map: Module 5 fires `NEW_ORDER`/`RUSH_ORDER` (owner) on order creation, `ORDER_READY` (customer) when status becomes Done, and `UNCLAIMED_ORDER` (owner) past the threshold; Module 6 fires `LOW_STOCK` (owner); Module 7 fires `PAYMENT` (owner); Module 10 fires `PROMO` (customer, as `isBroadcast`); `ANNOUNCEMENT` is owner-composed and always `isBroadcast` to all customers.

---

# PART III — CROSS-MODULE DEPENDENCIES

- **Module 5 (Order Management) is the hub** — Modules 4, 6, 7, 8, 12, 14, 15, and 16 all read or write `Order` fields it owns. Whoever builds Module 5 needs the most careful coordination with the rest of the team.
- **Module 16 (Notifications) has five callers** (5, 6, 7, 9, 10) but is displayed by two different modules (5's Owner Dashboard, 11's Customer Dashboard) that don't own it. This is the same "owns vs. displays" pattern as the old Module 15 → Module 8 relationship, just generalized across more callers now.
- **Module 13 (Customer Account Management) depends on Module 1** for the actual password-hashing function — it should never reimplement hashing independently.
- **Module 10 (Promotions) feeds Module 5** — active promos must be readable by Order Management at the moment of price calculation, not just stored separately.
- **Module 9 (Expense Management) feeds Module 8** — Sales Reporting's `netProfit` field is meaningless without Expense data being available for the same reporting period.
- **`EXPENSE_CATEGORIES`, `SUKI_ORDER_THRESHOLD`, `UNCLAIMED_THRESHOLD_DAYS`, and `PROMO_TYPES`/`PROMO_ELIGIBILITY` are all placeholders** — none of these were specified in the client interview. Confirm real values with the client before building logic that depends on their exact thresholds/categories.
- **Module 3 (Activity Log) only logs record-changing actions**, explicitly excluding passive browsing — this is a deliberate data-privacy scope limit, not an oversight. If your professor asks why the log doesn't capture every click, this is the justification.
- **No messaging/support-ticket module exists in this design** — the team considered and dropped both (chat was judged too complex for the DSA scope; a support-ticket queue was also considered and dropped). Customer-side unresolved issues currently have no dedicated channel; flag this to your adviser if it comes up as a gap.
- **No printer/hardware tracking exists** — deliberately dropped. Order completion in Module 5 is a manual staff status update (Printing → Done), with no per-printer state machine underneath it.
