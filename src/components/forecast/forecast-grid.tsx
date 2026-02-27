'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EmployeeForecast } from '@/lib/forecast/types';
import { calculateStandardHours } from '@/lib/forecast/forecast-logic';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ForecastGridProps {
    year: number;
    employees: EmployeeForecast[];
    onEmployeeChange: (id: string, field: 'employment_rate' | 'night_share' | 'category', value: number | string) => void;
    onExceptionChange: (employeeId: string, week: number, hours: number | null) => void;
}

export function ForecastGrid({ year, employees, onEmployeeChange, onExceptionChange }: ForecastGridProps) {
    const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

    // Local state for fast typing without waiting for parent/API
    const [localData, setLocalData] = useState<Record<string, Record<PropertyKey, any>>>({});

    useEffect(() => {
        // Sync props to local when external data changes significantly (e.g. init)
        const initialMap: Record<string, any> = {};
        employees.forEach(emp => {
            initialMap[emp.id] = {
                category: emp.category,
                employment_rate: emp.employment_rate || 100,
                night_share: emp.night_share || 0,
                exceptions: emp.exceptions,
                standard_hours: emp.standard_hours,
            };
        });
        setLocalData(initialMap);
    }, [employees]);

    const getLocalVal = (empId: string, field: string) => {
        return localData[empId]?.[field] ?? '';
    };

    const getHoursForWeek = (empId: string, week: number) => {
        if (!localData[empId]) return 0;
        const exceptions = localData[empId].exceptions || [];
        const exc = exceptions.find((x: any) => x.week_number === week && x.year === year);
        if (exc) {
            return exc.hours;
        }
        return localData[empId].standard_hours || 0;
    };

    const isException = (empId: string, week: number) => {
        if (!localData[empId]) return false;
        const exceptions = localData[empId].exceptions || [];
        return exceptions.some((x: any) => x.week_number === week && x.year === year);
    };

    return (
        <div className="w-full overflow-x-auto border rounded-md shadow-sm bg-white pb-4 max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 z-20 shadow-sm">
                    <tr>
                        <th className="px-4 py-3 font-semibold border-b border-r bg-slate-50 sticky left-0 z-30 min-w-[200px]">Medarbetare</th>
                        <th className="px-3 py-3 font-semibold border-b border-r bg-slate-50 min-w-[120px]">Yrkesroll</th>
                        <th className="px-3 py-3 font-semibold border-b border-r bg-slate-50 min-w-[100px]">Tjänst. %</th>
                        <th className="px-3 py-3 font-semibold border-b border-r bg-slate-50 min-w-[100px]">Natt %</th>
                        {weeks.map(week => (
                            <th key={week} className="px-2 py-3 font-medium border-b text-center min-w-[60px]">
                                v.{week}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {employees.map(emp => (
                        <tr key={emp.id} className="hover:bg-slate-50 border-b">
                            {/* Sticky Name Col */}
                            <td className="px-4 py-2 border-r font-medium text-slate-800 sticky left-0 z-10 bg-white shadow-[1px_0_0_0_#e2e8f0]">
                                {emp.first_name} {emp.last_name}
                            </td>

                            {/* Category Col */}
                            <td className="px-2 py-2 border-r">
                                <Select
                                    value={getLocalVal(emp.id, 'category')}
                                    onValueChange={(val) => onEmployeeChange(emp.id, 'category', val)}
                                >
                                    <SelectTrigger className="h-8 text-xs border-0 bg-transparent focus:ring-1">
                                        <SelectValue placeholder="Välj..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VUB">VUB</SelectItem>
                                        <SelectItem value="SSK">SSK</SelectItem>
                                        <SelectItem value="AMB">AMB</SelectItem>
                                        <SelectItem value="LÄKARE">LÄKARE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </td>

                            {/* employment_rate Col */}
                            <td className="px-2 py-2 border-r text-center">
                                <Input
                                    type="number"
                                    className="h-8 w-16 px-1 text-center text-xs border-0 bg-transparent focus-visible:ring-1 mx-auto"
                                    value={getLocalVal(emp.id, 'employment_rate')}
                                    onChange={(e) => {
                                        const clone = { ...localData };
                                        if (clone[emp.id]) clone[emp.id].employment_rate = e.target.value;
                                        setLocalData(clone);
                                    }}
                                    onBlur={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) onEmployeeChange(emp.id, 'employment_rate', val);
                                    }}
                                />
                            </td>

                            {/* night_share Col */}
                            <td className="px-2 py-2 border-r text-center">
                                <Input
                                    type="number"
                                    className="h-8 w-16 px-1 text-center text-xs border-0 bg-transparent focus-visible:ring-1 mx-auto"
                                    value={getLocalVal(emp.id, 'night_share')}
                                    onChange={(e) => {
                                        const clone = { ...localData };
                                        if (clone[emp.id]) clone[emp.id].night_share = e.target.value;
                                        setLocalData(clone);
                                    }}
                                    onBlur={(e) => {
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val)) onEmployeeChange(emp.id, 'night_share', val);
                                    }}
                                />
                            </td>

                            {/* Standard Hours for Weeks */}
                            {weeks.map(week => {
                                const val = getHoursForWeek(emp.id, week);
                                const isExc = isException(emp.id, week);

                                // We format to 1 decimal place, but if user is mid-typing, we show exact.
                                // For simplicity, we just bind to value and use onBlur.
                                return (
                                    <td key={week} className={`px-1 py-1 border-r text-center ${isExc ? 'bg-orange-50' : ''}`}>
                                        <Input
                                            type="text"
                                            className={`h-8 w-14 px-1 text-center text-xs border-0 bg-transparent focus-visible:ring-1 mx-auto ${isExc ? 'font-bold text-orange-700' : 'text-slate-600'}`}
                                            defaultValue={val.toFixed(1)}
                                            onFocus={(e) => e.target.select()}
                                            // Handling blur to trigger save and re-render
                                            onBlur={(e) => {
                                                const currentStr = e.target.value;
                                                // If empty, reset to standard
                                                if (currentStr === '') {
                                                    onExceptionChange(emp.id, week, null);
                                                    e.target.value = (localData[emp.id]?.standard_hours || 0).toFixed(1);
                                                    return;
                                                }
                                                // Parse number
                                                const num = parseFloat(currentStr.replace(',', '.'));
                                                if (!isNaN(num)) {
                                                    const std = localData[emp.id]?.standard_hours || 0;
                                                    // Only save exception if it differs from standard
                                                    if (Math.abs(num - std) > 0.01) {
                                                        onExceptionChange(emp.id, week, num);
                                                        e.target.value = num.toFixed(1);
                                                    } else {
                                                        // It matches standard, so clear exception
                                                        onExceptionChange(emp.id, week, null);
                                                        e.target.value = std.toFixed(1);
                                                    }
                                                }
                                            }}
                                            key={`input-${emp.id}-${week}-${localData[emp.id]?.standard_hours}-${isExc}`}
                                        // The key ensures React forces an update if standard_hours changes 
                                        // so the default values reset to the new standard.
                                        />
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    {employees.length === 0 && (
                        <tr>
                            <td colSpan={56} className="text-center py-8 text-slate-500">
                                Inga medarbetare hittades för denna station.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
