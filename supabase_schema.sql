
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
  html text,                         -- Rendered HTML
  css text,                          -- Rendered CSS
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

-- TEMPLATES (Public Gallery)
create table templates (
  id text primary key,
  name text not null,
  description text,
  content jsonb default '{}'::jsonb,  -- GrapesJS project data
  html text,                           -- Rendered HTML output
  css text,                            -- Rendered CSS styles
  theme jsonb default '{}'::jsonb,     -- Theme settings (primaryColor, secondaryColor, fontFamily, borderRadius)
  tags text[] default array[]::text[], -- Array of tags for categorization
  category text,                       -- Main category (e.g., 'business', 'portfolio', 'landing')
  thumbnail_html text,                 -- Simplified HTML for preview rendering
  is_active boolean default true,      -- Soft delete flag
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for templates table
alter table templates enable row level security;

-- Public read-only access (anyone can view templates)
create policy "Templates are viewable by everyone."
  on templates for select
  using ( is_active = true );

-- Only authenticated users can insert templates (for admin/seed scripts)
create policy "Authenticated users can insert templates."
  on templates for insert
  with check ( auth.role() = 'authenticated' );

-- Only authenticated users can update templates
create policy "Authenticated users can update templates."
  on templates for update
  using ( auth.role() = 'authenticated' );

-- Create indexes for performance
create index templates_name_trgm_idx on templates using gin (name gin_trgm_ops);
create index templates_description_trgm_idx on templates using gin (description gin_trgm_ops);
create index templates_tags_idx on templates using gin (tags);
create index templates_category_idx on templates (category);
create index templates_is_active_idx on templates (is_active);

-- Enable pg_trgm extension for fuzzy text search (if not already enabled)
create extension if not exists pg_trgm;

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
