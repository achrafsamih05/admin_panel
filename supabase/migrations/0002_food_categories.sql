-- =====================================================================
-- Refresh the category list for a food-oriented storefront.
--
-- Safe to re-run. The strategy:
--   1. Insert/update the new food categories (UPSERT on slug).
--   2. For each "legacy" slug (electronics, clothing, food, accessories),
--      re-assign any products that still reference it to the new "Lunch"
--      bucket, then delete the legacy row.
--
-- If you've already renamed categories manually, this script is a no-op for
-- everything it can't find. Running it multiple times is safe.
-- =====================================================================

-- 1) Upsert the new food category set.
insert into public.categories (name, slug, sort_order) values
  ('Breakfast', 'breakfast', 10),
  ('Lunch',     'lunch',     20),
  ('Dinner',    'dinner',    30),
  ('Desserts',  'desserts',  40),
  ('Drinks',    'drinks',    50),
  ('Snacks',    'snacks',    60)
on conflict (slug) do update
  set name       = excluded.name,
      sort_order = excluded.sort_order;

-- 2) Migrate products off any legacy categories, then drop them.
do $$
declare
  legacy_slugs text[] := array['electronics','clothing','food','accessories'];
  legacy_slug text;
  legacy_id  uuid;
  fallback_id uuid;
begin
  select id into fallback_id from public.categories where slug = 'lunch';

  foreach legacy_slug in array legacy_slugs loop
    select id into legacy_id from public.categories where slug = legacy_slug;
    if legacy_id is not null then
      -- Point any products at the fallback so the FK stays valid.
      update public.products
         set category_id = fallback_id
       where category_id = legacy_id;

      delete from public.categories where id = legacy_id;
    end if;
  end loop;
end $$;
