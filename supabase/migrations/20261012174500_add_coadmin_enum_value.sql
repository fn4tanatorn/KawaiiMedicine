-- Step 1: Add 'co_admin' to public.user_role enum.
-- Separated from function definition because PostgreSQL requires enum value addition
-- to be committed before the new enum value can be referenced in functions or queries (SQLSTATE 55P04).
alter type public.user_role add value if not exists 'co_admin';
