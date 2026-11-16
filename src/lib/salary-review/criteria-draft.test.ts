import { describe, expect, it } from 'vitest'
import { withEvidence, withRating, type CriteriaDraft } from './criteria-draft'

describe('bedömning av lönekriterier: betyg och konkreta exempel i valfri ordning', () => {
    it('tar emot konkreta exempel innan delkriteriet har fått betyg', () => {
        const draft = withEvidence({}, '1b', '1', 'Tog initiativ vid larmet')

        expect(draft['1b']).toEqual({ rating: '', evidence: 'Tog initiativ vid larmet', notes: '', category_key: '1' })
    })

    it('behåller texten när betyget sätts efteråt', () => {
        let draft: CriteriaDraft = withEvidence({}, '1b', '1', 'Tog initiativ')
        draft = withRating(draft, '1b', '1', 'bra')

        expect(draft['1b']).toMatchObject({ rating: 'bra', evidence: 'Tog initiativ' })
    })

    it('behåller betyget när texten ändras', () => {
        let draft: CriteriaDraft = withRating({}, '1a', '1', 'utmarkt')
        draft = withEvidence(draft, '1a', '1', 'Ledde övningen')

        expect(draft['1a']).toMatchObject({ rating: 'utmarkt', evidence: 'Ledde övningen' })
    })
})
