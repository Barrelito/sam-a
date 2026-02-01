-- Add recurring task instance system
-- This allows recurring tasks to have separate instances per month
-- preserving history and attachments

-- Step 1: Add new columns to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS is_recurring_master BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurring_master_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS instance_month INTEGER CHECK (instance_month BETWEEN 1 AND 12),
ADD COLUMN IF NOT EXISTS instance_year INTEGER CHECK (instance_year >= 2020 AND instance_year <= 2100);

-- Step 2: Add comments for documentation
COMMENT ON COLUMN public.tasks.is_recurring_master IS 'True if this task is a master template for recurring monthly tasks';
COMMENT ON COLUMN public.tasks.recurring_master_id IS 'Reference to master task if this is an instance';
COMMENT ON COLUMN public.tasks.instance_month IS 'Month number (1-12) for this instance';
COMMENT ON COLUMN public.tasks.instance_year IS 'Year for this instance';
COMMENT ON COLUMN public.tasks.is_recurring_monthly IS 'DEPRECATED: Use is_recurring_master instead. Kept for backward compatibility.';

-- Step 3: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_master 
ON public.tasks(recurring_master_id) 
WHERE recurring_master_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_recurring_instance 
ON public.tasks(instance_month, instance_year) 
WHERE instance_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring_master 
ON public.tasks(is_recurring_master) 
WHERE is_recurring_master = TRUE;

-- Step 4: Function to create monthly instances from master tasks
CREATE OR REPLACE FUNCTION create_monthly_task_instances()
RETURNS TABLE(created_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    current_month_val INTEGER;
    current_year_val INTEGER;
    master_task RECORD;
    instance_count INTEGER := 0;
BEGIN
    current_month_val := EXTRACT(MONTH FROM CURRENT_DATE);
    current_year_val := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Loop through all master tasks
    FOR master_task IN 
        SELECT * FROM public.tasks 
        WHERE is_recurring_master = true
    LOOP
        -- Check if instance for this month already exists
        IF NOT EXISTS (
            SELECT 1 FROM public.tasks
            WHERE recurring_master_id = master_task.id
            AND instance_month = current_month_val
            AND instance_year = current_year_val
        ) THEN
            -- Create new instance for this month
            INSERT INTO public.tasks (
                title, description, category,
                owner_type, vo_id, station_id, station_group_id,
                created_by, year, deadline_day,
                status, notes,
                is_recurring_master, recurring_master_id,
                instance_month, instance_year,
                is_recurring_monthly,
                start_month, end_month
            )
            VALUES (
                master_task.title, 
                master_task.description, 
                master_task.category,
                master_task.owner_type, 
                master_task.vo_id, 
                master_task.station_id, 
                master_task.station_group_id,
                master_task.created_by, 
                current_year_val, 
                master_task.deadline_day,
                'not_started', 
                master_task.notes,
                false, 
                master_task.id,
                current_month_val, 
                current_year_val,
                false,  -- Instances are NOT recurring monthly themselves
                NULL,   -- Instances don't use start_month
                NULL    -- Instances don't use end_month
            );
            
            instance_count := instance_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT instance_count;
END;
$$;

COMMENT ON FUNCTION create_monthly_task_instances() IS 'Creates task instances for current month from all recurring master tasks. Run on 1st of each month.';

-- Step 5: Function to convert existing recurring_monthly tasks to master/instance system
CREATE OR REPLACE FUNCTION migrate_recurring_monthly_to_instances()
RETURNS TABLE(migrated_count INTEGER, instance_count INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    recurring_task RECORD;
    master_id UUID;
    current_month_val INTEGER;
    current_year_val INTEGER;
    completed_month INTEGER;
    completed_year INTEGER;
    migrated INTEGER := 0;
    instances INTEGER := 0;
BEGIN
    current_month_val := EXTRACT(MONTH FROM CURRENT_DATE);
    current_year_val := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- Loop through all old-style recurring monthly tasks
    FOR recurring_task IN 
        SELECT * FROM public.tasks 
        WHERE is_recurring_monthly = true 
        AND is_recurring_master = false
        AND recurring_master_id IS NULL
    LOOP
        -- Create a master task from this recurring task
        INSERT INTO public.tasks (
            title, description, category,
            owner_type, vo_id, station_id, station_group_id,
            created_by, year, deadline_day, notes,
            is_recurring_master, is_recurring_monthly,
            status
        )
        VALUES (
            recurring_task.title, 
            recurring_task.description, 
            recurring_task.category,
            recurring_task.owner_type, 
            recurring_task.vo_id, 
            recurring_task.station_id, 
            recurring_task.station_group_id,
            recurring_task.created_by, 
            current_year_val, 
            recurring_task.deadline_day, 
            recurring_task.notes,
            true,   -- This is now a master
            false,  -- Masters are not recurring_monthly
            'not_started'  -- Masters don't have status
        )
        RETURNING id INTO master_id;
        
        migrated := migrated + 1;
        
        -- If the original task was completed, create an instance for that completion month
        IF recurring_task.status = 'done' AND recurring_task.completed_at IS NOT NULL THEN
            completed_month := EXTRACT(MONTH FROM recurring_task.completed_at);
            completed_year := EXTRACT(YEAR FROM recurring_task.completed_at);
            
            -- Update the original task to become an instance of the completed month
            UPDATE public.tasks
            SET 
                is_recurring_monthly = false,
                is_recurring_master = false,
                recurring_master_id = master_id,
                instance_month = completed_month,
                instance_year = completed_year
            WHERE id = recurring_task.id;
            
            instances := instances + 1;
        ELSE
            -- If not completed, convert to current month instance
            UPDATE public.tasks
            SET 
                is_recurring_monthly = false,
                is_recurring_master = false,
                recurring_master_id = master_id,
                instance_month = current_month_val,
                instance_year = current_year_val
            WHERE id = recurring_task.id;
            
            instances := instances + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT migrated, instances;
END;
$$;

COMMENT ON FUNCTION migrate_recurring_monthly_to_instances() IS 'One-time migration: Converts old is_recurring_monthly=true tasks to new master/instance system';
