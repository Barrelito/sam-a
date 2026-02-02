-- Add station_group_id support to weekly_newsletters
-- Allows creating newsletters for either individual stations or station groups

-- Add station_group_id column
ALTER TABLE public.weekly_newsletters 
ADD COLUMN IF NOT EXISTS station_group_id UUID REFERENCES public.station_groups(id) ON DELETE SET NULL;

-- Make station_id nullable since we can use station_group_id instead
ALTER TABLE public.weekly_newsletters 
ALTER COLUMN station_id DROP NOT NULL;

-- Add constraint: require at least one (station_id OR station_group_id)
ALTER TABLE public.weekly_newsletters
ADD CONSTRAINT weekly_newsletters_station_or_group_check 
CHECK (
    (station_id IS NOT NULL AND station_group_id IS NULL) OR
    (station_id IS NULL AND station_group_id IS NOT NULL)
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_weekly_newsletters_station_group_id 
ON public.weekly_newsletters(station_group_id);

-- Update RLS policies to support station groups
DROP POLICY IF EXISTS "Managers can view newsletters for their stations" ON public.weekly_newsletters;
DROP POLICY IF EXISTS "Managers can create newsletters for their stations" ON public.weekly_newsletters;
DROP POLICY IF EXISTS "Managers can update newsletters for their stations" ON public.weekly_newsletters;
DROP POLICY IF EXISTS "Managers can delete their draft newsletters" ON public.weekly_newsletters;

-- 1. SELECT: Managers can view newsletters for their stations OR station groups
CREATE POLICY "Managers can view newsletters for their stations or groups"
ON public.weekly_newsletters FOR SELECT TO authenticated
USING (
    -- User manages the individual station
    (
        station_id IS NOT NULL
        AND EXISTS (
            SELECT 1 
            FROM public.user_stations us
            WHERE us.station_id = weekly_newsletters.station_id
            AND us.user_id = auth.uid()
        )
    )
    OR
    -- User manages a station that belongs to this station group
    (
        station_group_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.station_group_members sgm
            JOIN public.user_stations us ON us.station_id = sgm.station_id
            WHERE sgm.station_group_id = weekly_newsletters.station_group_id
            AND us.user_id = auth.uid()
        )
    )
);

-- 2. INSERT: Managers can create newsletters for their stations OR groups they manage
CREATE POLICY "Managers can create newsletters for their stations or groups"
ON public.weekly_newsletters FOR INSERT TO authenticated
WITH CHECK (
    -- Creating for individual station
    (
        station_id IS NOT NULL
        AND EXISTS (
            SELECT 1 
            FROM public.user_stations us
            WHERE us.station_id = weekly_newsletters.station_id
            AND us.user_id = auth.uid()
        )
    )
    OR
    -- Creating for station group
    (
        station_group_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.station_group_members sgm
            JOIN public.user_stations us ON us.station_id = sgm.station_id
            WHERE sgm.station_group_id = weekly_newsletters.station_group_id
            AND us.user_id = auth.uid()
        )
    )
);

-- 3. UPDATE: Managers can update newsletters for their stations OR groups
CREATE POLICY "Managers can update newsletters for their stations or groups"
ON public.weekly_newsletters FOR UPDATE TO authenticated
USING (
    -- User manages the individual station
    (
        station_id IS NOT NULL
        AND EXISTS (
            SELECT 1 
            FROM public.user_stations us
            WHERE us.station_id = weekly_newsletters.station_id
            AND us.user_id = auth.uid()
        )
    )
    OR
    -- User manages a station in this group
    (
        station_group_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.station_group_members sgm
            JOIN public.user_stations us ON us.station_id = sgm.station_id
            WHERE sgm.station_group_id = weekly_newsletters.station_group_id
            AND us.user_id = auth.uid()
        )
    )
);

-- 4. DELETE: Managers can delete draft newsletters for their stations OR groups
CREATE POLICY "Managers can delete draft newsletters for their stations or groups"
ON public.weekly_newsletters FOR DELETE TO authenticated
USING (
    status = 'draft'
    AND (
        -- User manages the individual station
        (
            station_id IS NOT NULL
            AND EXISTS (
                SELECT 1 
                FROM public.user_stations us
                WHERE us.station_id = weekly_newsletters.station_id
                AND us.user_id = auth.uid()
            )
        )
        OR
        -- User manages a station in this group
        (
            station_group_id IS NOT NULL
            AND EXISTS (
                SELECT 1
                FROM public.station_group_members sgm
                JOIN public.user_stations us ON us.station_id = sgm.station_id
                WHERE sgm.station_group_id = weekly_newsletters.station_group_id
                AND us.user_id = auth.uid()
            )
        )
    )
);

COMMENT ON COLUMN public.weekly_newsletters.station_group_id 
IS 'Optional station group ID - newsletters can be for a single station OR a station group';
