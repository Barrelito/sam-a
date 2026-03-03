-- Add annual_cycle_item_id to tasks table
-- This allows materialized annual cycle tasks to be linked back to their template item
-- enabling deduplication and full task features (comments, attachments, checklist, archive)

ALTER TABLE public.tasks
    ADD COLUMN IF NOT EXISTS annual_cycle_item_id UUID
        REFERENCES public.annual_cycle_items(id) ON DELETE SET NULL;

-- Unique constraint: one materialized task per (item, station, year)
-- Allows NULL station_id for VO/admin tasks
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_annual_cycle_station_year
    ON public.tasks(annual_cycle_item_id, station_id, year)
    WHERE annual_cycle_item_id IS NOT NULL AND station_id IS NOT NULL;

-- Index for lookup performance
CREATE INDEX IF NOT EXISTS idx_tasks_annual_cycle_item
    ON public.tasks(annual_cycle_item_id)
    WHERE annual_cycle_item_id IS NOT NULL;

COMMENT ON COLUMN public.tasks.annual_cycle_item_id IS
    'If set, this task was auto-materialized from an annual_cycle_items template. Used for deduplication.';
