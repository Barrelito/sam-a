-- Backfill annual_cycle_item_id on legacy VO tasks
--
-- VO tasks seeded via seed_arshjul_for_vo (migration_v3) were created before
-- tasks.annual_cycle_item_id existed, so the VO dashboard had to guess which
-- tasks belonged to the annual cycle by fuzzy title matching. This links those
-- rows to their annual_cycle_items template so the dashboard can rely on the
-- foreign key instead.
--
-- Scope: only owner_type = 'vo' rows are touched. They have station_id NULL,
-- so the partial unique index idx_tasks_annual_cycle_station_year (which
-- requires station_id NOT NULL) cannot be violated. Station tasks distributed
-- from a VO task are resolved through parent_task_id in the UI instead.
--
-- Matching: exact title equality (case/whitespace-insensitive), plus an
-- explicit mapping for seeded titles that differ from the template titles.
-- When several template items share a title (monthly recurring activities),
-- the item whose month matches the task's start_month is preferred, then the
-- earliest month.

WITH title_map(task_title, item_title) AS (
    VALUES
        ('helårsuppföljning av kort- och långtidssjukfrånvaro', 'helårsuppföljning sjukfrånvaro'),
        ('löneöversyn', 'löneöversyn: start'),
        ('löneöversyn: lönesättning och lönesamtal med lönekriterier', 'löneöversyn: lönesättning'),
        ('löneöversyn utbetalning av ny lön', 'löneöversyn: utbetalning'),
        ('uppföljning av las-tid i heroma', 'uppföljning av las-tid'),
        ('uppföljning av övertid (>150 timmar)', 'uppföljning av övertid (>150h)'),
        ('uppföljning semesteruttag (20 dagar)', 'uppföljning semesteruttag'),
        ('uppföljning och stopp av övertid för medarbetare mer än 180 timmar', 'uppföljning övertid (>180h)'),
        ('avsluta ej aktuella intermittent anställda', 'avsluta intermittenta anställda'),
        ('presentera resultat osa-kartläggning (apt)', 'presentera resultat osa')
),
candidates AS (
    SELECT DISTINCT ON (t.id)
        t.id AS task_id,
        i.id AS item_id
    FROM public.tasks t
    JOIN public.annual_cycle_items i
        ON lower(trim(i.title)) = lower(trim(t.title))
        OR (lower(trim(t.title)), lower(trim(i.title))) IN (
            SELECT task_title, item_title FROM title_map
        )
    WHERE t.annual_cycle_item_id IS NULL
        AND t.owner_type = 'vo'
    ORDER BY t.id,
        (i.month = t.start_month) DESC NULLS LAST,
        i.month
)
UPDATE public.tasks t
SET annual_cycle_item_id = c.item_id
FROM candidates c
WHERE t.id = c.task_id;
