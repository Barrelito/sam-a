-- =============================================
-- Station Groups Migration
-- Adds station_groups (stationsområden) feature
-- =============================================

-- =============================================
-- 1. STATION_GROUPS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.station_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  vo_id UUID NOT NULL REFERENCES public.verksamhetsomraden(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(name, vo_id)
);

-- RLS for station_groups
ALTER TABLE public.station_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view station groups"
  ON public.station_groups FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage station groups"
  ON public.station_groups FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- VO chiefs can manage station groups in their VO
CREATE POLICY "VO chiefs can manage their station groups"
  ON public.station_groups FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'vo_chief' 
      AND vo_id = station_groups.vo_id
    )
  );

-- Trigger for updated_at
CREATE TRIGGER set_station_groups_updated_at
  BEFORE UPDATE ON public.station_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_station_groups_vo_id ON public.station_groups(vo_id);

-- =============================================
-- 2. STATION_GROUP_MEMBERS TABLE (Many-to-Many)
-- =============================================
CREATE TABLE IF NOT EXISTS public.station_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  station_group_id UUID NOT NULL REFERENCES public.station_groups(id) ON DELETE CASCADE,
  station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(station_group_id, station_id)
);

-- RLS for station_group_members
ALTER TABLE public.station_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view station group members"
  ON public.station_group_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage station group members"
  ON public.station_group_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- VO chiefs can manage members for their station groups
CREATE POLICY "VO chiefs can manage their station group members"
  ON public.station_group_members FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.station_groups sg
      JOIN public.profiles p ON p.vo_id = sg.vo_id
      WHERE sg.id = station_group_members.station_group_id
      AND p.id = auth.uid()
      AND p.role = 'vo_chief'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_station_group_members_group_id ON public.station_group_members(station_group_id);
CREATE INDEX IF NOT EXISTS idx_station_group_members_station_id ON public.station_group_members(station_id);

-- =============================================
-- 3. ADD station_group_id TO TASKS TABLE
-- =============================================
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS station_group_id UUID REFERENCES public.station_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_station_group_id ON public.tasks(station_group_id);

-- =============================================
-- 4. SEED DATA - Create "Roslagen" station group
-- =============================================
DO $$
DECLARE
  roslagen_group_id UUID;
BEGIN
  -- Create Roslagen station group for VO Nord
  INSERT INTO public.station_groups (id, name, description, vo_id)
  VALUES (
    'bbbb1111-1111-1111-1111-111111111111',
    'Roslagen',
    'Stationsområde Roslagen - Norrtälje, Rimbo, Hallstavik',
    '11111111-1111-1111-1111-111111111111'  -- VO Nord
  )
  ON CONFLICT (name, vo_id) DO NOTHING
  RETURNING id INTO roslagen_group_id;
  
  -- If the group was created, add the stations
  IF roslagen_group_id IS NOT NULL THEN
    -- Add Norrtälje
    INSERT INTO public.station_group_members (station_group_id, station_id)
    VALUES (roslagen_group_id, 'aaaa1111-1111-1111-1111-111111111111')
    ON CONFLICT DO NOTHING;
    
    -- Add Rimbo
    INSERT INTO public.station_group_members (station_group_id, station_id)
    VALUES (roslagen_group_id, 'aaaa2222-2222-2222-2222-222222222222')
    ON CONFLICT DO NOTHING;
    
    -- Add Hallstavik
    INSERT INTO public.station_group_members (station_group_id, station_id)
    VALUES (roslagen_group_id, 'aaaa3333-3333-3333-3333-333333333333')
    ON CONFLICT DO NOTHING;
  ELSE
    -- Group already exists, try to add members using the existing group
    INSERT INTO public.station_group_members (station_group_id, station_id)
    SELECT 'bbbb1111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111'
    WHERE EXISTS (SELECT 1 FROM public.station_groups WHERE id = 'bbbb1111-1111-1111-1111-111111111111')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.station_group_members (station_group_id, station_id)
    SELECT 'bbbb1111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222'
    WHERE EXISTS (SELECT 1 FROM public.station_groups WHERE id = 'bbbb1111-1111-1111-1111-111111111111')
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.station_group_members (station_group_id, station_id)
    SELECT 'bbbb1111-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333'
    WHERE EXISTS (SELECT 1 FROM public.station_groups WHERE id = 'bbbb1111-1111-1111-1111-111111111111')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =============================================
-- DONE!
-- =============================================
