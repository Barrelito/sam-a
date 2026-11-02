// En stängd löneöversyn visas men kan inte ändras. Allt innehåll läggs i ett
// avstängt fieldset, så att formulärens fält och knappar blir inaktiva.

import { Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { isOpenCycle } from '@/lib/salary-review/lonesattning'
import type { CycleStatus } from '@/lib/salary-review/types'

export function ClosedCycleNotice({ year }: { year: number }) {
    return (
        <Alert className="mb-4">
            <Lock className="h-4 w-4" />
            <AlertDescription>
                Löneöversyn {year} är stängd. Du kan läsa underlaget men inte ändra något.
            </AlertDescription>
        </Alert>
    )
}

export default function ClosedCycleGuard({
    cycle,
    children,
}: {
    cycle: { year: number; status: CycleStatus }
    children: React.ReactNode
}) {
    if (isOpenCycle(cycle)) return <>{children}</>

    return (
        <>
            <div className="container mx-auto pt-4">
                <ClosedCycleNotice year={cycle.year} />
            </div>
            <fieldset disabled className="m-0 min-w-0 border-0 p-0">
                {children}
            </fieldset>
        </>
    )
}
