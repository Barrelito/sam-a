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
        loadAvailableOptions()
    }, [newsletterId])



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
            // Fetch user's stations
            const stationsRes = await fetch('/api/stations')
            if (stationsRes.ok) {
                const data = await stationsRes.json()
                setAvailableStations(data.stations || [])
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
            // Dynamic import to reduce bundle size
            const jsPDF = (await import('jspdf')).default
            const html2canvas = (await import('html2canvas')).default

            // Convert markdown to HTML
            const convertMarkdownToHTML = (text: string): string => {
                return text
                    // Headers
                    .replace(/^### (.+)$/gm, '<h3 style="font-size: 16px; font-weight: 600; color: #1f2937; margin: 20px 0 12px 0; padding-left: 12px; border-left: 3px solid #3b82f6;">$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 28px 0 14px 0;">$1</h2>')
                    .replace(/^# (.+)$/gm, '<h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 36px 0 18px 0;">$1</h1>')
                    // Bold
                    .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight: 600; color: #111827;">$1</strong>')
                    // Italic
                    .replace(/\*(.+?)\*/g, '<em style="font-style: italic;">$1</em>')
                    // Line breaks
                    .replace(/\n\n/g, '</p><p style="margin: 12px 0; line-height: 1.7; color: #374151;">')
                    .replace(/\n/g, '<br/>')
            }

            // Create a temporary container with the newsletter content
            const tempDiv = document.createElement('div')
            tempDiv.style.position = 'absolute'
            tempDiv.style.left = '-9999px'
            tempDiv.style.width = '210mm' // A4 width
            tempDiv.style.padding = '20mm'
            tempDiv.style.fontFamily = 'Inter, system-ui, -apple-system, sans-serif'
            tempDiv.style.background = 'white'

            // Create station title
            let stationTitle = 'Station'
            if (newsletter?.station) {
                stationTitle = newsletter.station.name
            } else if (newsletter?.station_group) {
                const stationNames = newsletter.station_group.members?.map((m: any) => m.station?.name).filter(Boolean).join(', ') || ''
                stationTitle = `${newsletter.station_group.name} (${stationNames})`
            }

            // Convert content to HTML
            const htmlContent = convertMarkdownToHTML(generatedText)

            // Build modern HTML layout
            tempDiv.innerHTML = `
                <div style="margin-bottom: 36px;">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 32px; text-align: center; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
                        <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.3px;">${stationTitle}</h1>
                        <div style="font-size: 15px; opacity: 0.95; font-weight: 500;">Veckobrev • Vecka ${newsletter?.week_number}, ${newsletter?.year}</div>
                    </div>
                </div>
                <div style="background: #f9fafb; padding: 28px; border-radius: 10px; margin-bottom: 24px;">
                    <p style="margin: 0; line-height: 1.7; color: #374151;">${htmlContent}</p>
                </div>
                <div style="margin-top: 44px; padding-top: 20px; text-align: center; border-top: 2px solid #e5e7eb;">
                    <div style="color: #6b7280; font-size: 11px; line-height: 1.6;">
                        <div style="font-weight: 500; margin-bottom: 4px;">Genererat ${new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        <div>${stationTitle}</div>
                    </div>
                </div>
            `

            document.body.appendChild(tempDiv)

            // Convert to canvas
            const canvas = await html2canvas(tempDiv, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            })

            // Remove temp div
            document.body.removeChild(tempDiv)

            // Create PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            })

            const imgData = canvas.toDataURL('image/png')
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const marginTop = 10 // 10mm top margin
            const marginBottom = 10 // 10mm bottom margin
            const contentHeight = pageHeight - marginTop - marginBottom

            const imgWidth = pageWidth
            const imgHeight = (canvas.height * pageWidth) / canvas.width

            let heightLeft = imgHeight
            let position = marginTop

            // Add first page
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
            heightLeft -= contentHeight

            // Add additional pages if content exceeds one page
            while (heightLeft > 0) {
                position = marginTop - (imgHeight - heightLeft)
                pdf.addPage()
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
                heightLeft -= contentHeight
            }

            pdf.save(`veckobrev-v${newsletter?.week_number}-${newsletter?.year}.pdf`)

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
