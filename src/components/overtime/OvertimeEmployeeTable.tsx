"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Search, ArrowUpDown } from "lucide-react"
import { ALERT_CONFIG, getProgressColor } from "@/lib/overtime/config"
import { formatHours } from "@/lib/overtime/types"
import type { OvertimeEmployeeSummary } from "@/lib/overtime/types"

interface OvertimeEmployeeTableProps {
  employees: OvertimeEmployeeSummary[]
  onEmployeeClick?: (employee: OvertimeEmployeeSummary) => void
}

type SortField = 'name' | 'overtimeMonthly' | 'overtimeTotal' | 'yearlyPercentage'

export default function OvertimeEmployeeTable({
  employees,
  onEmployeeClick,
}: OvertimeEmployeeTableProps) {
  const [search, setSearch] = useState("")
  const [stationFilter, setStationFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [alertFilter, setAlertFilter] = useState("all")
  const [sortField, setSortField] = useState<SortField>("overtimeTotal")
  const [sortAsc, setSortAsc] = useState(false)

  // Extract unique stations and categories for filters
  const allStations = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((e) => e.stations.forEach((s) => set.add(s.name)))
    return Array.from(set).sort()
  }, [employees])

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    employees.forEach((e) => set.add(e.category))
    return Array.from(set).sort()
  }, [employees])

  // Filter and sort
  const filtered = useMemo(() => {
    let result = employees

    // Search
    if (search) {
      const lower = search.toLowerCase()
      result = result.filter(
        (e) =>
          e.displayName.toLowerCase().includes(lower) ||
          e.rawName.toLowerCase().includes(lower)
      )
    }

    // Station filter
    if (stationFilter !== "all") {
      result = result.filter((e) =>
        e.stations.some((s) => s.name === stationFilter)
      )
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((e) => e.category === categoryFilter)
    }

    // Alert filter
    if (alertFilter !== "all") {
      result = result.filter((e) => {
        if (alertFilter === "warning") return e.monthlyAlert === "warning" || e.yearlyAlert === "warning"
        if (alertFilter === "breach") return e.monthlyAlert === "breach" || e.yearlyAlert === "breach"
        if (alertFilter === "ok") return e.monthlyAlert === "none" && e.yearlyAlert === "none"
        return true
      })
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case "name":
          cmp = a.displayName.localeCompare(b.displayName, "sv")
          break
        case "overtimeMonthly":
          cmp = a.overtimeMonthly - b.overtimeMonthly
          break
        case "overtimeTotal":
          cmp = a.overtimeTotal - b.overtimeTotal
          break
        case "yearlyPercentage":
          cmp = a.yearlyPercentage - b.yearlyPercentage
          break
      }
      return sortAsc ? cmp : -cmp
    })

    return result
  }, [employees, search, stationFilter, categoryFilter, alertFilter, sortField, sortAsc])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök medarbetare..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={stationFilter}
          onChange={(e) => setStationFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="all">Alla stationer</option>
          {allStations.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="all">Alla kategorier</option>
          {allCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={alertFilter}
          onChange={(e) => setAlertFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background"
        >
          <option value="all">Alla statusar</option>
          <option value="ok">OK</option>
          <option value="warning">Varning</option>
          <option value="breach">Överskriden</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Visar {filtered.length} av {employees.length} medarbetare
      </p>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th
                  className="text-left p-3 font-medium cursor-pointer hover:bg-muted"
                  onClick={() => toggleSort("name")}
                >
                  <span className="flex items-center gap-1">
                    Namn <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="text-left p-3 font-medium">Station</th>
                <th className="text-left p-3 font-medium">Kategori</th>
                <th
                  className="text-right p-3 font-medium cursor-pointer hover:bg-muted"
                  onClick={() => toggleSort("overtimeMonthly")}
                >
                  <span className="flex items-center justify-end gap-1">
                    ÖT Mån <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th
                  className="text-right p-3 font-medium cursor-pointer hover:bg-muted"
                  onClick={() => toggleSort("overtimeTotal")}
                >
                  <span className="flex items-center justify-end gap-1">
                    ÖT År <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
                <th className="p-3 font-medium min-w-[150px]">Årsgräns (200h)</th>
                <th className="text-center p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, idx) => {
                const worstAlert =
                  emp.monthlyAlert === "breach" || emp.yearlyAlert === "breach"
                    ? "breach"
                    : emp.monthlyAlert === "warning" || emp.yearlyAlert === "warning"
                      ? "warning"
                      : "none"

                const alertCfg = ALERT_CONFIG[worstAlert]
                const progressPct = Math.min(emp.yearlyPercentage, 120)

                return (
                  <tr
                    key={`${emp.rawName}-${idx}`}
                    className={`border-b hover:bg-muted/30 cursor-pointer transition-colors ${
                      worstAlert === "breach" ? "bg-red-50" : ""
                    }`}
                    onClick={() => onEmployeeClick?.(emp)}
                  >
                    <td className="p-3">
                      <div className="font-medium">{emp.displayName}</div>
                      {!emp.employeeId && (
                        <span className="text-xs text-amber-600">Ej matchad i system</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {emp.stations.map((s) => s.name).join(", ")}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs">
                        {emp.category}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-mono">
                      {formatHours(emp.overtimeMonthly)}
                    </td>
                    <td className="p-3 text-right font-mono font-medium">
                      {formatHours(emp.overtimeTotal)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Progress
                            value={Math.min(progressPct, 100)}
                            className="h-2"
                            style={{
                              // @ts-expect-error CSS custom property
                              '--progress-foreground': getProgressColor(emp.yearlyPercentage).replace('bg-', ''),
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {Math.round(emp.yearlyPercentage)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      {worstAlert !== "none" && (
                        <Badge
                          variant={worstAlert === "breach" ? "destructive" : "default"}
                          className={worstAlert === "warning" ? "bg-amber-100 text-amber-800 hover:bg-amber-100" : ""}
                        >
                          {alertCfg.icon} {alertCfg.label}
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Inga medarbetare matchar filtren.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
