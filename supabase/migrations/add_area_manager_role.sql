-- ============================================================
-- Migration: Lägg till area_manager-roll och user_station_groups
-- ============================================================

-- 1. Ny kopplingstabell: vilken area_manager som ansvarar för vilken station_group
CREATE TABLE IF NOT EXISTS user_station_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  station_group_id UUID NOT NULL REFERENCES station_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, station_group_id)
);

-- 2. RLS för user_station_groups
ALTER TABLE user_station_groups ENABLE ROW LEVEL SECURITY;

-- Alla autentiserade användare kan läsa (behövs för delegering)
CREATE POLICY "Authenticated users can read user_station_groups"
  ON user_station_groups FOR SELECT
  TO authenticated
  USING (true);

-- Bara admin och vo_chief kan hantera kopplingarna
CREATE POLICY "Admins and vo_chiefs can manage user_station_groups"
  ON user_station_groups FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'vo_chief')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'vo_chief')
    )
  );

-- ============================================================
-- INSTRUKTIONER FÖR MANUELL DATAINMATNING:
--
-- Steg 1: Hitta Christians user-ID:
--   SELECT id, full_name, role FROM profiles WHERE email = 'christian@...';
--
-- Steg 2: Hitta station_group ID:
--   SELECT id, name FROM station_groups;
--
-- Steg 3: Uppdatera rollen:
--   UPDATE profiles SET role = 'area_manager' WHERE id = '<christian_id>';
--
-- Steg 4: Koppla till station_group:
--   INSERT INTO user_station_groups (user_id, station_group_id)
--   VALUES ('<christian_id>', '<station_group_id>');
-- ============================================================
