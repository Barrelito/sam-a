-- =============================================
-- Weekly Newsletter System
-- =============================================
-- Allows managers to create AI-powered newsletters
-- Organized by week number with full archive

-- 1. Create weekly_newsletters table
CREATE TABLE IF NOT EXISTS public.weekly_newsletters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
    
    -- Week identification
    year INTEGER NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 53),
    
    -- Content stages
    raw_bullets JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_suggestions JSONB DEFAULT NULL,
    generated_content TEXT DEFAULT NULL,
    final_content TEXT DEFAULT NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ DEFAULT NULL,
    
    -- Ensure one newsletter per station per week
    UNIQUE(station_id, year, week_number)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_weekly_newsletters_station_id 
    ON public.weekly_newsletters(station_id);
    
CREATE INDEX IF NOT EXISTS idx_weekly_newsletters_year_week 
    ON public.weekly_newsletters(year, week_number);
    
CREATE INDEX IF NOT EXISTS idx_weekly_newsletters_status 
    ON public.weekly_newsletters(status);
    
CREATE INDEX IF NOT EXISTS idx_weekly_newsletters_created_by 
    ON public.weekly_newsletters(created_by);

-- 3. Enable RLS
ALTER TABLE public.weekly_newsletters ENABLE ROW LEVEL SECURITY;

-- 4. Create updated_at trigger
CREATE TRIGGER set_weekly_newsletters_updated_at
    BEFORE UPDATE ON public.weekly_newsletters
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- RLS POLICIES
-- =============================================

-- 1. Managers can view newsletters for their stations
CREATE POLICY "Managers can view newsletters for their stations"
ON public.weekly_newsletters FOR SELECT TO authenticated
USING (
    -- User manages this station
    EXISTS (
        SELECT 1 
        FROM public.user_stations us
        WHERE us.station_id = weekly_newsletters.station_id
        AND us.user_id = auth.uid()
    )
    -- OR user is VO chief for this station's VO
    OR EXISTS (
        SELECT 1
        FROM public.stations s
        WHERE s.id = weekly_newsletters.station_id
        AND s.vo_id IN (
            SELECT vo_id 
            FROM public.profiles 
            WHERE id = auth.uid() AND role = 'vo_chief'
        )
    )
    -- OR user is admin
    OR EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 2. Managers can create newsletters for their stations
CREATE POLICY "Managers can create newsletters for their stations"
ON public.weekly_newsletters FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid() AND (
        -- User manages this station
        EXISTS (
            SELECT 1 
            FROM public.user_stations us
            WHERE us.station_id = station_id
            AND us.user_id = auth.uid()
        )
        -- OR user is VO chief for this station's VO
        OR EXISTS (
            SELECT 1
            FROM public.stations s
            WHERE s.id = station_id
            AND s.vo_id IN (
                SELECT vo_id 
                FROM public.profiles 
                WHERE id = auth.uid() AND role = 'vo_chief'
            )
        )
        -- OR user is admin
        OR EXISTS (
            SELECT 1 
            FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
);

-- 3. Managers can update newsletters they can view
CREATE POLICY "Managers can update newsletters for their stations"
ON public.weekly_newsletters FOR UPDATE TO authenticated
USING (
    -- Same as SELECT policy
    EXISTS (
        SELECT 1 
        FROM public.user_stations us
        WHERE us.station_id = weekly_newsletters.station_id
        AND us.user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1
        FROM public.stations s
        WHERE s.id = weekly_newsletters.station_id
        AND s.vo_id IN (
            SELECT vo_id 
            FROM public.profiles 
            WHERE id = auth.uid() AND role = 'vo_chief'
        )
    )
    OR EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 4. Managers can delete drafts they created (or admins can delete any)
CREATE POLICY "Managers can delete their draft newsletters"
ON public.weekly_newsletters FOR DELETE TO authenticated
USING (
    (created_by = auth.uid() AND status = 'draft')
    OR EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);
