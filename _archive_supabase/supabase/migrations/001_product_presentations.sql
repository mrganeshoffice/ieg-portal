-- IEG Portal: "Our Product PPT" module.
-- Run once in Supabase Dashboard > SQL Editor (or `supabase db push`).
-- Nothing here needs, or should ever use, the service-role key from the browser.

-- 1. Who is an admin ------------------------------------------------------------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

drop policy if exists "admins can read their own row" on public.admin_users;
create policy "admins can read their own row" on public.admin_users
  for select to authenticated using (user_id = auth.uid());
-- No insert/update/delete policies: admins are added only from the SQL editor / dashboard.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. Presentations ---------------------------------------------------------------
create table if not exists public.product_presentations (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 500),
  thumbnail_url text not null,
  presentation_url text not null check (presentation_url ~* '^(https?://|/[^/\\])'),
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);
create index if not exists product_presentations_order_idx on public.product_presentations (is_published, display_order, created_at desc);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists product_presentations_touch on public.product_presentations;
create trigger product_presentations_touch before update on public.product_presentations
  for each row execute function public.touch_updated_at();

alter table public.product_presentations enable row level security;

drop policy if exists "public reads published" on public.product_presentations;
create policy "public reads published" on public.product_presentations
  for select to anon, authenticated using (is_published = true);

drop policy if exists "admins read all" on public.product_presentations;
create policy "admins read all" on public.product_presentations
  for select to authenticated using (public.is_admin());

drop policy if exists "admins insert" on public.product_presentations;
create policy "admins insert" on public.product_presentations
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admins update" on public.product_presentations;
create policy "admins update" on public.product_presentations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins delete" on public.product_presentations;
create policy "admins delete" on public.product_presentations
  for delete to authenticated using (public.is_admin());

-- 3. Realtime (user page refreshes as soon as an admin saves) -------------------
do $$ begin
  alter publication supabase_realtime add table public.product_presentations;
exception when duplicate_object then null; end $$;

-- 4. Thumbnail storage -----------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-thumbnails', 'product-thumbnails', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins upload thumbnails" on storage.objects;
create policy "admins upload thumbnails" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-thumbnails' and public.is_admin());
drop policy if exists "admins update thumbnails" on storage.objects;
create policy "admins update thumbnails" on storage.objects
  for update to authenticated using (bucket_id = 'product-thumbnails' and public.is_admin());
drop policy if exists "admins delete thumbnails" on storage.objects;
create policy "admins delete thumbnails" on storage.objects
  for delete to authenticated using (bucket_id = 'product-thumbnails' and public.is_admin());
-- Public bucket: anyone can VIEW a thumbnail by its URL; only admins can write or delete.

-- 5. Create your first admin ------------------------------------------------------
-- a) Supabase Dashboard > Authentication > Users > "Add user" (email + password, tick "Auto confirm").
-- b) Authentication > Providers > Email: turn OFF "Allow new users to sign up".
-- c) Then run (replace the email):
--    insert into public.admin_users (user_id) select id from auth.users where email = 'admin@yourcompany.com';
