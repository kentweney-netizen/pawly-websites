-- PAWLY Pet Hub roster: same Solana address keeps pets across wallets.
create table if not exists public.pet_hub_roster (
  wallet text primary key,
  pets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.pet_hub_roster enable row level security;
drop policy if exists pet_hub_roster_read on public.pet_hub_roster;
create policy pet_hub_roster_read on public.pet_hub_roster for select using (true);
drop policy if exists pet_hub_roster_upsert on public.pet_hub_roster;
create policy pet_hub_roster_upsert on public.pet_hub_roster for insert with check (true);
drop policy if exists pet_hub_roster_update on public.pet_hub_roster;
create policy pet_hub_roster_update on public.pet_hub_roster for update using (true);
grant select, insert, update on public.pet_hub_roster to anon, authenticated;
