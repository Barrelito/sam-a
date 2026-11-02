// Visas under ett kriterium i bedömningen: fjolårets värde och konkreta
// exempel, och om bedömningen ändrats sedan medarbetarsamtalet, vad den var då.

import { History, PencilLine } from 'lucide-react'

export interface AssessmentHistoryProps {
    /** År för föregående lönesättning, om det finns en */
    previousYear?: number | null
    /** Fjolårets värde, eller null om kriteriet inte bedömdes då */
    previousLabel?: string | null
    /** Fjolårets konkreta exempel för kriteriet, om sådana skrevs */
    previousEvidence?: string | null
    /** Satt bara när bedömningen ändrats sedan medarbetarsamtalet; null = var inte bedömt då */
    atMeetingLabel?: string | null
}

export default function AssessmentHistory({ previousYear, previousLabel, previousEvidence, atMeetingLabel }: AssessmentHistoryProps) {
    const showPrevious = previousYear != null
    const changed = atMeetingLabel !== undefined
    if (!showPrevious && !changed) return null

    return (
        <div className="mt-2 space-y-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
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
            {showPrevious && previousEvidence && (
                <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    <p className="mb-0.5 font-medium">Konkreta exempel {previousYear}</p>
                    <p className="whitespace-pre-wrap">{previousEvidence}</p>
                </div>
            )}
        </div>
    )
}
