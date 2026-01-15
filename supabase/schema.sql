-- =============================================
-- Station Manager Portal - Database Schema
-- Version 2.1 - Fixed table order
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES (Must be first - others reference it)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'assistant_manager' 
    CHECK (role IN ('admin', 'vo_chief', 'station_manager', 'assistant_manager')),
  vo_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" 
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles" 
  ON public.profiles FOR INSERT TO authenticated 
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- 2. VERKSAMHETSOMRADEN (Operational Areas)
-- =============================================
CREATE TABLE IF NOT EXISTS public.verksamhetsomraden (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.verksamhetsomraden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view VO areas" 
  ON public.verksamhetsomraden FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage VO areas" 
  ON public.verksamhetsomraden FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Add foreign key to profiles now that verksamhetsomraden exists
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_vo_id_fkey 
  FOREIGN KEY (vo_id) REFERENCES public.verksamhetsomraden(id) ON DELETE SET NULL;

-- =============================================
-- 3. STATIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  vo_id UUID NOT NULL REFERENCES public.verksamhetsomraden(id) ON DELETE CASCADE,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, vo_id)
);

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stations" 
  ON public.stations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage stations" 
  ON public.stations FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- 4. USER_STATIONS (Many-to-Many)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, station_id)
);

ALTER TABLE public.user_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view user-station assignments" 
  ON public.user_stations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage user-station assignments" 
  ON public.user_stations FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================
-- 5. RECURRING_TASKS
-- =============================================
CREATE TABLE IF NOT EXISTS public.recurring_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  month INTEGER CHECK (month IS NULL OR (month >= 1 AND month <= 12)),
  tertial INTEGER NOT NULL CHECK (tertial >= 1 AND tertial <= 3),
  category TEXT NOT NULL CHECK (category IN ('HR', 'Finance', 'Safety', 'Operations')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'done')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  station_id UUID REFERENCES public.stations(id) ON DELETE SET NULL,
  notes TEXT,
  is_recurring_monthly BOOLEAN NOT NULL DEFAULT FALSE,
  year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tasks" 
  ON public.recurring_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert tasks" 
  ON public.recurring_tasks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks" 
  ON public.recurring_tasks FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete tasks" 
  ON public.recurring_tasks FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_month ON public.recurring_tasks(month);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_year ON public.recurring_tasks(year);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_assigned_to ON public.recurring_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_recurring_tasks_station_id ON public.recurring_tasks(station_id);

-- =============================================
-- 6. TASK_LOGS (Audit Trail)
-- =============================================
CREATE TABLE IF NOT EXISTS public.task_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.recurring_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('status_change', 'comment', 'assignment', 'created')),
  old_status TEXT,
  new_status TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view logs" 
  ON public.task_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert logs" 
  ON public.task_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_task_logs_task_id ON public.task_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_logs_user_id ON public.task_logs(user_id);

-- =============================================
-- 7. TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_verksamhetsomraden_updated_at
  BEFORE UPDATE ON public.verksamhetsomraden
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_stations_updated_at
  BEFORE UPDATE ON public.stations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_recurring_tasks_updated_at
  BEFORE UPDATE ON public.recurring_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- 8. NEW USER TRIGGER (First user = admin)
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin'
      ELSE 'assistant_manager'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 9. SEED DATA
-- =============================================

-- Verksamhetsområden
INSERT INTO public.verksamhetsomraden (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'VO Nord', 'Verksamhetsområde Nord'),
  ('22222222-2222-2222-2222-222222222222', 'VO Mitt', 'Verksamhetsområde Mitt'),
  ('33333333-3333-3333-3333-333333333333', 'VO Syd', 'Verksamhetsområde Syd')
ON CONFLICT (name) DO NOTHING;

-- Stations (VO Nord)
INSERT INTO public.stations (id, name, vo_id) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'Norrtälje', '11111111-1111-1111-1111-111111111111'),
  ('aaaa2222-2222-2222-2222-222222222222', 'Rimbo', '11111111-1111-1111-1111-111111111111'),
  ('aaaa3333-3333-3333-3333-333333333333', 'Hallstavik', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (name, vo_id) DO NOTHING;

-- Year Wheel Tasks (General)
INSERT INTO public.recurring_tasks (title, month, tertial, category, status, station_id, notes) VALUES
  ('Lansering kompetenstorget', 1, 1, 'HR', 'not_started', NULL, NULL),
  ('Helårsuppföljning kort/långtidsfrånvaro', 1, 1, 'HR', 'not_started', NULL, NULL),
  ('Löneöversyn', 1, 1, 'Finance', 'not_started', NULL, NULL),
  ('Handlingsplan OSA', 1, 1, 'Safety', 'not_started', NULL, NULL),
  ('Lönesamtal', 2, 1, 'Finance', 'not_started', NULL, NULL),
  ('Uppföljning sjukfrånvaro', 2, 1, 'HR', 'not_started', NULL, NULL),
  ('Kontroll övertid', 2, 1, 'Finance', 'not_started', NULL, NULL),
  ('Kör provlön i Heroma', 2, 1, 'Finance', 'not_started', NULL, NULL),
  ('Utvecklingssamtal', 11, 3, 'HR', 'not_started', NULL, NULL),
  ('Uppföljning LAS-tid', 11, 3, 'HR', 'not_started', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Recurring Monthly Tasks
INSERT INTO public.recurring_tasks (title, month, tertial, category, status, is_recurring_monthly, notes) VALUES
  ('Kontroll av övertid (månadsvis)', NULL, 1, 'Finance', 'not_started', TRUE, 'Återkommande varje månad'),
  ('Uppföljning sjukfrånvaro (månadsvis)', NULL, 1, 'HR', 'not_started', TRUE, 'Återkommande varje månad')
ON CONFLICT DO NOTHING;

-- =============================================
-- DONE!
-- =============================================
