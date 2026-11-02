import { describe, expect, it } from 'vitest'
import {
    assessmentSnapshot,
    changedSinceEmployeeMeeting,
    showMissingEmployeeMeetingWarning,
    cycleStatusLabel,
    forPresentation,
    parseYear,
    pickCycle,
    pickPreviousReview,
    startableYear,
    toPreviousLonesattning,
    type PreviousLonesattning,
} from './lonesattning'

const c2025 = { id: 'c25', year: 2025, status: 'completed' as const }
const c2026 = { id: 'c26', year: 2026, status: 'active' as const }
const c2027 = { id: 'c27', year: 2027, status: 'active' as const }
const c2027planning = { id: 'c27p', year: 2027, status: 'planning' as const }

describe('pickCycle: vilken löneöversyn som är vald', () => {
    it('väljer det begärda året när det finns', () => {
        expect(pickCycle([c2026, c2027], 2026)).toBe(c2026)
    })

    it('väljer nyaste öppna löneöversyn när inget år begärs', () => {
        expect(pickCycle([c2025, c2026, c2027], null)).toBe(c2027)
    })

    it('räknar en löneöversyn under planering som öppen', () => {
        expect(pickCycle([c2026, c2027planning])).toBe(c2027planning)
    })

    it('faller tillbaka på nyaste öppna när det begärda året saknas', () => {
        expect(pickCycle([c2026, c2027], 2030)).toBe(c2027)
    })

    it('hoppar över stängda löneöversyner som standard', () => {
        expect(pickCycle([{ ...c2027, status: 'completed' }, c2026])).toBe(c2026)
    })

    it('låter en stängd löneöversyn väljas uttryckligen', () => {
        expect(pickCycle([c2025, c2026], 2025)).toBe(c2025)
    })

    it('ger ingen när alla löneöversyner är stängda och inget år begärs', () => {
        expect(pickCycle([c2025])).toBeNull()
    })

    it('ger ingen när det inte finns några löneöversyner alls', () => {
        expect(pickCycle([], 2026)).toBeNull()
    })
})

describe('parseYear', () => {
    it('läser ett fyrsiffrigt år', () => {
        expect(parseYear('2027')).toBe(2027)
        expect(parseYear(['2026', '2027'])).toBe(2026)
    })

    it('ger null för saknat eller ogiltigt år', () => {
        expect(parseYear(null)).toBeNull()
        expect(parseYear(undefined)).toBeNull()
        expect(parseYear('')).toBeNull()
        expect(parseYear('27')).toBeNull()
        expect(parseYear('2027; drop')).toBeNull()
    })
})

describe('cycleStatusLabel', () => {
    it('visar planering och aktiv som öppen, och avslutad som stängd', () => {
        expect(cycleStatusLabel('planning')).toBe('Öppen')
        expect(cycleStatusLabel('active')).toBe('Öppen')
        expect(cycleStatusLabel('completed')).toBe('Stängd')
    })
})

describe('startableYear: vilket år chefen kan starta', () => {
    const today = new Date('2026-11-02T10:00:00Z')

    it('ger nästa år till en stationschef när det inte finns', () => {
        expect(startableYear('station_manager', [c2026], today)).toBe(2027)
    })

    it('ger inget när nästa år redan är startat', () => {
        expect(startableYear('station_manager', [c2026, c2027], today)).toBeNull()
    })

    it('ger inget till biträdande chef', () => {
        expect(startableYear('assistant_manager', [c2026], today)).toBeNull()
    })

    it('ger nästa år även när ett stängt år ligger före', () => {
        expect(startableYear('vo_chief', [c2025], today)).toBe(2027)
    })
})

describe('assessmentSnapshot: bedömningen när medarbetarsamtalet genomfördes', () => {
    it('sparar betyg per delkriterium och uppfyllt per yrkesskicklighetskriterium', () => {
        const snapshot = assessmentSnapshot(
            [
                { sub_criterion_key: '1a', rating: 'bra' },
                { sub_criterion_key: '2b', rating: 'utmarkt' },
            ],
            [
                { criterion_key: 'ps1', is_met: true },
                { criterion_key: 'ps2', is_met: false },
            ]
        )

        expect(snapshot).toEqual({
            criteria: { '1a': 'bra', '2b': 'utmarkt' },
            particularly_skilled: { ps1: true, ps2: false },
        })
    })

    it('ger tomma bedömningar när inget är bedömt', () => {
        expect(assessmentSnapshot([], [])).toEqual({ criteria: {}, particularly_skilled: {} })
    })
})

describe('pickPreviousReview: medarbetarens föregående lönesättning', () => {
    const r2024 = { id: 'r24', cycle: { year: 2024 } }
    const r2025 = { id: 'r25', cycle: { year: 2025 } }
    const r2026 = { id: 'r26', cycle: { year: 2026 } }
    const r2027 = { id: 'r27', cycle: { year: 2027 } }

    it('väljer senaste tidigare år', () => {
        expect(pickPreviousReview([r2024, r2026, r2025, r2027], 2027)).toBe(r2026)
    })

    it('hoppar över år som saknas', () => {
        expect(pickPreviousReview([r2024, r2027], 2027)).toBe(r2024)
    })

    it('räknar aldrig samma eller senare år som föregående', () => {
        expect(pickPreviousReview([r2027], 2027)).toBeNull()
        expect(pickPreviousReview([r2027], 2026)).toBeNull()
    })

    it('ger null för en nyanställd utan tidigare lönesättning', () => {
        expect(pickPreviousReview([], 2027)).toBeNull()
    })

    it('tål lönesättningar utan löneöversyn', () => {
        expect(pickPreviousReview([{ id: 'x', cycle: null }, r2025], 2027)).toBe(r2025)
    })
})

describe('forPresentation: föregående lönesättning som medarbetaren får se', () => {
    const previous: PreviousLonesattning = {
        year: 2026,
        criteria: { '1a': 'bra' },
        particularly_skilled: { ps1: true },
        is_particularly_skilled: true,
        agreements: 'Leda en övning',
        development_needs: 'Handledarutbildning',
        employee_meeting_notes: 'Chefens anteckning',
        salary_meeting_notes: 'Anteckning från lönesamtalet',
        salary_before: 38000,
        salary_after: 39500,
        increase: 1500,
    }

    it('tar bort lönebelopp och chefens interna anteckningar', () => {
        expect(forPresentation(previous)).toEqual({
            year: 2026,
            criteria: { '1a': 'bra' },
            particularly_skilled: { ps1: true },
            is_particularly_skilled: true,
            agreements: 'Leda en övning',
            development_needs: 'Handledarutbildning',
            employee_meeting_notes: null,
            salary_meeting_notes: null,
            salary_before: null,
            salary_after: null,
            increase: null,
        })
    })
})

describe('toPreviousLonesattning: sammanställer en tidigare lönesättning', () => {
    const row = {
        cycle: { year: 2026 },
        is_particularly_skilled: false,
        final_salary: 39500,
        final_increase: 1200,
        skilled_amount: 300,
        meeting_notes: 'Från lönesamtalet',
        salary_criteria_assessments: [{ sub_criterion_key: '1a', rating: 'bra' as const }],
        particularly_skilled_assessments: [{ criterion_key: 'ps1', is_met: false }],
        meeting_preparation: { development_needs: 'Från förberedelsen' },
    }

    it('tar överenskommelser och utvecklingsbehov från medarbetarsamtalet', () => {
        const previous = toPreviousLonesattning(row, {
            agreements: 'Leda en övning',
            development_needs: 'Handledarutbildning',
            notes: 'Intern',
        })

        expect(previous).toEqual({
            year: 2026,
            criteria: { '1a': 'bra' },
            particularly_skilled: { ps1: false },
            is_particularly_skilled: false,
            agreements: 'Leda en övning',
            development_needs: 'Handledarutbildning',
            employee_meeting_notes: 'Intern',
            salary_meeting_notes: 'Från lönesamtalet',
            salary_before: 38000,
            salary_after: 39500,
            increase: 1500,
        })
    })

    it('faller tillbaka på lönesamtalets förberedelse för år utan medarbetarsamtal', () => {
        const previous = toPreviousLonesattning(row, null)

        expect(previous.agreements).toBeNull()
        expect(previous.development_needs).toBe('Från förberedelsen')
        expect(previous.employee_meeting_notes).toBeNull()
    })

    it('visar ingen lön före när slutlig lön saknas', () => {
        const previous = toPreviousLonesattning(
            { ...row, final_salary: null, final_increase: null, skilled_amount: null, meeting_preparation: [] },
            null
        )

        expect(previous.salary_before).toBeNull()
        expect(previous.salary_after).toBeNull()
        expect(previous.increase).toBeNull()
        expect(previous.development_needs).toBeNull()
    })
})

describe('changedSinceEmployeeMeeting: bedömning som ändrats efter medarbetarsamtalet', () => {
    const snapshot = { '1a': 'bra', '2b': 'mycket_bra', '3c': 'utmarkt' } as const

    it('ger värdet i medarbetarsamtalet för varje ändrat kriterium', () => {
        expect(
            changedSinceEmployeeMeeting({ '1a': 'mycket_bra', '2b': 'mycket_bra', '3c': 'bra' }, snapshot)
        ).toEqual({ '1a': 'bra', '3c': 'utmarkt' })
    })

    it('ger inget när inget ändrats', () => {
        expect(changedSinceEmployeeMeeting({ ...snapshot }, snapshot)).toEqual({})
    })

    it('räknar ett kriterium som bedömts först efter samtalet som ändrat', () => {
        expect(changedSinceEmployeeMeeting({ '1a': 'bra', '4a': 'bra' }, { '1a': 'bra' })).toEqual({ '4a': null })
    })

    it('räknar ett kriterium vars bedömning tagits bort som ändrat', () => {
        expect(changedSinceEmployeeMeeting({}, { '1a': 'bra' })).toEqual({ '1a': 'bra' })
    })

    it('ger inget när medarbetarsamtalet inte är genomfört', () => {
        expect(changedSinceEmployeeMeeting({ '1a': 'utmarkt' }, null)).toEqual({})
    })

    it('fungerar likadant för särskild yrkesskicklighet', () => {
        expect(changedSinceEmployeeMeeting({ ps1: true, ps2: true }, { ps1: true, ps2: false })).toEqual({ ps2: false })
    })
})

describe('showMissingEmployeeMeetingWarning: varning i lönesamtalet', () => {
    it('varnar när medarbetarsamtalet saknas', () => {
        expect(showMissingEmployeeMeetingWarning(null)).toBe(true)
    })

    it('varnar när medarbetarsamtalet är påbörjat men inte genomfört', () => {
        expect(showMissingEmployeeMeetingWarning({ completed_at: null })).toBe(true)
    })

    it('varnar inte när medarbetarsamtalet är genomfört', () => {
        expect(showMissingEmployeeMeetingWarning({ completed_at: '2026-11-20T09:00:00Z' })).toBe(false)
    })
})
