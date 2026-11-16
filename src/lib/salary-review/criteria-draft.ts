// Chefens pågående bedömning av lönekriterierna, innan den sparas.
// Betyg och konkreta exempel kan fyllas i i valfri ordning.

import type { CriteriaRating } from './types'

export type CriterionDraft = {
    rating: CriteriaRating | ''
    evidence: string
    notes: string
    category_key: string
}

export type CriteriaDraft = Record<string, CriterionDraft>

export function withRating(draft: CriteriaDraft, subCriterionKey: string, categoryKey: string, rating: CriteriaRating): CriteriaDraft {
    const current = draft[subCriterionKey]
    return {
        ...draft,
        [subCriterionKey]: {
            rating,
            evidence: current?.evidence ?? '',
            notes: current?.notes ?? '',
            category_key: categoryKey,
        },
    }
}

export function withEvidence(draft: CriteriaDraft, subCriterionKey: string, categoryKey: string, evidence: string): CriteriaDraft {
    const current = draft[subCriterionKey]
    return {
        ...draft,
        [subCriterionKey]: {
            rating: current?.rating ?? '',
            evidence,
            notes: current?.notes ?? '',
            category_key: categoryKey,
        },
    }
}
