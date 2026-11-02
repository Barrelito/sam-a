// Föregående lönesättning, som tas upp i medarbetarsamtalet.
// Panelen visar det den får: i presentationsläget har lönebelopp och chefens
// interna anteckningar redan tagits bort (forPresentation).

import { History } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SALARY_CRITERIA, RATING_COLORS, RATING_DISPLAY_NAMES } from '@/lib/salary-review/salary-criteria'
import { findCriterionByKey } from '@/lib/salary-review/particularly-skilled-criteria'
import { metLabel, type PreviousLonesattning } from '@/lib/salary-review/lonesattning'

const kr = (n: number) => `${n.toLocaleString('sv-SE')} kr`

function Text({ label, value }: { label: string; value: string | null }) {
    if (!value) return null
    return (
        <div>
            <h4 className="text-sm font-medium mb-1">{label}</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{value}</p>
        </div>
    )
}

export default function PreviousLonesattningPanel({ previous }: { previous: PreviousLonesattning | null }) {
    if (!previous) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Föregående lönesättning
                    </CardTitle>
                    <CardDescription>
                        Medarbetaren har ingen tidigare lönesättning, till exempel för att hen är nyanställd.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const skilled = Object.entries(previous.particularly_skilled)
    const hasCriteria = Object.keys(previous.criteria).length > 0
    const showSalary = previous.salary_after != null

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Föregående lönesättning – {previous.year}
                </CardTitle>
                <CardDescription>Det ni tog upp och kom fram till förra gången.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Text label="Överenskommelser" value={previous.agreements} />
                <Text label="Utvecklingsbehov" value={previous.development_needs} />

                {hasCriteria && (
                    <div>
                        <h4 className="text-sm font-medium mb-2">Bedömning av lönekriterier</h4>
                        <div className="space-y-3">
                            {SALARY_CRITERIA.map(category => {
                                const rated = category.subcriteria.filter(sub => previous.criteria[sub.id])
                                if (rated.length === 0) return null
                                return (
                                    <div key={category.id}>
                                        <p className="text-xs font-semibold text-muted-foreground mb-1">{category.name}</p>
                                        <ul className="space-y-1">
                                            {rated.map(sub => {
                                                const rating = previous.criteria[sub.id]
                                                return (
                                                    <li key={sub.id} className="flex items-start justify-between gap-3 text-sm">
                                                        <span>{sub.id}. {sub.text}</span>
                                                        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold border ${RATING_COLORS[rating]}`}>
                                                            {RATING_DISPLAY_NAMES[rating]}
                                                        </span>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {skilled.length > 0 && (
                    <div>
                        <h4 className="text-sm font-medium mb-2">
                            Särskild yrkesskicklighet
                            {previous.is_particularly_skilled != null && (
                                <span className="ml-2 font-normal text-muted-foreground">
                                    {previous.is_particularly_skilled ? 'uppfylldes' : 'uppfylldes inte'}
                                </span>
                            )}
                        </h4>
                        <ul className="space-y-1">
                            {skilled.map(([key, met]) => (
                                <li key={key} className="flex items-start justify-between gap-3 text-sm">
                                    <span>{findCriterionByKey(key)?.text ?? key}</span>
                                    <span className="shrink-0 text-xs">{met ? '✅' : '—'} {metLabel(met)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <Text label="Anteckningar från medarbetarsamtalet" value={previous.employee_meeting_notes} />
                <Text label="Anteckningar från lönesamtalet" value={previous.salary_meeting_notes} />

                {showSalary && (
                    <div className="grid gap-2 sm:grid-cols-3 text-sm">
                        {previous.salary_before != null && (
                            <div><p className="text-muted-foreground">Lön före</p><p className="font-medium">{kr(previous.salary_before)}</p></div>
                        )}
                        <div><p className="text-muted-foreground">Lön efter</p><p className="font-medium">{kr(previous.salary_after!)}</p></div>
                        {previous.increase != null && (
                            <div><p className="text-muted-foreground">Höjning</p><p className="font-medium">{kr(previous.increase)}</p></div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
