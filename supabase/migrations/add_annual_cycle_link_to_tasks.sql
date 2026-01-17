
-- Add link between tasks and annual cycle items
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS annual_cycle_item_id UUID REFERENCES public.annual_cycle_items(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_annual_cycle_item_id ON public.tasks(annual_cycle_item_id);

-- Comment
COMMENT ON COLUMN public.tasks.annual_cycle_item_id IS 'Länk till årshjulsmallen om denna uppgift skapades från årshjulet';
