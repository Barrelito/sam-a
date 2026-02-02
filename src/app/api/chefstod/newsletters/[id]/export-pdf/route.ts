import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import puppeteer from 'puppeteer'

// POST /api/chefstod/newsletters/[id]/export-pdf
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient()

        // Auth check
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Unwrap params Promise
        const { id } = await params

        // Get newsletter
        const { data: newsletter, error: nlError } = await supabase
            .from('weekly_newsletters')
            .select(`
                *,
                station:stations(id, name)
            `)
            .eq('id', id)
            .single()

        if (nlError || !newsletter) {
            return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 })
        }

        const content = newsletter.final_content || newsletter.generated_content

        if (!content) {
            return NextResponse.json(
                { error: 'No content to export. Please generate newsletter first.' },
                { status: 400 }
            )
        }

        // Convert markdown to HTML (simple conversion - you can use a library like marked.js)
        const htmlContent = convertMarkdownToHTML(content)

        // Create HTML template for PDF
        const html = createPDFTemplate({
            content: htmlContent,
            stationName: newsletter.station?.name || 'Station',
            year: newsletter.year,
            weekNumber: newsletter.week_number
        })

        // Launch Puppeteer and generate PDF
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle0' })

        const pdf = await page.pdf({
            format: 'A4',
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            },
            printBackground: true
        })

        await browser.close()

        // Return PDF
        return new NextResponse(pdf, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="veckobrev-v${newsletter.week_number}-${newsletter.year}.pdf"`
            }
        })
    } catch (error) {
        console.error('Error generating PDF:', error)
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
    }
}

// Simple markdown to HTML converter
function convertMarkdownToHTML(markdown: string): string {
    let html = markdown

    // Headers
    html = html.replace(/### (.*?)$/gm, '<h3>$1</h3>')
    html = html.replace(/## (.*?)$/gm, '<h2>$1</h2>')
    html = html.replace(/# (.*?)$/gm, '<h1>$1</h1>')

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // Lists
    const lines = html.split('\n')
    let inList = false
    const processed: string[] = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            if (!inList) {
                processed.push('<ul>')
                inList = true
            }
            processed.push(`<li>${line.trim().substring(2)}</li>`)
        } else {
            if (inList) {
                processed.push('</ul>')
                inList = false
            }
            processed.push(line)
        }
    }
    if (inList) processed.push('</ul>')

    html = processed.join('\n')

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>')

    return html
}

// PDF Template
function createPDFTemplate(data: {
    content: string
    stationName: string
    year: number
    weekNumber: number
}): string {
    return `
<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Veckobrev - Vecka ${data.weekNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background: white;
        }
        
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            padding: 40px 0;
            text-align: center;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .header .week-info {
            font-size: 18px;
            opacity: 0.9;
        }
        
        .content {
            padding: 0 40px;
            max-width: 800px;
            margin: 0 auto;
        }
        
        h1 {
            font-size: 28px;
            color: #111827;
            margin: 30px 0 15px 0;
            font-weight: 700;
        }
        
        h2 {
            font-size: 22px;
            color: #1f2937;
            margin: 25px 0 12px 0;
            font-weight: 600;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
        }
        
        h3 {
            font-size: 18px;
            color: #374151;
            margin: 20px 0 10px 0;
            font-weight: 600;
        }
        
        p {
            margin: 12px 0;
            color: #4b5563;
            font-size: 14px;
        }
        
        ul {
            margin: 15px 0 15px 25px;
        }
        
        li {
            margin: 8px 0;
            color: #4b5563;
            font-size: 14px;
        }
        
        strong {
            color: #111827;
            font-weight: 600;
        }
        
        .footer {
            margin-top: 60px;
            padding: 30px 0;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #9ca3af;
            font-size: 12px;
        }
        
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${data.stationName}</h1>
        <div class="week-info">Veckobrev • Vecka ${data.weekNumber}, ${data.year}</div>
    </div>
    
    <div class="content">
        ${data.content}
    </div>
    
    <div class="footer">
        Genererat ${new Date().toLocaleDateString('sv-SE')} • ${data.stationName}
    </div>
</body>
</html>
    `
}
