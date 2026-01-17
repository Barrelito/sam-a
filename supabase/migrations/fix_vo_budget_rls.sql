-- ENDAST station_budget_allocations FIX
-- (vo_cycle_budgets är redan fixad från förra körningen)
-- Kör detta i Supabase SQL Editor

-- Ta bort gamla policies
DROP POLICY IF EXISTS "Users can view relevant station allocations" ON public.station_budget_allocations;
DROP POLICY IF EXISTS "VO chiefs can manage station allocations" ON public.station_budget_allocations;
DROP POLICY IF EXISTS "VO chiefs can update station allocations" ON public.station_budget_allocations;
DROP POLICY IF EXISTS "station_allocations_select" ON public.station_budget_allocations;
DROP POLICY IF EXISTS "station_allocations_insert" ON public.station_budget_allocations;
DROP POLICY IF EXISTS "station_allocations_update" ON public.station_budget_allocations;

-- SELECT: VO-chefer kan se allocations för budgetar i sitt VO
CREATE POLICY "station_allocations_select"
  ON public.station_budget_allocations FOR SELECT
  TO authenticated
  USING (
    vo_cycle_budget_id IN (
      SELECT id FROM public.vo_cycle_budgets 
      WHERE vo_id = (SELECT vo_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- INSERT: VO-chefer kan skapa allocations för budgetar i sitt VO
CREATE POLICY "station_allocations_insert"
  ON public.station_budget_allocations FOR INSERT
  TO authenticated
  WITH CHECK (
    vo_cycle_budget_id IN (
      SELECT id FROM public.vo_cycle_budgets 
      WHERE vo_id = (SELECT vo_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- UPDATE: VO-chefer kan uppdatera allocations för budgetar i sitt VO
CREATE POLICY "station_allocations_update"
  ON public.station_budget_allocations FOR UPDATE
  TO authenticated
  USING (
    vo_cycle_budget_id IN (
      SELECT id FROM public.vo_cycle_budgets 
      WHERE vo_id = (SELECT vo_id FROM public.profiles WHERE id = auth.uid())
    )
  );

SELECT 'station_budget_allocations RLS fixed!' as status;
