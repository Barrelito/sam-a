-- =============================================
-- En stängd löneöversyn kan inte ändras (ADR 0004)
-- =============================================
-- Admin och VO-chef stänger en löneöversyn genom att sätta status
-- 'completed'. Därefter får inga lönesättningar, bedömningar eller
-- samtalsunderlag i den löneöversynen skapas eller ändras. API:t svarar redan
-- 409; den här triggern är skyddet om någon skriver förbi API:t.
--
-- DELETE spärras inte: att radera en medarbetare kaskadraderar dess
-- lönesättningar, och det ska fortsätta fungera.

CREATE OR REPLACE FUNCTION public.salary_review_cycle_status(p_review_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.status
  FROM public.salary_reviews r
  JOIN public.salary_review_cycles c ON c.id = r.cycle_id
  WHERE r.id = p_review_id
$$;

CREATE OR REPLACE FUNCTION public.prevent_writes_in_closed_cycle()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF TG_TABLE_NAME = 'salary_reviews' THEN
    SELECT status INTO v_status FROM public.salary_review_cycles WHERE id = NEW.cycle_id;
  ELSE
    v_status := public.salary_review_cycle_status(NEW.salary_review_id);
  END IF;

  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'Löneöversynen är stängd och kan inte ändras'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS closed_cycle_guard ON public.salary_reviews;
CREATE TRIGGER closed_cycle_guard
  BEFORE INSERT OR UPDATE ON public.salary_reviews
  FOR EACH ROW EXECUTE FUNCTION public.prevent_writes_in_closed_cycle();

DROP TRIGGER IF EXISTS closed_cycle_guard ON public.salary_criteria_assessments;
CREATE TRIGGER closed_cycle_guard
  BEFORE INSERT OR UPDATE ON public.salary_criteria_assessments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_writes_in_closed_cycle();

DROP TRIGGER IF EXISTS closed_cycle_guard ON public.particularly_skilled_assessments;
CREATE TRIGGER closed_cycle_guard
  BEFORE INSERT OR UPDATE ON public.particularly_skilled_assessments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_writes_in_closed_cycle();

DROP TRIGGER IF EXISTS closed_cycle_guard ON public.salary_meeting_preparations;
CREATE TRIGGER closed_cycle_guard
  BEFORE INSERT OR UPDATE ON public.salary_meeting_preparations
  FOR EACH ROW EXECUTE FUNCTION public.prevent_writes_in_closed_cycle();
