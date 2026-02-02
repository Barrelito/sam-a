"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Plus, Calendar, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import ImportBulletsDialog from '@/components/newsletter/ImportBulletsDialog'


interface Newsletter {
    id: string
    year: number
    week_number: number
    status: 'draft' | 'published'
    final_content: string | null
    generated_content: string | null
    created_at: string
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

export default function VeckobrevPage() {
    const router = useRouter()
    const [newsletters, setNewsletters] = useState<Newsletter[]>([])
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [stationId, setStationId] = useState<string | null>(null)
    const [showImportDialog, setShowImportDialog] = useState(false)
    const [previousBullets, setPreviousBullets] = useState<string[]>([])
    const { toast } = useToast()

    useEffect(() => {
        loadNewsletters()
    }, [])

    const loadNewsletters = async () => {
        try {
            const res = await fetch('/api/chefstod/newsletters')
            if (res.ok) {
                const data = await res.json()
                setNewsletters(data.newsletters || [])

                // Get station_id from first newsletter if available
                if (data.newsletters && data.newsletters.length > 0) {
                    const firstNewsletter = data.newsletters[0]
                    if (firstNewsletter.station) {
                        setStationId(firstNewsletter.station.id)
                    } else if (firstNewsletter.station_group?.members?.[0]) {
                        setStationId(firstNewsletter.station_group.members[0].station.id)
                    }
                }
            }
        } catch (error) {
            console.error('Error loading newsletters:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateNewsletter = async () => {
        setCreating(true)
        try {
            // First, try to fetch the previous week's newsletter
            const previousRes = await fetch('/api/chefstod/newsletters')
            if (previousRes.ok) {
                const { newsletters: allNewsletters } = await previousRes.json()
                // Get the most recent newsletter with bullets
                const previousWithBullets = allNewsletters.find((n: any) =>
                    n.raw_bullets && Array.isArray(n.raw_bullets) && n.raw_bullets.length > 0
                )

                if (previousWithBullets && previousWithBullets.raw_bullets) {
                    // Show import dialog
                    setPreviousBullets(previousWithBullets.raw_bullets)
                    setShowImportDialog(true)
                    setCreating(false)
                    return
                }
            }

            // No previous bullets found, create directly
            await createNewsletterWithBullets([])
        } catch (error) {
            console.error('Error creating newsletter:', error)
            toast({
                variant: "destructive",
                title: "Fel",
                description: "Kunde inte skapa veckobrevet"
            })
            setCreating(false)
        }
    }

    const createNewsletterWithBullets = async (bullets: string[]) => {
        setCreating(true)
        try {
            // If we don't have a station_id yet, let the API figure it out from the user
            const body: any = { initial_bullets: bullets }
            if (stationId) {
                body.station_id = stationId
            }

            const res = await fetch('/api/chefstod/newsletters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await res.json()

            if (res.status === 409) {
                // Newsletter already exists
                toast({
                    title: "Veckobrev finns redan",
                    description: "Ett veckobrev för denna vecka finns redan. Öppnar det..."
                })

                if (data.existingId) {
                    window.location.href = `/chefstod/veckobrev/${data.existingId}`
                } else {
                    console.error('No existingId in response:', data)
                }
                return
            }

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create newsletter')
            }

            if (!data.newsletter || !data.newsletter.id) {
                console.error('Invalid response from API:', data)
                throw new Error('Newsletter created but no ID returned')
            }

            toast({
                title: "✓ Veckobrev skapat!",
                description: `Vecka ${data.newsletter.week_number}, ${data.newsletter.year}`
            })

            setShowImportDialog(false)
            router.push(`/chefstod/veckobrev/${data.newsletter.id}`)
        } catch (error: any) {
            console.error('Error creating newsletter:', error)
            toast({
                variant: "destructive",
                title: "Fel vid skapande",
                description: error.message || "Kunde inte skapa veckobrevet"
            })
        } finally {
            setCreating(false)
        }
    }

    const getContentPreview = (newsletter: Newsletter): string => {
        const content = newsletter.final_content || newsletter.generated_content || ''
        // Remove markdown and get first 150 chars
        const plainText = content.replace(/[#*_\[\]]/g, '').substring(0, 150)
        return plainText ? plainText + '...' : 'Inget innehåll än'
    }

    if (loading) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                Laddar veckobrev...
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Veckobrev</h1>
                    <p className="text-muted-foreground mt-1">
                        Skapa och hantera veckobrev med AI-assistans
                    </p>
                </div>
                <Button onClick={handleCreateNewsletter} disabled={creating} size="lg">
                    <Plus className="mr-2 h-4 w-4" />
                    {creating ? 'Skapar...' : 'Nytt Veckobrev'}
                </Button>
            </div>

            {/* Newsletters Grid */}
            {newsletters.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Inga veckobrev än</h3>
                        <p className="text-muted-foreground mb-4 text-center max-w-md">
                            Skapa ditt första veckobrev genom att klicka på knappen ovan.
                            AI:n hjälper dig att omvandla punkter till ett professionellt brev.
                        </p>
                        <Button onClick={handleCreateNewsletter} disabled={creating}>
                            <Plus className="mr-2 h-4 w-4" />
                            Skapa Ditt Första Veckobrev
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {newsletters.map(newsletter => (
                        <Link key={newsletter.id} href={`/chefstod/veckobrev/${newsletter.id}`}>
                            <Card className="h-full hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-500">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <CardTitle className="text-lg">
                                                Vecka {newsletter.week_number}
                                            </CardTitle>
                                        </div>
                                        <Badge variant={newsletter.status === 'published' ? 'default' : 'secondary'}>
                                            {newsletter.status === 'published' ? 'Publicerad' : 'Utkast'}
                                        </Badge>
                                    </div>
                                    <CardDescription>
                                        {newsletter.station?.name ||
                                            (newsletter.station_group ? `${newsletter.station_group.name} (${newsletter.station_group.members?.map(m => m.station?.name).filter(Boolean).join(', ')})` : 'Okänd station')} • {newsletter.year}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground line-clamp-3">
                                        {getContentPreview(newsletter)}
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                                        <Eye className="h-3 w-3" />
                                        Skapad {new Date(newsletter.created_at).toLocaleDateString('sv-SE')}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            {/* Import bullets dialog */}
            <ImportBulletsDialog
                open={showImportDialog}
                bullets={previousBullets}
                onImport={(bullets) => createNewsletterWithBullets(bullets)}
                onSkip={() => createNewsletterWithBullets([])}
                isCreating={creating}
            />
        </div>
    )
}
