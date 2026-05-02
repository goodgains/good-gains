create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists customers_email_idx on public.customers (email);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  external_order_id text not null unique,
  payment_provider text not null,
  payment_status text not null,
  customer_id uuid not null references public.customers(id) on delete cascade,
  customer_name text not null,
  purchased_product_name text not null,
  purchased_slugs text[] not null default '{}',
  bundle_id text null,
  coupon_code text null,
  amount_usd numeric(10, 2) null,
  currency text not null default 'USD',
  download_token text not null unique,
  expires_at timestamptz null,
  max_downloads integer not null default 10,
  download_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_download_token_idx on public.orders (download_token);
create index if not exists orders_external_order_id_idx on public.orders (external_order_id);

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  license_key text not null unique,
  customer_id uuid not null references public.customers(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null default 'active',
  payment_status text not null default 'COMPLETED',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists licenses_customer_id_idx on public.licenses (customer_id);
create index if not exists licenses_order_id_idx on public.licenses (order_id);
create index if not exists licenses_license_key_idx on public.licenses (license_key);

create table if not exists public.license_products (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  product_slug text not null,
  product_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (license_id, product_slug)
);

create index if not exists license_products_license_id_idx on public.license_products (license_id);
create index if not exists license_products_product_slug_idx on public.license_products (product_slug);

create table if not exists public.delivery_logs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid null references public.customers(id) on delete set null,
  order_id uuid null references public.orders(id) on delete set null,
  license_id uuid null references public.licenses(id) on delete set null,
  context text not null,
  email_to text not null,
  email_from text not null,
  reply_to text null,
  provider text not null,
  sent boolean not null default false,
  message_id text null,
  error text null,
  provider_response jsonb null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists delivery_logs_customer_id_idx on public.delivery_logs (customer_id);
create index if not exists delivery_logs_order_id_idx on public.delivery_logs (order_id);
create index if not exists delivery_logs_license_id_idx on public.delivery_logs (license_id);
