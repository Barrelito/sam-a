// =============================================
// Lönesamtalsguide
// Baserat på HR:s instruktioner för lönesättande samtal
// =============================================

export interface MeetingPhase {
    title: string
    description: string
    steps: string[]
    tips?: string[]
}

// =============================================
// Före samtalet - Förberedelse
// =============================================

export const MEETING_PREPARATION: MeetingPhase = {
    title: 'Innan och inför samtalet',
    description: 'Som chef är det viktigt att du förbereder dig väl inför lönesamtalet.',
    steps: [
        'Följ upp vad ni kom överens om vid tidigare samtal. Använd tidigare dokumentation från lönesamtal och från utvecklingsplanen i Heroma Kompetens.',
        'Kom ni överens om vad medarbetaren skulle göra för att höja sin lön?',
        'Har personen nått målen, utfört eller levt upp till det ni kom överens om eller ej?',
        'Har personen har bidragit till verksamheten?',
        'Ta fram uppgifter om medarbetarens lön, lönespann och statistik och kriterier för särskilt yrkesskickliga',
        'Informera och ge medarbetaren tillgång till lönekriterierna och kriterierna för särskilt yrkesskickliga inför lönesamtalet.'
    ],
    tips: [
        'Dokumentera dina förberedelser i systemet så att du har allt samlat',
        'Läs igenom tidigare års bedömningar och anteckningar',
        'Se över löneutvecklingen över tid'
    ]
}

// =============================================
// Viktiga dokument
// =============================================

export const IMPORTANT_DOCUMENTS = [
    {
        title: 'Lönekriterier med definitioner',
        description: 'Grundläggande bedömningskriterier för alla medarbetare'
    },
    {
        title: 'Löneriktlinje',
        description: 'En riktlinje för AISAB'
    },
    {
        title: 'Bedömningskriterier för särskild yrkesskickliga inom ambulanssjukvård',
        description: 'För VUB och SSK (ej AMB)'
    }
]

// =============================================
// Under samtalet - Struktur
// =============================================

export const MEETING_STRUCTURE: MeetingPhase = {
    title: 'Under samtalet',
    description: 'Syftet med mötet är att diskutera medarbetarens arbetsinsats. Det är ingen förhandling utan det är du som chef som sätter lönen. Du som chef bör ha som målsättning att den anställde ska vara nöjd med lönesamtalet och kunna förstå hur du har kommit fram till den nya lönen även om denne inte är nöjd med utfallet.',
    steps: [
        '1. Klargör syftet med samtalet',
        '2. Berätta om samtalets upplägg och hur mycket tid ni har',
        '3. Redogör för de bedömningsgrunder du använt',
        '4. Summera din bild av medarbetarens arbetsinsats utifrån bedömningsgrunderna. Använd så konkreta exempel som möjligt. Lyft gärna exempel på hur personen har bidragit till verksamheten och vad medarbetaren behöver göra mer. Tycker medarbetaren att din bild stämmer?',
        '5. Berätta hur du gjort din värdering och lönesättning samt presentera den nya lönen. Fokusera på den nya lönen och inte på påslaget eller höjningen.',
        '6. Berätta hur medarbetaren ska kunna påverka sin löneutveckling framöver.',
        '7. Skriv ner och dokumentera punkter som ni ska ta med er till kommande medarbetar-/utvecklingssamtal.'
    ],
    tips: [
        'Det är du som chef som sätter lönen - detta är ingen förhandling',
        'Använd konkreta exempel från verksamheten',
        'Fokusera på den nya lönen, inte på ökningen',
        'Var tydlig med vad medarbetaren kan göra för att utvecklas'
    ]
}

// =============================================
// Efter samtalet - Dokumentation
// =============================================

export const POST_MEETING: MeetingPhase = {
    title: 'Efter samtalet',
    description: 'Dokumentera samtalet och uppföljningspunkter',
    steps: [
        'Dokumentera samtalets huvudpunkter i systemet',
        'Notera vad ni kom överens om för framtiden',
        'Lägg in utvecklingsområden i medarbetarens utvecklingsplan',
        'Sätt datum för uppföljning',
        'Slutför löneöversynen i systemet när allt är klart'
    ],
    tips: [
        'Dokumentera samma dag som samtalet hölls',
        'Var konkret i vad medarbetaren ska göra för att utvecklas',
        'Sätt tydliga mål för nästa års uppföljning'
    ]
}

// =============================================
// Samtalsmallar och fraser
// =============================================

export const CONVERSATION_TEMPLATES = {
    opening: [
        'Idag ska vi ha vårt årliga lönesamtal. Syftet är att diskutera din arbetsinsats under året och hur din lön ska se ut framåt.',
        'Samtalet är planerat att ta cirka [X] minuter.',
        'Jag kommer att utgå från de bedömningsgrunder vi har på AISAB när jag värderar din arbetsinsats.'
    ],
    assessment_intro: [
        'Jag har gjort en bedömning av din arbetsinsats utifrån våra lönekriterier.',
        'Låt mig dela min bild av hur du har arbetat under det gångna året.',
        'Jag vill börja med att lyfta några konkreta exempel från din arbetsinsats.'
    ],
    salary_presentation: [
        'Baserat på min bedömning av din arbetsinsats så blir din nya lön [X] kr/månad.',
        'Med utgångspunkt i dina prestationer och våra bedömningsgrunder så föreslår jag en lön på [X] kr.',
        'Din nya lön blir [X] kr/månad, vilket återspeglar din arbetsinsats enligt våra kriterier.'
    ],
    future_development: [
        'För att utveckla din lön framåt så skulle jag vilja se att du...',
        'Områden där du kan utvecklas för att påverka din lön är...',
        'Till nästa år vill jag att vi fokuserar på...'
    ]
}

// =============================================
// Checklista för samtalet
// =============================================

export const MEETING_CHECKLIST = [
    {
        category: 'Förberedelse',
        items: [
            'Har granskat tidigare dokumentation',
            'Har analyserat lönekriterier-bedömningar',
            'Har tagit fram lönestatistik',
            'Har förberett konkreta exempel',
            'Har beslutat om löneförslag',
            'Har bokat tid och plats för samtalet',
            'Har informerat medarbetaren om tillgång till kriterier'
        ]
    },
    {
        category: 'Under samtalet',
        items: [
            'Klargjort syfte och struktur',
            'Presenterat bedömn ingsgrunder',
            'Delat konkreta exempel',
            'Lyssnat på medarbetarens perspektiv',
            'Presenterat ny lön',
            'Diskuterat framtida utveckling',
            'Dokumenterat överenskommelser'
        ]
    },
    {
        category: 'Efter samtalet',
        items: [
            'Dokumenterat samtalet i systemet',
            'Lagt in uppföljningspunkter',
            'Uppdaterat utvecklingsplan',
            'Satt datum för nästa uppföljning',
            'Slutfört löneöversynen'
        ]
    }
]

// =============================================
// Helper functions
// =============================================

/**
 * Genererar en sammanfattning av bedömningsgrunder
 */
export function generateAssessmentSummary(
    criteriaAssessments: Record<string, string>,
    particularlySkilled: boolean | null
): string {
    let summary = 'Baserat på bedömningen av lönekriterier:\n\n'

    // Lägg till kriteriesammanfattning här

    if (particularlySkilled !== null) {
        summary += `\n\nSärskilt yrkesskicklig: ${particularlySkilled ? 'Ja' : 'Nej'}`
    }

    return summary
}

/**
 * Förslag på utvecklingsområden baserat på bedömningar
 */
export function suggestDevelopmentAreas(
    criteriaAssessments: Record<string, string>
): string[] {
    const suggestions: string[] = []

    // Analysera bedömningar och föreslå utvecklingsområden

    return suggestions
}
