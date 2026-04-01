-- Run this once in Supabase SQL Editor to convert legacy Thai category values to English ids.

update public.transactions
set category = case category
  when U&'\0e2d\0e32\0e2b\0e32\0e23' then 'food'
  when U&'\0e40\0e14\0e34\0e19\0e17\0e32\0e07' then 'travel'
  when U&'\0e17\0e35\0e48\0e2d\0e22\0e39\0e48\0e2d\0e32\0e28\0e31\0e22' then 'housing'
  when U&'\0e1a\0e34\0e25' then 'bills'
  when U&'\0e0a\0e49\0e2d\0e1b\0e1b\0e34\0e49\0e07' then 'shopping'
  when U&'\0e2a\0e38\0e02\0e20\0e32\0e1e' then 'health'
  when U&'\0e1a\0e31\0e19\0e40\0e17\0e34\0e07' then 'entertainment'
  when U&'\0e2d\0e37\0e48\0e19\0e46' then 'other'
  when U&'\0e40\0e07\0e34\0e19\0e40\0e14\0e37\0e2d\0e19' then 'salary'
  when U&'\0e42\0e1a\0e19\0e31\0e2a' then 'bonus'
  when U&'\0e1f\0e23\0e35\0e41\0e25\0e19\0e0b\0e4c' then 'freelance'
  when U&'\0e02\0e32\0e22\0e02\0e2d\0e07' then 'sales'
  when U&'\0e14\0e2d\0e01\0e40\0e1a\0e35\0e49\0e22' then 'interest'
  else category
end
where category in (
  U&'\0e2d\0e32\0e2b\0e32\0e23',
  U&'\0e40\0e14\0e34\0e19\0e17\0e32\0e07',
  U&'\0e17\0e35\0e48\0e2d\0e22\0e39\0e48\0e2d\0e32\0e28\0e31\0e22',
  U&'\0e1a\0e34\0e25',
  U&'\0e0a\0e49\0e2d\0e1b\0e1b\0e34\0e49\0e07',
  U&'\0e2a\0e38\0e02\0e20\0e32\0e1e',
  U&'\0e1a\0e31\0e19\0e40\0e17\0e34\0e07',
  U&'\0e2d\0e37\0e48\0e19\0e46',
  U&'\0e40\0e07\0e34\0e19\0e40\0e14\0e37\0e2d\0e19',
  U&'\0e42\0e1a\0e19\0e31\0e2a',
  U&'\0e1f\0e23\0e35\0e41\0e25\0e19\0e0b\0e4c',
  U&'\0e02\0e32\0e22\0e02\0e2d\0e07',
  U&'\0e14\0e2d\0e01\0e40\0e1a\0e35\0e49\0e22'
);

insert into public.budgets (user_id, category, amount, updated_at)
select
  user_id,
  case category
    when U&'\0e2d\0e32\0e2b\0e32\0e23' then 'food'
    when U&'\0e40\0e14\0e34\0e19\0e17\0e32\0e07' then 'travel'
    when U&'\0e17\0e35\0e48\0e2d\0e22\0e39\0e48\0e2d\0e32\0e28\0e31\0e22' then 'housing'
    when U&'\0e1a\0e34\0e25' then 'bills'
    when U&'\0e0a\0e49\0e2d\0e1b\0e1b\0e34\0e49\0e07' then 'shopping'
    when U&'\0e2a\0e38\0e02\0e20\0e32\0e1e' then 'health'
    when U&'\0e1a\0e31\0e19\0e40\0e17\0e34\0e07' then 'entertainment'
    when U&'\0e2d\0e37\0e48\0e19\0e46' then 'other'
    when U&'\0e40\0e07\0e34\0e19\0e40\0e14\0e37\0e2d\0e19' then 'salary'
    when U&'\0e42\0e1a\0e19\0e31\0e2a' then 'bonus'
    when U&'\0e1f\0e23\0e35\0e41\0e25\0e19\0e0b\0e4c' then 'freelance'
    when U&'\0e02\0e32\0e22\0e02\0e2d\0e07' then 'sales'
    when U&'\0e14\0e2d\0e01\0e40\0e1a\0e35\0e49\0e22' then 'interest'
    else category
  end,
  amount,
  timezone('utc', now())
from public.budgets
where category in (
  U&'\0e2d\0e32\0e2b\0e32\0e23',
  U&'\0e40\0e14\0e34\0e19\0e17\0e32\0e07',
  U&'\0e17\0e35\0e48\0e2d\0e22\0e39\0e48\0e2d\0e32\0e28\0e31\0e22',
  U&'\0e1a\0e34\0e25',
  U&'\0e0a\0e49\0e2d\0e1b\0e1b\0e34\0e49\0e07',
  U&'\0e2a\0e38\0e02\0e20\0e32\0e1e',
  U&'\0e1a\0e31\0e19\0e40\0e17\0e34\0e07',
  U&'\0e2d\0e37\0e48\0e19\0e46',
  U&'\0e40\0e07\0e34\0e19\0e40\0e14\0e37\0e2d\0e19',
  U&'\0e42\0e1a\0e19\0e31\0e2a',
  U&'\0e1f\0e23\0e35\0e41\0e25\0e19\0e0b\0e4c',
  U&'\0e02\0e32\0e22\0e02\0e2d\0e07',
  U&'\0e14\0e2d\0e01\0e40\0e1a\0e35\0e49\0e22'
)
on conflict (user_id, category)
do update set amount = excluded.amount, updated_at = excluded.updated_at;

delete from public.budgets
where category in (
  U&'\0e2d\0e32\0e2b\0e32\0e23',
  U&'\0e40\0e14\0e34\0e19\0e17\0e32\0e07',
  U&'\0e17\0e35\0e48\0e2d\0e22\0e39\0e48\0e2d\0e32\0e28\0e31\0e22',
  U&'\0e1a\0e34\0e25',
  U&'\0e0a\0e49\0e2d\0e1b\0e1b\0e34\0e49\0e07',
  U&'\0e2a\0e38\0e02\0e20\0e32\0e1e',
  U&'\0e1a\0e31\0e19\0e40\0e17\0e34\0e07',
  U&'\0e2d\0e37\0e48\0e19\0e46',
  U&'\0e40\0e07\0e34\0e19\0e40\0e14\0e37\0e2d\0e19',
  U&'\0e42\0e1a\0e19\0e31\0e2a',
  U&'\0e1f\0e23\0e35\0e41\0e25\0e19\0e0b\0e4c',
  U&'\0e02\0e32\0e22\0e02\0e2d\0e07',
  U&'\0e14\0e2d\0e01\0e40\0e1a\0e35\0e49\0e22'
);
