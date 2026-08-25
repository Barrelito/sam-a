-- =============================================
-- Fix: employee_notes RLS för områdeschefer (area_manager)
-- =============================================
-- Områdeschefer får se medarbetare via user_station_groups (se
-- fix_rls_employees_area_manager.sql) men employee_notes-policyerna
-- kollade bara user_stations. Resultatet blev en tom loggbok och att
-- sparade anteckningar tyst nekades.

DROP POLICY IF EXISTS "Managers can view notes for their station employees" ON public.employee_notes;
DROP POLICY IF EXISTS "Managers can create notes for their station employees" ON public.employee_notes;

-- Hjälpvillkor: har användaren tillgång till medarbetarens station?
-- (admin, VO-chef i samma VO, områdeschef via stationsområde, eller
--  direkt stationskoppling)

CREATE POLICY "Managers can view notes for their station employees"
ON public.employee_notes FOR SELECT TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (
        SELECT 1
        FROM public.employees emp
        JOIN public.stations s ON s.id = emp.station_id
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE emp.id = employee_notes.employee_id
        AND p.role = 'vo_chief'
        AND s.vo_id = p.vo_id
    )
    OR EXISTS (
        SELECT 1
        FROM public.employees emp
        JOIN public.user_station_groups usg ON usg.user_id = auth.uid()
        JOIN public.station_group_members sgm
            ON sgm.station_group_id = usg.station_group_id
        WHERE emp.id = employee_notes.employee_id
        AND sgm.station_id = emp.station_id
    )
    OR EXISTS (
        SELECT 1
        FROM public.employees emp
        JOIN public.user_stations us ON us.station_id = emp.station_id
        WHERE emp.id = employee_notes.employee_id
        AND us.user_id = auth.uid()
    )
);

CREATE POLICY "Managers can create notes for their station employees"
ON public.employee_notes FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid() AND (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
        OR EXISTS (
            SELECT 1
            FROM public.employees emp
            JOIN public.stations s ON s.id = emp.station_id
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE emp.id = employee_id
            AND p.role = 'vo_chief'
            AND s.vo_id = p.vo_id
        )
        OR EXISTS (
            SELECT 1
            FROM public.employees emp
            JOIN public.user_station_groups usg ON usg.user_id = auth.uid()
            JOIN public.station_group_members sgm
                ON sgm.station_group_id = usg.station_group_id
            WHERE emp.id = employee_id
            AND sgm.station_id = emp.station_id
        )
        OR EXISTS (
            SELECT 1
            FROM public.employees emp
            JOIN public.user_stations us ON us.station_id = emp.station_id
            WHERE emp.id = employee_id
            AND us.user_id = auth.uid()
        )
    )
);
