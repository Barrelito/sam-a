import React from 'react';
import { TargetLevel } from '@/lib/forecast/types';
import { cn } from '@/lib/utils';

interface ForecastDashboardProps {
    year: number;
    plannedHoursByWeek: Record<number, Record<string, number>>; // weekNumber -> category -> hours
    targetLevels: TargetLevel[];
}

export function ForecastDashboard({ year, plannedHoursByWeek, targetLevels }: ForecastDashboardProps) {
    const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
    const categories = ['VUB/SSK', 'AMB', 'LÄKARE'];

    // Helper to get target hours for a category and week
    const getTarget = (cat: string, week: number) => {
        const target = targetLevels.find(t => t.category === cat && t.week_number === week && t.year === year);
        return target ? target.hours : 0;
    };

    return (
        <div className="w-full overflow-x-auto border rounded-md shadow-sm bg-white mb-6">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-700">
                    <tr>
                        <th className="px-4 py-3 font-semibold border-b border-r bg-slate-50 sticky left-0 z-10 w-48 min-w-[200px]">
                            Sammanställning (v.1-52)
                        </th>
                        {weeks.map(week => (
                            <th key={week} className="px-2 py-3 font-medium border-b text-center min-w-[60px]">
                                v.{week}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {categories.map((cat, idx) => (
                        <React.Fragment key={cat}>
                            {/* Target Row (Målnivå) */}
                            <tr className="bg-slate-50">
                                <td className="px-4 py-2 border-b border-r font-medium text-slate-600 sticky left-0 z-10 bg-slate-50">
                                    {cat} - Målnivå
                                </td>
                                {weeks.map(week => (
                                    <td key={`target-${week}`} className="px-2 py-2 border-b text-center text-slate-500">
                                        {getTarget(cat, week).toFixed(1)}
                                    </td>
                                ))}
                            </tr>

                            {/* Planned Row (Planerat) */}
                            <tr>
                                <td className="px-4 py-2 border-b border-r font-medium text-slate-700 sticky left-0 z-10 bg-white">
                                    {cat} - Planerat
                                </td>
                                {weeks.map(week => {
                                    const planned = plannedHoursByWeek[week]?.[cat] || 0;
                                    return (
                                        <td key={`planned-${week}`} className="px-2 py-2 border-b text-center text-slate-700">
                                            {planned.toFixed(1)}
                                        </td>
                                    );
                                })}
                            </tr>

                            {/* Balance Row (Balans) */}
                            <tr className={cn(idx !== categories.length - 1 ? "border-b-4 border-slate-200" : "")}>
                                <td className="px-4 py-2 border-b border-r font-semibold text-slate-800 sticky left-0 z-10 bg-slate-50">
                                    {cat} - Balans
                                </td>
                                {weeks.map(week => {
                                    const target = getTarget(cat, week);
                                    const planned = plannedHoursByWeek[week]?.[cat] || 0;
                                    const balance = planned - target;

                                    const isDeficit = balance < 0;

                                    return (
                                        <td key={`balance-${week}`} className={cn(
                                            "px-2 py-2 border-b text-center font-bold",
                                            isDeficit ? "bg-red-50 text-red-600" : "text-green-600"
                                        )}>
                                            {balance > 0 ? '+' : ''}{balance.toFixed(1)}
                                        </td>
                                    );
                                })}
                            </tr>
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
