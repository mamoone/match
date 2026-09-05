-- URGEMAR - Supabase Database Schema
-- Run this in the Supabase SQL Editor

-- ============ EXTENSIONS ============
create extension if not exists "uuid-ossp";

-- ============ ENUM TYPES ============
create type user_role as enum ('marin', 'responsable', 'admin');
create type offer_status as enum ('open', 'filled', 'cancelled');
create type application_status as enum ('pending', 'accepted', 'rejected');
create type urgency_level as enum ('standard', 'urgent');

-- ============ PROFILES TABLE ============
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  phone text,
  role user_role not null default 'marin',
  specialty text,
  company_name text,
  experience_years integer,
  certifications text,
  banned boolean not null default false,
  created_at timestamptz default now()
);

-- ============ JOB OFFERS TABLE ============
create table if not exists public.job_offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  specialty_needed text not null,
  location text not null,
  vessel_type text,
  start_date date not null,
  end_date date not null,
  daily_rate numeric(10,2),
  urgency urgency_level not null default 'standard',
  status offer_status not null default 'open',
  posted_by uuid references public.profiles(id) not null,
  filled_by uuid references public.profiles(id),
  filled_at timestamptz,
  created_at timestamptz default now()
);

-- ============ APPLICATIONS TABLE ============
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.job_offers(id) on delete cascade not null,
  worker_id uuid references public.profiles(id) on delete cascade not null,
  worker_name text not null,
  worker_specialty text,
  worker_phone text,
  status application_status not null default 'pending',
  created_at timestamptz default now(),
  unique (offer_id, worker_id)
);

-- ============ NOTIFICATIONS TABLE ============
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  type text not null default 'info',
  offer_id uuid references public.job_offers(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz default now()
);

-- ============ INDEXES ============
create index if not exists idx_offers_status on public.job_offers(status);
create index if not exists idx_offers_specialty on public.job_offers(specialty_needed);
create index if not exists idx_offers_created on public.job_offers(created_at desc);
create index if not exists idx_applications_offer on public.applications(offer_id);
create index if not exists idx_applications_worker on public.applications(worker_id);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

-- ============ NOTIFICATION ON NEW OFFER ============
-- Notify ALL sailors when a responsible posts a new offer
create or replace function public.notify_marins_on_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acc record;
begin
  for acc in
    select id from public.profiles
    where role = 'marin' and banned = false
  loop
    insert into public.notifications (user_id, message, type, offer_id)
    values (
      acc.id,
      'Nouvelle offre: ' || new.title || ' - ' || new.specialty_needed || ' à ' || new.location,
      'new_offer',
      new.id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_notify_marins on public.job_offers;
create trigger trg_notify_marins
after insert on public.job_offers
for each row execute function public.notify_marins_on_offer();

-- ============ TRIGGER: UPDATE FILLED_AT ============
create or replace function public.set_filled_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'filled' and old.status != 'filled' then
    new.filled_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_filled_at on public.job_offers;
create trigger trg_set_filled_at
before update on public.job_offers
for each row execute function public.set_filled_at();

-- ============ ROW LEVEL SECURITY ============
alter table public.profiles enable row level security;
alter table public.job_offers enable row level security;
alter table public.applications enable row level security;
alter table public.notifications enable row level security;

-- PROFILES: user reads own, public reads non-banned
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_select_public" on public.profiles
  for select using (not banned);

create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_update_admin" on public.profiles
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ADMIN: captain can view all users (admin only)
create policy "admin_select_all" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- JOB OFFERS: everyone can see open offers, owner can manage
create policy "offers_select_all" on public.job_offers
  for select using (true);

create policy "offers_insert_own" on public.job_offers
  for insert with check (
    auth.uid() = posted_by and
    exists (select 1 from public.profiles where id = auth.uid() and role != 'marin' and not banned)
  );

create policy "offers_update_own" on public.job_offers
  for update using (
    auth.uid() = posted_by or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "offers_delete_admin" on public.job_offers
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- APPLICATIONS: marin can insert own, see own; owner sees for own offers
create policy "applications_insert_own" on public.applications
  for insert with check (auth.uid() = worker_id);

create policy "applications_select_worker" on public.applications
  for select using (auth.uid() = worker_id);

create policy "applications_select_owner" on public.applications
  for select using (
    exists (
      select 1 from public.job_offers
      where job_offers.id = applications.offer_id
      and job_offers.posted_by = auth.uid()
    )
  );

create policy "applications_update_owner" on public.applications
  for update using (
    exists (
      select 1 from public.job_offers
      where job_offers.id = applications.offer_id
      and job_offers.posted_by = auth.uid()
    )
  );

-- NOTIFICATIONS: only the recipient can read/update own
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

create policy "notifications_insert" on public.notifications
  for insert with check (
    auth.uid() = user_id or
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============ ADMIN BOOTSTRAP ============
-- After creating your first user in the app, run this in SQL Editor
-- to make them admin (replace with the user's UUID):
-- update public.profiles set role = 'admin' where email = 'admin@votreferme.com';

-- ============ REALTIME ============
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.job_offers;
alter publication supabase_realtime add table public.applications;
