import { createClient } from '@/lib/supabase/server'
import { streamText, StreamData } from 'ai'
import { openai } from '@ai-sdk/openai'

export const runtime = 'edge'


// ... (imports remain the same) ...

interface EmployeeData {
    id: string
    first_name: string
    last_name: string
    category: string
    experience_level: string
    current_salary: number
    station_name: string
}

interface GroupStats {
    category: string
    experience_level: string
    count: number
    avg_salary: number
    median_salary: number
    min_salary: number
    max_salary: number
    employees: EmployeeData[]
}

interface OutlierEmployee {
    id: string
    name: string
    salary: number
    diff_percentage: number
    deviation_type: 'low' | 'high'
}

interface AnalysisGroup {
    group: string
    category: string
    experience_level: string
    stats: {
        median: number
        avg: number
        count: number
        min: number
        max: number
        range: string
    }
    significant_deviations: OutlierEmployee[]
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // 1. Fetch all employees with salary data
        const { data: employees, error } = await supabase
            .from('employees')
            .select(`
        id, first_name, last_name, category, experience_level, current_salary,
        station:stations(name)
      `)
            .not('current_salary', 'is', null)
            .not('experience_level', 'is', null)

        if (error) throw error

        // 2. Group by Category + Experience Level
        const groups: Record<string, GroupStats> = {}

        employees.forEach((emp: any) => {
            const key = `${emp.category}-${emp.experience_level}`

            if (!groups[key]) {
                groups[key] = {
                    category: emp.category,
                    experience_level: emp.experience_level,
                    count: 0,
                    avg_salary: 0,
                    median_salary: 0,
                    min_salary: Infinity,
                    max_salary: -Infinity,
                    employees: []
                }
            }

            const group = groups[key]
            const salary = emp.current_salary

            group.count++
            group.employees.push({
                id: emp.id,
                first_name: emp.first_name,
                last_name: emp.last_name,
                category: emp.category,
                experience_level: emp.experience_level,
                current_salary: salary,
                station_name: emp.station?.name || 'Unknown'
            })
            group.min_salary = Math.min(group.min_salary, salary)
            group.max_salary = Math.max(group.max_salary, salary)
        })

        // 3. Calculate Stats for each group
        const analysisData: AnalysisGroup[] = Object.values(groups).map(group => {
            const salaries = group.employees.map(e => e.current_salary).sort((a, b) => a - b)

            // Calculate Average
            const sum = salaries.reduce((a, b) => a + b, 0)
            group.avg_salary = Math.round(sum / group.count)

            // Calculate Median
            const mid = Math.floor(salaries.length / 2)
            group.median_salary = salaries.length % 2 !== 0
                ? salaries[mid]
                : (salaries[mid - 1] + salaries[mid]) / 2

            // Identify outliers (simple +/- 10% from median rule)
            const outliers: OutlierEmployee[] = group.employees.filter(e => {
                const diff = (e.current_salary - group.median_salary) / group.median_salary
                return Math.abs(diff) > 0.10 // 10% deviation
            }).map(e => ({
                id: e.id,
                name: `${e.first_name} ${e.last_name}`,
                salary: e.current_salary,
                diff_percentage: Math.round(((e.current_salary - group.median_salary) / group.median_salary) * 100),
                deviation_type: e.current_salary < group.median_salary ? 'low' : 'high'
            }))

            return {
                group: `${group.category} (${group.experience_level} years)`,
                category: group.category,
                experience_level: group.experience_level,
                stats: {
                    median: Math.round(group.median_salary),
                    avg: group.avg_salary,
                    count: group.count,
                    min: group.min_salary,
                    max: group.max_salary,
                    range: `${group.min_salary} - ${group.max_salary}`
                },
                significant_deviations: outliers
            }
        })

        // Calculate summary statistics
        const totalDeviations = analysisData.reduce((sum, g) => sum + g.significant_deviations.length, 0)
        const totalEmployees = analysisData.reduce((sum, g) => sum + g.stats.count, 0)
        const lowDeviations = analysisData.reduce((sum, g) =>
            sum + g.significant_deviations.filter(d => d.deviation_type === 'low').length, 0)
        const highDeviations = analysisData.reduce((sum, g) =>
            sum + g.significant_deviations.filter(d => d.deviation_type === 'high').length, 0)

        // 4. Construct Enhanced Prompt
        const prompt = `
      Du är en lönesättande expertassistent. Din uppgift är att analysera medarbetares löner och hitta orättvisor.
      
      Här är lönestatistiken för din organisation, grupperad per Kategori och Erfarenhetsnivå.
      Varje grupp har en medianlön som vi ser som "Baslinjen". Vi har redan flaggat ${totalDeviations} medarbetare som avviker mer än 10% från medianen.

      SAMMANFATTNING:
      - Totalt antal medarbetare: ${totalEmployees}
      - Antal avvikelser: ${totalDeviations} (${lowDeviations} för låg lön, ${highDeviations} för hög lön)
      - Antal grupper: ${analysisData.length}

      DATA ATT ANALYSERA:
      ${JSON.stringify(analysisData, null, 2)}

      UPPGIFT:
      1. **Sammanfattning**: Börja med en kort sammanfattning av löneläget generellt (2-3 meningar).
      
      2. **Gruppanalys**: För varje grupp med avvikelser:
         - Nämn gruppen (kategori + erfarenhetsnivå)
         - Kommentera om lönespridningen verkar rimlig
         - Lista specifika avvikelser med namn och procentuell avvikelse
      
      3. **Rekommendationer**: Ge konkreta rekommendationer:
         - Om någon ligger lågt: föreslå en justering till närmre medianen
         - Om någon ligger högt: ifrågasätt varför (t.ex. "Har denna person särskilt ansvar?")
      
      4. **Nästa steg**: Avsluta med en konkret handlingsplan för HR/lönesättare.

      FORMATERING:
      - Använd Markdown med tydliga rubriker (##)
      - Använd fetstil för **namn** och **siffror**
      - Använd tabeller där det passar för att visa avvikelser
      - Håll tonen professionell, insiktsfull och analyserande
    `

        // Initialize StreamData
        const streamData = new StreamData()

        // Append structured data
        streamData.append({
            groups: analysisData,
            summary: {
                totalEmployees,
                totalDeviations,
                lowDeviations,
                highDeviations,
                groupCount: analysisData.length,
                timestamp: new Date().toISOString()
            }
        } as any)

        // 5. Stream response with data
        const result = await streamText({
            model: openai('gpt-4o'),
            prompt: prompt,
            onFinish: async () => {
                await streamData.close()
            }
        })

        return result.toDataStreamResponse({ data: streamData })

    } catch (error) {
        console.error('Error in AI analysis:', error)
        return new Response(JSON.stringify({ error: 'Failed to analyze salaries' }), { status: 500 })
    }
}
