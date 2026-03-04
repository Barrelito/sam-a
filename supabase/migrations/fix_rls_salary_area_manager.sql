-- Steg 1: Se vad de befintliga policies faktiskt innehåller
-- SELECT policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename IN ('salary_reviews', 'salary_criteria_assessments');

-- Steg 2: Droppa och återskapa med area_manager-stöd

DROP POLICY IF EXISTS "Users can manage reviews permissive" ON public.salary_reviews;
DROP POLICY IF EXISTS "Users can manage criteria assessments permissive" ON public.salary_criteria_assessments;

-- salary_reviews: alla som har access till stationen (via user_stations ELLER user_station_groups)
CREATE POLICY "Users can manage reviews permissive"
ON public.salary_reviews
FOR ALL
TO authenticated
USING (
    -- Koppla salary_review → employee → station
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = salary_reviews.employee_id
        AND (
            -- Admin
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            OR
            -- VO-chef
            EXISTS (
                SELECT 1 FROM profiles p
                JOIN stations s ON s.id = e.station_id
                WHERE p.id = auth.uid() AND p.role = 'vo_chief' AND s.vo_id = p.vo_id
            )
            OR
            -- Area manager via station_group
            EXISTS (
                SELECT 1 FROM user_station_groups usg
                JOIN station_group_members sgm ON sgm.station_group_id = usg.station_group_id
                WHERE usg.user_id = auth.uid()
                AND sgm.station_id = e.station_id
            )
            OR
            -- Stationschef via user_stations
            EXISTS (
                SELECT 1 FROM user_stations us
                WHERE us.user_id = auth.uid()
                AND us.station_id = e.station_id
            )
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM employees e
        WHERE e.id = salary_reviews.employee_id
        AND (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            OR
            EXISTS (
                SELECT 1 FROM user_station_groups usg
                JOIN station_group_members sgm ON sgm.station_group_id = usg.station_group_id
                WHERE usg.user_id = auth.uid() AND sgm.station_id = e.station_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_stations us
                WHERE us.user_id = auth.uid() AND us.station_id = e.station_id
            )
        )
    )
);

-- salary_criteria_assessments: samma logik via employee_id → employees
CREATE POLICY "Users can manage criteria assessments permissive"
ON public.salary_criteria_assessments
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM salary_reviews sr
        JOIN employees e ON e.id = sr.employee_id
        WHERE sr.id = salary_criteria_assessments.salary_review_id
        AND (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            OR
            EXISTS (
                SELECT 1 FROM profiles p
                JOIN stations s ON s.id = e.station_id
                WHERE p.id = auth.uid() AND p.role = 'vo_chief' AND s.vo_id = p.vo_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_station_groups usg
                JOIN station_group_members sgm ON sgm.station_group_id = usg.station_group_id
                WHERE usg.user_id = auth.uid() AND sgm.station_id = e.station_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_stations us
                WHERE us.user_id = auth.uid() AND us.station_id = e.station_id
            )
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM salary_reviews sr
        JOIN employees e ON e.id = sr.employee_id
        WHERE sr.id = salary_criteria_assessments.salary_review_id
        AND (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
            OR
            EXISTS (
                SELECT 1 FROM user_station_groups usg
                JOIN station_group_members sgm ON sgm.station_group_id = usg.station_group_id
                WHERE usg.user_id = auth.uid() AND sgm.station_id = e.station_id
            )
            OR
            EXISTS (
                SELECT 1 FROM user_stations us
                WHERE us.user_id = auth.uid() AND us.station_id = e.station_id
            )
        )
    )
);
