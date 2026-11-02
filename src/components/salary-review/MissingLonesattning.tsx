// När en medarbetare saknar lönesättning i vald löneöversyn: i en stängd
// löneöversyn skapas inga nya, i en öppen gick det inte att skapa den.

import { isOpenCycle } from '@/lib/salary-review/lonesattning'
import type { CycleStatus } from '@/lib/salary-review/types'

export default function MissingLonesattning({ cycle }: { cycle: { year: number; status: CycleStatus } }) {
    return (
        <div className="container mx-auto py-8">
            <p className="text-muted-foreground">
                {isOpenCycle(cycle)
                    ? 'Kunde inte skapa eller hämta lönesättningen.'
                    : `Medarbetaren har ingen lönesättning i löneöversyn ${cycle.year}.`}
            </p>
        </div>
    )
}
