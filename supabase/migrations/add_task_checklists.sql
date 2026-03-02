-- Migration: Add task checklist items
-- Adds a checklist system where each task can have multiple checklist items

CREATE TABLE IF NOT EXISTS task_checklist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by task_id
CREATE INDEX IF NOT EXISTS idx_task_checklist_items_task_id ON task_checklist_items(task_id);

-- RLS Policies
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;

-- Anyone who can see a task can see its checklist items (SELECT)
CREATE POLICY "task_checklist_select" ON task_checklist_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasks t
            LEFT JOIN user_stations us ON us.user_id = auth.uid()
            WHERE t.id = task_checklist_items.task_id
            AND (
                t.created_by = auth.uid()
                OR t.assigned_to = auth.uid()
                OR (t.station_id IS NOT NULL AND us.station_id = t.station_id)
                OR EXISTS (
                    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'vo_chief')
                )
            )
        )
    );

-- Anyone who can see a task can insert checklist items
CREATE POLICY "task_checklist_insert" ON task_checklist_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks t
            LEFT JOIN user_stations us ON us.user_id = auth.uid()
            WHERE t.id = task_checklist_items.task_id
            AND (
                t.created_by = auth.uid()
                OR t.assigned_to = auth.uid()
                OR (t.station_id IS NOT NULL AND us.station_id = t.station_id)
                OR EXISTS (
                    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'vo_chief')
                )
            )
        )
    );

-- Anyone who can see a task can update (check off) checklist items
CREATE POLICY "task_checklist_update" ON task_checklist_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tasks t
            LEFT JOIN user_stations us ON us.user_id = auth.uid()
            WHERE t.id = task_checklist_items.task_id
            AND (
                t.created_by = auth.uid()
                OR t.assigned_to = auth.uid()
                OR (t.station_id IS NOT NULL AND us.station_id = t.station_id)
                OR EXISTS (
                    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'vo_chief')
                )
            )
        )
    );

-- Only task creator or admin can delete checklist items
CREATE POLICY "task_checklist_delete" ON task_checklist_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tasks t
            WHERE t.id = task_checklist_items.task_id
            AND (
                t.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'vo_chief')
                )
            )
        )
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_task_checklist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_checklist_updated_at
    BEFORE UPDATE ON task_checklist_items
    FOR EACH ROW
    EXECUTE FUNCTION update_task_checklist_updated_at();
