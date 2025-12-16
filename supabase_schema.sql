
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Managed by Supabase Auth usually, but good to have a public profile table)
create table profiles (
  id uuid references auth.users not null primary key,
  email text,
  updated_at timestamp with time zone
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- DATABASES (PAGES/PROJECTS)
create table pages (
  id text primary key,
  user_id uuid references auth.users not null,
  name text,
  content jsonb default '{}'::jsonb, -- HTML/Styles
  theme jsonb default '{}'::jsonb,   -- Theme settings
  messages jsonb default '[]'::jsonb,-- Chat history
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table pages enable row level security;

create policy "Users can view own pages."
  on pages for select
  using ( auth.uid() = user_id );

create policy "Users can insert own pages."
  on pages for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own pages."
  on pages for update
  using ( auth.uid() = user_id );

create policy "Users can delete own pages."
  on pages for delete
  using ( auth.uid() = user_id );

-- Function to handle new user signup (optional, for profiles)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
