"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, CheckCircle, AlertTriangle, Users } from "lucide-react"
import Link from "next/link"
import OvertimeUploadForm from "@/components/overtime/OvertimeUploadForm"

interface UploadResult {
  report: { id: string; filename: string; period_start: string; period_end: string }
  matchedCount: number
  unmatchedCount: number
  warnings: string[]
  entryCount: number
}

export default function OvertimeUploadPage() {
  const [result, setResult] = useState<UploadResult | null>(null)
  const router = useRouter()

  const handleUploadComplete = (uploadResult: UploadResult) => {
    setResult(uploadResult)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/overtime">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Tillbaka
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ladda upp övertidsrapport</h1>
          <p className="text-muted-foreground">
            Importera HERCMA Övertidsjournal
          </p>
        </div>
      </div>

      {/* Upload form or result */}
      {!result ? (
        <OvertimeUploadForm onUploadComplete={handleUploadComplete} />
      ) : (
        <div className="space-y-6">
          {/* Success card */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-green-800 mb-1">
                    Rapport uppladdad!
                  </h2>
                  <p className="text-sm text-green-700 mb-4">
                    {result.report.filename} har analyserats.
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{result.entryCount}</div>
                      <div className="text-xs text-muted-foreground">Poster</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{result.matchedCount}</div>
                      <div className="text-xs text-muted-foreground">Matchade</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-amber-600">{result.unmatchedCount}</div>
                      <div className="text-xs text-muted-foreground">Omatchade</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{result.warnings.length}</div>
                      <div className="text-xs text-muted-foreground">Varningar</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Parsningsvarningar ({result.warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-muted-foreground">
                      &bull; {w}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={() => router.push(`/overtime/reports/${result.report.id}`)}>
              Visa rapport
            </Button>
            <Button variant="outline" onClick={() => setResult(null)}>
              Ladda upp en till
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
