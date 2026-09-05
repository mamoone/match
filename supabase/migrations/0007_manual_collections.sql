-- Manual collection: 100 MAD per filled offer (50 captain + 50 sailor), collected by captain.

drop table if exists public.payments;

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid unique not null references public.job_offers(id) on delete cascade,
  captain_id uuid not null references public.profiles(id),
  sailor_id uuid references public.profiles(id),
  total_mad numeric not null default 100 check (total_mad >= 0),
  received_mad numeric not null default 0 check (received_mad >= 0),
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_collections_captain on public.collections(captain_id);
create index if not exists idx_collections_status on public.collections(status);

-- Auto-create a collection when an offer is filled
create or replace function public.on_offer_filled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'filled' and old.status <> 'filled' then
    insert into public.collections (offer_id, captain_id, sailor_id, total_mad, received_mad, status)
    values (new.id, new.posted_by, new.filled_by, 100, 0, 'pending')
    on conflict (offer_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_collection_on_fill on public.job_offers;
create trigger trg_collection_on_fill
after update on public.job_offers
for each row execute function public.on_offer_filled();

alter table public.collections enable row level security;

create policy "collections_select" on public.collections
  for select using (captain_id = auth.uid() or public.is_admin());

create policy "collections_write_admin" on public.collections
  for all using (public.is_admin()) with check (public.is_admin());