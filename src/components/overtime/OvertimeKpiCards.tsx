"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, AlertTriangle, ShieldAlert, Clock } from "lucide-react"
import type { OvertimeDashboardKpis } from "@/lib/overtime/types"
import { formatHours } from "@/lib/overtime/types"

interface OvertimeKpiCardsProps {
  kpis: OvertimeDashboardKpis
}

export default function OvertimeKpiCards({ kpis }: OvertimeKpiCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {/* Total medarbetare */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Medarbetare</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.totalEmployees}</div>
          <p className="text-xs text-muted-foreground">
            {kpis.matchedEmployees} matchade, {kpis.unmatchedEmployees} omatchade
          </p>
        </CardContent>
      </Card>

      {/* Varningar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Varningar</CardTitle>
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{kpis.warningCount}</div>
          <p className="text-xs text-muted-foreground">
            Närmar sig gränsvärde
          </p>
        </CardContent>
      </Card>

      {/* Överskridanden */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Överskridanden</CardTitle>
          <ShieldAlert className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{kpis.breachCount}</div>
          <p className="text-xs text-muted-foreground">
            Gränsvärde överskridet
          </p>
        </CardContent>
      </Card>

      {/* Snittövertid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Snitt övertid YTD</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatHours(kpis.avgYearlyOvertime)}</div>
          <p className="text-xs text-muted-foreground">
            Median: {formatHours(kpis.medianYearlyOvertime)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
