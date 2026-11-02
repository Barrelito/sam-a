import { describe, expect, it } from 'vitest'
import { cycleStatusLabel, parseYear, pickCycle } from './lonesattning'

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
