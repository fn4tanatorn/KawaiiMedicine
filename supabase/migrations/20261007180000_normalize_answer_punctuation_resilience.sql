-- Improve normalize_answer for typing questions in Identify and Exams:
-- 1. Lowercase and trim.
-- 2. Convert hyphens and underscores to spaces (e.g. "c-cell" -> "c cell", "type-1" -> "type 1").
-- 3. Strip quotes, commas, parentheses, colons, semicolons, and trailing punctuation.
-- 4. Collapse multiple spaces into a single space.

create or replace function public.normalize_answer(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               lower(btrim(coalesce(p, ''))),
               '[-_]+', ' ', 'g'
             ),
             '[''"`(),;:/?!.。]+', '', 'g'
           ),
           '\s+', ' ', 'g'
         );
$$;
