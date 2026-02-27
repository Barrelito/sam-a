-- Skapar tabell för att spåra utlånad personal mellan stationer
CREATE TABLE IF NOT EXISTS forecast_resource_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    from_station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    to_station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 52),
    hours DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index för snabba uppslag för VO/Station
CREATE INDEX IF NOT EXISTS idx_forecast_resource_transfers_from ON forecast_resource_transfers(from_station_id, year, week_number);
CREATE INDEX IF NOT EXISTS idx_forecast_resource_transfers_to ON forecast_resource_transfers(to_station_id, year, week_number);

-- RLS
ALTER TABLE forecast_resource_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users on forecast_resource_transfers"
ON forecast_resource_transfers FOR ALL
USING (auth.role() = 'authenticated');
