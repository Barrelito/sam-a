-- =============================================
-- Migration: Fix RLS for task distribution
-- =============================================

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "VO chiefs can create tasks for their VO" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;

-- Create new insert policy that allows:
-- 1. Admins to create any task
-- 2. VO chiefs to create tasks for their VO (both VO and station tasks)
-- 3. Station managers to create personal tasks
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
        -- Station managers can create personal or station tasks they're assigned to
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role IN ('station_manager', 'assistant_manager')
            AND (
                tasks.owner_type = 'personal'
                OR (
                    tasks.owner_type = 'station' 
                    AND tasks.station_id IN (
                        SELECT station_id FROM user_stations WHERE user_id = auth.uid()
                    )
                )
            )
        )
    )
);

-- Also update the update policy to allow more flexibility
DROP POLICY IF EXISTS "Users can update their tasks" ON public.tasks;

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
);

-- =============================================
-- DONE! VO chiefs can now distribute tasks to stations
-- =============================================
