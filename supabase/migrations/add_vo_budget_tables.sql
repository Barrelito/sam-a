-- VO Budget Management Tables
-- För VO-chefer att hantera budgetar och fördela till stationer

-- ==============================================
-- VO Cycle Budgets
-- Total budget per VO och löneöversynscykel
-- ==============================================

CREATE TABLE IF NOT EXISTS public.vo_cycle_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES public.salary_review_cycles(id) ON DELETE CASCADE,
  vo_id UUID NOT NULL REFERENCES public.verksamhetsomraden(id) ON DELETE CASCADE,
  total_budget DECIMAL(12, 2) NOT NULL CHECK (total_budget >= 0),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, vo_id)
);

COMMENT ON TABLE public.vo_cycle_budgets IS 'Total budget för varje VO per löneöversynscykel';
COMMENT ON COLUMN public.vo_cycle_budgets.total_budget IS 'Total budget i SEK som VO-chef har att fördela';

-- ==============================================
-- Station Budget Allocations
-- Fördelning av VO-budget till individuella stationer
-- ==============================================

CREATE TABLE IF NOT EXISTS public.station_budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vo_cycle_budget_id UUID NOT NULL REFERENCES public.vo_cycle_budgets(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(12, 2) NOT NULL CHECK (allocated_amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vo_cycle_budget_id, station_id)
);

COMMENT ON TABLE public.station_budget_allocations IS 'Budget allokerad från VO till varje station';
COMMENT ON COLUMN public.station_budget_allocations.allocated_amount IS 'Summa i SEK allokerad till denna station';

-- ==============================================
-- Indexes för performance
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_vo_cycle_budgets_cycle ON public.vo_cycle_budgets(cycle_id);
CREATE INDEX IF NOT EXISTS idx_vo_cycle_budgets_vo ON public.vo_cycle_budgets(vo_id);
CREATE INDEX IF NOT EXISTS idx_station_allocations_budget ON public.station_budget_allocations(vo_cycle_budget_id);
CREATE INDEX IF NOT EXISTS idx_station_allocations_station ON public.station_budget_allocations(station_id);

-- ==============================================
-- Row Level Security (RLS) Policies
-- ==============================================

ALTER TABLE public.vo_cycle_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.station_budget_allocations ENABLE ROW LEVEL SECURITY;

-- VO chiefs kan se sina egna VO budgetar
CREATE POLICY "VO chiefs can view their VO budgets"
  ON public.vo_cycle_budgets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.vo_id = vo_cycle_budgets.vo_id
    )
  );

-- VO chiefs kan skapa och uppdatera sina VO budgetar
CREATE POLICY "VO chiefs can insert their VO budgets"
  ON public.vo_cycle_budgets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'vo_chief'
      AND profiles.vo_id = vo_cycle_budgets.vo_id
    )
  );

CREATE POLICY "VO chiefs can update their VO budgets"
  ON public.vo_cycle_budgets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'vo_chief'
      AND profiles.vo_id = vo_cycle_budgets.vo_id
    )
  );

-- VO chiefs och stationschefer kan se relevanta station allocations
CREATE POLICY "Users can view relevant station allocations"
  ON public.station_budget_allocations FOR SELECT
  USING (
    -- Station managers ser sin egen stations budget
    EXISTS (
      SELECT 1 FROM public.user_stations 
      WHERE user_stations.station_id = station_budget_allocations.station_id 
      AND user_stations.user_id = auth.uid()
    )
    OR
    -- VO chiefs ser alla stationer i sitt VO
    EXISTS (
      SELECT 1 FROM public.vo_cycle_budgets vcb
      JOIN public.profiles p ON p.vo_id = vcb.vo_id
      WHERE vcb.id = station_budget_allocations.vo_cycle_budget_id 
      AND p.id = auth.uid()
    )
  );

-- VO chiefs kan skapa och uppdatera station allocations
CREATE POLICY "VO chiefs can manage station allocations"
  ON public.station_budget_allocations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vo_cycle_budgets vcb
      JOIN public.profiles p ON p.vo_id = vcb.vo_id
      WHERE vcb.id = station_budget_allocations.vo_cycle_budget_id 
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "VO chiefs can update station allocations"
  ON public.station_budget_allocations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.vo_cycle_budgets vcb
      JOIN public.profiles p ON p.vo_id = vcb.vo_id
      WHERE vcb.id = station_budget_allocations.vo_cycle_budget_id 
      AND p.id = auth.uid()
    )
  );

-- ==============================================
-- Functions för automatisk updated_at
-- ==============================================

CREATE OR REPLACE FUNCTION update_vo_budget_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vo_cycle_budgets_updated_at
  BEFORE UPDATE ON public.vo_cycle_budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_vo_budget_updated_at();

CREATE TRIGGER update_station_allocations_updated_at
  BEFORE UPDATE ON public.station_budget_allocations
  FOR EACH ROW
  EXECUTE FUNCTION update_vo_budget_updated_at();
