-- =============================================
-- Medarbetarsamtal (se CONTEXT.md)
-- =============================================
-- Lönesättningens första samtal. Ett per lönesättning. Bedömningen görs i de
-- befintliga tabellerna för kriterier och särskild yrkesskicklighet; när
-- samtalet markeras genomfört sparas bedömningen som den var då
-- (assessment_snapshot), så att lönesamtalet kan visa vad som ändrats.
--
-- assessment_snapshot:
--   { "criteria": { "<sub_criterion_key>": "<rating>" },
--     "particularly_skilled": { "<criterion_key>": true|false } }

CREATE TABLE IF NOT EXISTS public.salary_employee_meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_review_id UUID NOT NULL UNIQUE
    REFERENCES public.salary_reviews(id) ON DELETE CASCADE,
  held_on DATE,
  agreements TEXT,
  development_needs TEXT,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assessment_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_employee_meetings_review
  ON public.salary_employee_meetings(salary_review_id);

CREATE TRIGGER set_salary_employee_meetings_updated_at
  BEFORE UPDATE ON public.salary_employee_meetings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.salary_employee_meetings ENABLE ROW LEVEL SECURITY;

-- Åtkomsten följer lönesättningen: den som får se och hantera lönesättningen
-- (stationschef, biträdande chef, områdeschef, VO-chef, admin enligt
-- salary_reviews-policyerna) får se och hantera dess medarbetarsamtal.
-- Underfrågan mot salary_reviews körs med anroparens RLS.

CREATE POLICY "Users can view employee meetings for visible reviews"
  ON public.salary_employee_meetings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      WHERE sr.id = salary_employee_meetings.salary_review_id
    )
  );

CREATE POLICY "Users can manage employee meetings for visible reviews"
  ON public.salary_employee_meetings FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      WHERE sr.id = salary_employee_meetings.salary_review_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      WHERE sr.id = salary_employee_meetings.salary_review_id
    )
  );

-- Samma skrivskydd som övriga lönesättningsdata i en stängd löneöversyn
DROP TRIGGER IF EXISTS closed_cycle_guard ON public.salary_employee_meetings;
CREATE TRIGGER closed_cycle_guard
  BEFORE INSERT OR UPDATE ON public.salary_employee_meetings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_writes_in_closed_cycle();
