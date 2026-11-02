// Gemensam ram för löneöversynen: årsvalet ligger överst på alla sidor,
// och admin och VO-chef kan stänga vald löneöversyn därifrån.

import { createClient } from '@/lib/supabase/server'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import { CLOSE_CYCLE_ROLES, isOpenCycle } from '@/lib/salary-review/lonesattning'
import CycleYearPicker from '@/components/salary-review/CycleYearPicker'
import CloseCycleButton from '@/components/salary-review/CloseCycleButton'
import type { UserRole } from '@/lib/types'

export default async function SalaryReviewLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { cycle, cycles } = await getSelectedCycle(supabase)

    let unfinishedCount: number | null = null
    if (cycle && isOpenCycle(cycle)) {
        const { data: { user } } = await supabase.auth.getUser()
        const { data: profile } = user
            ? await supabase.from('profiles').select('role').eq('id', user.id).single()
            : { data: null }

        if (profile && CLOSE_CYCLE_ROLES.includes(profile.role as UserRole)) {
            const { count } = await supabase
                .from('salary_reviews')
                .select('id', { count: 'exact', head: true })
                .eq('cycle_id', cycle.id)
                .neq('status', 'completed')
            unfinishedCount = count ?? 0
        }
    }

    return (
        <>
            {cycles.length > 0 && (
                <div className="container mx-auto pt-6 flex flex-wrap items-center justify-end gap-3">
                    {cycle && unfinishedCount !== null && (
                        <CloseCycleButton cycleId={cycle.id} year={cycle.year} unfinishedCount={unfinishedCount} />
                    )}
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
