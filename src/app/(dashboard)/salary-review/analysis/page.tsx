'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, AlertTriangle, TrendingUp, Download, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { SalaryGroupCard } from '@/components/salary-review/SalaryGroupCard'
import { SalaryAnalysisSummary } from '@/components/salary-review/SalaryAnalysisSummary'

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

interface AnalysisSummary {
    totalEmployees: number
    totalDeviations: number
    lowDeviations: number
    highDeviations: number
    groupCount: number
    timestamp: string
}

export default function SalaryAnalysisPage() {
    const [completion, setCompletion] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [hasStarted, setHasStarted] = useState(false)
    const [analysisData, setAnalysisData] = useState<AnalysisGroup[] | null>(null)
    const [summary, setSummary] = useState<AnalysisSummary | null>(null)

    const handlePrint = () => {
        window.print()
    }

    const handleStartAnalysis = async () => {
        setHasStarted(true)
        setIsLoading(true)
        setError(null)
        setCompletion('')
        setAnalysisData(null)
        setSummary(null)

        try {
            const response = await fetch('/api/ai/analyze-salary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error('Failed to analyze salaries')
            }

            // Parse structured data from headers
            const analysisHeader = response.headers.get('X-Analysis-Data')
            if (analysisHeader) {
                const data = JSON.parse(analysisHeader)
                setAnalysisData(data.groups)
                setSummary(data.summary)
            }

            // Stream the AI text response
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()

            if (reader) {
                let done = false
                while (!done) {
                    const { value, done: doneReading } = await reader.read()
                    done = doneReading
                    if (value) {
                        const chunk = decoder.decode(value)
                        // Parse streaming data (simple version, may need refinement)
                        const lines = chunk.split('\n')
                        for (const line of lines) {
                            if (line.startsWith('0:')) {
                                const text = line.substring(2).replace(/"/g, '')
                                setCompletion(prev => prev + text)
                            }
                        }
                    }
                }
            }

            setIsLoading(false)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Unknown error'))
            setIsLoading(false)
        }
    }

    return (
        <>
            <style jsx global>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                }
            `}</style>
            <div className="container mx-auto py-8 max-w-7xl">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                            <Sparkles className="h-8 w-8 text-yellow-500" />
                            AI Löneanalys & Insikter
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Låt AI:n analysera din lönestruktur för att hitta orättvisor och avvikelser baserat på erfarenhetsnivå.
                        </p>
                    </div>
                    {hasStarted && !isLoading && (
                        <div className="flex gap-2 no-print">
                            <Button onClick={handlePrint} variant="outline" size="lg">
                                <Download className="mr-2 h-4 w-4" />
                                Exportera PDF
                            </Button>
                            <Button onClick={() => {
                                setHasStarted(false)
                                setCompletion('')
                                setAnalysisData(null)
                                setSummary(null)
                            }} variant="outline">
                                Ny analys
                            </Button>
                        </div>
                    )}
                </div>

                {!hasStarted ? (
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-100">
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
                        {/* Print Header */}
                        <div className="hidden print:block mb-6 border-b pb-4">
                            <h1 className="text-2xl font-bold">AI Löneanalys & Insikter</h1>
                            <p className="text-sm text-gray-600">
                                Genererad: {summary ? new Date(summary.timestamp).toLocaleString('sv-SE') : new Date().toLocaleString('sv-SE')}
                            </p>
                        </div>

                        {/* Status / Loading State */}
                        {isLoading && !analysisData && (
                            <Card>
                                <CardContent className="py-8 flex flex-col items-center justify-center text-center">
                                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-4" />
                                    <h3 className="text-lg font-medium">Analyserar lönedata...</h3>
                                    <p className="text-muted-foreground">Hämtar statistik och jämför grupper...</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Summary Dashboard */}
                        {summary && (
                            <SalaryAnalysisSummary
                                totalEmployees={summary.totalEmployees}
                                totalDeviations={summary.totalDeviations}
                                lowDeviations={summary.lowDeviations}
                                highDeviations={summary.highDeviations}
                                groupCount={summary.groupCount}
                            />
                        )}

                        {/* Group Cards */}
                        {analysisData && analysisData.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                    <h2 className="text-xl font-semibold">Detaljerad Gruppanalys</h2>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {analysisData
                                        .sort((a, b) => b.significant_deviations.length - a.significant_deviations.length)
                                        .map((group, index) => (
                                            <SalaryGroupCard
                                                key={index}
                                                category={group.category}
                                                experienceLevel={group.experience_level}
                                                stats={group.stats}
                                                deviations={group.significant_deviations}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Page break for print */}
                        {analysisData && <div className="page-break" />}

                        {/* AI Analysis */}
                        {(completion || isLoading) && (
                            <Card className="border-t-4 border-t-yellow-500 shadow-md">
                                <CardHeader className="bg-muted/10 pb-4">
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5" />
                                        AI-Insikter & Rekommendationer
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
                            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                                <CardContent className="py-6 flex items-center gap-4 text-red-700 dark:text-red-400">
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
        </>
    )
}
