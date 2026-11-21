-- LUV CONECT: authentication, hotel administration and platform administration.
-- Existing hotel records remain visible initially; newly created hotels require approval.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'cliente' check (role in ('cliente','hotel_admin','super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hotels
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists province text,
  add column if not exists approved boolean not null default true,
  add column if not exists paused boolean not null default false;

-- Preserve existing listings while requiring approval for future hotel registrations.
alter table public.hotels alter column approved set default false;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  guest_name text not null,
  guest_email text not null,
  check_in date not null,
  check_out date not null,
  guests integer not null default 1 check (guests > 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  created_at timestamptz not null default now(),
  constraint bookings_dates_valid check (check_out > check_in)
);

create index if not exists hotels_owner_id_idx on public.hotels(owner_id);
create index if not exists rooms_hotel_id_idx on public.rooms(hotel_id);
create index if not exists bookings_hotel_id_idx on public.bookings(hotel_id);
create index if not exists bookings_user_id_idx on public.bookings(user_id);

create or replace function public.current_profile_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() limit 1 $$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_profile_role() = 'super_admin', false) $$;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'cliente');
  if requested_role not in ('cliente','hotel_admin') then requested_role := 'cliente'; end if;
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, nullif(new.raw_user_meta_data->>'full_name',''), requested_role)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.handle_new_auth_user();


-- Create profiles for accounts that existed before this migration.
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  nullif(u.raw_user_meta_data->>'full_name',''),
  case when u.raw_user_meta_data->>'role' in ('cliente','hotel_admin')
       then u.raw_user_meta_data->>'role' else 'cliente' end
from auth.users u
on conflict (id) do update set email = excluded.email;

create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only a super administrator can change account roles';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger before update on public.profiles
for each row execute procedure public.protect_profile_role();

alter table public.profiles enable row level security;
alter table public.hotels enable row level security;
alter table public.rooms enable row level security;
alter table public.bookings enable row level security;

grant select on public.hotels, public.rooms to anon, authenticated;
grant insert, update, delete on public.hotels, public.rooms to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update on public.bookings to authenticated;

drop policy if exists "profiles_read_self_or_super_admin" on public.profiles;
create policy "profiles_read_self_or_super_admin" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_super_admin());
drop policy if exists "profiles_update_self_or_super_admin" on public.profiles;
create policy "profiles_update_self_or_super_admin" on public.profiles
for update to authenticated using (id = auth.uid() or public.is_super_admin())
with check (id = auth.uid() or public.is_super_admin());

-- Remove permissive legacy policies: PostgreSQL combines permissive policies with OR.
drop policy if exists "Public can view active hotels" on public.hotels;
drop policy if exists "Public can view rooms of active hotels" on public.rooms;

drop policy if exists "hotels_public_read_approved" on public.hotels;
create policy "hotels_public_read_approved" on public.hotels
for select to anon, authenticated using ((approved = true and paused = false) or owner_id = auth.uid() or public.is_super_admin());
drop policy if exists "hotels_owner_insert" on public.hotels;
create policy "hotels_owner_insert" on public.hotels
for insert to authenticated with check (owner_id = auth.uid() and public.current_profile_role() in ('hotel_admin','super_admin'));
drop policy if exists "hotels_owner_update" on public.hotels;
create policy "hotels_owner_update" on public.hotels
for update to authenticated using (owner_id = auth.uid() or public.is_super_admin())
with check ((owner_id = auth.uid() and public.current_profile_role() in ('hotel_admin','super_admin')) or public.is_super_admin());
drop policy if exists "hotels_super_admin_delete" on public.hotels;
create policy "hotels_super_admin_delete" on public.hotels
for delete to authenticated using (public.is_super_admin());

drop policy if exists "rooms_public_read_for_visible_hotels" on public.rooms;
create policy "rooms_public_read_for_visible_hotels" on public.rooms
for select to anon, authenticated using (
  exists (select 1 from public.hotels h where h.id = rooms.hotel_id
    and ((h.approved = true and h.paused = false) or h.owner_id = auth.uid() or public.is_super_admin()))
);
drop policy if exists "rooms_owner_manage" on public.rooms;
create policy "rooms_owner_manage" on public.rooms
for all to authenticated using (
  exists (select 1 from public.hotels h where h.id = rooms.hotel_id
    and (h.owner_id = auth.uid() or public.is_super_admin()))
) with check (
  exists (select 1 from public.hotels h where h.id = rooms.hotel_id
    and (h.owner_id = auth.uid() or public.is_super_admin()))
);

drop policy if exists "bookings_guest_or_hotel_admin_read" on public.bookings;
create policy "bookings_guest_or_hotel_admin_read" on public.bookings
for select to authenticated using (
  user_id = auth.uid() or public.is_super_admin() or exists (
    select 1 from public.hotels h where h.id = bookings.hotel_id and h.owner_id = auth.uid()
  )
);
drop policy if exists "bookings_guest_create" on public.bookings;
create policy "bookings_guest_create" on public.bookings
for insert to authenticated with check (user_id = auth.uid());


-- Hotel managers may edit hotel details, but cannot self-approve or pause listings.
create or replace function public.protect_hotel_moderation_fields()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_super_admin() then
    if tg_op = 'INSERT' then
      new.approved := false;
      new.paused := false;
    elsif new.approved is distinct from old.approved or new.paused is distinct from old.paused then
      raise exception 'Only a super administrator can approve or pause hotels';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_hotel_moderation_fields_trigger on public.hotels;
create trigger protect_hotel_moderation_fields_trigger
before insert or update on public.hotels
for each row execute procedure public.protect_hotel_moderation_fields();

-- Public image delivery; uploads are restricted to each authenticated user's own folder.
insert into storage.buckets (id, name, public)
values ('hotel-images', 'hotel-images', true)
on conflict (id) do update set public = true;
drop policy if exists "hotel_images_public_read" on storage.objects;
create policy "hotel_images_public_read" on storage.objects
for select to anon, authenticated using (bucket_id = 'hotel-images');
drop policy if exists "hotel_images_owner_upload" on storage.objects;
create policy "hotel_images_owner_upload" on storage.objects
for insert to authenticated with check (
  bucket_id = 'hotel-images' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "hotel_images_owner_update" on storage.objects;
create policy "hotel_images_owner_update" on storage.objects
for update to authenticated using (
  bucket_id = 'hotel-images' and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'hotel-images' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "hotel_images_owner_delete" on storage.objects;
create policy "hotel_images_owner_delete" on storage.objects
for delete to authenticated using (
  bucket_id = 'hotel-images' and (storage.foldername(name))[1] = auth.uid()::text
);
