// =============================================
// Kriterier för Särskild Yrkesskicklighet
// Baserat på AISAB:s dokument "Bedömningskriterier för särskild yrkesskickliga inom ambulanssjukvård"
// =============================================

import type { EmployeeCategory } from './types'

export interface ParticularlySkillfulCriterion {
    id: string
    title: string
    description: string
    subcriteria: ParticularlySkillfulSubCriterion[]
}

export interface ParticularlySkillfulSubCriterion {
    id: string
    text: string
}

// =============================================
// VUB (Vårdare Utbildad Bas) - Kriterier
// =============================================

export const VUB_CRITERIA: ParticularlySkillfulCriterion[] = [
    {
        id: 'vub_1',
        title: 'Medarbetaren finns i den kliniska verksamheten',
        description: 'Medarbetaren finns i den kliniska verksamheten nära patienterna och bidrar aktivt till verksamhetens utveckling',
        subcriteria: [
            {
                id: 'vub_1_a',
                text: 'Medarbetaren finns i den kliniska verksamheten nära patienterna och bidrar aktivt till verksamhetens utveckling'
            }
        ]
    },
    {
        id: 'vub_2',
        title: 'Medarbetaren har förvärvat sin särskilda yrkesskicklighet genom erfarenhet av kliniskt arbete',
        description: 'Medarbetaren har förvärvat sin särskilda yrkesskicklighet genom erfarenhet av kliniskt arbete och har förmåga att dela med sig av sin verksamhetsnära kunskap till kollegor, studenter och patienter, dessa medarbetare har därför sannolikt en längre tids yrkeserfarenhet',
        subcriteria: [
            {
                id: 'vub_2_a',
                text: 'Medarbetaren har förvärvat sin särskilda yrkesskicklighet genom erfarenhet av kliniskt arbete och har förmåga att dela med sig av sin verksamhetsnära kunskap till kollegor, studenter och patienter, dessa medarbetare har därför sannolikt en längre tids yrkeserfarenhet'
            }
        ]
    },
    {
        id: 'vub_3',
        title: 'Medarbetaren är en verksamhetsbärare som arbetar interprofessionellt och coachande',
        description: 'Medarbetaren är en verksamhetsbärare som arbetar interprofessionellt och coachande och stärker andras resurser och förmågor',
        subcriteria: [
            {
                id: 'vub_3_a',
                text: 'Medarbetaren är en verksamhetsbärare som arbetar interprofessionellt och coachande och stärker andras resurser och förmågor'
            }
        ]
    },
    {
        id: 'vub_4',
        title: 'Medarbetarens handlingar och agerande tyder på kompetens baserat på erfarenheter, färdigheter och djupt kunnande',
        description: 'Medarbetarens handlingar och agerande tyder på kompetens baserat på erfarenheter, färdigheter och djupt kunnande',
        subcriteria: [
            {
                id: 'vub_4_a',
                text: 'Medarbetarens handlingar och agerande tyder på kompetens baserat på erfarenheter, färdigheter och djupt kunnande'
            }
        ]
    },
    {
        id: 'vub_5',
        title: 'Medarbetaren kan arbeta självständigt',
        description: 'Medarbetaren kan arbeta självständigt, vilket innebär förmågan att se, upptäcka, bedöma, analysera, ta beslut och agera bekvämt även i komplexa situationer, och arbetar framåtsyftande till nytta för patienten och verksamheten',
        subcriteria: [
            {
                id: 'vub_5_a',
                text: 'Medarbetaren kan arbeta självständigt, vilket innebär förmågan att se, upptäcka, bedöma, analysera, ta beslut och agera bekvämt även i komplexa situationer, och arbetar framåtsyftande till nytta för patienten och verksamheten'
            }
        ]
    },
    {
        id: 'vub_6',
        title: 'Medarbetaren bidrar i utvecklingen av den personcentrerade vården',
        description: 'Medarbetaren bidrar i utvecklingen av den personcentrerade vården och ser till helheten',
        subcriteria: [
            {
                id: 'vub_6_a',
                text: 'Medarbetaren bidrar i utvecklingen av den personcentrerade vården och ser till helheten'
            }
        ]
    }
]

// =============================================
// SSK (Sjuksköterska) - Kriterier
// =============================================

export const SSK_CRITERIA: ParticularlySkillfulCriterion[] = [
    {
        id: 'ssk_1',
        title: 'Medarbetaren finns i den kliniska verksamheten',
        description: 'Medarbetaren finns i den kliniska verksamheten nära patienterna och bidrar aktivt till verksamhetens utveckling',
        subcriteria: [
            {
                id: 'ssk_1_a',
                text: 'Medarbetaren finns i den kliniska verksamheten nära patienterna och bidrar aktivt till verksamhetens utveckling'
            }
        ]
    },
    {
        id: 'ssk_2',
        title: 'Medarbetaren har förvärvat sin särskilda yrkesskicklighet genom erfarenhet av kliniskt arbete',
        description: 'Medarbetaren har förvärvat sin särskilda yrkesskicklighet genom erfarenhet av kliniskt arbete och har förmåga att dela med sig av sin verksamhetsnära kunskap till kollegor, studenter och patienter, dessa medarbetare har därför sannolikt en längre tids yrkeserfarenhet',
        subcriteria: [
            {
                id: 'ssk_2_a',
                text: 'Medarbetaren har förvärvat sin särskilda yrkesskicklighet genom erfarenhet av kliniskt arbete och har förmåga att dela med sig av sin verksamhetsnära kunskap till kollegor, studenter och patienter, dessa medarbetare har därför sannolikt en längre tids yrkeserfarenhet'
            }
        ]
    },
    {
        id: 'ssk_3',
        title: 'Medarbetaren är en verksamhetsbärare som arbetar interprofessionellt och coachande',
        description: 'Medarbetaren är en verksamhetsbärare som arbetar interprofessionellt och coachande och stärker andras resurser och förmågor',
        subcriteria: [
            {
                id: 'ssk_3_a',
                text: 'Medarbetaren är en verksamhetsbärare som arbetar interprofessionellt och coachande och stärker andras resurser och förmågor'
            }
        ]
    },
    {
        id: 'ssk_4',
        title: 'Medarbetarens handlingar och agerande tyder på kompetens baserat på erfarenheter, färdigheter och djupt kunnande',
        description: 'Medarbetarens handlingar och agerande tyder på kompetens baserat på erfarenheter, färdigheter och djupt kunnande',
        subcriteria: [
            {
                id: 'ssk_4_a',
                text: 'Medarbetarens handlingar och agerande tyder på kompetens baserat på erfarenheter, färdigheter och djupt kunnande'
            }
        ]
    },
    {
        id: 'ssk_5',
        title: 'Medarbetaren kan arbeta självständigt',
        description: 'Medarbetaren kan arbeta självständigt, vilket innebär förmågan att se, upptäcka, bedöma, analysera, ta beslut och agera bekvämt även i komplexa situationer, och arbetar framåtsyftande till nytta för patienten och verksamheten',
        subcriteria: [
            {
                id: 'ssk_5_a',
                text: 'Medarbetaren kan arbeta självständigt, vilket innebär förmågan att se, upptäcka, bedöma, analysera, ta beslut och agera bekvämt även i komplexa situationer, och arbetar framåtsyftande till nytta för patienten och verksamheten'
            }
        ]
    },
    {
        id: 'ssk_6',
        title: 'Medarbetaren bidrar i utvecklingen av den personcentrerade vården',
        description: 'Medarbetaren bidrar i utvecklingen av den personcentrerade vården och ser till helheten',
        subcriteria: [
            {
                id: 'ssk_6_a',
                text: 'Medarbetaren bidrar i utvecklingen av den personcentrerade vården och ser till helheten'
            }
        ]
    }
]

// =============================================
// Helper functions
// =============================================

/**
 * Hämtar kriterier baserat på medarbetarkategori
 */
export function getCriteriaForEmployeeCategory(category: EmployeeCategory): ParticularlySkillfulCriterion[] | null {
    switch (category) {
        case 'VUB':
            return VUB_CRITERIA
        case 'SSK':
            return SSK_CRITERIA
        case 'AMB':
            return null // AMB har inte särskild yrkesskicklighet
        default:
            return null
    }
}

/**
 * Räknar totalt antal subkriterier för en kategori
 */
export function getTotalSubCriteriaCount(category: EmployeeCategory): number {
    const criteria = getCriteriaForEmployeeCategory(category)
    if (!criteria) return 0

    return criteria.reduce((sum, criterion) => sum + criterion.subcriteria.length, 0)
}

/**
 * Hämtar alla subkriterier-IDn för en kategori
 */
export function getAllSubCriteriaIds(category: EmployeeCategory): string[] {
    const criteria = getCriteriaForEmployeeCategory(category)
    if (!criteria) return []

    return criteria.flatMap(criterion =>
        criterion.subcriteria.map(sub => sub.id)
    )
}

/**
 * Kontrollera om en kategori har särskild yrkesskicklighet
 */
export function hasParticularlySkillfulCriteria(category: EmployeeCategory): boolean {
    return category === 'VUB' || category === 'SSK'
}

/**
 * Hitta ett specifikt kriterium baserat på dess nyckel (t.ex. "vub_5_a" eller "ssk_3_b")
 */
export function findCriterionByKey(key: string): ParticularlySkillfulSubCriterion | null {
    const allCriteria = [...VUB_CRITERIA, ...SSK_CRITERIA]

    for (const criterion of allCriteria) {
        const found = criterion.subcriteria.find(sub => sub.id === key)
        if (found) {
            return found
        }
    }

    return null
}
