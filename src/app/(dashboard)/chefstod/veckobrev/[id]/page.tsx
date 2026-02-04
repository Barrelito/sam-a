"use client"

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Download, Send, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import BulletEditor from '@/components/newsletter/BulletEditor'
import AISuggestions from '@/components/newsletter/AISuggestions'
import NewsletterPreview from '@/components/newsletter/NewsletterPreview'
import { useAuth } from '@/lib/auth-context'

interface Newsletter {
    id: string
    year: number
    week_number: number
    status: 'draft' | 'published'
    raw_bullets: string[]
    ai_suggestions: any
    generated_content: string | null
    final_content: string | null
    station: {
        id: string
        name: string
    } | null
    station_group: {
        id: string
        name: string
        members: {
            station: {
                id: string
                name: string
            }
        }[]
    } | null
}

export default function NewsletterEditorPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { toast } = useToast()
    const { profile } = useAuth()

    // Unwrap the params Promise
    const resolvedParams = use(params)
    const newsletterId = resolvedParams.id

    const [newsletter, setNewsletter] = useState<Newsletter | null>(null)
    const [bullets, setBullets] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [generatedText, setGeneratedText] = useState('')
    const [exporting, setExporting] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [availableStations, setAvailableStations] = useState<any[]>([])
    const [availableGroups, setAvailableGroups] = useState<any[]>([])
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    useEffect(() => {
        loadNewsletter()
        if (profile) {
            loadAvailableOptions()
        }
    }, [newsletterId, profile])



    const loadNewsletter = async () => {
        try {
            const res = await fetch(`/api/chefstod/newsletters/${newsletterId}`)
            if (res.ok) {
                const data = await res.json()
                setNewsletter(data.newsletter)
                setBullets(data.newsletter.raw_bullets || [])
                setGeneratedText(data.newsletter.final_content || data.newsletter.generated_content || '')
                setHasUnsavedChanges(false)
            } else {
                toast({
                    variant: "destructive",
                    title: "Fel",
                    description: "Kunde inte ladda veckobrevet"
                })
            }
        } catch (error) {
            console.error('Error loading newsletter:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadAvailableOptions = async () => {
        try {
            // Get stations from user profile instead of API
            if (profile?.user_stations) {
                const stations = profile.user_stations.map((us: any) => us.station).filter(Boolean)
                setAvailableStations(stations)
            }

            // Fetch available station groups
            const groupsRes = await fetch('/api/admin/station-groups')
            if (groupsRes.ok) {
                const data = await groupsRes.json()
                setAvailableGroups(data.station_groups || [])
            }
        } catch (error) {
            console.error('Error loading options:', error)
        }
    }

    const getNewsletterTitle = () => {
        if (!newsletter) return ''
        if (newsletter.station) {
            return `Veckobrev för ${newsletter.station.name}`
        } else if (newsletter.station_group) {
            const stationNames = newsletter.station_group.members?.map(m => m.station?.name).filter(Boolean).join(', ') || ''
            return `Veckobrev för ${newsletter.station_group.name} (${stationNames})`
        }
        return 'Veckobrev'
    }

    const handleChangeStationOrGroup = async (type: 'station' | 'group', id: string) => {
        setSaving(true)
        try {
            const updateData: any = {}
            if (type === 'station') {
                updateData.station_id = id
                updateData.station_group_id = null
            } else {
                updateData.station_group_id = id
                updateData.station_id = null
            }

            const res = await fetch(`/api/chefstod/newsletters/${newsletterId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            })

            if (res.ok) {
                toast({
                    title: "✓ Uppdaterat",
                    description: "Station/område har ändrats"
                })
                // Reload newsletter to get updated data
                await loadNewsletter()
            }
        } catch (error) {
            console.error('Error updating station/group:', error)
            toast({
                variant: "destructive",
                title: "Fel",
                description: "Kunde inte uppdatera station/område"
            })
        } finally {
            setSaving(false)
        }
    }

    const handleBulletsChange = (newBullets: string[]) => {
        setBullets(newBullets)
        setHasUnsavedChanges(true)
    }

    const handleSaveBullets = async () => {
        setSaving(true)
        try {
            await fetch(`/api/chefstod/newsletters/${newsletterId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw_bullets: bullets })
            })
            setHasUnsavedChanges(false)
            toast({
                title: "✓ Sparat!",
                description: "Dina punkter har sparats"
            })
        } catch (error) {
            console.error('Error saving bullets:', error)
            toast({
                variant: "destructive",
                title: "Fel",
                description: "Kunde inte spara punkterna"
            })
        } finally {
            setSaving(false)
        }
    }

    const handleGenerate = async () => {
        if (bullets.length === 0) {
            toast({
                variant: "destructive",
                title: "Inga punkter",
                description: "Lägg till minst en punkt innan du genererar"
            })
            return
        }

        setGenerating(true)
        setGeneratedText('')

        try {
            const response = await fetch(`/api/chefstod/newsletters/${newsletterId}/generate`, {
                method: 'POST'
            })

            if (!response.ok) {
                throw new Error('Generation failed')
            }

            const reader = response.body?.getReader()
            if (!reader) throw new Error('No reader')

            const decoder = new TextDecoder()
            let fullText = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('0:')) {
                        const text = line.substring(2).trim().replace(/^"(.*)"$/, '$1')
                        fullText += text
                        setGeneratedText(fullText)
                    }
                }
            }

            toast({
                title: "✓ Veckobrev genererat!",
                description: "Granska innehållet och exportera när du är nöjd"
            })

            await loadNewsletter() // Reload to get saved content
        } catch (error) {
            console.error('Error generating:', error)
            toast({
                variant: "destructive",
                title: "Fel vid generering",
                description: "Kunde inte generera veckobrevet"
            })
        } finally {
            setGenerating(false)
        }
    }

    const handleSaveEditedContent = async (editedContent: string) => {
        try {
            const res = await fetch(`/api/chefstod/newsletters/${newsletterId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ final_content: editedContent })
            })

            if (!res.ok) {
                throw new Error('Failed to save')
            }

            setGeneratedText(editedContent)

            toast({
                title: "✓ Innehåll sparat!",
                description: "Dina ändringar har sparats"
            })
        } catch (error) {
            console.error('Error saving edited content:', error)
            toast({
                variant: "destructive",
                title: "Fel vid sparande",
                description: "Kunde inte spara ändringarna"
            })
            throw error // Re-throw to let component handle state
        }
    }

    const handleExportPDF = async () => {
        setExporting(true)
        try {
            // @ts-ignore - pdfmake types
            const pdfMake = await import('pdfmake/build/pdfmake')
            // @ts-ignore - pdfmake types  
            const pdfFonts = await import('pdfmake/build/vfs_fonts')

            // Set up fonts
            if (pdfMake.default) {
                pdfMake.default.vfs = pdfFonts.default || pdfFonts
            }

            // Parse markdown to pdfmake content
            const parseMarkdownToPdfContent = (text: string): any[] => {
                const content: any[] = []
                const lines = text.split('\n')

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i]

                    // Skip empty lines
                    if (!line.trim()) continue

                    // H3 headers
                    if (line.startsWith('### ')) {
                        content.push({
                            text: line.substring(4),
                            style: 'h3',
                            margin: [0, 8, 0, 4]
                        })
                    }
                    // H2 headers
                    else if (line.startsWith('## ')) {
                        content.push({
                            text: line.substring(3),
                            style: 'h2',
                            margin: [0, 12, 0, 6]
                        })
                    }
                    // H1 headers
                    else if (line.startsWith('# ')) {
                        content.push({
                            text: line.substring(2),
                            style: 'h1',
                            margin: [0, 16, 0, 8]
                        })
                    }
                    // Regular paragraphs
                    else {
                        // Process inline markdown (bold, italic)
                        const processedText = line
                            .replace(/\*\*(.+?)\*\*/g, (_, text) => text) // Remove bold markers for now
                            .replace(/\*(.+?)\*/g, (_, text) => text) // Remove italic markers

                        content.push({
                            text: processedText,
                            style: 'normal',
                            margin: [0, 0, 0, 6]
                        })
                    }
                }

                return content
            }

            let stationTitle = 'Station'
            if (newsletter?.station) {
                stationTitle = newsletter.station.name
            } else if (newsletter?.station_group) {
                const stationNames = newsletter.station_group.members?.map((m: any) => m.station?.name).filter(Boolean).join(', ') || ''
                stationTitle = `${newsletter.station_group.name} (${stationNames})`
            }

            const parsedContent = parseMarkdownToPdfContent(generatedText)

            // Define PDF document
            const docDefinition = {
                pageSize: 'A4',
                pageMargins: [40, 40, 40, 40],
                content: [
                    // Header with gradient-style background
                    {
                        table: {
                            widths: ['*'],
                            body: [[{
                                text: stationTitle,
                                style: 'header',
                                fillColor: '#3b82f6',
                                color: 'white',
                                alignment: 'center',
                                margin: [10, 10, 10, 5]
                            }], [{
                                text: `Veckobrev • Vecka ${newsletter?.week_number}, ${newsletter?.year}`,
                                style: 'subheader',
                                fillColor: '#3b82f6',
                                color: 'white',
                                alignment: 'center',
                                margin: [10, 0, 10, 10]
                            }]]
                        },
                        layout: 'noBorders',
                        margin: [0, 0, 0, 20]
                    },
                    // Content box
                    {
                        table: {
                            widths: ['*'],
                            body: [[{
                                stack: parsedContent,
                                fillColor: '#f9fafb',
                                margin: [15, 15, 15, 15]
                            }]]
                        },
                        layout: {
                            hLineWidth: () => 0,
                            vLineWidth: () => 0,
                            paddingLeft: () => 0,
                            paddingRight: () => 0,
                            paddingTop: () => 0,
                            paddingBottom: () => 0
                        },
                        margin: [0, 0, 0, 20]
                    },
                    // Footer
                    {
                        canvas: [{
                            type: 'line',
                            x1: 0, y1: 0,
                            x2: 515, y2: 0,
                            lineWidth: 1,
                            lineColor: '#e5e7eb'
                        }],
                        margin: [0, 10, 0, 10]
                    },
                    {
                        text: `Genererat ${new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}`,
                        style: 'footer',
                        alignment: 'center'
                    },
                    {
                        text: stationTitle,
                        style: 'footer',
                        alignment: 'center'
                    }
                ],
                styles: {
                    header: {
                        fontSize: 18,
                        bold: true
                    },
                    subheader: {
                        fontSize: 11,
                        bold: false
                    },
                    h1: {
                        fontSize: 16,
                        bold: true,
                        color: '#111827'
                    },
                    h2: {
                        fontSize: 14,
                        bold: true,
                        color: '#111827'
                    },
                    h3: {
                        fontSize: 12,
                        bold: true,
                        color: '#1f2937'
                    },
                    normal: {
                        fontSize: 10,
                        lineHeight: 1.4,
                        color: '#374151'
                    },
                    footer: {
                        fontSize: 8,
                        color: '#6b7280'
                    }
                },
                defaultStyle: {
                    font: 'Roboto'
                }
            }

            // Generate and download PDF
            pdfMake.default.createPdf(docDefinition).download(`veckobrev-v${newsletter?.week_number}-${newsletter?.year}.pdf`)

            toast({
                title: "✓ PDF exporterad!",
                description: "Filen har laddats ner"
            })

        } catch (error: any) {
            console.error('Error exporting PDF:', error)
            toast({
                variant: "destructive",
                title: "Fel vid export",
                description: error.message || "Kunde inte exportera PDF"
            })
        } finally {
            setExporting(false)
        }
    }

    const handlePublish = async () => {
        setPublishing(true)
        try {
            await fetch(`/api/chefstod/newsletters/${newsletterId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'published' })
            })

            toast({
                title: "✓ Veckobrev publicerat!",
                description: "Brevet är nu markerat som publicerat"
            })

            await loadNewsletter()
        } catch (error) {
            console.error('Error publishing:', error)
            toast({
                variant: "destructive",
                title: "Fel vid publicering",
                description: "Kunde inte publicera veckobrevet"
            })
        } finally {
            setPublishing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!newsletter) {
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">Veckobrevet kunde inte laddas</p>
                <Button onClick={() => router.back()} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tillbaka
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push('/chefstod/veckobrev')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            Vecka {newsletter.week_number}, {newsletter.year}
                        </h1>
                        <div className="flex items-center gap-2 mt-2">
                            <Select
                                value={newsletter.station?.id || newsletter.station_group?.id}
                                onValueChange={(value) => {
                                    const isGroup = availableGroups.some((g: any) => g.id === value)
                                    handleChangeStationOrGroup(isGroup ? 'group' : 'station', value)
                                }}
                            >
                                <SelectTrigger className="w-[400px]">
                                    <span>
                                        {newsletter.station && `📍 ${newsletter.station.name}`}
                                        {newsletter.station_group && `🏢 ${newsletter.station_group.name}`}
                                        {!newsletter.station && !newsletter.station_group && "Välj station eller område"}
                                    </span>
                                </SelectTrigger>
                                <SelectContent>
                                    {availableStations.map((station: any) => (
                                        <SelectItem key={station.id} value={station.id}>
                                            📍 {station.name}
                                        </SelectItem>
                                    ))}
                                    {availableGroups.length > 0 && availableStations.length > 0 && (
                                        <div className="border-t my-1" />
                                    )}
                                    {availableGroups.map((group: any) => (
                                        <SelectItem key={group.id} value={group.id}>
                                            🏢 {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <Badge variant={newsletter.status === 'published' ? 'default' : 'secondary'}>
                        {newsletter.status === 'published' ? 'Publicerad' : 'Utkast'}
                    </Badge>
                    {saving && <span className="text-xs text-muted-foreground">Sparar...</span>}
                </div>

                <div className="flex gap-2">
                    {generatedText && (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleExportPDF}
                                disabled={exporting}
                            >
                                {exporting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                Exportera PDF
                            </Button>
                            {newsletter.status === 'draft' && (
                                <Button
                                    onClick={handlePublish}
                                    disabled={publishing}
                                >
                                    {publishing ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                    )}
                                    Publicera
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Main Content - Split View */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Panel - Input */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Innehåll</CardTitle>
                                <div className="flex items-center gap-2">
                                    {hasUnsavedChanges && (
                                        <Badge variant="secondary" className="text-xs">
                                            Osparade ändringar
                                        </Badge>
                                    )}
                                    <Button
                                        onClick={handleSaveBullets}
                                        disabled={saving || !hasUnsavedChanges}
                                        size="sm"
                                    >
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Sparar...
                                            </>
                                        ) : (
                                            'Spara'
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <BulletEditor
                                bullets={bullets}
                                onChange={handleBulletsChange}
                            />
                        </CardContent>
                    </Card>

                    <AISuggestions newsletterId={newsletterId} onAddBullet={(bullet) => {
                        handleBulletsChange([...bullets, bullet])
                    }} />
                </div>

                {/* Right Panel - Preview */}
                <div className="space-y-4">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Förhandsvisning</CardTitle>
                                <Button
                                    onClick={handleGenerate}
                                    disabled={generating || bullets.length === 0}
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Genererar...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            {generatedText ? 'Regenerera' : 'Generera med AI'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <NewsletterPreview
                                content={generatedText}
                                isGenerating={generating}
                                onSave={handleSaveEditedContent}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
