"use client"

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
    }
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

    useEffect(() => {
        loadNewsletter()
    }, [newsletterId])

    const loadNewsletter = async () => {
        try {
            const res = await fetch(`/api/chefstod/newsletters/${newsletterId}`)
            if (res.ok) {
                const data = await res.json()
                setNewsletter(data.newsletter)
                setBullets(data.newsletter.raw_bullets || [])
                setGeneratedText(data.newsletter.final_content || data.newsletter.generated_content || '')
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

    const handleBulletsChange = async (newBullets: string[]) => {
        setBullets(newBullets)

        // Auto-save bullets
        setSaving(true)
        try {
            await fetch(`/api/chefstod/newsletters/${newsletterId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw_bullets: newBullets })
            })
        } catch (error) {
            console.error('Error saving bullets:', error)
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
            const response = await fetch(`/api/chefstod/newsletters/${newsletterId}/export-pdf`, {
                method: 'POST'
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error)
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `veckobrev-v${newsletter?.week_number}-${newsletter?.year}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

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
                        <p className="text-muted-foreground mt-1">{newsletter.station.name}</p>
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
                            <CardTitle>Innehåll</CardTitle>
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
