-- Add assigned_to column to annual_task_completions
-- This allows annual cycle tasks shown as station tasks to be delegated to specific staff

ALTER TABLE public.annual_task_completions
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- RLS: Allow station managers to update their station's completions (assigned_to included)
DROP POLICY IF EXISTS "Station managers can update their completions" ON public.annual_task_completions;
CREATE POLICY "Station managers can update their completions"
    ON public.annual_task_completions FOR UPDATE
    USING (
        station_id IN (
            SELECT station_id FROM public.user_stations WHERE user_id = auth.uid()
        )
        OR user_id = auth.uid()
    );
