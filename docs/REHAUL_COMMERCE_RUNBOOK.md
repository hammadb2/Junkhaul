# Rehaul Commerce Runbook

Current status: not approved for public payments.

## Implemented In This Pass

- `supabase/migrations/20260816000001_rehaul_commerce_hardening.sql`
- `lib/rehaulOrders.js#addToCart`
- `lib/rehaulOrders.js#calculateOrderTotals`
- `lib/rehaulOrders.js#createOrder`
- `app/api/rehaul/checkout/route.js`

The new migration adds:

- Partial unique index `uq_rehaul_active_inventory_reservation`.
- RPC `rehaul_reserve_listing_in_cart` for server-authoritative, lock-based reservation.
- RPC `rehaul_create_order_from_cart` for atomic order/cart/order-line/reservation conversion.
- `rehaul_delivery_exceptions` for delivery review instead of free fallback.
- `rehaul_tax_config_versions` and order/order-line tax evidence columns.

## Required Checkout Behavior

1. Product page requests add-to-cart using only `listing_id`.
2. Server selects listing, current price, and inventory item.
3. RPC locks cart, listing, and inventory; exactly one active reservation may exist.
4. Delivery totals are computed server-side.
5. If delivery pricing fails, checkout returns `409` with `delivery_review_required`; cart and reservation remain intact.
6. A staff member with explicit authorization must approve a delivery fee before order creation can continue.
7. Final-sale acknowledgement is collected at checkout, not as an unwired product-page checkbox.
8. Stripe PaymentIntent must be created from the authoritative order total only.

## Remaining Commerce Blockers

- Product detail form remains unwired.
- Cart drawer/page, remove item, reservation expiry UI, sold/reserved states, and keyboard/mobile states are missing.
- Rehaul PaymentIntent creation and Rehaul-specific webhook reconciliation are not implemented.
- Tax runtime still returns an explicit unapproved placeholder; accountant/owner approval is required.
- Delivery-fee approval API/admin UI is not implemented.
- Atomic RPCs have not been applied to staging or verified with concurrent buyers.

