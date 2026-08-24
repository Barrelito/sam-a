-- Hardening of annual_task_completions
--
-- 1. Area managers (stationsområdeschefer) had no SELECT policy on
--    annual_task_completions, so annual cycle status for their stations was
--    invisible to them. They map to stations via
--    user_station_groups -> station_group_members (see add_area_manager_role.sql).
--
-- 2. The status column had no CHECK constraint and the vocabulary had drifted:
--    the table comment said 'completed'/'dismissed' while the app writes
--    'todo', 'in_progress' and 'completed'. Normalize any stray values and
--    constrain the column to the set the app actually uses.

-- ==============================================
-- 1. RLS: area managers can view completions for their station groups
-- ==============================================

DROP POLICY IF EXISTS "Area managers can view completions in their station groups"
    ON public.annual_task_completions;

CREATE POLICY "Area managers can view completions in their station groups"
    ON public.annual_task_completions FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            JOIN public.user_station_groups usg ON usg.user_id = p.id
            JOIN public.station_group_members sgm ON sgm.station_group_id = usg.station_group_id
            WHERE p.id = auth.uid()
                AND p.role = 'area_manager'
                AND sgm.station_id = annual_task_completions.station_id
        )
    );

-- ==============================================
-- 2. Status vocabulary: normalize, then constrain
-- ==============================================

UPDATE public.annual_task_completions
SET status = 'todo'
WHERE status NOT IN ('todo', 'in_progress', 'completed', 'dismissed');

ALTER TABLE public.annual_task_completions
    DROP CONSTRAINT IF EXISTS annual_task_completions_status_check;

ALTER TABLE public.annual_task_completions
    ADD CONSTRAINT annual_task_completions_status_check
    CHECK (status IN ('todo', 'in_progress', 'completed', 'dismissed'));

COMMENT ON COLUMN public.annual_task_completions.status IS
    'todo | in_progress | completed | dismissed';
