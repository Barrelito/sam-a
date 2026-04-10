"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ShieldAlert } from "lucide-react"
import { OVERTIME_LIMITS } from "@/lib/overtime/config"
import { formatHours } from "@/lib/overtime/types"
import type { OvertimeEmployeeSummary } from "@/lib/overtime/types"

interface OvertimeWarningsPanelProps {
  employees: OvertimeEmployeeSummary[]
}

export default function OvertimeWarningsPanel({ employees }: OvertimeWarningsPanelProps) {
  // Filter to only employees with warnings or breaches, sorted by severity
  const alertEmployees = employees
    .filter(
      (e) =>
        e.monthlyAlert !== "none" || e.yearlyAlert !== "none"
    )
    .sort((a, b) => {
      // Breaches first, then warnings
      const severityScore = (e: OvertimeEmployeeSummary) => {
        let score = 0
        if (e.yearlyAlert === "breach") score += 100
        if (e.monthlyAlert === "breach") score += 50
        if (e.yearlyAlert === "warning") score += 10
        if (e.monthlyAlert === "warning") score += 5
        return score
      }
      return severityScore(b) - severityScore(a)
    })

  if (alertEmployees.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-green-600 font-medium text-lg mb-2">
            Inga aktiva varningar
          </div>
          <p className="text-muted-foreground">
            Samtliga medarbetare ligger under gränsvärdena.
          </p>
        </CardContent>
      </Card>
    )
  }

  const breachCount = alertEmployees.filter(
    (e) => e.monthlyAlert === "breach" || e.yearlyAlert === "breach"
  ).length
  const warningCount = alertEmployees.length - breachCount

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4">
        {breachCount > 0 && (
          <Badge variant="destructive" className="text-sm py-1 px-3">
            <ShieldAlert className="h-4 w-4 mr-1" />
            {breachCount} överskridande{breachCount !== 1 ? "n" : ""}
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge className="text-sm py-1 px-3 bg-amber-100 text-amber-800 hover:bg-amber-100">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {warningCount} varning{warningCount !== 1 ? "ar" : ""}
          </Badge>
        )}
      </div>

      {/* Warning list */}
      <div className="space-y-3">
        {alertEmployees.map((emp, idx) => (
          <Card
            key={`${emp.rawName}-${idx}`}
            className={
              emp.monthlyAlert === "breach" || emp.yearlyAlert === "breach"
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-medium">{emp.displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {emp.stations.map((s) => s.name).join(", ")} &middot; {emp.category}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  {emp.yearlyAlert === "breach" && (
                    <Badge variant="destructive">
                      Årsgräns överskriden (+{formatHours(emp.overtimeTotal - OVERTIME_LIMITS.YEARLY_LIMIT)})
                    </Badge>
                  )}
                  {emp.yearlyAlert === "warning" && (
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                      {formatHours(emp.hoursToYearlyLimit)} kvar till årsgräns
                    </Badge>
                  )}
                  {emp.monthlyAlert === "breach" && (
                    <Badge variant="destructive">
                      Månadsgräns överskriden (+{formatHours(emp.overtimeMonthly - OVERTIME_LIMITS.MONTHLY_LIMIT)})
                    </Badge>
                  )}
                  {emp.monthlyAlert === "warning" && (
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                      {formatHours(emp.overtimeMonthly)} av {OVERTIME_LIMITS.MONTHLY_LIMIT}h denna månad
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Övertid månad:</span>{" "}
                  <span className="font-mono font-medium">{formatHours(emp.overtimeMonthly)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Övertid år:</span>{" "}
                  <span className="font-mono font-medium">{formatHours(emp.overtimeTotal)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Kvar till årsgräns:</span>{" "}
                  <span className="font-mono font-medium">{formatHours(emp.hoursToYearlyLimit)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
