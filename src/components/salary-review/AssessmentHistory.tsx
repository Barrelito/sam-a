// Visas under ett kriterium i bedömningen: fjolårets värde, och om
// bedömningen ändrats sedan medarbetarsamtalet, vad den var då.

import { History, PencilLine } from 'lucide-react'

export interface AssessmentHistoryProps {
    /** År för föregående lönesättning, om det finns en */
    previousYear?: number | null
    /** Fjolårets värde, eller null om kriteriet inte bedömdes då */
    previousLabel?: string | null
    /** Satt bara när bedömningen ändrats sedan medarbetarsamtalet; null = var inte bedömt då */
    atMeetingLabel?: string | null
}

export default function AssessmentHistory({ previousYear, previousLabel, atMeetingLabel }: AssessmentHistoryProps) {
    const showPrevious = previousYear != null
    const changed = atMeetingLabel !== undefined
    if (!showPrevious && !changed) return null

    return (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {showPrevious && (
                <span className="flex items-center gap-1 text-muted-foreground">
                    <History className="h-3 w-3" />
                    {previousYear}: {previousLabel ?? 'ej bedömt'}
                </span>
            )}
            {changed && (
                <span className="flex items-center gap-1 text-amber-700">
                    <PencilLine className="h-3 w-3" />
                    {atMeetingLabel === null
                        ? 'Var inte bedömt i medarbetarsamtalet'
                        : <>Var <em>{atMeetingLabel}</em> i medarbetarsamtalet</>}
                </span>
            )}
        </div>
    )
}
