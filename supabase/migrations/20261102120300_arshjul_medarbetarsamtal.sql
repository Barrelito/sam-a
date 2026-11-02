-- =============================================
-- Årshjulet: Utvecklingssamtal -> Medarbetarsamtal (se CONTEXT.md)
-- =============================================
-- Medarbetarsamtal är det kanoniska ordet. Höstens samtal (aug–okt) inleder
-- nästa års löneöversyn, så aktiviteten länkar dit. year=next väljer nästa
-- års löneöversyn, eller visar översikten där den kan startas om den saknas.

UPDATE public.annual_cycle_items
SET title = 'Medarbetarsamtal',
    description = CASE month
        WHEN 8 THEN 'Planera och starta höstens medarbetarsamtal. De inleder nästa års löneöversyn.'
        ELSE description
    END,
    action_link = '/api/salary-review/select-year?year=next&next=/salary-review/employees',
    updated_at = NOW()
WHERE title = 'Utvecklingssamtal';

-- Uppgifter som redan materialiserats ur aktiviteten för innevarande år och
-- framåt får det nya namnet, så att årshjulet och uppgiftslistan matchar.
-- Tidigare år lämnas orörda.
UPDATE public.tasks t
SET title = 'Medarbetarsamtal'
FROM public.annual_cycle_items i
WHERE t.annual_cycle_item_id = i.id
  AND i.title = 'Medarbetarsamtal'
  AND t.title = 'Utvecklingssamtal'
  AND t.year >= EXTRACT(YEAR FROM NOW());
