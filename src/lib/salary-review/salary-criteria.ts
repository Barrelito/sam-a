// =============================================
// Lönekriterier med definitioner
// Baserat på AISAB:s dokument "Lönekriterier med definitioner"
// =============================================

import type { CriteriaRating, CategoryDefinition } from './types'

// =============================================
// Rating Definitioner
// =============================================

export const RATING_DEFINITIONS: Record<CriteriaRating, string> = {
    'behover_utvecklas': 'Medarbetaren nå nått de uppställda målen eller inte mots varat det eftersträvade beteendet',
    'bra': 'Medarbetaren når de uppställda målen samt motsvarar det eftersträvade beteendet',
    'mycket_bra': 'Medarbetaren relativt konsekvent överträffar de uppställda målen med marginal samt också överträffar det eftersträvade beteendet',
    'utmarkt': 'Medarbetaren konsekvent och med stor marginal överträffar uppställda mål och är en tydlig förebild för andra vad gäller eftersträvat beteende'
}

export const RATING_DISPLAY_NAMES: Record<CriteriaRating, string> = {
    'behover_utvecklas': 'Behöver utvecklas',
    'bra': 'Bra',
    'mycket_bra': 'Mycket bra',
    'utmarkt': 'Utmärkt'
}

export const RATING_COLORS: Record<CriteriaRating, string> = {
    'behover_utvecklas': 'text-red-600 bg-red-50 border-red-200',
    'bra': 'text-yellow-600 bg-yellow-50 border-yellow-200',
    'mycket_bra': 'text-blue-600 bg-blue-50 border-blue-200',
    'utmarkt': 'text-green-600 bg-green-50 border-green-200'
}

// =============================================
// Lönekriterier - Huvudkategorier
// =============================================

export const SALARY_CRITERIA: CategoryDefinition[] = [
    {
        id: '1',
        category_number: 1,
        name: 'Verksamhetsutveckling',
        description: 'Visar öppenhet, förståelse och bidrar konstruktivt till verksamhetsförändringar',
        subcriteria: [
            {
                id: '1a',
                text: 'Visar öppenhet, förståelse och bidrar konstruktivt till verksamhetsförändringar',
                description: 'Medverkar aktivt till att utveckla verksamheten genom att vara initiativtagande och bidrar med nya idéer'
            },
            {
                id: '1b',
                text: 'Medverkar aktivt till att utveckla verksamheten genom att vara initiativtagande och bidrar med nya idéer',
                description: 'Hålla sig uppdaterad inom sitt arbetsområde genom att aktivt söka, ta till sig och tillämpa nya kunskaper och erfarenheter'
            }
        ]
    },
    {
        id: '2',
        category_number: 2,
        name: 'Prestation',
        description: 'Visar högt engagemang i verksamheten och ett helhetsperspektiv i arbetet',
        subcriteria: [
            {
                id: '2a',
                text: 'Visar högt engagemang i verksamheten och ett helhetsperspektiv i arbetet'
            },
            {
                id: '2b',
                text: 'Har kunskap om och arbetar efter verksamhetens mål'
            },
            {
                id: '2c',
                text: 'Är pålitlig och lojalare mot fattade beslut, policys och riktlinjer'
            }
        ]
    },
    {
        id: '3',
        category_number: 3,
        name: 'Kompetens och yrkesskicklighet',
        description: 'Är trygg i sin yrkesroll',
        subcriteria: [
            {
                id: '3a',
                text: 'Är trygg i sin yrkesroll'
            },
            {
                id: '3b',
                text: 'Har ett bra bemötande till patienter/kunder/samverkansnartners'
            },
            {
                id: '3c',
                text: 'Tar egna initiativ till att utveckla den egna kompetensen utifrån verksamhetens behov'
            },
            {
                id: '3d',
                text: 'Delar med sig av sina yrkeskunskaper, till exempel handleder och/eller utbildar andra'
            }
        ]
    },
    {
        id: '4',
        category_number: 4,
        name: 'Arbetsmiljö',
        description: 'Bidrar aktivt till att skapa ett positivt arbetsklimat',
        subcriteria: [
            {
                id: '4a',
                text: 'Bidrar aktivt till att skapa ett positivt arbetsklimat'
            },
            {
                id: '4b',
                text: 'Bidrar till gott samarbete'
            },
            {
                id: '4c',
                text: 'Har ett inkluderande förhållningssätt där alla får komma till tals och olika åsikter välkomnas'
            }
        ]
    }
]

// =============================================
// Tillkommande bedömningskriterier för enhetschef/stationschef/biträdande stationschef
// =============================================

export const MANAGER_ADDITIONAL_CRITERIA: CategoryDefinition[] = [
    {
        id: '5',
        category_number: 5,
        name: 'Ledarskap för enhetschef/stationschef',
        description: 'Ytterligare kriterier för chefer',
        subcriteria: [
            {
                id: '5a',
                text: 'Arbetar att sätta uppnå verksamhetens mål'
            },
            {
                id: '5b',
                text: 'Planerar och kommunicerar mål och krav på resultat till arbetsgivarna'
            },
            {
                id: '5c',
                text: 'Leder arbetet så att verksamheten utvecklas och effektiviseras'
            },
            {
                id: '5d',
                text: 'Gör medarbetarna möjlighet till utveckling och brände i arbetet utifrån verksamhetens möjlighet och krav'
            },
            {
                id: '5e',
                text: 'Skapar förutsättningar för dialog, medinnytande, samverkan och trivsel'
            }
        ]
    }
]

// =============================================
// Helper functions
// =============================================

/**
 * Hämtar alla kriterier för en given kategori (VUB, SSK, AMB)
 * AMB-kategorin har inte tillgång till ledarskapskriterier
 */
export function getCriteriaForCategory(category: 'VUB' | 'SSK' | 'AMB'): CategoryDefinition[] {
    // Alla kategorier har de 4 grundläggande kriterierna
    return SALARY_CRITERIA
}

/**
 * Hämtar alla subkriterier för en kategori
 */
export function getAllSubCriteria(): string[] {
    return SALARY_CRITERIA.flatMap(cat => cat.subcriteria.map(sub => sub.id))
}

/**
 * Räknar totalt antal kriterier som måste bedömas
 */
export function getTotalCriteriaCount(): number {
    return SALARY_CRITERIA.reduce((sum, cat) => sum + cat.subcriteria.length, 0)
}

/**
 * Hittar en specifikt subkriterium baserat på ID
 */
export function findSubCriterion(subCriterionId: string): { category: CategoryDefinition, criterion: any } | null {
    for (const category of SALARY_CRITERIA) {
        const criterion = category.subcriteria.find(sub => sub.id === subCriterionId)
        if (criterion) {
            return { category, criterion }
        }
    }
    return null
}
