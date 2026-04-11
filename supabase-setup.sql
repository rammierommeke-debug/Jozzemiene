-- Tabellen aanmaken
create table if not exists events (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  date text not null,
  time text,
  category text default 'algemeen',
  person text default 'Samen',
  created_at timestamptz default now()
);

create table if not exists ideas (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text default '',
  category text default 'anders',
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists meals (
  id text primary key default gen_random_uuid()::text,
  day text not null,
  slot text not null,
  name text not null,
  emoji text default '🍽️',
  week text not null default '',
  photo_url text default null
);

create table if not exists albums (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  emoji text default '📸',
  created_at timestamptz default now()
);

create table if not exists photos (
  id text primary key default gen_random_uuid()::text,
  url text not null,
  caption text default '',
  album_id text,
  created_at timestamptz default now()
);

create table if not exists savings (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  emoji text default '🎯',
  target numeric not null,
  saved numeric default 0,
  created_at timestamptz default now()
);

create table if not exists taken (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text default '',
  category text default 'algemeen',
  priority text default 'normaal',
  due_date text,
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists trips (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  destination text not null,
  flag text default '🌍',
  date_from text,
  date_to text,
  description text default '',
  cover_color text default '#c2714f',
  blocks jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists postcards (
  id text primary key default gen_random_uuid()::text,
  background text,
  front_photo text,
  front_emoji text default '🌸',
  front_text text default '',
  stickers jsonb default '[]'::jsonb,
  message text default '',
  sender text default '',
  recipient text default '',
  stamp text default '💌',
  stamp_color text default '#c2714f',
  created_at timestamptz default now()
);

-- RLS uitschakelen (prive app, geen login nodig)
alter table events disable row level security;
alter table ideas disable row level security;
alter table meals disable row level security;
alter table albums disable row level security;
alter table photos disable row level security;
alter table savings disable row level security;
alter table taken disable row level security;
alter table trips disable row level security;
alter table postcards disable row level security;
