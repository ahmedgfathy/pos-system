# Sell-It MongoDB model

Database: `pos_system`

MongoDB collections are created with JSON Schema validation and indexes by
`backend/src/schema.js`. Demo/reference data is idempotently inserted by
`backend/src/seed.js`.

## Collections

### `products`

Core catalog and stock record.

- Identity: `id`, `sku`, `name`, `description`
- Scan codes: `barcode`, `qr_code`
- Classification: `category_id`, `category`, `brand`
- Unit: `unit_id`, `unit`
- Pricing: `price`, `cost`, `tax_rate`
- Inventory: `stock`, `minimum_stock`, `maximum_stock`, `location`
- Purchasing: `supplier_id`
- State/audit: `active`, `created_at`, `updated_at`

Unique indexes: `id`, `sku`. Scan, search, category and active-state indexes are
also included.

### `users`

- `id`, `username`, `password_hash`
- `full_name`, `email`, `phone`
- `role`: `admin`, `manager`, or `cashier`
- `permissions`, `active`, `last_login_at`
- `created_at`, `updated_at`

Passwords are bcrypt hashes, never returned by the API.

### `categories`

`id`, `name`, `description`, `active`, `created_at`, `updated_at`.

### `units`

`id`, `name`, `symbol`, `allow_decimal`, `active`, `created_at`, `updated_at`.
Demo units are piece, kilogram, liter, pack and box.

### `suppliers`

`id`, `name`, `contact_name`, `email`, `phone`, `address`, `tax_number`,
`active`, `created_at`, `updated_at`.

### `sales`

- `id`, `invoice_number`, `cashier_id`
- Embedded item snapshots containing product, SKU, barcode, unit, quantity,
  price, cost and tax
- `subtotal`, `tax_total`, `total`
- `payment_method`, `status`, `created_at`

### `inventory_transactions`

Immutable stock ledger containing `id`, product snapshot, transaction `type`,
`quantity`, `unit_cost`, reference, notes, creator and timestamp.

### `accounting_entries`

Immutable financial ledger containing `id`, `type`, `description`, `amount`,
reference fields and timestamp.

### `system_settings`

Key/value settings for store name, currency, tax, receipt text and similar
configuration.

## Demo accounts

- Administrator: `admin` / `admin123`
- Manager: `manager` / `manager123`
- Cashier: `cashier` / `cashier123`

Change these passwords before production use.
