# Supabase setup

## 1. Create the project
1. Go to <https://supabase.com> → **New project**.
2. Copy the **Project URL** and the **anon public** key from *Project Settings → API*.

## 2. Apply the schema
Open the SQL editor in the Supabase dashboard and paste the contents of
[`migrations/0001_init.sql`](./migrations/0001_init.sql), then **Run**.

This creates:
- `profiles` (1:1 with `auth.users`, holds the shipping address)
- `categories`, `products`
- `orders`, `order_items`
- RLS policies so storefront users only ever touch their own rows
- A `handle_new_user()` trigger that auto-inserts a profile at signup
- An `is_admin()` helper (checks `profiles.role = 'admin'`)

## 3. Create the storage bucket
*Storage → New bucket* → name: `product-images` → **Public**. The SQL in step 2
already installed read/write policies for it.

## 4. Promote yourself to admin
After signing up once through the admin panel, run:

```sql
update public.profiles set role = 'admin' where id = '<your auth.users.id>';
```

(Or look up the id in *Authentication → Users*.)

## 5. Wire environment variables
Create `.env` files at the root of each Vite project:

```bash
# admin_panel/.env  AND  storefront/.env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

`.env` is already git-ignored.
