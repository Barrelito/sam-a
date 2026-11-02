-- =============================================
-- Chefer får starta nästa års löneöversyn (ADR 0004)
-- =============================================
-- Stationschef och områdeschef får nu skapa en löneöversyn, utöver admin och
-- VO-chef. Vilket år som får skapas (bara nästa år, och bara om det saknas)
-- avgörs i API:t; UNIQUE(year) gör att två samtidiga starter inte kan ge två
-- rader för samma år. Att ändra eller stänga en löneöversyn är fortfarande
-- förbehållet admin och VO-chef.
--
-- Rollistan nedan ska stämma med START_CYCLE_ROLES i
-- src/lib/salary-review/lonesattning.ts.

DROP POLICY IF EXISTS "Admins and VO chiefs can create cycles" ON public.salary_review_cycles;
DROP POLICY IF EXISTS "Managers can start cycles" ON public.salary_review_cycles;

CREATE POLICY "Managers can start cycles"
  ON public.salary_review_cycles FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'vo_chief', 'area_manager', 'station_manager')
    )
  );
