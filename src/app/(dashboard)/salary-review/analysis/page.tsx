'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, AlertTriangle, TrendingUp } from 'lucide-react'
import { useCompletion } from 'ai/react'
import ReactMarkdown from 'react-markdown'

export default function SalaryAnalysisPage() {
    const { complete, completion, isLoading, error } = useCompletion({
        api: '/api/ai/analyze-salary',
    })

    const [hasStarted, setHasStarted] = useState(false)

    const handleStartAnalysis = () => {
        setHasStarted(true)
        complete('')
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="h-8 w-8 text-yellow-500" />
                    AI Löneanalys & Insikter
                </h1>
                <p className="text-muted-foreground text-lg">
                    Låt AI:n analysera din lönestruktur för att hitta orättvisor och avvikelser baserat på erfarenhetsnivå.
                </p>
            </div>

            {!hasStarted ? (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
                    <CardHeader>
                        <CardTitle>Redo att analysera?</CardTitle>
                        <CardDescription>
                            Vi kommer att gruppera dina medarbetare baserat på yrkeskategori och erfarenhetsnivå,
                            beräkna medianlöner för varje grupp, och låta vår AI identifiera signifikanta avvikelser.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            size="lg"
                            onClick={handleStartAnalysis}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Starta Analys
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {/* Status / Loading State */}
                    {isLoading && !completion && (
                        <Card>
                            <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                                <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                                <h3 className="text-lg font-medium">Analyserar lönedata...</h3>
                                <p className="text-muted-foreground">Hämtar statistik och jämför grupper...</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Resultat */}
                    {(completion || isLoading) && (
                        <Card className="border-t-4 border-t-yellow-500 shadow-md">
                            <CardHeader className="bg-muted/10 pb-4">
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5" />
                                    Analysrapport
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="prose prose-blue max-w-none dark:prose-invert">
                                    <ReactMarkdown>
                                        {completion}
                                    </ReactMarkdown>
                                </div>
                                {isLoading && (
                                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground animate-pulse">
                                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                                        Genererar insikter...
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {error && (
                        <Card className="border-red-200 bg-red-50">
                            <CardContent className="py-6 flex items-center gap-4 text-red-700">
                                <AlertTriangle className="h-6 w-6" />
                                <div>
                                    <h3 className="font-bold">Ett fel uppstod</h3>
                                    <p>{error.message || 'Kunde inte genomföra analysen. Kontrollera din API-nyckel.'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    )
}
