-- Fix: Lägg till area_manager i employees-tabellens RLS-policies
-- Befintliga policy-namn (verifierade via Supabase):
-- "Create employees", "Delete employees", "Update employees"
-- "Users can manage employees permissive", "Users can view employees permissive"
-- "View employees by station"

-- DROP befintliga SELECT/INSERT/UPDATE-policies
DROP POLICY IF EXISTS "Create employees" ON public.employees;
DROP POLICY IF EXISTS "Update employees" ON public.employees;
DROP POLICY IF EXISTS "Delete employees" ON public.employees;
DROP POLICY IF EXISTS "Users can manage employees permissive" ON public.employees;
DROP POLICY IF EXISTS "Users can view employees permissive" ON public.employees;
DROP POLICY IF EXISTS "View employees by station" ON public.employees;

-- SELECT: area_manager ser medarbetare i sina stations
CREATE POLICY "View employees by station"
ON public.employees
FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN stations s ON s.id = employees.station_id
        WHERE p.id = auth.uid() AND p.role = 'vo_chief' AND s.vo_id = p.vo_id
    )
    OR
    -- Area manager: stationer i sin station_group
    EXISTS (
        SELECT 1 FROM user_station_groups usg
        JOIN station_group_members sgm ON sgm.station_group_id = usg.station_group_id
        WHERE usg.user_id = auth.uid()
        AND sgm.station_id = employees.station_id
    )
    OR
    EXISTS (
        SELECT 1 FROM user_stations us
        WHERE us.user_id = auth.uid()
        AND us.station_id = employees.station_id
    )
);

-- INSERT
CREATE POLICY "Create employees"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN stations s ON s.id = employees.station_id
        WHERE p.id = auth.uid() AND p.role = 'vo_chief' AND s.vo_id = p.vo_id
    )
    OR
    EXISTS (
        SELECT 1 FROM user_station_groups usg
        JOIN station_group_members sgm ON sgm.station_group_id = usg.station_group_id
        WHERE usg.user_id = auth.uid()
        AND sgm.station_id = employees.station_id
    )
    OR
    EXISTS (
        SELECT 1 FROM user_stations us
        WHERE us.user_id = auth.uid()
        AND us.station_id = employees.station_id
    )
);

-- UPDATE
CREATE POLICY "Update employees"
ON public.employees
FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN stations s ON s.id = employees.station_id
        WHERE p.id = auth.uid() AND p.role = 'vo_chief' AND s.vo_id = p.vo_id
    )
    OR
    EXISTS (
        SELECT 1 FROM user_station_groups usg
        JOIN station_group_members sgm ON sgm.station_group_id = usg.station_group_id
        WHERE usg.user_id = auth.uid()
        AND sgm.station_id = employees.station_id
    )
    OR
    EXISTS (
        SELECT 1 FROM user_stations us
        WHERE us.user_id = auth.uid()
        AND us.station_id = employees.station_id
    )
);

-- DELETE (återskapa oförändrad)
CREATE POLICY "Delete employees"
ON public.employees
FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'vo_chief'))
    OR
    EXISTS (
        SELECT 1 FROM user_stations us
        WHERE us.user_id = auth.uid()
        AND us.station_id = employees.station_id
    )
);
