-- Add Eisenhower priority matrix to tasks
-- Priority levels: 1=Urgent&Important, 2=Important, 3=Urgent, 4=Neither, NULL=No priority

-- Add priority column
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS priority INTEGER CHECK (priority BETWEEN 1 AND 4);

-- Add comment
COMMENT ON COLUMN public.tasks.priority IS 'Eisenhower priority: 1=Urgent&Important (Do), 2=Important (Plan), 3=Urgent (Delegate), 4=Neither (Eliminate)';

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_tasks_priority 
ON public.tasks(priority) 
WHERE priority IS NOT NULL;
