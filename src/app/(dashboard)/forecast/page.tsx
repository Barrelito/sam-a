import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ForecastClient from './forecast-client';

export const metadata = {
    title: 'Personalprognos 2026',
};

export default async function ForecastPage() {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect('/login');
    }

    // Get the user's station (assuming they are a station manager)
    // For simplicity, we get the first assigned station
    const { data: userStations } = await supabase
        .from('user_stations')
        .select('station_id, station:stations(name)')
        .eq('user_id', user.id)
        .limit(1);

    const stationId = userStations && userStations.length > 0 ? userStations[0].station_id : null;
    const stationName = userStations && userStations.length > 0 ? (userStations[0].station as any).name : 'Okänd Station';

    return (
        <div className="flex flex-col h-full max-w-[1600px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Personalprognos 2026</h1>
                    <p className="text-muted-foreground mt-1">
                        Station: {stationName} {!stationId && "(Ingen station tilldelad)"}
                    </p>
                </div>
            </div>

            {stationId ? (
                <ForecastClient stationId={stationId} year={2026} />
            ) : (
                <div className="p-12 text-center bg-slate-50 border rounded-lg">
                    <h3 className="text-lg font-medium">Behörighet saknas</h3>
                    <p className="text-muted-foreground mt-2">Du verkar inte vara tilldelad till någon station. Kontakta din administratör.</p>
                </div>
            )}
        </div>
    );
}
