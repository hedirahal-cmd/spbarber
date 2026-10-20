-- SP Barber — Supabase Schema

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  items jsonb not null,
  total integer not null,
  status text not null default 'pending' check (status in ('pending','paid','shipped','delivered','cancelled')),
  stripe_payment_intent_id text,
  shipping_address jsonb,
  created_at timestamptz default now(),
  -- Expedition (bloc Colissimo/Chronopost). tracking_number/shipped_at deja
  -- en production avant ce fichier n'en garde trace -- ajoutes ici pour que
  -- le schema redevienne une reference fidele. carrier nullable : une
  -- commande deja expediee avant ce champ n'a pas de valeur, et l'appli la
  -- traite alors comme Colissimo (voir /api/admin/ship) plutot que d'exiger
  -- une migration de donnees historiques.
  tracking_number text,
  shipped_at timestamptz,
  carrier text check (carrier in ('colissimo', 'chronopost')),
  -- Dropshipping (tondeuses) : commande passee chez le fournisseur, distinct
  -- du suivi d'expedition ci-dessus.
  fournisseur_commande boolean not null default false,
  -- Second colis independant (2026-10-20, decision Hedi) : une commande
  -- mixte (tondeuse + produit standard) part en DEUX colis physiques
  -- distincts -- le colis standard (champs ci-dessus) et celui du
  -- fournisseur pour la tondeuse (champs ci-dessous), chacun son propre
  -- transporteur et son propre e-mail de suivi. Champs paralleles plutot
  -- qu'une table a part : jamais plus de deux colis possibles aujourd'hui.
  tracking_number_fournisseur text,
  shipped_at_fournisseur timestamptz,
  carrier_fournisseur text check (carrier_fournisseur in ('colissimo', 'chronopost'))
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
