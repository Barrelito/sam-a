-- Replace the partial unique index on materialized annual cycle tasks with a
-- full one.
--
-- PostgREST/supabase-js upserts specify the conflict target as
-- ON CONFLICT (annual_cycle_item_id, station_id, year) without the partial
-- index's WHERE predicate, so Postgres cannot infer a partial index as the
-- arbiter and every upsert would fail. A full unique index behaves the same
-- for our data (rows with NULL in any column never conflict, since NULLs are
-- distinct) and can be inferred by ON CONFLICT.

DROP INDEX IF EXISTS public.idx_tasks_annual_cycle_station_year;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_tasks_annual_cycle_station_year
    ON public.tasks(annual_cycle_item_id, station_id, year);
