-- Fix: Lägg till area_manager i profiles_role_check-constraint
-- Det finns en CHECK-constraint på profiles.role som inte inkluderade area_manager

-- Ta bort den gamla constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Skapa en ny constraint med area_manager inkluderat
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'vo_chief', 'area_manager', 'station_manager', 'assistant_manager'));
