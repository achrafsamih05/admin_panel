-- =====================================================================
-- Estrave / InApp — initial schema
-- Run in the Supabase SQL editor OR via `supabase db push`
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Helper: updated_at trigger ----------
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles ----------
-- 1 row per auth.users row. Holds the saved shipping address used at checkout.
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  phone           text,
  avatar_url      text,
  role            text not null default 'customer' check (role in ('customer','admin')),
  address_line1   text,
  address_line2   text,
  city            text,
  state           text,
  zip_code        text,
  country         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.tg_set_updated_at();

-- Auto-create a profile row whenever a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- categories ----------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  slug        text not null unique,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

insert into public.categories (name, slug, sort_order) values
  ('Electronics','electronics',10),
  ('Clothing','clothing',20),
  ('Food','food',30),
  ('Accessories','accessories',40)
on conflict (slug) do nothing;

-- ---------- products ----------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  sku          text unique,
  name         text not null,
  description  text,
  price        numeric(12,2) not null default 0 check (price >= 0),
  stock        int not null default 0 check (stock >= 0),
  image_url    text,                         -- public URL in storage bucket
  image_path   text,                         -- bucket path for deletion
  category_id  uuid references public.categories(id) on delete set null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.tg_set_updated_at();

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx   on public.products(is_active);
create index if not exists products_name_trgm    on public.products using gin (lower(name) gin_trgm_ops);
-- ^ trigram index speeds up "ILIKE %term%" search. Requires pg_trgm:
create extension if not exists pg_trgm;

-- ---------- orders ----------
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  status           text not null default 'pending'
                     check (status in ('pending','paid','shipped','delivered','cancelled')),
  total            numeric(12,2) not null default 0,
  -- snapshot of the shipping address at the moment of checkout
  ship_full_name   text,
  ship_phone       text,
  ship_address_line1 text,
  ship_address_line2 text,
  ship_city        text,
  ship_state       text,
  ship_zip_code    text,
  ship_country     text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.tg_set_updated_at();

create index if not exists orders_user_idx    on public.orders(user_id);
create index if not exists orders_status_idx  on public.orders(status);

-- ---------- order_items ----------
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  name        text not null,       -- snapshot
  price       numeric(12,2) not null,
  quantity    int not null check (quantity > 0),
  line_total  numeric(12,2) generated always as (price * quantity) stored
);

create index if not exists order_items_order_idx on public.order_items(order_id);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles    enable row level security;
alter table public.categories  enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- profiles: a user manages their own row; admins can read everything.
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles self upsert" on public.profiles;
create policy "profiles self upsert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- categories: readable by anyone (including anon storefront); admins write.
drop policy if exists "categories read all" on public.categories;
create policy "categories read all" on public.categories
  for select using (true);

drop policy if exists "categories admin write" on public.categories;
create policy "categories admin write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- products: active products are public. Admins do everything.
drop policy if exists "products read public" on public.products;
create policy "products read public" on public.products
  for select using (is_active = true or public.is_admin());

drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- orders: a user sees and creates only their own; admins see all.
drop policy if exists "orders owner select" on public.orders;
create policy "orders owner select" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders owner insert" on public.orders;
create policy "orders owner insert" on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- order_items: access follows the parent order.
drop policy if exists "order_items via order" on public.order_items;
create policy "order_items via order" on public.order_items
  for select using (
    exists (select 1 from public.orders o
            where o.id = order_id
              and (o.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "order_items owner insert" on public.order_items;
create policy "order_items owner insert" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o
            where o.id = order_id and o.user_id = auth.uid())
  );

-- =====================================================================
-- Storage bucket for product images
-- =====================================================================
-- Run this AFTER creating a bucket called `product-images` (public)
-- via the Supabase dashboard, OR uncomment to create it here:
--
-- insert into storage.buckets (id, name, public)
-- values ('product-images','product-images', true)
-- on conflict (id) do nothing;

-- Anyone can read (because bucket is public); only admins can upload/update/delete.
drop policy if exists "product-images read" on storage.objects;
create policy "product-images read" on storage.objects
  for select using (bucket_id = 'product-images');

drop policy if exists "product-images admin write" on storage.objects;
create policy "product-images admin write" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images admin update" on storage.objects;
create policy "product-images admin update" on storage.objects
  for update using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images admin delete" on storage.objects;
create policy "product-images admin delete" on storage.objects
  for delete using (bucket_id = 'product-images' and public.is_admin());
