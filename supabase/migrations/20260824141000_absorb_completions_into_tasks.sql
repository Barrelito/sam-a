-- Absorb annual_task_completions into materialized tasks rows
--
-- The annual cycle previously kept status in two stores: annual_task_completions
-- (written by the list views) and materialized tasks rows (written by the task
-- detail page). From now on tasks is the single source of truth: annual cycle
-- items are materialized as one tasks row per (item, station, year) and all
-- status changes go through the tasks API.
--
-- This migration moves existing station-level completion state into tasks:
--   1. Tasks that exist but are still 'not_started' pick up the progress
--      recorded in their completion row (the list views wrote there).
--   2. Completions with no task row at all are materialized as tasks with the
--      completion's status, assignee and notes.
--
-- Personal completions (user_id set, station_id NULL) are left untouched; the
-- personal annual-cycle flow for stationless roles is retired. The
-- annual_task_completions table itself is kept as an archive — nothing writes
-- to it anymore.
--
-- Requires 20260824140000_full_unique_index_annual_tasks.sql (ON CONFLICT
-- target below infers the full unique index).

-- ==============================================
-- 1. Upgrade existing not_started tasks from their completion rows
-- ==============================================

UPDATE public.tasks t
SET status = CASE WHEN c.status IN ('completed', 'dismissed') THEN 'done' ELSE 'in_progress' END,
    completed_at = CASE WHEN c.status IN ('completed', 'dismissed') THEN COALESCE(c.completed_at, NOW()) END,
    completed_by = CASE WHEN c.status IN ('completed', 'dismissed') THEN c.completed_by END,
    assigned_to = COALESCE(t.assigned_to, c.assigned_to),
    notes = COALESCE(t.notes, c.notes)
FROM public.annual_task_completions c
WHERE t.annual_cycle_item_id = c.annual_cycle_item_id
    AND t.station_id = c.station_id
    AND t.year = c.year
    AND c.station_id IS NOT NULL
    AND t.status = 'not_started'
    AND c.status IN ('completed', 'in_progress', 'dismissed');

-- Carry assignments from completions whose task exists with progress already
UPDATE public.tasks t
SET assigned_to = c.assigned_to
FROM public.annual_task_completions c
WHERE t.annual_cycle_item_id = c.annual_cycle_item_id
    AND t.station_id = c.station_id
    AND t.year = c.year
    AND c.station_id IS NOT NULL
    AND t.assigned_to IS NULL
    AND c.assigned_to IS NOT NULL;

-- ==============================================
-- 2. Materialize completions that have no task row
-- ==============================================

INSERT INTO public.tasks (
    title, description, category, owner_type, vo_id, station_id, created_by,
    year, start_month, end_month, deadline_day, status, assigned_to,
    completed_at, completed_by, notes, annual_cycle_item_id
)
SELECT
    i.title,
    i.description,
    CASE lower(i.category)
        WHEN 'hr' THEN 'HR'
        WHEN 'finance' THEN 'Finance'
        WHEN 'environment' THEN 'Safety'
        WHEN 'safety' THEN 'Safety'
        ELSE 'Operations'
    END,
    'station',
    s.vo_id,
    c.station_id,
    COALESCE(c.completed_by, c.assigned_to),
    c.year,
    i.month,
    i.month,
    25,
    CASE WHEN c.status IN ('completed', 'dismissed') THEN 'done'
         WHEN c.status = 'in_progress' THEN 'in_progress'
         ELSE 'not_started'
    END,
    c.assigned_to,
    CASE WHEN c.status IN ('completed', 'dismissed') THEN COALESCE(c.completed_at, NOW()) END,
    CASE WHEN c.status IN ('completed', 'dismissed') THEN c.completed_by END,
    c.notes,
    c.annual_cycle_item_id
FROM public.annual_task_completions c
JOIN public.annual_cycle_items i ON i.id = c.annual_cycle_item_id
JOIN public.stations s ON s.id = c.station_id
WHERE c.station_id IS NOT NULL
    AND COALESCE(c.completed_by, c.assigned_to) IS NOT NULL -- created_by is NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.annual_cycle_item_id = c.annual_cycle_item_id
            AND t.station_id = c.station_id
            AND t.year = c.year
    )
ON CONFLICT (annual_cycle_item_id, station_id, year) DO NOTHING;

COMMENT ON TABLE public.annual_task_completions IS
    'ARKIV: ersatt av materialiserade tasks-rader (annual_cycle_item_id). Skrivs inte längre av appen.';
