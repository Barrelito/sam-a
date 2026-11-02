// En stängd löneöversyn visas men kan inte ändras. Allt innehåll läggs i ett
// avstängt fieldset, så att formulärens fält och knappar blir inaktiva. Även
// navigeringsknappar inuti blir inaktiva, så sidan får en tillbakalänk utanför.

import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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

/** Gör fälten och knapparna i innehållet inaktiva när `disabled` är satt. */
export function ReadOnlyFieldset({ disabled, children }: { disabled: boolean; children: React.ReactNode }) {
    return (
        <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0">
            {children}
        </fieldset>
    )
}

export default function ClosedCycleGuard({
    cycle,
    backHref,
    children,
}: {
    cycle: { year: number; status: CycleStatus }
    /** Vart tillbakalänken går när innehållet är avstängt */
    backHref: string
    children: React.ReactNode
}) {
    if (isOpenCycle(cycle)) return <>{children}</>

    return (
        <>
            <div className="container mx-auto pt-4">
                <Link href={backHref}>
                    <Button variant="ghost" className="mb-2">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Tillbaka till medarbetare
                    </Button>
                </Link>
                <ClosedCycleNotice year={cycle.year} />
            </div>
            <ReadOnlyFieldset disabled>{children}</ReadOnlyFieldset>
        </>
    )
}
