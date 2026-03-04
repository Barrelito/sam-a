-- Fix: Lägg till area_manager i tasks INSERT och UPDATE RLS-policies

-- DROP befintliga policies
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;

-- Ny INSERT-policy med area_manager stöd
CREATE POLICY "Users can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
    auth.uid() = created_by AND (
        -- Admins kan skapa alla tasks
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
        OR
        -- VO-chefer kan skapa tasks i sitt VO
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'vo_chief'
            AND (tasks.vo_id = p.vo_id OR tasks.owner_type = 'personal')
        )
        OR
        -- Area managers kan skapa station-tasks för stationer i sin station_group
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_station_groups usg ON usg.user_id = p.id
            JOIN station_group_members sgm ON sgm.station_group_id = usg.station_group_id
            WHERE p.id = auth.uid()
            AND p.role = 'area_manager'
            AND (
                tasks.owner_type = 'personal'
                OR (
                    tasks.owner_type = 'station'
                    AND tasks.station_id = sgm.station_id
                )
            )
        )
        OR
        -- Stationschefer kan skapa personal- eller stationsuppgifter
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

-- Ny UPDATE-policy med area_manager stöd
CREATE POLICY "Users can update tasks"
ON public.tasks
FOR UPDATE
USING (
    -- Admins
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    -- VO-chefer i sitt VO
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'vo_chief'
        AND tasks.vo_id = p.vo_id
    )
    OR
    -- Area managers för stationer i sin station_group
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_station_groups usg ON usg.user_id = p.id
        JOIN station_group_members sgm ON sgm.station_group_id = usg.station_group_id
        WHERE p.id = auth.uid()
        AND p.role = 'area_manager'
        AND tasks.station_id = sgm.station_id
    )
    OR
    -- Skaparen
    created_by = auth.uid()
    OR
    -- Tilldelad
    assigned_to = auth.uid()
    OR
    -- Stationschefer med stationstillgång
    EXISTS (
        SELECT 1 FROM user_stations us
        WHERE us.user_id = auth.uid()
        AND us.station_id = tasks.station_id
    )
);
