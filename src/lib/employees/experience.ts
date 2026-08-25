// Erfarenhet härleds från anställningsdatum.
//
// Bakgrund: 'experience_level' var tidigare ett helt manuellt fält vid sidan av
// 'employment_date', vilket gav två sanningar för samma sak - de kunde peka åt
// olika håll och det manuella värdet blev inaktuellt med tiden.
//
// Regeln nu: finns anställningsdatum är det källan. Kolumnen experience_level
// skrivs om automatiskt vid varje sparning och används bara som fallback för
// medarbetare som saknar anställningsdatum. Läsvägar härleder alltid värdet på
// nytt (via resolveExperienceLevel) så att det aldrig hinner bli inaktuellt.

export const EXPERIENCE_LEVELS = ['0-3', '3-5', '5-10', '10+'] as const
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]

export const EXPERIENCE_LABELS: Record<ExperienceLevel, string> = {
    '0-3': '0-3 år',
    '3-5': '3-5 år',
    '5-10': '5-10 år',
    '10+': '10+ år',
}

/** Antal hela anställningsår räknat från anställningsdatum. */
export function yearsOfService(
    employmentDate: string | null | undefined,
    today: Date = new Date()
): number | null {
    if (!employmentDate) return null

    const start = new Date(employmentDate)
    if (Number.isNaN(start.getTime())) return null

    let years = today.getFullYear() - start.getFullYear()

    // Dra av ett år om årsdagen inte passerats än i år
    const monthDiff = today.getMonth() - start.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < start.getDate())) {
        years--
    }

    // Framtida anställningsdatum räknas som 0 år, inte negativt
    return years < 0 ? 0 : years
}

/** Placerar ett antal år i rätt erfarenhetsintervall. */
export function experienceBucket(years: number): ExperienceLevel {
    if (years < 3) return '0-3'
    if (years < 5) return '3-5'
    if (years < 10) return '5-10'
    return '10+'
}

/** Erfarenhetsintervall härlett från anställningsdatum, om det finns. */
export function experienceLevelFromEmploymentDate(
    employmentDate: string | null | undefined,
    today: Date = new Date()
): ExperienceLevel | null {
    const years = yearsOfService(employmentDate, today)
    return years === null ? null : experienceBucket(years)
}

export function isExperienceLevel(value: unknown): value is ExperienceLevel {
    return typeof value === 'string' && (EXPERIENCE_LEVELS as readonly string[]).includes(value)
}

export interface ExperienceSource {
    employment_date?: string | null
    experience_level?: string | null
}

export interface ResolvedExperience {
    level: ExperienceLevel | null
    /** Antal hela år - bara känt när anställningsdatum finns. */
    years: number | null
    /** true = härlett från anställningsdatum, false = manuellt angivet. */
    derived: boolean
}

/**
 * Enda stället som avgör en medarbetares erfarenhet.
 * Anställningsdatum vinner alltid över det manuella fältet.
 */
export function resolveExperience(
    employee: ExperienceSource | null | undefined,
    today: Date = new Date()
): ResolvedExperience {
    const years = yearsOfService(employee?.employment_date, today)

    if (years !== null) {
        return { level: experienceBucket(years), years, derived: true }
    }

    const manual = employee?.experience_level
    return {
        level: isExperienceLevel(manual) ? manual : null,
        years: null,
        derived: false,
    }
}

/** Text att visa i gränssnittet, t.ex. "5-10 år (7 år)". */
export function formatExperience(resolved: ResolvedExperience): string {
    if (!resolved.level) return 'Ej angiven'

    const label = EXPERIENCE_LABELS[resolved.level]
    if (resolved.years === null) return label

    return `${label} (${resolved.years} år)`
}
