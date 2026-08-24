# MyProjectTrace — Project Financial Capture & Early Warning System

Official Website: [myprojecttrace.com](https://myprojecttrace.com)

**MyProjectTrace** helps trade contractors and remodelers capture project purchases, preserve multi-page receipt evidence, track incoming customer collections, and calculate the true gross financial position of every job in real-time.

---

## Phase 1 Architecture & Security Overview

### Core Capabilities
- **Multi-Tenant Workspace Architecture**: Strict isolation under `/companies/{companyId}` where each contractor company owns its distinct data partition.
- **Deterministic Financial Engine**:
  - *Total Contract Value* = Base Contract + Approved Change Orders
  - *Total Purchases* = Confirmed Receipts & Material Purchases (each purchase counted exactly once)
  - *Total Collected* = Received & Cleared Customer Payments
  - *Gross Project Position* = Total Collected − Total Purchases
  - *Gross Margin Estimate* = (Total Contract Value − Total Purchases) / Total Contract Value
  - *Accounts Receivable* = Total Contract Value − Total Collected
- **6-Rule Financial Risk & Early Warning Engine**:
  1. *Purchases Rising Faster than Collections* (`totalPurchases > totalCollected`)
  2. *Negative Cash Position* (`cashPosition < 0`)
  3. *Low Gross Margin Estimate* (`grossMarginEstimate < minimumGrossMarginThreshold`)
  4. *High Accounts Receivable* (`accountsReceivable > arWarningThreshold`)
  5. *Large Single Purchase* (`purchaseAmount > largePurchaseThreshold`)
  6. *Unusual Spending Spike* (multiple rapid purchases or outlier spikes)
- **Role-Based Access Control (RBAC)**:
  - **OWNER**: Full administrative ownership, financial thresholds configuration, user management, and workspace settings.
  - **ADMIN**: Project management, financial tracking, receipts, and payments.
  - **FIELD_USER**: Field receipts and purchase capture, project view-only access. Prevented by Firestore Security Rules from creating/updating/deleting projects or escalating roles.

---

## Required Firebase Services

1. **Firebase Authentication**: Email & Password sign-in / sign-up.
2. **Cloud Firestore**: Multi-tenant NoSQL database storing companies, users, projects, providers, purchases, receipt pages, line items, payments, and alerts.
3. **Firebase Storage**: Secure receipt image and document asset preservation.

---

## Environment Variables Configuration

Copy `.env.example` to your environment or configure the variables in Google AI Studio / Firebase settings:

```env
# Firebase Client SDK Configuration (Client-side safe public credentials)
VITE_FIREBASE_API_KEY=""
VITE_FIREBASE_AUTH_DOMAIN=""
VITE_FIREBASE_PROJECT_ID=""
VITE_FIREBASE_STORAGE_BUCKET=""
VITE_FIREBASE_MESSAGING_SENDER_ID=""
VITE_FIREBASE_APP_ID=""

# Gemini AI Secret (Server-side proxy only)
GEMINI_API_KEY=""
```

---

## Firestore Database Structure & Security Rules

### Data Hierarchy
```
/user_directory/{userId}                     -> Minimal membership resolution { userId, companyId, createdAt }
/companies/{companyId}                       -> Company document { companyId, companyName, ownerUid, settings, createdAt }
  /companies/{companyId}/users/{userId}      -> Authorized users & roles (OWNER, ADMIN, FIELD_USER)
  /companies/{companyId}/projects/{projectId}-> Job records & contract values
  /companies/{companyId}/providers/{provId}  -> Suppliers & material vendors
  /companies/{companyId}/purchases/{purchId} -> Purchases & receipts
    /receiptPages/{pageId}                   -> Multi-page receipt scans & storage paths
    /items/{itemId}                          -> Extracted line items
  /companies/{companyId}/payments/{payId}    -> Customer payments & evidence
  /companies/{companyId}/alerts/{alertId}    -> System risk alerts
```

### Zero-Trust Security Invariants
- **No Global Listing**: `allow list` on `/companies` is set to `false`. Signed-in users cannot list arbitrary tenant companies.
- **Immutable Ownership & Anti-Escalation**: Normal users cannot modify their `role`, `companyId`, or `userId`. `FIELD_USER` cannot promote themselves to `ADMIN` or `OWNER`.
- **Project Isolation**: Only `OWNER` or `ADMIN` roles may create, update, or delete project contract documents. `FIELD_USER` is restricted to read-only for projects.
- **Direct Membership Validation**: `isMemberOfCompany(companyId)` verifies user document existence at `/companies/{companyId}/users/$(request.auth.uid)`.

---

## Local Development & Build

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Run TypeScript lint check
npm run lint

# Build production bundle
npm run build
```
