import React from 'react';
import { TargetLevel } from '@/lib/forecast/types';
import { StationData, AreaCalculatedData } from './area-types';
import { cn } from '@/lib/utils';

interface AreaBottleneckMatrixProps {
    year: number;
    stations: StationData[];
    aggregatedData: AreaCalculatedData;
    targetLevels: TargetLevel[];
}

export function AreaBottleneckMatrix({ year, stations, aggregatedData, targetLevels }: AreaBottleneckMatrixProps) {
    const weeks = Array.from({ length: 52 }, (_, i) => i + 1);
    const categories = ['VUB/SSK', 'AMB', 'LÄKARE'];

    // For the matrix, we want to show if a station is in deficit (red) or surplus (green).
    // TargetLevels mock is currently total for VO, or per station?
    // Let's assume the mock targets are PER STATION for this matrix.
    const getTarget = (cat: string, week: number) => {
        const target = targetLevels.find(t => t.category === cat && t.week_number === week && t.year === year);
        // If mock targets were built per station, we'd look up by station. 
        // For now, we assume the mock covers 1 station's worth of need.
        return target ? target.hours : 0;
    };

    return (
        <div className="w-full overflow-x-auto border rounded-md shadow-sm bg-white mb-6">
            <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Flaskhals-matris (Totalbalans per station)</h3>
                <p className="text-xs text-slate-500">Siffran visar aggregerad balans (alla yrkeskategorier). Håll muspekaren över för detaljer.</p>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-700">
                    <tr>
                        <th className="px-4 py-2 font-semibold border-b border-r bg-slate-50 sticky left-0 z-10 w-48 min-w-[200px]">
                            Station
                        </th>
                        {weeks.map(week => (
                            <th key={week} className="px-2 py-2 font-medium border-b text-center min-w-[60px]">
                                {week}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {stations.map((station) => (
                        <tr key={station.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-slate-700 border-b border-r sticky left-0 z-10 bg-white">
                                {station.name}
                            </td>
                            {weeks.map(week => {
                                // Calculate total balance for this station
                                let totalBalance = 0;
                                let tooltipTitle = `${station.name} - Vecka ${week}\n`;

                                categories.forEach(cat => {
                                    const target = getTarget(cat, week);
                                    const planned = aggregatedData.stationPlannedHours[station.id]?.[week]?.[cat] || 0;
                                    const balance = planned - target;
                                    totalBalance += balance;

                                    tooltipTitle += `${cat}: ${balance > 0 ? '+' : ''}${balance.toFixed(1)}h\n`;
                                });

                                const isDeficit = totalBalance < -10; // Threshold for displaying red
                                const isSurplus = totalBalance > 10;

                                let bgColor = '';
                                let textColor = 'text-slate-600';
                                if (isDeficit) {
                                    bgColor = 'bg-red-100';
                                    textColor = 'text-red-700 font-bold';
                                } else if (isSurplus) {
                                    bgColor = 'bg-green-100';
                                    textColor = 'text-green-700 font-bold';
                                }

                                return (
                                    <td key={`${station.id}-${week}`} className={cn("px-1 py-1 border-b text-center border-r border-slate-100", bgColor)}>
                                        <div
                                            className={cn("w-full h-full flex items-center justify-center cursor-default min-h-[30px]", textColor)}
                                            title={tooltipTitle}
                                        >
                                            {Math.round(totalBalance)}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
