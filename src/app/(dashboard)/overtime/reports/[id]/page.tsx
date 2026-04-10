"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Download, FileCheck, Loader2 } from "lucide-react"
import Link from "next/link"
import OvertimeKpiCards from "@/components/overtime/OvertimeKpiCards"
import OvertimeEmployeeTable from "@/components/overtime/OvertimeEmployeeTable"
import OvertimeWarningsPanel from "@/components/overtime/OvertimeWarningsPanel"
import OvertimeStationChart from "@/components/overtime/OvertimeStationChart"
import { formatHours } from "@/lib/overtime/types"
import { OVERTIME_LIMITS } from "@/lib/overtime/config"
import type {
  OvertimeReport,
  OvertimeEmployeeSummary,
  OvertimeStationSummary,
  OvertimeDashboardKpis,
} from "@/lib/overtime/types"

export default function OvertimeReportDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<OvertimeReport | null>(null)
  const [employees, setEmployees] = useState<OvertimeEmployeeSummary[]>([])
  const [stations, setStations] = useState<OvertimeStationSummary[]>([])
  const [kpis, setKpis] = useState<OvertimeDashboardKpis | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<OvertimeEmployeeSummary | null>(null)
  const [exporting, setExporting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (id) fetchReport()
  }, [id])

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/overtime/reports/${id}`)
      if (!res.ok) {
        router.push("/overtime")
        return
      }
      const data = await res.json()
      setReport(data.report)
      setEmployees(data.employees)
      setStations(data.stations)
      setKpis(data.kpis)
    } catch (e) {
      console.error("Failed to fetch report:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!report) return
    setConfirming(true)
    try {
      await fetch(`/api/overtime/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      })
      setReport({ ...report, status: "confirmed" })
    } catch (e) {
      console.error("Failed to confirm report:", e)
    } finally {
      setConfirming(false)
    }
  }

  const handleExportPdf = async () => {
    if (!report) return
    setExporting(true)
    try {
      const res = await fetch("/api/overtime/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "PDF-export misslyckades")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Overtidsrapport_anonymiserad_${report.period_start}_${report.period_end}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      setReport({ ...report, status: "exported" })
    } catch (e) {
      console.error("Failed to export PDF:", e)
    } finally {
      setExporting(false)
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("sv-SE")

  if (loading || !report || !kpis) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/overtime">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Tillbaka
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Laddar rapport...</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/overtime">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Tillbaka
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Övertidsrapport</h1>
            <p className="text-muted-foreground">
              Period: {formatDate(report.period_start)} – {formatDate(report.period_end)}
              <span className="mx-2">&middot;</span>
              {report.filename}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report.status === "draft" && (
            <Button variant="outline" onClick={handleConfirm} disabled={confirming}>
              {confirming ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
              Bekräfta rapport
            </Button>
          )}
          <Button onClick={handleExportPdf} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Exportera PDF (anonymiserad)
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <OvertimeKpiCards kpis={kpis} />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Översikt</TabsTrigger>
          <TabsTrigger value="employees">
            Medarbetare ({kpis.totalEmployees})
          </TabsTrigger>
          <TabsTrigger value="warnings">
            Varningar ({kpis.warningCount + kpis.breachCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OvertimeStationChart stations={stations} />
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <OvertimeEmployeeTable
            employees={employees}
            onEmployeeClick={setSelectedEmployee}
          />
        </TabsContent>

        <TabsContent value="warnings" className="mt-6">
          <OvertimeWarningsPanel employees={employees} />
        </TabsContent>
      </Tabs>

      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.displayName}</DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <Badge variant="outline">{selectedEmployee.category}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Station(er)</p>
                  <p className="font-medium">
                    {selectedEmployee.stations.map((s) => s.name).join(", ")}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-medium">Övertid</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Månad:</span>{" "}
                    <span className="font-mono font-medium">
                      {formatHours(selectedEmployee.overtimeMonthly)}
                    </span>
                    <span className="text-muted-foreground"> / {OVERTIME_LIMITS.MONTHLY_LIMIT}h</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">År (YTD):</span>{" "}
                    <span className="font-mono font-medium">
                      {formatHours(selectedEmployee.overtimeTotal)}
                    </span>
                    <span className="text-muted-foreground"> / {OVERTIME_LIMITS.YEARLY_LIMIT}h</span>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Kvar till årsgräns:</span>{" "}
                  <span className="font-mono font-bold">
                    {formatHours(selectedEmployee.hoursToYearlyLimit)}
                  </span>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-medium">Mertid</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Månad:</span>{" "}
                    <span className="font-mono">{formatHours(selectedEmployee.extraTimeMonthly)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">År (YTD):</span>{" "}
                    <span className="font-mono">{formatHours(selectedEmployee.extraTimeTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <h3 className="font-medium">Arbetad tid</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Månad:</span>{" "}
                    <span className="font-mono">{formatHours(selectedEmployee.workedTimeMonthly)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">År (YTD):</span>{" "}
                    <span className="font-mono">{formatHours(selectedEmployee.workedTimeTotal)}</span>
                  </div>
                </div>
              </div>

              {!selectedEmployee.employeeId && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Denna medarbetare kunde inte matchas mot personalregistret.
                  Originalnamn: {selectedEmployee.rawName}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
