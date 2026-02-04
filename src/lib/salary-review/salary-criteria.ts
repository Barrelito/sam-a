// =============================================
// Lönekriterier med definitioner
// Baserat på AISAB:s dokument "Lönekriterier med definitioner"
// =============================================

import type { CriteriaRating, CategoryDefinition } from './types'

// =============================================
// Rating Definitioner
// =============================================

export const RATING_DEFINITIONS: Record<CriteriaRating, string> = {
    'behover_utvecklas': 'Innebär att medarbetaren ej nått de uppställda målen eller inte motsvarar det eftersträvade beteendet.',
    'bra': 'Innebär att medarbetaren når de uppställda målen samt motsvarar det eftersträvade beteendet, dvs man har nått ett bra resultat.',
    'mycket_bra': 'Innebär att medarbetaren relativt konsekvent överträffar uppställda målen med marginal samt också överträffar det eftersträvade beteendet.',
    'utmarkt': 'Innebär att medarbetaren konsekvent och med stor marginal överträffar uppställda mål och är en tydlig förebild för andra vad gäller eftersträvat beteende.'
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

// Numerisk mappning för löneberäkning - enkel skala
// Behöver utvecklas = 0p, Bra = 1p, Mycket bra = 2p, Utmärkt = 3p
// Max totalt: 14 kriterier × 3p = 42 poäng
export const NUMERIC_RATING_VALUES: Record<CriteriaRating, number> = {
    'behover_utvecklas': 0,    // 0 poäng
    'bra': 1,                  // 1 poäng
    'mycket_bra': 2,           // 2 poäng
    'utmarkt': 3               // 3 poäng
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
                examples: [
                    'Ställer sig positiv till förändringar och nya arbetssätt',
                    'Deltar aktivt i implementering av nya rutiner och system',
                    'Ger konstruktiv feedback vid förändringsprocesser'
                ]
            },
            {
                id: '1b',
                text: 'Medverkar aktivt till att utveckla verksamheten genom att vara initiativtagande och bidrar med nya idéer',
                examples: [
                    'Kommer med förbättringsförslag som implementeras',
                    'Tar egna initiativ för att effektivisera arbetsprocesser',
                    'Driver eller deltar aktivt i utvecklingsprojekt'
                ]
            },
            {
                id: '1c',
                text: 'Hålla sig uppdaterad inom sitt arbetsområde genom att aktivt söka, ta till sig och tillämpa nya kunskaper och erfarenheter',
                examples: [
                    'Deltar i fortbildningar och utbildningar',
                    'Söker aktivt information om nya metoder och riktlinjer',
                    'Delar med sig av ny kunskap till kollegor',
                    'Tillämpar nya kunskaper i det dagliga arbetet'
                ]
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
                text: 'Visar högt engagemang i verksamheten och ett helhetsperspektiv i arbetet',
                examples: [
                    'Tar ansvar utöver sina ordinarie arbetsuppgifter',
                    'Visar initiativförmåga och engagemang för verksamhetens bästa',
                    'Ser till helheten och verksamhetens behov, inte bara egna uppgifter'
                ]
            },
            {
                id: '2b',
                text: 'Har kunskap om och arbetar efter verksamhetens mål',
                examples: [
                    'Kan beskriva och förklara verksamhetens mål och vision',
                    'Prioriterar arbetsuppgifter utifrån verksamhetens mål',
                    'Bidrar aktivt till måluppfyllelse i det dagliga arbetet'
                ]
            },
            {
                id: '2c',
                text: 'Är pålitlig och lojal mot fattade beslut, policys och riktlinjer',
                examples: [
                    'Följer beslutade rutiner och riktlinjer konsekvent',
                    'Stöttar och implementerar beslut även om hen har annan åsikt',
                    'Är en god ambassadör för verksamheten och dess beslut'
                ]
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
                text: 'Är trygg i sin yrkesroll',
                examples: [
                    'Hanterar sina arbetsuppgifter självständigt',
                    'Fattar trygga beslut i sin yrkesutövning',
                    'Klarar av utmanande situationer med professionalism'
                ]
            },
            {
                id: '3b',
                text: 'Har ett bra bemötande till patienten/kunden/samverkanspartners',
                examples: [
                    'Visar respekt, empati och professionalism i alla möten',
                    'Anpassar kommunikationen efter mottagarens behov',
                    'Får positiv feedback från patienter/kunder/samarbetspartners'
                ]
            },
            {
                id: '3c',
                text: 'Tar egna initiativ till att utveckla den egna kompetensen utifrån verksamhetens behov',
                examples: [
                    'Identifierar egna utvecklingsområden',
                    'Söker aktivt efter kompetensutveckling som gynnar verksamheten',
                    'Tar ansvar för sin egen professionella utveckling'
                ]
            },
            {
                id: '3d',
                text: 'Delar med sig av sina yrkeskunskaper, till exempel handleder och/eller utbildar andra',
                examples: [
                    'Handleder nya medarbetare eller studenter',
                    'Delar aktivt med sig av sin kunskap och erfarenhet',
                    'Agerar som mentor eller stöd för kollegor',
                    'Håller utbildningar eller informationsträffar'
                ]
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
                text: 'Bidrar aktivt till att skapa ett positivt arbetsklimat',
                examples: [
                    'Sprider positiv energi och uppmuntran',
                    'Tar initiativ till sociala aktiviteter',
                    'Bidrar till en god stämning på arbetsplatsen',
                    'Stöttar kollegor i både medgång och motgång'
                ]
            },
            {
                id: '4b',
                text: 'Bidrar till gott samarbete',
                examples: [
                    'Arbetar väl tillsammans med olika kollegor',
                    'Är flexibel och lösningsorienterad i samarbeten',
                    'Delar information och resurser med kollegor',
                    'Hjälper till när behov uppstår'
                ]
            },
            {
                id: '4c',
                text: 'Har ett inkluderande förhållningssätt där alla får komma till tals och olika åsikter välkomnas',
                examples: [
                    'Lyssnar aktivt på andras åsikter och perspektiv',
                    'Uppmuntrar alla att delta i diskussioner',
                    'Visar respekt för olikheter och olika synsätt',
                    'Skapar en trygg miljö där alla vågar uttrycka sina tankar'
                ]
            },
            {
                id: '4d',
                text: 'Du har en professionell och positiv inställning till verksamheten, arbetsuppgifterna och kollegorna',
                examples: [
                    'Visar en konstruktiv attityd även i utmanande situationer',
                    'Är lösningsfokuserad snarare än problemfokuserad',
                    'Pratar positivt om verksamheten och kollegor',
                    'Upprätthåller professionella gränser och etik'
                ]
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
        description: 'Tillkommande bedömningskriterier för enhetschef/stationschef/biträdande stationschef',
        subcriteria: [
            {
                id: '5a',
                text: 'Arbetar för att uppnå verksamhetens mål'
            },
            {
                id: '5b',
                text: 'Prioriterar och kommunicerar mål och krav på resultat till medarbetarna'
            },
            {
                id: '5c',
                text: 'Arbetar aktivt med resultatuppföljning av verksamheten och medarbetarna'
            },
            {
                id: '5d',
                text: 'Leder arbetet så att verksamheten utvecklas och effektiviseras'
            },
            {
                id: '5e',
                text: 'Ger medarbetarna möjlighet till utveckling och lärande i arbetet utifrån verksamhetens behov'
            },
            {
                id: '5f',
                text: 'Skapar förutsättningar för dialog, medinflytande, samverkan och trivsel'
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
