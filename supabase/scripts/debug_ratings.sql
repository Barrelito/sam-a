-- Debug Query: Kontrollera reviews och ratings (RÄTTAD)
-- Kör denna i Supabase SQL Editor

SELECT 
  e.first_name, 
  e.last_name, 
  sr.id as salary_review_id, 
  sr.cycle_id,
  sca.rating,
  sca.criterion_key
FROM public.employees e
JOIN public.salary_reviews sr ON sr.employee_id = e.id
LEFT JOIN public.salary_criteria_assessments sca ON sca.salary_review_id = sr.id
ORDER BY e.last_name, sr.created_at DESC;
