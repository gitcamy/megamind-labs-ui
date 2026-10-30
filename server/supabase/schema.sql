-- Hosted generator: accounts, plans and metered generations.
-- Run once in the Supabase SQL editor. The server writes with the service role; people can only read their own rows.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status text,
  period_start timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  model text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_read_tokens int not null default 0,
  cache_write_tokens int not null default 0,
  cost_usd numeric(10, 5) not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists generations_user_created on public.generations (user_id, created_at desc);
create index if not exists generations_created on public.generations (created_at);

alter table public.profiles enable row level security;
alter table public.generations enable row level security;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "read own generations" on public.generations;
create policy "read own generations" on public.generations for select using (auth.uid() = user_id);

-- Every new sign-in gets a free profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Claims one generation if the person is under every limit. The row lock on the profile makes two
-- requests at once queue up here, so nobody can slip past a limit by sending in parallel.
-- Returns the new generation id, or raises with a code the server turns into a message.
create or replace function public.reserve_generation(
  p_user uuid,
  p_period_start timestamptz,
  p_max_count int,
  p_max_cost numeric,
  p_per_hour int,
  p_per_day int
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_id bigint;
  v_count int;
  v_cost numeric;
begin
  perform 1 from profiles where id = p_user for update;
  if not found then raise exception 'no_profile'; end if;

  -- A run that never finished (closed tab, crashed function) stops blocking after five minutes.
  update generations set status = 'failed', finished_at = now()
    where user_id = p_user and status = 'running' and created_at < now() - interval '5 minutes';

  if exists (select 1 from generations where user_id = p_user and status = 'running') then
    raise exception 'busy';
  end if;
  if (select count(*) from generations where user_id = p_user and created_at > now() - interval '1 hour') >= p_per_hour then
    raise exception 'hourly_limit';
  end if;
  if (select count(*) from generations where user_id = p_user and created_at > now() - interval '1 day') >= p_per_day then
    raise exception 'daily_limit';
  end if;

  select count(*) filter (where status <> 'failed' or output_tokens > 0), coalesce(sum(cost_usd), 0)
    into v_count, v_cost
    from generations where user_id = p_user and created_at >= p_period_start;
  if v_count >= p_max_count or v_cost >= p_max_cost then
    raise exception 'quota';
  end if;

  insert into generations (user_id) values (p_user) returning id into v_id;
  return v_id;
end $$;

-- Usage in the current period, for the account panel.
create or replace function public.usage_since(p_user uuid, p_since timestamptz)
returns table (used int, cost numeric)
language sql security definer set search_path = public as $$
  select (count(*) filter (where status <> 'failed' or output_tokens > 0))::int, coalesce(sum(cost_usd), 0)
  from generations where user_id = p_user and created_at >= p_since;
$$;

-- Total spend across everyone, for the daily kill switch.
create or replace function public.spend_since(p_since timestamptz) returns numeric
language sql security definer set search_path = public as $$
  select coalesce(sum(cost_usd), 0) from generations where created_at >= p_since;
$$;

revoke all on function public.reserve_generation from public, anon, authenticated;
revoke all on function public.usage_since from public, anon, authenticated;
revoke all on function public.spend_since from public, anon, authenticated;
