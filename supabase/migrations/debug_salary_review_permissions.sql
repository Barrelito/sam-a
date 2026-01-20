-- =============================================
-- DEBUG QUERIES FOR SALARY REVIEW SAVE ISSUE
-- Run these in Supabase SQL Editor to diagnose
-- =============================================

-- 1. Check current user info
SELECT 
  auth.uid() as user_id,
  p.full_name,
  p.email,
  p.role,
  p.vo_id
FROM public.profiles p
WHERE p.id = auth.uid();

-- 2. Check user's stations
SELECT 
  us.user_id,
  us.station_id,
  s.name as station_name,
  s.vo_id
FROM public.user_stations us
JOIN public.stations s ON s.id = us.station_id
WHERE us.user_id = auth.uid();

-- 3. Check if user can SELECT salary_reviews
-- (If this returns 0 rows, RLS is blocking)
SELECT 
  sr.id,
  sr.employee_id,
  sr.manager_id,
  e.first_name,
  e.last_name,
  e.station_id
FROM public.salary_reviews sr
JOIN public.employees e ON e.id = sr.employee_id
WHERE sr.id = 'PASTE_REVIEW_ID_HERE'; -- Replace with actual review ID from URL

-- 4. Check if user can SELECT particularly_skilled_assessments
SELECT COUNT(*) as assessment_count
FROM public.particularly_skilled_assessments
WHERE salary_review_id = 'PASTE_REVIEW_ID_HERE';

-- 5. Check if user can SELECT salary_criteria_assessments  
SELECT COUNT(*) as criteria_count
FROM public.salary_criteria_assessments
WHERE salary_review_id = 'PASTE_REVIEW_ID_HERE';

-- 6. Check if user can SELECT salary_meeting_preparations
SELECT *
FROM public.salary_meeting_preparations
WHERE salary_review_id = 'PASTE_REVIEW_ID_HERE';

-- =============================================
-- EXPECTED RESULTS:
-- - Query 1: Should show your user info
-- - Query 2: Should show your stations
-- - Query 3: Should show the review (if it returns 0 rows = RLS BLOCKING!)
-- - Queries 4-6: Should show counts/data (if 0 or error = RLS BLOCKING!)
-- =============================================
