-- =============================================
-- Employee Hub - Manager Logbook
-- =============================================

-- 1. NEW TABLE: employee_notes
CREATE TABLE IF NOT EXISTS public.employee_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    
    content TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'general' CHECK (note_type IN ('general', 'performance', 'check_in', 'incident', 'development')),
    
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employee_notes_employee_id ON public.employee_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_notes_created_by ON public.employee_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_employee_notes_event_date ON public.employee_notes(event_date);

-- RLS
ALTER TABLE public.employee_notes ENABLE ROW LEVEL SECURITY;

-- Handle updated_at
CREATE TRIGGER set_employee_notes_updated_at
  BEFORE UPDATE ON public.employee_notes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS POLICIES

-- 1. Managers can view notes for employees at their stations
CREATE POLICY "Managers can view notes for their station employees"
ON public.employee_notes FOR SELECT TO authenticated
USING (
    -- The employee belongs to a station managed by the user
    EXISTS (
        SELECT 1 
        FROM public.employees emp
        JOIN public.user_stations us ON us.station_id = emp.station_id
        WHERE emp.id = employee_notes.employee_id
        AND us.user_id = auth.uid()
    )
    -- OR user is VO chief for the employee's station
    OR EXISTS (
        SELECT 1
        FROM public.employees emp
        JOIN public.stations s ON s.id = emp.station_id
        WHERE emp.id = employee_notes.employee_id
        AND s.vo_id IN (SELECT vo_id FROM public.profiles WHERE id = auth.uid() AND role = 'vo_chief')
    )
    -- OR user is Admin
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Managers can create notes for their station employees
CREATE POLICY "Managers can create notes for their station employees"
ON public.employee_notes FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid() AND (
        -- The employee belongs to a station managed by the user
        EXISTS (
            SELECT 1 
            FROM public.employees emp
            JOIN public.user_stations us ON us.station_id = emp.station_id
            WHERE emp.id = employee_id
            AND us.user_id = auth.uid()
        )
        -- OR user is VO chief
        OR EXISTS (
            SELECT 1
            FROM public.employees emp
            JOIN public.stations s ON s.id = emp.station_id
            WHERE emp.id = employee_id
            AND s.vo_id IN (SELECT vo_id FROM public.profiles WHERE id = auth.uid() AND role = 'vo_chief')
        )
        -- OR user is Admin
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
);

-- 3. Managers can update their OWN notes (or admins)
CREATE POLICY "Users can update their own notes"
ON public.employee_notes FOR UPDATE TO authenticated
USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Managers can delete their OWN notes (or admins)
CREATE POLICY "Users can delete their own notes"
ON public.employee_notes FOR DELETE TO authenticated
USING (
    created_by = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
