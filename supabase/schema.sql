create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  description text not null default '',
  amount numeric(12,2) not null check (amount > 0),
  category text not null,
  date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists transactions_user_id_date_idx
  on public.transactions(user_id, date desc);

create table if not exists public.budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  amount numeric(12,2) not null check (amount >= 0),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, category)
);

alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

drop policy if exists "Users manage own transactions" on public.transactions;
create policy "Users manage own transactions"
  on public.transactions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own budgets" on public.budgets;
create policy "Users manage own budgets"
  on public.budgets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
