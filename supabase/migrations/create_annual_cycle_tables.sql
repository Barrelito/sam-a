-- Digital Annual Cycle Tables
-- Tabeller för att hantera det digitala årshjulet och status på återkommande uppgifter

-- ==============================================
-- 1. Annual Cycle Items (Mallar för årshjulet)
-- Definierar vad som ska hända varje år/månad
-- ==============================================

CREATE TABLE IF NOT EXISTS public.annual_cycle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  category TEXT NOT NULL, -- 'hr', 'finance', 'environment', 'other'
  role_target TEXT DEFAULT 'station_manager', -- 'station_manager', 'vo_chief'
  action_link TEXT, -- Länk till verktyg om applicerbart (t.ex. '/salary-review')
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.annual_cycle_items IS 'Mallar för återkommande aktiviteter i årshjulet';

-- ==============================================
-- 2. Annual Task Completions (Status)
-- Håller reda på om en station/person har gjort uppgiften för ett visst år
-- ==============================================

CREATE TABLE IF NOT EXISTS public.annual_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_cycle_item_id UUID NOT NULL REFERENCES public.annual_cycle_items(id) ON DELETE CASCADE,
  station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id), -- Om det är en personlig uppgift (t.ex. för VO-chef)
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'dismissed'
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  completed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  UNIQUE(annual_cycle_item_id, station_id, year),
  UNIQUE(annual_cycle_item_id, user_id, year)
);

COMMENT ON TABLE public.annual_task_completions IS 'Loggar när en årshjuls-uppgift är genomförd för ett år';

-- ==============================================
-- RLS Policies
-- ==============================================

ALTER TABLE public.annual_cycle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_task_completions ENABLE ROW LEVEL SECURITY;

-- Annual Cycle Items: Alla inloggade kan läsa (för att se årshjulet)
CREATE POLICY "Authenticated users can view annual cycle items"
  ON public.annual_cycle_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Endast admins kan ändra i årshjulet (eller VO Chefer om vi vill tillåta det senare)
-- För nu, låt oss säga bara admins kan skapa items i koden/via SQL.

-- Annual Task Completions:
-- Stationschefer kan se completions för sin station
CREATE POLICY "Users can view completions for their station"
  ON public.annual_task_completions FOR SELECT
  USING (
    station_id IN (
      SELECT station_id FROM public.user_stations WHERE user_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

-- VO chefer kan se completions för sitt VO
CREATE POLICY "VO chiefs can view completions in their VO"
  ON public.annual_task_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stations s
      JOIN public.profiles p ON p.vo_id = s.vo_id
      WHERE s.id = annual_task_completions.station_id
      AND p.id = auth.uid()
      AND p.role = 'vo_chief'
    )
  );

-- Stationschefer kan MARKERA som klart (INSERT) för sin station
CREATE POLICY "Station managers can complete tasks"
  ON public.annual_task_completions FOR INSERT
  WITH CHECK (
    station_id IN (
      SELECT station_id FROM public.user_stations WHERE user_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

-- ==============================================
-- Seed Data: Årshjul 2026 (Från bildunderlag)
-- ==============================================

-- Rensa gamla items för att undvika dubletter vid omkörning (DEV ONLY - ta bort i prod om vi vill)
-- DELETE FROM public.annual_cycle_items; 

INSERT INTO public.annual_cycle_items (title, description, month, category, action_link) VALUES
-- JANUARI
('Lansering kompetenstorget', 'Information och genomgång av nya kompetenstorget.', 1, 'hr', NULL),
('Helårsuppföljning sjukfrånvaro', 'Analys av kort- och långtidssjukfrånvaro för föregående år.', 1, 'hr', NULL),
('Löneöversyn: Start', 'Förberedelser inför lönerevision. Se över underlag.', 1, 'hr', '/salary-review'),
('Handlingsplan OSA-kartläggning', 'Uppföljning och åtgärder baserat på OSA-resultat.', 1, 'hr', NULL),
('Kontroll av övertid', 'Månadsvis kontroll av övertidsuttag.', 1, 'finance', NULL),
('Kör provlön i Heroma', 'Säkerställ att löneunderlag är korrekt inför utbetalning.', 1, 'finance', 'https://heroma.se'),

-- FEBRUARI
('Löneöversyn: Lönesättning', 'Genomför lönesamtal och sätt löner baserat på kriterier.', 2, 'hr', '/salary-review/distribution'),
('Uppföljning av sjukfrånvaro', 'Månadsvis uppföljning.', 2, 'hr', NULL),
('Kontroll av övertid', 'Månadsvis kontroll.', 2, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 2, 'finance', 'https://heroma.se'),
('Uppföljning av LAS-tid', 'Kontrollera LAS-tid i Heroma.', 2, 'hr', 'https://heroma.se'),

-- MARS
('Löneöversyn: Avslut', 'Slutför lönesamtal och skicka in underlag.', 3, 'hr', '/salary-review'),
('Uppföljning av sjukfrånvaro', 'Månadsvis uppföljning.', 3, 'hr', NULL),
('Kontroll av övertid', 'Månadsvis kontroll.', 3, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 3, 'finance', 'https://heroma.se'),
('Kontrollera bisyssla', 'Samla in uppgifter om bisysslor från medarbetare.', 3, 'hr', NULL),

-- APRIL
('Uppföljning av sjukfrånvaro', 'Månadsvis uppföljning.', 4, 'hr', NULL),
('Nominering morgondagens chef', 'Identifiera talanger för framtida ledarskap.', 4, 'hr', NULL),
('Löneöversyn: Utbetalning', 'Kontrollera att ny lön syns på lönebeskedet.', 4, 'finance', '/salary-review'),
('Uppföljning handlingsplan OSA', 'Stäm av åtgärder från kartläggningen.', 4, 'hr', NULL),
('Kontroll av övertid', 'Månadsvis kontroll.', 4, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 4, 'finance', 'https://heroma.se'),
('Uppföljning av LAS-tid', 'Kontrollera LAS-tid i Heroma.', 4, 'hr', NULL),

-- MAJ
('Uppföljning av övertid (>150h)', 'Särskild kontroll av medarbetare med hög övertid.', 5, 'hr', NULL),
('Uppföljning handlingsplan OSA', 'Fortsatt arbete med arbetsmiljö.', 5, 'hr', NULL),
('Uppföljning av sjukfrånvaro', 'Månadsvis uppföljning.', 5, 'hr', NULL),
('Kontroll av övertid', 'Månadsvis kontroll.', 5, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 5, 'finance', 'https://heroma.se'),

-- JUNI
('Kontroll av övertid', 'Månadsvis kontroll.', 6, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 6, 'finance', 'https://heroma.se'),
('Uppföljning av sjukfrånvaro', 'Månadsvis uppföljning.', 6, 'hr', NULL),
('Uppföljning av LAS-tid', 'Kontrollera LAS-tid i Heroma.', 6, 'hr', NULL),

-- JULI
('Kontroll av övertid', 'Månadsvis kontroll.', 7, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 7, 'finance', 'https://heroma.se'),

-- AUGUSTI
('Utvecklingssamtal', 'Planera och starta höstens utvecklingssamtal.', 8, 'hr', '/salary-review/employees'), -- Länkar till employees som en start
('Bisyssla', 'Påminnelse om bisyssla.', 8, 'hr', NULL),
('Uppföljning semesteruttag', 'Kontrollera att 20 dagar tagits ut.', 8, 'hr', NULL),
('Uppföljning av sjukfrånvaro', 'Månadsvis uppföljning.', 8, 'hr', NULL),
('Kontroll av övertid', 'Månadsvis kontroll.', 8, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 8, 'finance', 'https://heroma.se'),
('Uppföljning av LAS-tid', 'Kontrollera LAS-tid i Heroma.', 8, 'hr', NULL),

-- SEPTEMBER
('Utvecklingssamtal', 'Fortsatt genomförande.', 9, 'hr', NULL),
('Uppföljning övertid (>180h)', 'Särskild kontroll och stopp vid behov.', 9, 'hr', NULL),
('Bisyssla', 'Uppföljning.', 9, 'hr', NULL),
('Uppföljning semesteruttag', 'Sista chansen att planera resterande dagar.', 9, 'hr', NULL),
('Kontroll av övertid', 'Månadsvis kontroll.', 9, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 9, 'finance', 'https://heroma.se'),
('Uppföljning av sjukfrånvaro', 'Månadsvis uppföljning.', 9, 'hr', NULL),

-- OKTOBER
('Avsluta intermittenta anställda', 'Se över behovsanställningar som ej är aktuella.', 10, 'hr', NULL),
('OSA-kartläggning', 'Genomför arbetsmiljökartläggning.', 10, 'hr', NULL),
('Utvecklingssamtal', 'Slutför samtalen.', 10, 'hr', NULL),
('Bisyssla', 'Kontroll.', 10, 'hr', NULL),
('Uppföljning av sjukfrånvaro', 'Månadsvis uppföljning.', 10, 'hr', NULL),
('Kontroll av övertid', 'Månadsvis kontroll.', 10, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 10, 'finance', 'https://heroma.se'),
('Uppföljning av LAS-tid', 'Månadsvis kontroll.', 10, 'hr', NULL),

-- NOVEMBER
('Presentera resultat OSA', 'På APT.', 11, 'hr', NULL),
('Uppföljning av sjukfrånvaro', 'Månadsvis uppföljning.', 11, 'hr', NULL),
('Utvecklingssamtal', 'Uppföljning.', 11, 'hr', NULL),
('Kontroll av övertid', 'Månadsvis kontroll.', 11, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 11, 'finance', 'https://heroma.se'),
('Uppföljning av LAS-tid', 'Månadsvis kontroll.', 11, 'hr', NULL),

-- DECEMBER
('Presentera resultat OSA', 'På APT (om ej klart i nov).', 12, 'hr', NULL),
('Kontroll av övertid', 'Slutlig kontroll för året.', 12, 'finance', NULL),
('Kör provlön i Heroma', 'Månadsvis körning.', 12, 'finance', 'https://heroma.se'),
('Uppföljning av sjukfrånvaro', 'Månadsvis uppföljning.', 12, 'hr', NULL);
