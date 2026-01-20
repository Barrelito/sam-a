-- =============================================
-- Migration: Fix RLS for station groups
-- Allows updating tasks that use station_group_id instead of station_id
-- =============================================

-- Drop and recreate the update policy to include station_group support
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;

CREATE POLICY "Users can update tasks"
ON public.tasks
FOR UPDATE
USING (
    -- Admins can update any task
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- VO chiefs can update tasks in their VO
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'vo_chief' 
        AND tasks.vo_id = p.vo_id
    )
    OR
    -- Task creator can update
    created_by = auth.uid()
    OR
    -- Assigned user can update
    assigned_to = auth.uid()
    OR
    -- Station managers can update station tasks they have access to
    EXISTS (
        SELECT 1 FROM user_stations us 
        WHERE us.user_id = auth.uid() 
        AND us.station_id = tasks.station_id
    )
    OR
    -- Station managers can update tasks in their station groups
    EXISTS (
        SELECT 1 FROM station_group_members sgm
        JOIN user_stations us ON us.station_id = sgm.station_id
        WHERE us.user_id = auth.uid() 
        AND sgm.station_group_id = tasks.station_group_id
    )
)
WITH CHECK (
    -- Admins can update any task
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- VO chiefs can update tasks in their VO
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'vo_chief' 
        AND tasks.vo_id = p.vo_id
    )
    OR
    -- Task creator can update
    created_by = auth.uid()
    OR
    -- Assigned user can update
    assigned_to = auth.uid()
    OR
    -- Station managers can update if changing to a station they have access to
    (
        tasks.station_id IS NULL 
        OR EXISTS (
            SELECT 1 FROM user_stations us 
            WHERE us.user_id = auth.uid() 
            AND us.station_id = tasks.station_id
        )
    )
    OR
    -- Station managers can update if changing to a station group they have access to
    (
        tasks.station_group_id IS NULL 
        OR EXISTS (
            SELECT 1 FROM station_group_members sgm
            JOIN user_stations us ON us.station_id = sgm.station_id
            WHERE us.user_id = auth.uid() 
            AND sgm.station_group_id = tasks.station_group_id
        )
    )
);

-- Also update insert policy to support station_group_id
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;

CREATE POLICY "Users can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
    auth.uid() = created_by AND (
        -- Admins can create any task
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        -- VO chiefs can create tasks for their VO (VO tasks, station tasks, personal)
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'vo_chief' 
            AND (
                -- Task is for their VO
                tasks.vo_id = p.vo_id
                OR 
                -- Personal task (no VO)
                tasks.owner_type = 'personal'
            )
        )
        OR
        -- Station managers can create personal or station/station_group tasks they're assigned to
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('station_manager', 'assistant_manager')
            AND (
                tasks.owner_type = 'personal'
                OR (
                    tasks.owner_type = 'station' 
                    AND (
                        -- Direct station assignment
                        tasks.station_id IN (
                            SELECT station_id FROM user_stations WHERE user_id = auth.uid()
                        )
                        OR
                        -- Station group assignment
                        tasks.station_group_id IN (
                            SELECT sgm.station_group_id 
                            FROM station_group_members sgm
                            JOIN user_stations us ON us.station_id = sgm.station_id
                            WHERE us.user_id = auth.uid()
                        )
                    )
                )
            )
        )
    )
);

-- =============================================
-- DONE! Tasks can now use station_group_id
-- =============================================
