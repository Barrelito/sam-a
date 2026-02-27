import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AreaForecastClient from './area-client';

export const metadata = {
    title: 'Personalprognos 2026 - Områdesöversikt',
};

export default async function AreaForecastPage() {
    const supabase = await createClient();

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        redirect('/login');
    }

    // VO check
    const { data: profile } = await supabase
        .from('profiles')
        .select('vo_id, verksamhetsomraden(name)')
        .eq('id', user.id)
        .single();

    const voId = profile?.vo_id;
    const voName = profile?.verksamhetsomraden ? (profile.verksamhetsomraden as any).name : 'Okänt Område';

    return (
        <div className="flex flex-col h-full max-w-[1600px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Personalprognos 2026 - Områdesöversikt</h1>
                    <p className="text-muted-foreground mt-1">
                        Verksamhetsområde: {voName} {!voId && "(Ingen behörighet)"}
                    </p>
                </div>
            </div>

            {voId ? (
                <AreaForecastClient year={2026} />
            ) : (
                <div className="p-12 text-center bg-slate-50 border rounded-lg">
                    <h3 className="text-lg font-medium">Behörighet saknas</h3>
                    <p className="text-muted-foreground mt-2">Du är inte knuten till något Verksamhetsområde (VO). Kontakta din administratör.</p>
                </div>
            )}
        </div>
    );
}
