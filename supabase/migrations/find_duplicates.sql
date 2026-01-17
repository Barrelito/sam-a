-- FIND CANDIDATE DUPLICATES
-- This query identifies tasks that:
-- 1. Have the same title as an Annual Cycle Item
-- 2. Are in the same start_month
-- 3. Are NOT linked to an annual_cycle_item_id (so they are legacy manual tasks)
-- 4. Are for the current year (or adjust year as needed)

SELECT 
    t.id, 
    t.title, 
    t.start_month, 
    t.status,
    t.station_id,
    aci.title as matching_cycle_item
FROM tasks t
JOIN annual_cycle_items aci ON t.title = aci.title AND t.start_month = aci.month
WHERE 
    t.annual_cycle_item_id IS NULL 
    AND t.year = 2026 -- Adjust if cleaning up 2025
    AND t.owner_type = 'station';

-- To see count:
-- SELECT COUNT(*) FROM tasks t JOIN annual_cycle_items aci ON t.title = aci.title AND t.start_month = aci.month WHERE t.annual_cycle_item_id IS NULL AND t.year = 2026 AND t.owner_type = 'station';
