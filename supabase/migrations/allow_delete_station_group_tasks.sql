-- =============================================
-- Migration: Fix DELETE RLS for tasks
-- Ensure station managers can delete tasks in their station groups
-- =============================================

DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

CREATE POLICY "Users can delete tasks"
ON public.tasks
FOR DELETE
USING (
    -- Admins can delete any task
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- VO chiefs can delete tasks in their VO
    EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'vo_chief' 
        AND tasks.vo_id = p.vo_id
    )
    OR
    -- Task creator can delete
    created_by = auth.uid()
    OR
    -- Station managers can delete tasks belonging to their station
    EXISTS (
        SELECT 1 FROM user_stations us 
        WHERE us.user_id = auth.uid() 
        AND us.station_id = tasks.station_id
    )
    OR
    -- Station managers can delete tasks belonging to their station group
    EXISTS (
        SELECT 1 FROM station_group_members sgm
        JOIN user_stations us ON us.station_id = sgm.station_id
        WHERE us.user_id = auth.uid() 
        AND sgm.station_group_id = tasks.station_group_id
    )
);
