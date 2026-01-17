-- =============================================
-- Migration: Löneöversynsmodul (Salary Review Module)
-- Version: v6
-- Description: Komplett databasschema för löneöversyn med medarbetare,
--              bedömning av särskild yrkesskicklighet, lönekriterier och lönesamtal
-- =============================================

-- =============================================
-- 1. SALARY_REVIEW_CYCLES - Löneöversynscykler
-- =============================================
CREATE TABLE IF NOT EXISTS public.salary_review_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  year INTEGER NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planning' 
    CHECK (status IN ('planning', 'active', 'completed')),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(year)
);

ALTER TABLE public.salary_review_cycles ENABLE ROW LEVEL SECURITY;

-- RLS Policies för cycles
CREATE POLICY "Authenticated users can view cycles"
  ON public.salary_review_cycles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and VO chiefs can create cycles"
  ON public.salary_review_cycles FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'vo_chief')
    )
  );

CREATE POLICY "Admins and VO chiefs can update cycles"
  ON public.salary_review_cycles FOR UPDATE TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'vo_chief')
    )
  );

-- Index för cycles
CREATE INDEX IF NOT EXISTS idx_salary_review_cycles_year ON public.salary_review_cycles(year);
CREATE INDEX IF NOT EXISTS idx_salary_review_cycles_status ON public.salary_review_cycles(status);

-- Trigger för updated_at
CREATE TRIGGER set_salary_review_cycles_updated_at
  BEFORE UPDATE ON public.salary_review_cycles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 2. EMPLOYEES - Medarbetare
-- =============================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  category TEXT NOT NULL CHECK (category IN ('VUB', 'SSK', 'AMB')),
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employment_date DATE,
  current_salary DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS Policies för employees
-- Station managers can view their own employees
CREATE POLICY "Station managers can view their employees"
  ON public.employees FOR SELECT TO authenticated 
  USING (
    manager_id = auth.uid()
    OR
    -- VO chiefs can view all employees in their VO
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.stations s ON s.vo_id = p.vo_id
      WHERE p.id = auth.uid()
      AND p.role = 'vo_chief'
      AND s.id = employees.station_id
    )
    OR
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Station managers can create employees for their stations
CREATE POLICY "Station managers can create employees"
  ON public.employees FOR INSERT TO authenticated 
  WITH CHECK (
    manager_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_stations
      WHERE user_id = auth.uid()
      AND station_id = employees.station_id
    )
  );

-- Station managers can update their own employees
CREATE POLICY "Station managers can update their employees"
  ON public.employees FOR UPDATE TO authenticated 
  USING (
    manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
  );

-- Station managers can delete their own employees
CREATE POLICY "Station managers can delete their employees"
  ON public.employees FOR DELETE TO authenticated 
  USING (
    manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index för employees
CREATE INDEX IF NOT EXISTS idx_employees_manager_id ON public.employees(manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_station_id ON public.employees(station_id);
CREATE INDEX IF NOT EXISTS idx_employees_category ON public.employees(category);

-- Trigger för updated_at
CREATE TRIGGER set_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 3. SALARY_REVIEWS - Individuella löneöversyner
-- =============================================
CREATE TABLE IF NOT EXISTS public.salary_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID NOT NULL REFERENCES public.salary_review_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' 
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  is_particularly_skilled BOOLEAN, -- NULL för AMB, true/false för VUB/SSK
  proposed_salary DECIMAL(10,2),
  final_salary DECIMAL(10,2),
  meeting_date DATE,
  meeting_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(cycle_id, employee_id)
);

ALTER TABLE public.salary_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies för salary_reviews
CREATE POLICY "Users can view their own reviews"
  ON public.salary_reviews FOR SELECT TO authenticated 
  USING (
    manager_id = auth.uid()
    OR
    -- VO chiefs can view all reviews in their VO (read-only)
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.stations s ON s.vo_id = p.vo_id
      JOIN public.employees e ON e.station_id = s.id
      WHERE p.id = auth.uid()
      AND p.role = 'vo_chief'
      AND e.id = salary_reviews.employee_id
    )
    OR
    -- Admins can view all
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Station managers can create reviews"
  ON public.salary_reviews FOR INSERT TO authenticated 
  WITH CHECK (
    manager_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.employees
      WHERE id = salary_reviews.employee_id
      AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Station managers can update their reviews"
  ON public.salary_reviews FOR UPDATE TO authenticated 
  USING (
    manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Station managers can delete their reviews"
  ON public.salary_reviews FOR DELETE TO authenticated 
  USING (
    manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index för salary_reviews
CREATE INDEX IF NOT EXISTS idx_salary_reviews_cycle_id ON public.salary_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_salary_reviews_employee_id ON public.salary_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_reviews_manager_id ON public.salary_reviews(manager_id);
CREATE INDEX IF NOT EXISTS idx_salary_reviews_status ON public.salary_reviews(status);

-- Trigger för updated_at
CREATE TRIGGER set_salary_reviews_updated_at
  BEFORE UPDATE ON public.salary_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 4. PARTICULARLY_SKILLED_ASSESSMENTS - Bedömning särskild yrkesskicklighet
-- =============================================
CREATE TABLE IF NOT EXISTS public.particularly_skilled_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_review_id UUID NOT NULL REFERENCES public.salary_reviews(id) ON DELETE CASCADE,
  criterion_key TEXT NOT NULL, -- t.ex. "vub_1_a", "ssk_2_b"
  is_met BOOLEAN NOT NULL DEFAULT false,
  evidence TEXT, -- Konkreta exempel och bevis
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salary_review_id, criterion_key)
);

ALTER TABLE public.particularly_skilled_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies för particularly_skilled_assessments
CREATE POLICY "Users can view assessments for their reviews"
  ON public.particularly_skilled_assessments FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      WHERE sr.id = particularly_skilled_assessments.salary_review_id
      AND (
        sr.manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.stations s ON s.vo_id = p.vo_id
          JOIN public.employees e ON e.station_id = s.id
          WHERE p.id = auth.uid()
          AND p.role IN ('vo_chief', 'admin')
          AND e.id = sr.employee_id
        )
      )
    )
  );

CREATE POLICY "Station managers can manage assessments"
  ON public.particularly_skilled_assessments FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews
      WHERE id = particularly_skilled_assessments.salary_review_id
      AND manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salary_reviews
      WHERE id = particularly_skilled_assessments.salary_review_id
      AND manager_id = auth.uid()
    )
  );

-- Index för particularly_skilled_assessments
CREATE INDEX IF NOT EXISTS idx_particularly_skilled_salary_review_id 
  ON public.particularly_skilled_assessments(salary_review_id);

-- Trigger för updated_at
CREATE TRIGGER set_particularly_skilled_assessments_updated_at
  BEFORE UPDATE ON public.particularly_skilled_assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 5. SALARY_CRITERIA_ASSESSMENTS - Bedömning lönekriterier
-- =============================================
CREATE TABLE IF NOT EXISTS public.salary_criteria_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_review_id UUID NOT NULL REFERENCES public.salary_reviews(id) ON DELETE CASCADE,
  criterion_key TEXT NOT NULL, -- t.ex. "1", "2", "3", "4" för huvudkategorier
  sub_criterion_key TEXT NOT NULL, -- t.ex. "1a", "2b", etc.
  rating TEXT NOT NULL CHECK (rating IN ('behover_utvecklas', 'bra', 'mycket_bra', 'utmarkt')),
  evidence TEXT NOT NULL, -- Konkreta exempel
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(salary_review_id, sub_criterion_key)
);

ALTER TABLE public.salary_criteria_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies för salary_criteria_assessments
CREATE POLICY "Users can view criteria assessments for their reviews"
  ON public.salary_criteria_assessments FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      WHERE sr.id = salary_criteria_assessments.salary_review_id
      AND (
        sr.manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.stations s ON s.vo_id = p.vo_id
          JOIN public.employees e ON e.station_id = s.id
          WHERE p.id = auth.uid()
          AND p.role IN ('vo_chief', 'admin')
          AND e.id = sr.employee_id
        )
      )
    )
  );

CREATE POLICY "Station managers can manage criteria assessments"
  ON public.salary_criteria_assessments FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews
      WHERE id = salary_criteria_assessments.salary_review_id
      AND manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salary_reviews
      WHERE id = salary_criteria_assessments.salary_review_id
      AND manager_id = auth.uid()
    )
  );

-- Index för salary_criteria_assessments
CREATE INDEX IF NOT EXISTS idx_salary_criteria_assessments_salary_review_id 
  ON public.salary_criteria_assessments(salary_review_id);
CREATE INDEX IF NOT EXISTS idx_salary_criteria_assessments_rating 
  ON public.salary_criteria_assessments(rating);

-- Trigger för updated_at
CREATE TRIGGER set_salary_criteria_assessments_updated_at
  BEFORE UPDATE ON public.salary_criteria_assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 6. SALARY_MEETING_PREPARATIONS - Förberedelser lönesamtal
-- =============================================
CREATE TABLE IF NOT EXISTS public.salary_meeting_preparations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salary_review_id UUID NOT NULL REFERENCES public.salary_reviews(id) ON DELETE CASCADE UNIQUE,
  previous_agreements TEXT, -- Vad kom ni överens om förra året?
  goals_achieved BOOLEAN, -- Nåddes målen?
  contribution_summary TEXT, -- Hur har medarbetaren bidragit?
  salary_statistics JSONB, -- Lönespann, median, etc.
  development_needs TEXT, -- Utvecklingsområden
  strengths_summary TEXT, -- Styrkor
  ai_generated_summary TEXT, -- AI-genererad sammanfattning (optional)
  prepared_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.salary_meeting_preparations ENABLE ROW LEVEL SECURITY;

-- RLS Policies för salary_meeting_preparations
CREATE POLICY "Users can view meeting preparations for their reviews"
  ON public.salary_meeting_preparations FOR SELECT TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews sr
      WHERE sr.id = salary_meeting_preparations.salary_review_id
      AND (
        sr.manager_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          JOIN public.stations s ON s.vo_id = p.vo_id
          JOIN public.employees e ON e.station_id = s.id
          WHERE p.id = auth.uid()
          AND p.role IN ('vo_chief', 'admin')
          AND e.id = sr.employee_id
        )
      )
    )
  );

CREATE POLICY "Station managers can manage meeting preparations"
  ON public.salary_meeting_preparations FOR ALL TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.salary_reviews
      WHERE id = salary_meeting_preparations.salary_review_id
      AND manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salary_reviews
      WHERE id = salary_meeting_preparations.salary_review_id
      AND manager_id = auth.uid()
    )
  );

-- Index för salary_meeting_preparations
CREATE INDEX IF NOT EXISTS idx_salary_meeting_preparations_salary_review_id 
  ON public.salary_meeting_preparations(salary_review_id);

-- Trigger för updated_at
CREATE TRIGGER set_salary_meeting_preparations_updated_at
  BEFORE UPDATE ON public.salary_meeting_preparations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- DONE! Löneöversynsmodul databas färdig
-- =============================================
