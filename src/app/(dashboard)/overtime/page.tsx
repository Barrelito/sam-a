"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileSpreadsheet, Clock, ChevronRight, Trash2 } from "lucide-react"
import Link from "next/link"

interface Report {
  id: string
  filename: string
  period_start: string
  period_end: string
  status: string
  employee_count: number
  station_count: number
  created_at: string
  uploader?: { full_name: string; email: string }
}

export default function OvertimePage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/overtime/reports")
      const data = await res.json()
      setReports(data.reports ?? [])
    } catch (e) {
      console.error("Failed to fetch reports:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Vill du ta bort denna rapport? Alla data raderas.")) return

    try {
      await fetch(`/api/overtime/reports/${id}`, { method: "DELETE" })
      setReports((prev) => prev.filter((r) => r.id !== id))
    } catch (err) {
      console.error("Failed to delete report:", err)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("sv-SE")
  }

  const statusLabel: Record<string, string> = {
    draft: "Utkast",
    confirmed: "Bekräftad",
    exported: "Exporterad",
  }

  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    confirmed: "bg-green-100 text-green-700",
    exported: "bg-blue-100 text-blue-700",
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Övertidsuppföljning</h1>
            <p className="text-muted-foreground">Laddar...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Övertidsuppföljning</h1>
          <p className="text-muted-foreground">
            Spåra övertid från HERCMA-exporter med gränsvärden och varningar
          </p>
        </div>
        <Link href="/overtime/upload">
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Ladda upp rapport
          </Button>
        </Link>
      </div>

      {/* Empty state */}
      {reports.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-lg font-medium mb-2">Ingen övertidsdata ännu</h2>
            <p className="text-muted-foreground mb-6">
              Ladda upp en HERCMA Övertidsjournal (.xlsx) för att komma igång.
            </p>
            <Link href="/overtime/upload">
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Ladda upp din första rapport
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Report list */}
      {reports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Uppladdade rapporter</h2>
          {reports.map((report) => (
            <Card
              key={report.id}
              className="hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => router.push(`/overtime/reports/${report.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <FileSpreadsheet className="h-10 w-10 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{report.filename}</span>
                      <Badge className={statusColor[report.status] ?? ""}>
                        {statusLabel[report.status] ?? report.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>Period: {formatDate(report.period_start)} – {formatDate(report.period_end)}</span>
                      <span>{report.employee_count} medarbetare</span>
                      <span>{report.station_count} stationer</span>
                      <span>Uppladdad: {formatDate(report.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(report.id, e)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
