# Security Specification - El-Naggar Furniture Job Order & Workshop ERP

## 1. Authentication & Role Model
- Authentication uses Firebase Authentication (Email/Password).
- Every active staff member has an authoritative profile document in `/users/{uid}` with `isActive: true` and one of four technical roles: `admin`, `accounting`, `operations`, `sales`.
- Optional delegation flag `isDelegatedManager: true` applies strictly when `role == 'operations'`.
- New users without a `/users/{uid}` profile or matching admin-issued `/user_invites/{email}` document are denied by default.
- Primary project owner (`cfo.moaz@gmail.com`) is the sole trusted first-admin bootstrap account.

## 2. Collection Access Control & Data Invariants
- **Default Deny**: All unmatched paths deny read and write (`allow read, write: if false`).
- **`/users/{userId}`**:
  - Read: Self (`uid == userId`) or `admin`.
  - Create: `admin` only, OR self-claim matching an active `/user_invites/{email}` (preserving exact invited `role` and `isDelegatedManager`), OR trusted owner bootstrap for `cfo.moaz@gmail.com`.
  - Update: `admin` only, OR self updating strictly `lastLoginAt` / `updatedAt` without mutating `role`, `isActive`, `isDelegatedManager`, `uid`, or `email`.
  - Delete: `admin` only (cannot delete self).
- **`/user_invites/{inviteEmail}`**:
  - Read: `admin`, or the authenticated user whose token email matches `inviteEmail`.
  - Write: `admin` only.
- **`/job_orders/{orderId}`**:
  - Read: Any active authenticated user (`isActive == true`).
  - Create: `admin`, or `sales` creating strictly `Draft` status with zero financial overrides.
  - Update: `admin`, `accounting`, `operations` (cannot alter financial fields `total_price` or `deposit_paid`), or `sales` updating strictly `Draft` orders while keeping `Draft` status and financial totals unchanged.
  - Delete: `admin` only.
  - Status must be one of `'Draft'`, `'قيد التشغيل'`, `'تم التنفيذ'`, `'تسليم'`.
- **`/customers/{customerId}`**:
  - Read: Any active authenticated user.
  - Create / Update: `admin` or `sales`.
  - Delete: `admin` only.
- **`/truck_manifests/{manifestId}`**:
  - Read: Any active authenticated user.
  - Create / Update / Delete: `admin` or `operations`.
- **`/delivery_receipts/{receiptId}`**:
  - Read: Any active authenticated user.
  - Create / Update: `admin`, `accounting`, `operations`, or `sales`.
  - Delete: `admin` only.
- **`/order_counters/{counterId}`**:
  - Read: Any active authenticated user.
  - Create / Update: `admin` or `sales`.
  - Delete: Denied.
- **`/audit_logs/{logId}`**:
  - Read: `admin` only.
  - Create: Any active authenticated user recording their own `user_uid == request.auth.uid`.
  - Update / Delete: Denied (strictly append-only).
- **`/smart_queries/{queryId}`**:
  - Read / Write: Active authenticated users.
