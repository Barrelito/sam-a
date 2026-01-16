-- =============================================
-- Migration: Add parent_task_id for task distribution
-- =============================================

-- Add parent_task_id column to link distributed tasks back to their VO template
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Index for efficient lookup of child tasks
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON public.tasks(parent_task_id);

-- =============================================
-- DONE!
-- This allows:
-- 1. VO tasks to be "distributed" to stations
-- 2. Each station gets their own task instance
-- 3. Parent task can track aggregate progress
-- =============================================
