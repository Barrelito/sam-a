// Läsbara beskrivningar av hur bedömningen ändrats sedan medarbetarsamtalet,
// för presentationsläget som visas för medarbetaren.

import {
    changedSinceEmployeeMeeting,
    changedSkilledSinceEmployeeMeeting,
    metLabel,
    type AssessmentSnapshot,
} from './lonesattning'
import { findCriterionByKey } from './particularly-skilled-criteria'
import { findSubCriterion, RATING_DISPLAY_NAMES } from './salary-criteria'
import type { CriteriaRating } from './types'

export type AssessmentChange = { key: string; label: string; then: string; now: string }

const ratingLabel = (rating: CriteriaRating | null | undefined) =>
    rating ? RATING_DISPLAY_NAMES[rating] : 'Ej bedömt'

export function describeChangesSinceMeeting(
    criteria: { sub_criterion_key: string; rating: CriteriaRating }[],
    particularlySkilled: { criterion_key: string; is_met: boolean }[],
    atMeeting: AssessmentSnapshot | null | undefined
): AssessmentChange[] {
    if (!atMeeting) return []

    const currentRatings = Object.fromEntries(criteria.map(c => [c.sub_criterion_key, c.rating]))
    const ratingChanges = changedSinceEmployeeMeeting(currentRatings, atMeeting.criteria)

    const currentMet = Object.fromEntries(particularlySkilled.map(p => [p.criterion_key, p.is_met]))
    const skilledKeys = [...new Set([...Object.keys(currentMet), ...Object.keys(atMeeting.particularly_skilled)])]
    const skilledChanges = changedSkilledSinceEmployeeMeeting(skilledKeys, currentMet, atMeeting.particularly_skilled)

    return [
        ...Object.entries(ratingChanges).map(([key, then]) => {
            const sub = findSubCriterion(key)?.criterion
            return {
                key,
                label: sub ? `${key}. ${sub.text}` : key,
                then: ratingLabel(then),
                now: ratingLabel(currentRatings[key]),
            }
        }),
        ...Object.entries(skilledChanges).map(([key, then]) => ({
            key,
            label: findCriterionByKey(key)?.text ?? key,
            then: metLabel(then),
            now: metLabel(currentMet[key]),
        })),
    ]
}
