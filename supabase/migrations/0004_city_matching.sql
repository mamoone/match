-- City-based matching + strict roles

-- 1) Ville du marin (port d'attache), défaut SAFI
alter table public.profiles add column if not exists city text not null default 'SAFI';
update public.profiles set city = 'SAFI' where city is null or trim(city) = '';

-- 2) Notifier UNIQUEMENT les marins de la même ville que l'offre
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
      and (
        new.location ilike '%' || city || '%'
        or city ilike '%' || new.location || '%'
      )
  loop
    insert into public.notifications (user_id, message, type, offer_id)
    values (
      acc.id,
      'Nouvelle offre à ' || new.location || ' : ' || new.title || ' (' || new.specialty_needed || ')',
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

-- 3) Seul un capitaine peut publier une offre
drop policy if exists "offers_insert_own" on public.job_offers;
create policy "offers_insert_own" on public.job_offers
  for insert with check (
    auth.uid() = posted_by
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'capitaine' and not banned)
  );

-- 4) Seul un marin peut postuler, une seule fois par offre
drop policy if exists "applications_insert_own" on public.applications;
create policy "applications_insert_own" on public.applications
  for insert with check (
    auth.uid() = worker_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'marin' and not banned)
  );

delete from public.applications a
using public.applications b
where a.offer_id = b.offer_id
  and a.worker_id = b.worker_id
  and a.created_at > b.created_at;

alter table public.applications
  add constraint applications_offer_worker_unique unique (offer_id, worker_id);

-- 5) Index pour le matching par ville
create index if not exists idx_profiles_city on public.profiles(city);