-- =============================================
-- Station Manager Portal - Migration v3
-- Årshjul Integration - Dynamic Tasks System
-- =============================================

-- =============================================
-- 1. NEW TABLE: tasks (replaces recurring_tasks)
-- =============================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('HR', 'Finance', 'Safety', 'Operations')),
  
  -- Ownership
  owner_type TEXT NOT NULL CHECK (owner_type IN ('vo', 'station', 'personal')),
  vo_id UUID REFERENCES public.verksamhetsomraden(id) ON DELETE CASCADE,
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Time period
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  start_month INTEGER CHECK (start_month >= 1 AND start_month <= 12),
  end_month INTEGER CHECK (end_month >= 1 AND end_month <= 12),
  is_recurring_monthly BOOLEAN DEFAULT FALSE,
  deadline_day INTEGER DEFAULT 25 CHECK (deadline_day >= 1 AND deadline_day <= 31),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'not_started' 
    CHECK (status IN ('not_started', 'in_progress', 'done', 'reported')),
  
  -- Assignment
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  
  -- VO Review (for station tasks)
  vo_reviewed BOOLEAN DEFAULT FALSE,
  vo_reviewed_at TIMESTAMPTZ,
  vo_reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  vo_comment TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_vo_id ON public.tasks(vo_id);
CREATE INDEX IF NOT EXISTS idx_tasks_station_id ON public.tasks(station_id);
CREATE INDEX IF NOT EXISTS idx_tasks_year_month ON public.tasks(year, start_month);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_type ON public.tasks(owner_type);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Everyone can view tasks in their VO or station
CREATE POLICY "Users can view relevant tasks" 
  ON public.tasks FOR SELECT TO authenticated 
  USING (
    -- User is creator
    created_by = auth.uid()
    -- Or user is assigned
    OR assigned_to = auth.uid()
    -- Or user belongs to the same VO
    OR vo_id IN (SELECT vo_id FROM public.profiles WHERE id = auth.uid())
    -- Or user belongs to the same station
    OR station_id IN (
      SELECT station_id FROM public.user_stations WHERE user_id = auth.uid()
    )
    -- Or user is admin
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can create tasks
CREATE POLICY "Users can create tasks" 
  ON public.tasks FOR INSERT TO authenticated 
  WITH CHECK (
    created_by = auth.uid()
    AND (
      -- Station managers can create station tasks for their stations
      (owner_type = 'station' AND station_id IN (
        SELECT station_id FROM public.user_stations WHERE user_id = auth.uid()
      ))
      -- VO chiefs can create VO tasks for their VO
      OR (owner_type = 'vo' AND vo_id IN (
        SELECT vo_id FROM public.profiles WHERE id = auth.uid() AND role = 'vo_chief'
      ))
      -- VO chiefs can create personal tasks
      OR (owner_type = 'personal' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'vo_chief'
      ))
      -- Admins can create any task
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Users can update tasks they created or are assigned to
CREATE POLICY "Users can update relevant tasks" 
  ON public.tasks FOR UPDATE TO authenticated 
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    -- VO chiefs can update tasks in their VO
    OR (vo_id IN (SELECT vo_id FROM public.profiles WHERE id = auth.uid() AND role = 'vo_chief'))
    -- Admins can update any
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Only creators, VO chiefs, or admins can delete
CREATE POLICY "Users can delete their own tasks" 
  ON public.tasks FOR DELETE TO authenticated 
  USING (
    created_by = auth.uid()
    OR (vo_id IN (SELECT vo_id FROM public.profiles WHERE id = auth.uid() AND role = 'vo_chief'))
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 2. NEW TABLE: task_comments
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the task can see its comments
CREATE POLICY "Users can view comments on visible tasks" 
  ON public.task_comments FOR SELECT TO authenticated 
  USING (
    task_id IN (SELECT id FROM public.tasks)
  );

-- Users can insert comments on tasks they can see
CREATE POLICY "Users can add comments" 
  ON public.task_comments FOR INSERT TO authenticated 
  WITH CHECK (
    user_id = auth.uid()
    AND task_id IN (SELECT id FROM public.tasks)
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" 
  ON public.task_comments FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- =============================================
-- 3. NEW TABLE: task_attachments
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the task can see its attachments
CREATE POLICY "Users can view attachments on visible tasks" 
  ON public.task_attachments FOR SELECT TO authenticated 
  USING (
    task_id IN (SELECT id FROM public.tasks)
  );

-- Users can upload attachments to tasks they can see
CREATE POLICY "Users can upload attachments" 
  ON public.task_attachments FOR INSERT TO authenticated 
  WITH CHECK (
    uploaded_by = auth.uid()
    AND task_id IN (SELECT id FROM public.tasks)
  );

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments" 
  ON public.task_attachments FOR DELETE TO authenticated 
  USING (uploaded_by = auth.uid());

-- =============================================
-- 4. NEW TABLE: vo_reports
-- =============================================
CREATE TABLE IF NOT EXISTS public.vo_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vo_id UUID NOT NULL REFERENCES public.verksamhetsomraden(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('month', 'tertial')),
  period_value INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  summary TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vo_id, year, period_type, period_value)
);

CREATE INDEX IF NOT EXISTS idx_vo_reports_vo_id ON public.vo_reports(vo_id);

ALTER TABLE public.vo_reports ENABLE ROW LEVEL SECURITY;

-- VO chiefs can view their own reports
CREATE POLICY "VO chiefs can view their reports" 
  ON public.vo_reports FOR SELECT TO authenticated 
  USING (
    vo_id IN (SELECT vo_id FROM public.profiles WHERE id = auth.uid() AND role = 'vo_chief')
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- VO chiefs can create reports
CREATE POLICY "VO chiefs can create reports" 
  ON public.vo_reports FOR INSERT TO authenticated 
  WITH CHECK (
    created_by = auth.uid()
    AND vo_id IN (SELECT vo_id FROM public.profiles WHERE id = auth.uid() AND role = 'vo_chief')
  );

-- VO chiefs can update their draft reports
CREATE POLICY "VO chiefs can update their reports" 
  ON public.vo_reports FOR UPDATE TO authenticated 
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- VO chiefs can delete draft reports
CREATE POLICY "VO chiefs can delete draft reports" 
  ON public.vo_reports FOR DELETE TO authenticated 
  USING (
    created_by = auth.uid() AND status = 'draft'
  );

CREATE TRIGGER set_vo_reports_updated_at
  BEFORE UPDATE ON public.vo_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 5. SEED DATA: Årshjul 2026 Tasks
-- =============================================

-- Note: These will be created as 'vo' tasks under each VO
-- They can be modified/deleted by VO chiefs

-- For each VO, we'll insert the standard year wheel tasks
-- The admin user's ID will be used as created_by for seed data
-- In production, VO chiefs will manage these

-- Function to seed tasks for a VO
CREATE OR REPLACE FUNCTION seed_arshjul_for_vo(
  p_vo_id UUID,
  p_created_by UUID
) RETURNS void AS $$
BEGIN
  -- January
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, start_month, end_month, deadline_day)
  VALUES 
    ('Lansering kompetenstorget', 'Operations', 'vo', p_vo_id, p_created_by, 2026, 1, 1, 25),
    ('Helårsuppföljning av kort- och långtidssjukfrånvaro', 'HR', 'vo', p_vo_id, p_created_by, 2026, 1, 1, 25),
    ('Löneöversyn', 'Finance', 'vo', p_vo_id, p_created_by, 2026, 1, 1, 25),
    ('Handlingsplan OSA-kartläggning', 'Safety', 'vo', p_vo_id, p_created_by, 2026, 1, 1, 25);

  -- February
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, start_month, end_month, deadline_day)
  VALUES 
    ('Löneöversyn: lönesättning och lönesamtal med lönekriterier', 'Finance', 'vo', p_vo_id, p_created_by, 2026, 2, 2, 25),
    ('Uppföljning av LAS-tid i Heroma', 'HR', 'vo', p_vo_id, p_created_by, 2026, 2, 2, 25);

  -- March
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, start_month, end_month, deadline_day)
  VALUES 
    ('Löneöversyn: lönesättning och lönesamtal med lönekriterier', 'Finance', 'vo', p_vo_id, p_created_by, 2026, 3, 3, 25),
    ('Kontrollera bisyssla', 'HR', 'vo', p_vo_id, p_created_by, 2026, 3, 3, 25);

  -- April
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, start_month, end_month, deadline_day)
  VALUES 
    ('Nominering morgondagens chef', 'HR', 'vo', p_vo_id, p_created_by, 2026, 4, 4, 25),
    ('Löneöversyn utbetalning av ny lön', 'Finance', 'vo', p_vo_id, p_created_by, 2026, 4, 4, 25),
    ('Uppföljning handlingsplan OSA', 'Safety', 'vo', p_vo_id, p_created_by, 2026, 4, 4, 25),
    ('Uppföljning av LAS-tid i Heroma', 'HR', 'vo', p_vo_id, p_created_by, 2026, 4, 4, 25);

  -- May
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, start_month, end_month, deadline_day)
  VALUES 
    ('Uppföljning av övertid (>150 timmar)', 'Finance', 'vo', p_vo_id, p_created_by, 2026, 5, 5, 25),
    ('Uppföljning handlingsplan OSA', 'Safety', 'vo', p_vo_id, p_created_by, 2026, 5, 5, 25);

  -- June
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, start_month, end_month, deadline_day)
  VALUES 
    ('Uppföljning av LAS-tid i Heroma', 'HR', 'vo', p_vo_id, p_created_by, 2026, 6, 6, 25);

  -- August
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, start_month, end_month, deadline_day)
  VALUES 
    ('Utvecklingssamtal', 'HR', 'vo', p_vo_id, p_created_by, 2026, 8, 11, 25),
    ('Bisyssla', 'HR', 'vo', p_vo_id, p_created_by, 2026, 8, 10, 25),
    ('Uppföljning semesteruttag (20 dagar)', 'HR', 'vo', p_vo_id, p_created_by, 2026, 8, 9, 25),
    ('Uppföljning av LAS-tid i Heroma', 'HR', 'vo', p_vo_id, p_created_by, 2026, 8, 8, 25);

  -- September
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, start_month, end_month, deadline_day)
  VALUES 
    ('Uppföljning och stopp av övertid för medarbetare mer än 180 timmar', 'Finance', 'vo', p_vo_id, p_created_by, 2026, 9, 9, 25);

  -- October
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, start_month, end_month, deadline_day)
  VALUES 
    ('Avsluta ej aktuella intermittent anställda', 'HR', 'vo', p_vo_id, p_created_by, 2026, 10, 10, 25),
    ('OSA-kartläggning', 'Safety', 'vo', p_vo_id, p_created_by, 2026, 10, 10, 25),
    ('Uppföljning av LAS-tid i Heroma', 'HR', 'vo', p_vo_id, p_created_by, 2026, 10, 10, 25);

  -- November
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, start_month, end_month, deadline_day)
  VALUES 
    ('Presentera resultat OSA-kartläggning (APT)', 'Safety', 'vo', p_vo_id, p_created_by, 2026, 11, 12, 25),
    ('Uppföljning av LAS-tid i Heroma', 'HR', 'vo', p_vo_id, p_created_by, 2026, 11, 11, 25);

  -- Monthly recurring tasks
  INSERT INTO public.tasks (title, category, owner_type, vo_id, created_by, year, is_recurring_monthly, deadline_day)
  VALUES 
    ('Kontroll av övertid', 'Finance', 'vo', p_vo_id, p_created_by, 2026, TRUE, 25),
    ('Kör provlön i Heroma', 'Finance', 'vo', p_vo_id, p_created_by, 2026, TRUE, 25),
    ('Uppföljning av sjukfrånvaro', 'HR', 'vo', p_vo_id, p_created_by, 2026, TRUE, 25);

END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DONE! 
-- Run: SELECT seed_arshjul_for_vo('vo_id_here', 'admin_user_id_here');
-- for each VO after an admin user is created
-- =============================================
