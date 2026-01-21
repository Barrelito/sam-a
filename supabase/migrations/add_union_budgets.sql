-- =============================================
-- Migration: Separera Budget per Avtalsområde
-- Vårdförbundet (SSK/VUB) vs Kommunal (AMB)
-- =============================================

-- 1. VO Union Budgets - Budget per avtalsområde per VO
CREATE TABLE IF NOT EXISTS public.vo_union_budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID NOT NULL REFERENCES public.salary_review_cycles(id) ON DELETE CASCADE,
  vo_id UUID NOT NULL REFERENCES public.verksamhetsomraden(id) ON DELETE CASCADE,
  union_type TEXT NOT NULL CHECK (union_type IN ('vardförbundet', 'kommunal')),
  
  -- Vårdförbundet-specifika fält
  total_budget DECIMAL(10,2),           -- Totalbudget att fördela poängbaserat
  extra_skilled_amount DECIMAL(10,2),   -- Extra kr/mån per Särskilt yrkesskicklig
  
  -- Kommunal-specifika fält  
  guaranteed_per_employee DECIMAL(10,2), -- Fast summa per anställd (t.ex. 600 kr/mån)
  variable_budget DECIMAL(10,2),         -- Rörlig budget för poängfördelning
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cycle_id, vo_id, union_type)
);

ALTER TABLE public.vo_union_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policy - VO chiefs and admins can manage
CREATE POLICY "VO chiefs can manage union budgets"
  ON public.vo_union_budgets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR (p.role = 'vo_chief' AND p.vo_id = vo_union_budgets.vo_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role = 'admin'
        OR (p.role = 'vo_chief' AND p.vo_id = vo_id)
      )
    )
  );

-- RLS Policy - Station managers can view relevant union budgets (needed for calculations)
CREATE POLICY "Station managers can view relevant union budgets"
  ON public.vo_union_budgets FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stations s
      JOIN public.user_stations us ON us.station_id = s.id
      WHERE us.user_id = auth.uid()
      AND s.vo_id = vo_union_budgets.vo_id
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_vo_union_budgets_cycle_vo 
  ON public.vo_union_budgets(cycle_id, vo_id);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER set_vo_union_budgets_updated_at
  BEFORE UPDATE ON public.vo_union_budgets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 2. Station Union Allocations - Fördelning per station per avtalsområde
-- =============================================
CREATE TABLE IF NOT EXISTS public.station_union_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vo_union_budget_id UUID NOT NULL REFERENCES public.vo_union_budgets(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  allocated_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(vo_union_budget_id, station_id)
);

ALTER TABLE public.station_union_allocations ENABLE ROW LEVEL SECURITY;

-- RLS Policy - Manage
CREATE POLICY "Users can manage station union allocations"
  ON public.station_union_allocations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vo_union_budgets vub
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE vub.id = station_union_allocations.vo_union_budget_id
      AND (
        p.role = 'admin'
        OR (p.role = 'vo_chief' AND p.vo_id = vub.vo_id)
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vo_union_budgets vub
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE vub.id = vo_union_budget_id
      AND (
        p.role = 'admin'
        OR (p.role = 'vo_chief' AND p.vo_id = vub.vo_id)
      )
    )
  );

-- RLS Policy - Station managers can view their allocations
CREATE POLICY "Station managers can view their allocations"
  ON public.station_union_allocations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_stations us
      WHERE us.user_id = auth.uid()
      AND us.station_id = station_union_allocations.station_id
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_station_union_allocations_budget 
  ON public.station_union_allocations(vo_union_budget_id);
CREATE INDEX IF NOT EXISTS idx_station_union_allocations_station 
  ON public.station_union_allocations(station_id);

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER set_station_union_allocations_updated_at
  BEFORE UPDATE ON public.station_union_allocations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- DONE
-- =============================================
