# Architecture notes

A one-page technical tour of the Estrave codebase, meant for the next engineer
to pick up where this iteration ended.

## Why two separate Vite projects?

The admin panel and the storefront have very different constraints:

- **Admin** bundles ApexCharts, a big dashboard shell (sidebar, topbar, lots
  of pages). Customers should never download any of it.
- **Storefront** must be fast on mobile, inherit the admin's brand, but ship
  its own minimal bundle.

A monorepo with two Vite roots keeps each bundle independent while letting
us share SCSS variables via relative import. There is no shared runtime code
— each app re-implements tiny helpers (`supabaseClient.js`, `cart.js`) to
keep bundles lean.

## Data flow

```
        ┌──────────────┐     insert/update/delete                ┌──────────────┐
        │ Admin Panel  │ ─────────────────────────────────────▶  │   Supabase   │
        │  (role=admin)│ ◀─────── public product image URL ───── │  Postgres +  │
        └──────────────┘                                         │  Storage +   │
                                                                 │   Auth       │
        ┌──────────────┐     select active products              │              │
        │  Storefront  │ ─────────────────────────────────────▶  │              │
        │  (role=user) │ ─── insert orders + order_items ─────▶  │              │
        └──────────────┘                                         └──────────────┘
```

The bucket `product-images` is public (read-only for anon users); the INSERT
policy on `storage.objects` checks `is_admin()` so only admins can upload.

## Row-Level Security summary

| Table         | Read                              | Write                        |
|---------------|-----------------------------------|------------------------------|
| `profiles`    | self or admin                     | self (insert/update own row) |
| `categories`  | anyone                            | admin only                   |
| `products`    | `is_active` OR admin              | admin only                   |
| `orders`      | owner (`user_id = auth.uid()`) or admin | owner insert; admin update |
| `order_items` | via parent order (owner or admin) | insert if parent is owner's  |

The `is_admin()` function is `SECURITY DEFINER` and queries `profiles`; it's
referenced from every admin-only policy.

## Cart state

Customer cart lives in `localStorage` (`estrave_cart_v1`). Reasons:
- Zero writes to Supabase until checkout — cheaper and faster.
- Works for guests who haven't signed up yet.
- Multi-tab sync via the `storage` event.

At checkout, the cart is read, an `orders` row is inserted (with the shipping
address snapshotted from `profiles`), then one `order_items` row per line.
The cart is cleared on success.

## Shipping address single source of truth

The address never appears in the checkout UI. It's stored on `profiles`
and snapshotted onto `orders` at the moment of purchase. So if the user
later changes their profile address, historical orders still show the
address that was used when the order was placed.

`hasShippingAddress(profile)` gates the Place-Order button. If it returns
false, the checkout page renders a warning panel with a link to the profile
page.

## Known follow-ups (out of scope for this iteration)

- **Product detail page** (`product.html`) — cards link to it but the page
  itself isn't built yet.
- **Orders dashboard in admin** — `command.html` still has static data;
  wiring it to `orders` + `order_items` is the natural next task.
- **Stock decrement on order** — currently the DB doesn't decrement
  `products.stock`. Add a trigger or a Postgres function called from
  checkout to do it atomically.
- **Payment** — the "Place order" button creates a `pending` order. Add
  Stripe (or similar) before using this in production.
- **Email notifications** — Supabase triggers + an Edge Function would be a
  lightweight way to email the customer on status changes.
