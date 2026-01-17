-- Fix RLS: Add UPDATE policy for annual_task_completions

CREATE POLICY "Station managers can update completions"
  ON public.annual_task_completions FOR UPDATE
  USING (
    station_id IN (
      SELECT station_id FROM public.user_stations WHERE user_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  )
  WITH CHECK (
    station_id IN (
      SELECT station_id FROM public.user_stations WHERE user_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );
