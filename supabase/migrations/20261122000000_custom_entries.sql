-- Generieke tabel voor zelfgemaakte tabbladen en Huishouden (slug = 'huishouden')
create table if not exists custom_entries (
  id text primary key default gen_random_uuid()::text,
  slug text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);
create index if not exists custom_entries_slug_idx on custom_entries (slug);
alter table custom_entries disable row level security;
notify pgrst, 'reload schema';
