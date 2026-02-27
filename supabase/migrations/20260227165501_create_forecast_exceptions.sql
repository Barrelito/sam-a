-- Skapar tabell för manuella undantag i prognosen
CREATE TABLE IF NOT EXISTS forecast_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 52),
    hours DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index för snabbare uppslag
CREATE INDEX IF NOT EXISTS idx_forecast_exceptions_lookup ON forecast_exceptions(employee_id, year, week_number);

-- RLS (Basic for now)
ALTER TABLE forecast_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on forecast_exceptions" 
ON forecast_exceptions FOR ALL 
USING (auth.role() = 'authenticated');
