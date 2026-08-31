-- SP Barber — Supabase Schema

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  items jsonb not null,
  total integer not null,
  status text not null default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled')),
  stripe_payment_intent_id text,
  shipping_address jsonb,
  created_at timestamptz default now()
);

create index on orders (email);
create index on orders (status);
create index on orders (created_at desc);

-- Row level security
alter table orders enable row level security;

create policy "Admin full access" on orders
  using (true)
  with check (true);

-- Idempotence du webhook Stripe : un meme paiement ne s'enregistre qu'une fois.
-- Index PARTIEL a dessein : stripe_payment_intent_id est nullable, et Postgres
-- autorise plusieurs NULL dans un index unique ordinaire -- la protection serait
-- donc trompeuse sur ces lignes-la. Une session sans payment_intent y echappe.
-- Applique en production par la migration 20260831121540.
create unique index if not exists orders_stripe_payment_intent_id_key
  on public.orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
