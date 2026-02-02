import { createClient } from '@/lib/supabase/server'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export const runtime = 'edge'

interface Suggestions {
    birthdays: { name: string; date: string }[]
    upcomingTasks: { title: string; due_date: string; category: string }[]
    seasonalReminders: string[]
    stats: {
        completedLastWeek: number
        pendingTasks: number
    }
}

function buildNewsletterPrompt(data: {
    bullets: string[]
    suggestions: Suggestions
    stationName: string
    weekNumber: number
    year: number
}): string {
    const { bullets, suggestions, stationName, weekNumber, year } = data

    return `Du är en kommunikationsexpert som skriver professionella, engagerande veckobrev för ${stationName}.

KONTEXT OM VERKSAMHETEN:
Detta är en AMBULANSSTATION där personalen består av sjuksköterskor och ambulanssjukvårdare som arbetar i skiftgång. 
Verksamheten handlar om akut sjukvård, utryckningar och patientvård i fält. 
Använd språk och tonalitet som passar en vårdmiljö - inte ett kontorsjobb.

Undvik generiska kontorsflosker som:
- "produktiv vecka"
- "nå våra mål"
- "teambuilding-aktiviteter"

Använd istället vårdrelaterat språk som:
- "en händelserik vecka med många utryckningar"
- "fortsatt god patientvård"
- "viktiga uppdateringar för er som jobbar i fält"

KONTEXT:
Vecka: ${weekNumber}, ${year}

CHEFENS PUNKTER (viktiga händelser att inkludera):
${bullets.length > 0 ? bullets.map((b, i) => `${i + 1}. ${b}`).join('\n') : 'Inga specifika punkter angivna.'}

AI-FÖRSLAG SOM KAN INKLUDERAS:
${suggestions.birthdays.length > 0 ? `\n🎂 Födelsedagar denna vecka:\n${suggestions.birthdays.map(b => `   - ${b.name}`).join('\n')}` : ''}

${suggestions.upcomingTasks.length > 0 ? `\n📋 Kommande uppgifter:\n${suggestions.upcomingTasks.slice(0, 5).map(t => `   - ${t.title} (${t.due_date})`).join('\n')}` : ''}

${suggestions.seasonalReminders.length > 0 ? `\n📅 Säsongsrelaterat:\n${suggestions.seasonalReminders.map(r => `   - ${r}`).join('\n')}` : ''}

📊 Statistik från förra veckan:
   - Slutförda uppgifter: ${suggestions.stats.completedLastWeek}
   - Pågående uppgifter: ${suggestions.stats.pendingTasks}

UPPGIFT:
Skriv ett professionellt, välstrukturerat veckobrev baserat på informationen ovan.

RIKTLINJER:
1. **Öppning**: Börja med en varm hälsning till teamet (anpassat för vårdpersonal)
2. **Struktur**: Organisera innehållet i tydliga sektioner med rubriker
3. **Ton**: Professionell men personlig och engagerande - anpassad för ambulansverksamhet
4. **Inkludering**: Välj relevant information från AI-förslagen som passar naturligt
5. **Avslutning**: Avsluta med uppmuntran eller framåtblick (relevant för vårdsektorn)
6. **Längd**: Håll det koncist men informativt (cirka 300-500 ord)

FORMATERING:
- Använd Markdown med ## för huvudrubriker och ### för underrubriker
- Använd **fetstil** för viktiga punkter
- Använd punktlistor för flera items
- Använd emojis sparsamt för att lyfta fram sektioner (🎂 för födelsedagar, 📋 för uppgifter, etc.)

Skriv veckobrevet nu (endast brevet, ingen metakommentar):
`
}

// POST /api/chefstod/newsletters/[id]/generate - Generate newsletter with AI
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
        }

        // Unwrap params Promise
        const { id } = await params

        // Get newsletter with station info
        const { data: newsletter, error: nlError } = await supabase
            .from('weekly_newsletters')
            .select(`
                *,
                station:stations(id, name)
            `)
            .eq('id', id)
            .single()

        if (nlError || !newsletter) {
            return new Response(JSON.stringify({ error: 'Newsletter not found' }), { status: 404 })
        }

        // Get user profile for signature
        const { data: employee } = await supabase
            .from('employees')
            .select('first_name, last_name, title')
            .eq('user_id', user.id)
            .single()

        // Fallback to user email if no employee record
        const userName = employee
            ? `${employee.first_name} ${employee.last_name}`
            : user.email?.split('@')[0] || 'Station Manager'
        const userTitle = employee?.title || 'Stationschef'

        // Get bullets and suggestions
        const bullets = (newsletter.raw_bullets as string[]) || []
        const suggestions = (newsletter.ai_suggestions as Suggestions) || {
            birthdays: [],
            upcomingTasks: [],
            seasonalReminders: [],
            stats: { completedLastWeek: 0, pendingTasks: 0 }
        }

        if (bullets.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Please add at least one bullet point before generating' }),
                { status: 400 }
            )
        }

        // Build prompt
        const prompt = buildNewsletterPrompt({
            bullets,
            suggestions,
            stationName: newsletter.station?.name || 'Station',
            weekNumber: newsletter.week_number,
            year: newsletter.year
        })

        // Stream AI response
        const result = await streamText({
            model: openai('gpt-4o'),
            prompt,
            temperature: 0.7,
            onFinish: async ({ text }) => {
                // Append signature to the generated content
                const signature = `\n\n---\n\n**Med vänliga hälsningar,**  \n${userName}  \n*${userTitle}*`
                const contentWithSignature = text + signature

                // Save generated content with signature
                await supabase
                    .from('weekly_newsletters')
                    .update({
                        generated_content: contentWithSignature,
                        final_content: contentWithSignature // Initially set final_content to generated
                    })
                    .eq('id', id)
            }
        })

        return result.toDataStreamResponse()
    } catch (error) {
        console.error('Error generating newsletter:', error)
        return new Response(JSON.stringify({ error: 'Failed to generate newsletter' }), { status: 500 })
    }
}
