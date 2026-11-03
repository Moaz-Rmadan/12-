# Security Specification - El-Naggar Design Furniture Job Order System

## 1. Data Invariants
- `customers` collection holds customer contact profiles.
- `job_orders` collection holds furniture manufacturing orders.
- Each `job_order` document MUST have a valid `order_number`, `customer_id`, and `room_model_code`.
- `job_details` subcollection MUST belong to its parent `job_order`.
- `attachments` subcollection MUST belong to its parent `job_order`.
- `status` MUST be one of `'قيد التشغيل'`, `'تم التنفيذ'`, `'تسليم'`.

## 2. Security Rules Blueprint
- Open read/write access for workshop managers and operators to allow seamless job order creation, status updates, fabric swatch attachments, and customer profiles.
