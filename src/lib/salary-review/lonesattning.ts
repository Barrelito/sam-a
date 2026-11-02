// Regler för löneöversyn och lönesättning (se CONTEXT.md och ADR 0004).
//
// Rena funktioner utan databasanrop, så att samma regler gäller i sidor och
// routes och kan testas utan Supabase. I koden heter en löneöversyn "cycle"
// (tabellen salary_review_cycles) och en lönesättning "review".

import type { CriteriaRating, CycleStatus } from './types'
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
 * Samma lista finns i databasregeln "Managers can start cycles"
 * (supabase/migrations/20261102120000_chefer_startar_loneoversyn.sql).
 */
export const START_CYCLE_ROLES: readonly UserRole[] = ['station_manager', 'area_manager', 'vo_chief', 'admin']

/**
 * Att stänga påverkar alla stationer och är förbehållet admin och VO-chef.
 * Motsvarar databasregeln "Admins and VO chiefs can update cycles".
 */
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

/**
 * Bedömningen som den var när medarbetarsamtalet markerades genomfört.
 * Lönesamtalet jämför mot den för att visa vad som ändrats sedan dess.
 */
export type AssessmentSnapshot = {
    criteria: Record<string, CriteriaRating>
    particularly_skilled: Record<string, boolean>
}

export function assessmentSnapshot(
    criteria: { sub_criterion_key: string; rating: CriteriaRating }[],
    particularlySkilled: { criterion_key: string; is_met: boolean }[]
): AssessmentSnapshot {
    return {
        criteria: Object.fromEntries(criteria.map(c => [c.sub_criterion_key, c.rating])),
        particularly_skilled: Object.fromEntries(particularlySkilled.map(p => [p.criterion_key, p.is_met])),
    }
}

/**
 * Medarbetarens föregående lönesättning: den i senaste tidigare år, oavsett om
 * den löneöversynen är stängd. Ett år utan lönesättning hoppas över.
 */
export function pickPreviousReview<T extends { cycle: { year: number } | null }>(
    reviews: T[],
    currentYear: number
): T | null {
    return (
        reviews
            .filter(r => r.cycle && r.cycle.year < currentYear)
            .sort((a, b) => b.cycle!.year - a.cycle!.year)[0] ?? null
    )
}

/** Det som tas upp från föregående lönesättning i medarbetarsamtalet. */
export type PreviousLonesattning = {
    year: number
    criteria: Record<string, CriteriaRating>
    particularly_skilled: Record<string, boolean>
    is_particularly_skilled: boolean | null
    agreements: string | null
    development_needs: string | null
    /** Chefens interna anteckningar – visas inte för medarbetaren */
    employee_meeting_notes: string | null
    salary_meeting_notes: string | null
    /** Lönebelopp – visas inte för medarbetaren */
    salary_before: number | null
    salary_after: number | null
    increase: number | null
}

/** Presentationsläget visas för medarbetaren: utan lön och interna anteckningar. */
export function forPresentation(previous: PreviousLonesattning): PreviousLonesattning {
    return {
        ...previous,
        employee_meeting_notes: null,
        salary_meeting_notes: null,
        salary_before: null,
        salary_after: null,
        increase: null,
    }
}

type PreviousReviewRow = {
    cycle: { year: number } | null
    is_particularly_skilled?: boolean | null
    final_salary?: number | null
    final_increase?: number | null
    skilled_amount?: number | null
    meeting_notes?: string | null
    salary_criteria_assessments?: { sub_criterion_key: string; rating: CriteriaRating }[] | null
    particularly_skilled_assessments?: { criterion_key: string; is_met: boolean }[] | null
    /** Supabase ger en rad eller en lista beroende på relationen */
    meeting_preparation?: { development_needs?: string | null } | { development_needs?: string | null }[] | null
}

type PreviousMeetingRow = {
    agreements?: string | null
    development_needs?: string | null
    notes?: string | null
}

/**
 * Sammanställer en tidigare lönesättning. År innan medarbetarsamtalet fanns
 * (t.ex. 2026) har inget samtal; då hämtas utvecklingsbehov från
 * lönesamtalets förberedelse.
 */
export function toPreviousLonesattning(
    row: PreviousReviewRow,
    meeting: PreviousMeetingRow | null
): PreviousLonesattning {
    const preparation = Array.isArray(row.meeting_preparation)
        ? row.meeting_preparation[0]
        : row.meeting_preparation
    const after = row.final_salary ?? null
    const hasIncrease = row.final_increase != null || row.skilled_amount != null
    const increase = after != null && hasIncrease
        ? Number(row.final_increase ?? 0) + Number(row.skilled_amount ?? 0)
        : null
    const snapshot = assessmentSnapshot(
        row.salary_criteria_assessments ?? [],
        row.particularly_skilled_assessments ?? []
    )

    return {
        year: row.cycle?.year ?? 0,
        criteria: snapshot.criteria,
        particularly_skilled: snapshot.particularly_skilled,
        is_particularly_skilled: row.is_particularly_skilled ?? null,
        agreements: meeting?.agreements ?? null,
        development_needs: meeting?.development_needs ?? preparation?.development_needs ?? null,
        employee_meeting_notes: meeting?.notes ?? null,
        salary_meeting_notes: row.meeting_notes ?? null,
        salary_before: after != null && increase != null ? Number(after) - increase : null,
        salary_after: after != null ? Number(after) : null,
        increase,
    }
}

/**
 * Kriterier vars bedömning skiljer sig från den som sparades när
 * medarbetarsamtalet genomfördes, med värdet då (null om det inte var
 * bedömt). Utan genomfört medarbetarsamtal finns inget att jämföra med.
 */
export function changedSinceEmployeeMeeting<V extends string | boolean>(
    current: Record<string, V>,
    atMeeting: Record<string, V> | null | undefined
): Record<string, V | null> {
    if (!atMeeting) return {}
    const changed: Record<string, V | null> = {}
    for (const key of new Set([...Object.keys(current), ...Object.keys(atMeeting)])) {
        const then = atMeeting[key] ?? null
        if ((current[key] ?? null) !== then) changed[key] = then
    }
    return changed
}

/** Lönesamtalet kan hållas ändå, men chefen ska se att medarbetarsamtalet saknas. */
export function showMissingEmployeeMeetingWarning(
    meeting: { completed_at: string | null } | null
): boolean {
    return !meeting?.completed_at
}

/** Hur ett kriterium för särskild yrkesskicklighet visas. */
export function metLabel(met: boolean | null | undefined): string {
    return met ? 'Uppfyllt' : 'Ej uppfyllt'
}

/**
 * Som changedSinceEmployeeMeeting, men för särskild yrkesskicklighet: ett
 * kriterium som inte är bedömt räknas som ej uppfyllt, både nu och då.
 */
export function changedSkilledSinceEmployeeMeeting(
    keys: string[],
    current: Record<string, boolean | undefined>,
    atMeeting: Record<string, boolean> | null | undefined
): Record<string, boolean> {
    if (!atMeeting) return {}
    const changed = changedSinceEmployeeMeeting(
        Object.fromEntries(keys.map(key => [key, current[key] ?? false])),
        Object.fromEntries(keys.map(key => [key, atMeeting[key] ?? false]))
    )
    return changed as Record<string, boolean>
}
