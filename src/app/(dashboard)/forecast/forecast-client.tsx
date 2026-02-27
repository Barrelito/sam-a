'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeForecast } from '@/lib/forecast/types';
import { calculateStandardHours } from '@/lib/forecast/forecast-logic';
import { mockTargetLevels } from '@/lib/forecast/mock-targets';
import { ForecastDashboard } from '@/components/forecast/forecast-dashboard';
import { ForecastGrid } from '@/components/forecast/forecast-grid';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ForecastClientProps {
    stationId: string;
    year: number;
}

export default function ForecastClient({ stationId, year }: ForecastClientProps) {
    const [employees, setEmployees] = useState<EmployeeForecast[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // Fetch original data
    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/forecast/employees?station_id=${stationId}&year=${year}`);
                if (!res.ok) throw new Error('Failed to fetch data');

                const data = await res.json();

                // Init standard hours
                const emps = data.employees.map((emp: any) => ({
                    ...emp,
                    standard_hours: calculateStandardHours(emp.category, emp.night_share, emp.employment_rate)
                }));

                setEmployees(emps);
            } catch (err: any) {
                toast({
                    variant: 'destructive',
                    title: 'Fel vid hämtning',
                    description: err.message
                });
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [stationId, year, toast]);

    // Compute aggregated planned hours
    const plannedHoursByWeek = useMemo(() => {
        const result: Record<number, Record<string, number>> = {};
        const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

        weeks.forEach(w => {
            result[w] = { 'VUB/SSK': 0, 'AMB': 0, 'LÄKARE': 0 };
        });

        employees.forEach(emp => {
            let catGroup = '';
            if (emp.category === 'VUB' || emp.category === 'SSK') catGroup = 'VUB/SSK';
            else if (emp.category === 'AMB') catGroup = 'AMB';
            else if (emp.category === 'LÄKARE' || emp.category === 'Läkare') catGroup = 'LÄKARE';

            if (!catGroup) return; // Skip unknown

            weeks.forEach(w => {
                const exc = emp.exceptions?.find(x => x.week_number === w && x.year === year);
                const hours = exc ? exc.hours : emp.standard_hours;
                result[w][catGroup] += hours;
            });
        });

        return result;
    }, [employees, year]);

    // Handle employee changes (employment_rate, night_share, category)
    const handleEmployeeChange = async (id: string, field: 'employment_rate' | 'night_share' | 'category', value: number | string) => {
        // Optimistic update
        setEmployees(prev => prev.map(emp => {
            if (emp.id !== id) return emp;
            const updated = { ...emp, [field]: value };
            // Recalculate standard hours
            updated.standard_hours = calculateStandardHours(updated.category, updated.night_share, updated.employment_rate);
            return updated;
        }));

        try {
            const res = await fetch('/api/forecast/employees', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: id, [field]: value })
            });

            if (!res.ok) throw new Error('Failed to update employee settings');
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Kunde inte spara',
                description: err.message
            });
            // Ideally we'd rollback state here if critical
        }
    };

    // Handle exception changes
    const handleExceptionChange = async (employeeId: string, week: number, hours: number | null) => {
        // Optimistic update
        setEmployees(prev => prev.map(emp => {
            if (emp.id !== employeeId) return emp;

            let newExceptions = [...(emp.exceptions || [])];
            const existingIdx = newExceptions.findIndex(x => x.week_number === week && x.year === year);

            if (hours === null) {
                // Remove
                if (existingIdx >= 0) newExceptions.splice(existingIdx, 1);
            } else {
                // Update or add
                if (existingIdx >= 0) {
                    newExceptions[existingIdx].hours = hours;
                } else {
                    newExceptions.push({
                        id: 'temp-' + Date.now(),
                        employee_id: employeeId,
                        year,
                        week_number: week,
                        hours,
                        created_at: '',
                        updated_at: ''
                    });
                }
            }
            return { ...emp, exceptions: newExceptions };
        }));

        try {
            const res = await fetch('/api/forecast/exceptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: employeeId, year, week_number: week, hours })
            });

            if (!res.ok) throw new Error('Failed to save exception');
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Kunde inte spara avvikelse',
                description: err.message
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground opacity-50" />
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-6">
            <ForecastDashboard
                year={year}
                plannedHoursByWeek={plannedHoursByWeek}
                targetLevels={mockTargetLevels}
            />

            <div>
                <h2 className="text-xl font-semibold mb-3">Detaljerad planering (Radnivå)</h2>
                <ForecastGrid
                    year={year}
                    employees={employees}
                    onEmployeeChange={handleEmployeeChange}
                    onExceptionChange={handleExceptionChange}
                />
                <p className="text-xs text-muted-foreground mt-2 inline-flex items-center">
                    <span className="w-2 h-2 rounded-full bg-orange-200 mr-2 inline-block"></span>
                    Markerade fält innebär en sparad manuell avvikelse. Sudda fältet för att återställa till standardtimmar.
                    Ändringar sparas automatiskt i bakgrunden.
                </p>
            </div>
        </div>
    );
}
