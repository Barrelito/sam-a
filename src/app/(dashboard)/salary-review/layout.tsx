// Gemensam ram för löneöversynen: årsvalet ligger överst på alla sidor.

import { createClient } from '@/lib/supabase/server'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import CycleYearPicker from '@/components/salary-review/CycleYearPicker'

export default async function SalaryReviewLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { cycle, cycles } = await getSelectedCycle(supabase)

    return (
        <>
            {cycles.length > 0 && (
                <div className="container mx-auto pt-6 flex justify-end">
                    <CycleYearPicker
                        cycles={cycles.map(c => ({ year: c.year, status: c.status }))}
                        selectedYear={cycle?.year ?? null}
                    />
                </div>
            )}
            {children}
        </>
    )
}
