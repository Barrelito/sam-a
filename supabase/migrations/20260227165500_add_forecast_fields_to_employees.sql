-- Add new fields to employees for Personalprognos 2026
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employment_rate DECIMAL(5,2) DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS night_share DECIMAL(5,2) DEFAULT 0.0;
