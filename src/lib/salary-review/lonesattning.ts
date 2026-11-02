// Regler för löneöversyn och lönesättning (se CONTEXT.md och ADR 0004).
//
// Rena funktioner utan databasanrop, så att samma regler gäller i sidor och
// routes och kan testas utan Supabase. I koden heter en löneöversyn "cycle"
// (tabellen salary_review_cycles) och en lönesättning "review".

import type { CycleStatus } from './types'
import type { UserRole } from '@/lib/types'

type CycleLike = { year: number; status: CycleStatus }

/** En löneöversyn är öppen tills admin eller VO-chef stänger den. */
export function isOpenCycle(cycle: { status: CycleStatus }): boolean {
    return cycle.status !== 'completed'
}

/**
 * Den löneöversyn en vy ska visa: det begärda året om det finns, annars
 * nyaste öppna. Flera år kan vara öppna samtidigt, så "den aktiva" finns inte.
 */
export function pickCycle<T extends CycleLike>(
    cycles: T[],
    requestedYear?: number | null
): T | null {
    if (requestedYear != null) {
        const requested = cycles.find(c => c.year === requestedYear)
        if (requested) return requested
    }
    const open = cycles.filter(isOpenCycle).sort((a, b) => b.year - a.year)
    return open[0] ?? null
}

/** Ett år från en URL-parameter, eller null om den saknas eller är ogiltig. */
export function parseYear(value: string | string[] | null | undefined): number | null {
    const raw = Array.isArray(value) ? value[0] : value
    if (!raw || !/^\d{4}$/.test(raw)) return null
    return Number(raw)
}

/** Status på en löneöversyn som chefen ser den. */
export function cycleStatusLabel(status: CycleStatus): string {
    return isOpenCycle({ status }) ? 'Öppen' : 'Stängd'
}

/**
 * Vilka som får starta nästa års löneöversyn. Att starta lägger bara till
 * något, så chefer får göra det själva (ADR 0004). Biträdande chef får inte.
 */
export const START_CYCLE_ROLES: readonly UserRole[] = ['station_manager', 'area_manager', 'vo_chief', 'admin']

/** Att stänga påverkar alla stationer och är förbehållet admin och VO-chef. */
export const CLOSE_CYCLE_ROLES: readonly UserRole[] = ['vo_chief', 'admin']

/** Det enda år som får startas: året efter dagens datum. */
export function nextCycleYear(today: Date): number {
    return today.getFullYear() + 1
}

/** Året chefen kan starta just nu, eller null om knappen inte ska visas. */
export function startableYear(
    role: UserRole | null | undefined,
    cycles: { year: number }[],
    today: Date
): number | null {
    if (!role || !START_CYCLE_ROLES.includes(role)) return null
    const year = nextCycleYear(today)
    return cycles.some(c => c.year === year) ? null : year
}
