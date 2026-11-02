import { describe, expect, it } from 'vitest'
import { describeChangesSinceMeeting } from './assessment-labels'
import { SALARY_CRITERIA } from './salary-criteria'
import { VUB_CRITERIA } from './particularly-skilled-criteria'

const sub1 = SALARY_CRITERIA[0].subcriteria[0]
const sub2 = SALARY_CRITERIA[1].subcriteria[0]
const skilled = VUB_CRITERIA[0].subcriteria[0]

describe('describeChangesSinceMeeting: ändringar som medarbetaren får se', () => {
    it('beskriver ändrade kriterier med värdet då och nu', () => {
        const changes = describeChangesSinceMeeting(
            [
                { sub_criterion_key: sub1.id, rating: 'mycket_bra' },
                { sub_criterion_key: sub2.id, rating: 'bra' },
            ],
            [],
            { criteria: { [sub1.id]: 'bra', [sub2.id]: 'bra' }, particularly_skilled: {} }
        )

        expect(changes).toEqual([
            { key: sub1.id, label: `${sub1.id}. ${sub1.text}`, then: 'Bra', now: 'Mycket bra' },
        ])
    })

    it('beskriver kriterier som inte var bedömda vid samtalet', () => {
        const changes = describeChangesSinceMeeting(
            [{ sub_criterion_key: sub1.id, rating: 'bra' }],
            [],
            { criteria: {}, particularly_skilled: {} }
        )

        expect(changes[0]).toMatchObject({ then: 'Ej bedömt', now: 'Bra' })
    })

    it('beskriver ändrad särskild yrkesskicklighet', () => {
        const changes = describeChangesSinceMeeting(
            [],
            [{ criterion_key: skilled.id, is_met: true }],
            { criteria: {}, particularly_skilled: { [skilled.id]: false } }
        )

        expect(changes).toEqual([
            { key: skilled.id, label: skilled.text, then: 'Ej uppfyllt', now: 'Uppfyllt' },
        ])
    })

    it('ger inga ändringar utan genomfört medarbetarsamtal', () => {
        expect(describeChangesSinceMeeting([{ sub_criterion_key: sub1.id, rating: 'bra' }], [], null)).toEqual([])
    })
})
