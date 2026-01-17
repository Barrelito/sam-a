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
                text: 'Att vara ansvarstagna, ta initiativ och aktivt bidra till kvalitetsutveckling och förbättringsarbeten genom att omsätta kunskap inhämtad från utbildning, den egna verksamheten samt omvärldsbevakning'
            }
        ]
    },
    {
        id: 'vub_2',
        title: 'Medarbetaren har förvärvat sin särskilda yrkesskicklighet genom erfarenhet av kliniskt arbete',
        description: 'Medarbetaren har förvärvat sin särskilda yrkesskicklighet genom erfarenhet av kliniskt arbete och formlig på att överföra kunskap till kollegor, studenter och patienter',
        subcriteria: [
            {
                id: 'vub_2_a',
                text: 'Har kunskap och relevant klinisk erfarenhet kombineras med förmågan att användas vid rätt tillfälle och på rätt sätt'
            },
            {
                id: 'vub_2_b',
                text: 'Har en hög pedagogisk förmåga och handleder regelbrundet studenter och kollegor'
            }
        ]
    },
    {
        id: 'vub_3',
        title: 'Medarbetaren är en verksamhetsbärare som arbetar interprofessionellt och coachande',
        description: 'Medarbetaren är en verksamhetsbärare som arbetar interprofessionellt och coachande och stärker andra resurser och förmågor',
        subcriteria: [
            {
                id: 'vub_3_a',
                text: 'En verksamhetsbärare bidrar till ökad tillgänglighet och arbetar för att uppnå verksamhetens mål och har en god helhets syn'
            },
            {
                id: 'vub_3_b',
                text: 'Att aktivt samarbeta med andra och vara inkluderande i sin yrkesroll'
            },
            {
                id: 'vub_3_c',
                text: 'Visa att arbetsplatsen med andra utvecklas, kan vara en god förebild och vara en ambassadör'
            }
        ]
    },
    {
        id: 'vub_4',
        title: 'Medarbetarens handlingar och agerande typer på kompetens baserat på erfarenheter, färdigheter och djupt kunnande',
        description: 'Medarbetarens handlingar och agerande typer på kompetens baserat på erfarenheter, färdigheter och djupt kunnande',
        subcriteria: [
            {
                id: 'vub_4_a',
                text: 'Det är den medarbetare kollega eller chef vänder sig till för råd och stöd'
            },
            {
                id: 'vub_4_b',
                text: 'Är trygg i sin roll och ska kunna samarbete med alla kollegor, på alla stationer och i alla situationer'
            },
            {
                id: 'vub_4_c',
                text: 'Arbetar utifrån ett helhetsperspektiv, kan omsätta sin fler åriga erfarenhet och agera frivillighet'
            }
        ]
    },
    {
        id: 'vub_5',
        title: 'Medarbetaren kan arbete självständigt, vilket innebär förmågan att se, upptäcka, bedöma, analysera, ta beslut och agera',
        description: 'Medarbetaren kan arbete självständigt, vilket innebär förmågan att se, upptäcka, bedöma, analysera, ta beslut och agera bekvmt även i komplexa situationer, och arbetar framåtsyftande till nytta för patienten och verksamheten',
        subcriteria: [
            {
                id: 'vub_5_a',
                text: 'Medarbetaren ska vara effektiv, proaktiv, stabil och lugn även i så/län händelser'
            },
            {
                id: 'vub_5_b',
                text: 'Se till och agera utifrån patientens framtida vårdbehov'
            }
        ]
    },
    {
        id: 'vub_6',
        title: 'Medarbetaren bidrar till utvecklingen av den personcentrerade vården och ser till helheten',
        description: 'Medarbetaren bidrar till utvecklingen av den personcentrerade vården och ser till helheten',
        subcriteria: [
            {
                id: 'vub_6_a',
                text: 'Att man är konsekvent i sitt vårdarbete utifrån patientens unika behov och sprider kunskapen i verksamheten'
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
                text: 'Att vara ansvarstagna, ta initiativ och aktivt bidra till kvalitetsutveckling och förbättringsarbeten genom att omsätta kunskap inhämtad från utbildning, den egna verksamheten samt omvärldsbevakning'
            }
        ]
    },
    {
        id: 'ssk_2',
        title: 'Medarbetaren har förvärvat sin särskilda yrkesskicklighet genom erfarenhet av kliniskt arbete',
        description: 'Medarbetaren har förvärvat sin särskilda yrkesskicklighet genom erfarenhet av kliniskt arbete och formlig på att överföra kunskap till kollegor, studenter och patienter',
        subcriteria: [
            {
                id: 'ssk_2_a',
                text: 'Har kunskap och relevant klinisk erfarenhet kombineras med förmågan att användas vid rätt tillfälle och på rätt sätt'
            },
            {
                id: 'ssk_2_b',
                text: 'Har en hög pedagogisk förmåga och handleder regelbruden studenter och kollegor'
            }
        ]
    },
    {
        id: 'ssk_3',
        title: 'Medarbetaren är en verksamhetsbärare som arbetar interprofessionellt och coachande',
        description: 'Medarbetaren är en verksamhetsbärare som arbetar interprofessionellt och coachande och stärker andra resurser och förmågor',
        subcriteria: [
            {
                id: 'ssk_3_a',
                text: 'En verksamhetsbärare bidrar till ökad tillgänglighet och arbetar för att uppnå verksamhetens mål och har en god helhets syn'
            },
            {
                id: 'ssk_3_b',
                text: 'Att aktivt samarbeta med andra och vara inkluderande i sin yrkesroll'
            },
            {
                id: 'ssk_3_c',
                text: 'Visa att arbetsplatsen med andra utvecklas, kan vara en god förebild och vara en ambassadör'
            }
        ]
    },
    {
        id: 'ssk_4',
        title: 'Medarbetarens handlingar och agerande typer på kompetens baserat på erfarenheter, färdigheter och djupt kunnande',
        description: 'Medarbetarens handlingar och agerande typer på kompetens baserat på erfarenheter, färdigheter och djupt kunnande',
        subcriteria: [
            {
                id: 'ssk_4_a',
                text: 'Det är den medarbetare kollega eller chef vänder sig till för råd och stöd'
            },
            {
                id: 'ssk_4_b',
                text: 'Är trygg i sin roll och ska kunna samarbete med alla kollegor, på alla stationer och i alla situationer'
            },
            {
                id: 'ssk_4_c',
                text: 'Arbetar utifrån ett helhetsperspektiv, kan omsätta sin fleråriga erfarenhet och agera frivillighet'
            }
        ]
    },
    {
        id: 'ssk_5',
        title: 'Medarbetaren kan arbete självständigt, vilket innebär förmågan att se, upptäcka, bedöma, analysera, ta beslut och agera',
        description: 'Medarbetaren kan arbete självständigt, vilket innebär förmågan att se, upptäcka, bedöma, analysera, ta beslut och agera bekvmt även i komplexa situationer, och arbetar framåtsyftande till nytta för patienten och verksamheten',
        subcriteria: [
            {
                id: 'ssk_5_a',
                text: 'Medarbetaren ska vara effektiv, proaktiv, stabil och lugn även i så/län händelser'
            },
            {
                id: 'ssk_5_b',
                text: 'Se till och agera utifrån patientens framtida vårdbehov'
            }
        ]
    },
    {
        id: 'ssk_6',
        title: 'Medarbetaren bidrar till utvecklingen av den personcentrerade vården och ser till helheten',
        description: 'Medarbetaren bidrar till utvecklingen av den personcentrerade vården och ser till helheten',
        subcriteria: [
            {
                id: 'ssk_6_a',
                text: 'Att man är konsekvent i sitt vårdarbete utifrån patientens unika behov och sprider kunskapen i verksamheten'
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
