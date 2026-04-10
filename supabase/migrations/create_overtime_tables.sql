-- =============================================
-- Migration: Övertidsuppföljning (HERCMA)
-- Skapar tabeller för att spåra övertid från
-- HERCMA-exporter med gränsvärden och varningar.
-- =============================================

-- =============================================
-- 1. OVERTIME_REPORTS
-- =============================================

CREATE TABLE IF NOT EXISTS public.overtime_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'exported')),
  parse_warnings JSONB DEFAULT '[]'::jsonb,
  employee_count INTEGER DEFAULT 0,
  station_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.overtime_reports ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE TRIGGER set_overtime_reports_updated_at
  BEFORE UPDATE ON public.overtime_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_overtime_reports_uploaded_by ON public.overtime_reports(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_overtime_reports_period ON public.overtime_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_overtime_reports_status ON public.overtime_reports(status);

-- RLS Policies for overtime_reports

-- SELECT: admin, vo_chief, or user with station/station_group access, or uploader
CREATE POLICY "View overtime reports"
  ON public.overtime_reports FOR SELECT TO authenticated
  USING (
    -- Admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- VO Chief (sees all in their VO)
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'vo_chief'
    )
    OR
    -- Uploader always sees own reports
    uploaded_by = auth.uid()
    OR
    -- Area manager via station groups
    EXISTS (
      SELECT 1 FROM public.user_station_groups
      WHERE user_id = auth.uid()
    )
    OR
    -- Station manager via user_stations
    EXISTS (
      SELECT 1 FROM public.user_stations
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: managers and above
CREATE POLICY "Create overtime reports"
  ON public.overtime_reports FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'vo_chief', 'area_manager', 'station_manager')
    )
  );

-- UPDATE: uploader or admin/vo_chief
CREATE POLICY "Update overtime reports"
  ON public.overtime_reports FOR UPDATE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
  );

-- DELETE: uploader or admin
CREATE POLICY "Delete overtime reports"
  ON public.overtime_reports FOR DELETE TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- 2. OVERTIME_ENTRIES
-- =============================================

CREATE TABLE IF NOT EXISTS public.overtime_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES public.overtime_reports(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  raw_name TEXT NOT NULL,
  matched_name TEXT,
  category TEXT NOT NULL CHECK (category IN ('VUB', 'SSK', 'AMB')),
  station_id UUID REFERENCES public.stations(id) ON DELETE SET NULL,
  station_name TEXT NOT NULL,
  fmgrp INTEGER,
  overtime_monthly DECIMAL(8,2) DEFAULT 0,
  overtime_total DECIMAL(8,2) DEFAULT 0,
  extra_time_monthly DECIMAL(8,2) DEFAULT 0,
  extra_time_total DECIMAL(8,2) DEFAULT 0,
  worked_time_monthly DECIMAL(8,2) DEFAULT 0,
  worked_time_total DECIMAL(8,2) DEFAULT 0,
  monthly_alert TEXT NOT NULL DEFAULT 'none'
    CHECK (monthly_alert IN ('none', 'warning', 'breach')),
  yearly_alert TEXT NOT NULL DEFAULT 'none'
    CHECK (yearly_alert IN ('none', 'warning', 'breach')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_overtime_entries_report ON public.overtime_entries(report_id);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_employee ON public.overtime_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_station ON public.overtime_entries(station_id);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_alerts ON public.overtime_entries(monthly_alert, yearly_alert);

ALTER TABLE public.overtime_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for overtime_entries
-- Access entries if you can access the report or station

-- SELECT: multi-role access
CREATE POLICY "View overtime entries"
  ON public.overtime_entries FOR SELECT TO authenticated
  USING (
    -- Admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- VO Chief
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'vo_chief'
    )
    OR
    -- Report uploader
    EXISTS (
      SELECT 1 FROM public.overtime_reports r
      WHERE r.id = overtime_entries.report_id
      AND r.uploaded_by = auth.uid()
    )
    OR
    -- Area manager via station_group -> station
    (
      station_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_station_groups usg
        JOIN public.station_group_members sgm
          ON sgm.station_group_id = usg.station_group_id
        WHERE usg.user_id = auth.uid()
        AND sgm.station_id = overtime_entries.station_id
      )
    )
    OR
    -- Station manager via user_stations
    (
      station_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_stations us
        WHERE us.user_id = auth.uid()
        AND us.station_id = overtime_entries.station_id
      )
    )
  );

-- INSERT: via report uploader or admin/vo_chief
CREATE POLICY "Create overtime entries"
  ON public.overtime_entries FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.overtime_reports r
      WHERE r.id = report_id
      AND r.uploaded_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'vo_chief')
    )
  );

-- DELETE: via report uploader or admin
CREATE POLICY "Delete overtime entries"
  ON public.overtime_entries FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.overtime_reports r
      WHERE r.id = overtime_entries.report_id
      AND r.uploaded_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- DONE
-- =============================================
