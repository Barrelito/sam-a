// Presentationsläge för medarbetarsamtalet: visas för medarbetaren.
// Föregående lönesättning utan lönebelopp och utan chefens interna anteckningar.

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import { getPreviousLonesattning } from '@/lib/salary-review/reviews-server'
import { forPresentation } from '@/lib/salary-review/lonesattning'
import PreviousLonesattningPanel from '@/components/salary-review/PreviousLonesattningPanel'

export const dynamic = 'force-dynamic'

export default async function EmployeeMeetingPresentationPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { id: employeeId } = await params
    const { data: employee } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .eq('id', employeeId)
        .single()

    if (!employee) notFound()

    const { cycle } = await getSelectedCycle(supabase)
    const previous = cycle ? await getPreviousLonesattning(supabase, employeeId, cycle.year) : null

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Medarbetarsamtal{cycle ? ` ${cycle.year}` : ''}</h1>
                    <p className="text-muted-foreground">{employee.first_name} {employee.last_name}</p>
                </div>
                <PreviousLonesattningPanel previous={previous ? forPresentation(previous) : null} />
            </div>
        </div>
    )
}
