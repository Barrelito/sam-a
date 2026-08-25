-- =============================================
-- Diagnostik: RLS-policyer på public.tasks
-- =============================================
-- Kör den här om det inte går att spara status eller prioritet på en uppgift
-- ("Du saknar behörighet att ändra den här uppgiften").
--
-- Läser bara - ändrar ingenting.

-- 1. Vilka policyer finns, och täcker UPDATE-policyn area_manager?
SELECT
    policyname,
    cmd,
    CASE
        WHEN qual LIKE '%user_station_groups%' THEN 'ja'
        ELSE 'nej'
    END AS stodjer_stationsomrade,
    qual AS villkor
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'tasks'
ORDER BY cmd, policyname;

-- 2. Din egen roll och dina kopplingar
SELECT
    p.id,
    p.email,
    p.role,
    p.vo_id,
    (SELECT count(*) FROM public.user_stations us WHERE us.user_id = p.id) AS antal_stationer,
    (SELECT count(*) FROM public.user_station_groups usg WHERE usg.user_id = p.id) AS antal_stationsomraden
FROM public.profiles p
WHERE p.id = auth.uid();

-- 3. Vilka uppgifter du faktiskt får uppdatera just nu.
--    Kan du se en uppgift här men inte spara den, är det UPDATE-policyn som nekar.
SELECT
    t.id,
    t.title,
    t.owner_type,
    t.station_id,
    t.station_group_id,
    t.status
FROM public.tasks t
ORDER BY t.updated_at DESC
LIMIT 20;
