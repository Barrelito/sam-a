-- Fix weekly_newsletters RLS policies to work without profiles table
-- Run this to fix the "newsletter could not be loaded" issue

-- Drop existing policies
DROP POLICY IF EXISTS "Managers can view newsletters for their stations" ON public.weekly_newsletters;
DROP POLICY IF EXISTS "Managers can create newsletters for their stations" ON public.weekly_newsletters;
DROP POLICY IF EXISTS "Managers can update newsletters for their stations" ON public.weekly_newsletters;
DROP POLICY IF EXISTS "Managers can delete their draft newsletters" ON public.weekly_newsletters;

-- Temporarily disable foreign key constraint to profiles (if it exists)
ALTER TABLE public.weekly_newsletters 
    ALTER COLUMN created_by DROP NOT NULL;

-- SIMPLIFIED RLS POLICIES (without profiles table dependency)

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
);

-- 2. Managers can create newsletters for their stations
CREATE POLICY "Managers can create newsletters for their stations"
ON public.weekly_newsletters FOR INSERT TO authenticated
WITH CHECK (
    -- User manages this station
    EXISTS (
        SELECT 1 
        FROM public.user_stations us
        WHERE us.station_id = station_id
        AND us.user_id = auth.uid()
    )
);

-- 3. Managers can update newsletters for their stations
CREATE POLICY "Managers can update newsletters for their stations"
ON public.weekly_newsletters FOR UPDATE TO authenticated
USING (
    -- User manages this station
    EXISTS (
        SELECT 1 
        FROM public.user_stations us
        WHERE us.station_id = weekly_newsletters.station_id
        AND us.user_id = auth.uid()
    )
);

-- 4. Managers can delete their draft newsletters
CREATE POLICY "Managers can delete their draft newsletters"
ON public.weekly_newsletters FOR DELETE TO authenticated
USING (
    status = 'draft'
    AND EXISTS (
        SELECT 1 
        FROM public.user_stations us
        WHERE us.station_id = weekly_newsletters.station_id
        AND us.user_id = auth.uid()
    )
);

COMMENT ON POLICY "Managers can view newsletters for their stations" 
ON public.weekly_newsletters 
IS 'Simplified RLS - allows managers to view newsletters for stations they manage';
