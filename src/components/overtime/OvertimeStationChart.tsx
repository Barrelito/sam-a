"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { OVERTIME_LIMITS } from "@/lib/overtime/config"
import type { OvertimeStationSummary } from "@/lib/overtime/types"

interface OvertimeStationChartProps {
  stations: OvertimeStationSummary[]
}

export default function OvertimeStationChart({ stations }: OvertimeStationChartProps) {
  const chartData = stations.map((s) => ({
    name: s.stationName,
    avgMonthly: Math.round(s.avgOvertimeMonthly * 10) / 10,
    avgYearly: Math.round(s.avgOvertimeYearly * 10) / 10,
    employees: s.employeeCount,
    warnings: s.warningCount,
    breaches: s.breachCount,
  }))

  const getBarColor = (station: OvertimeStationSummary) => {
    if (station.breachCount > 0) return "#ef4444" // red
    if (station.warningCount > 0) return "#f59e0b" // amber
    return "#22c55e" // green
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Snitt övertid per månad per station */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Snitt övertid per månad</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" unit="h" />
              <Tooltip
                formatter={(value) => [`${value}h`, "Snitt övertid/mån"]}
                labelFormatter={(label) => `Station: ${label}`}
              />
              <ReferenceLine
                y={OVERTIME_LIMITS.MONTHLY_WARNING}
                stroke="#f59e0b"
                strokeDasharray="5 5"
                label={{ value: `${OVERTIME_LIMITS.MONTHLY_WARNING}h`, position: "right", className: "text-xs fill-amber-600" }}
              />
              <ReferenceLine
                y={OVERTIME_LIMITS.MONTHLY_LIMIT}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: `${OVERTIME_LIMITS.MONTHLY_LIMIT}h`, position: "right", className: "text-xs fill-red-600" }}
              />
              <Bar dataKey="avgMonthly" radius={[4, 4, 0, 0]}>
                {stations.map((station, idx) => (
                  <Cell key={idx} fill={getBarColor(station)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Station-sammanfattning */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stationsöversikt</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stations.map((station) => (
              <div
                key={station.stationName}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <div className="font-medium">{station.stationName}</div>
                  <div className="text-sm text-muted-foreground">
                    {station.employeeCount} medarbetare
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {station.breachCount > 0 && (
                    <span className="text-red-600 font-medium">
                      {station.breachCount} överskrid.
                    </span>
                  )}
                  {station.warningCount > 0 && (
                    <span className="text-amber-600 font-medium">
                      {station.warningCount} varning{station.warningCount !== 1 ? "ar" : ""}
                    </span>
                  )}
                  {station.breachCount === 0 && station.warningCount === 0 && (
                    <span className="text-green-600 font-medium">OK</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
