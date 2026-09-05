-- Config lists + payments + notification insert fix

-- 1) Configurable lists (vessel types, searched profiles)
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null default '[]'::jsonb
);

insert into public.app_config (key, value) values
  ('offer_specialties', '["Marin","Mécanicien","Gardien"]'::jsonb),
  ('vessel_types', '["سفينة صيد السردين","شباك الجر","الصيد الساحلي","سفينة صيد الأعماق","ناقلة","سفينة الحاويات","قارب النزهة","مركب تقليدي","أخرى"]'::jsonb)
on conflict (key) do update set value = excluded.value;

alter table public.app_config enable row level security;
create policy "app_config_select_all" on public.app_config
  for select using (true);
create policy "app_config_write_admin" on public.app_config
  for all using (public.is_admin()) with check (public.is_admin());

-- 2) Payments (manual monthly follow-up)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  month date not null,
  amount_mad numeric not null default 0 check (amount_mad >= 0),
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_profile on public.payments(profile_id);
create index if not exists idx_payments_status on public.payments(status);

alter table public.payments enable row level security;
create policy "payments_select" on public.payments
  for select using (auth.uid() = profile_id or public.is_admin());
create policy "payments_write_admin" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- 3) Allow the sailor who applied to notify the offer owner
drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
  for insert with check (
    auth.uid() = user_id
    or public.is_admin()
    or exists (
      select 1 from public.job_offers as o
      join public.applications as a on a.offer_id = o.id
      where o.id = notifications.offer_id
        and o.posted_by = notifications.user_id
        and a.worker_id = auth.uid()
    )
  );