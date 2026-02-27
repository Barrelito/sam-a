'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EmployeeForecast, ResourceTransfer } from '@/lib/forecast/types';
import { calculateStandardHours } from '@/lib/forecast/forecast-logic';
import { mockTargetLevels } from '@/lib/forecast/mock-targets';
import { StationData, AreaCalculatedData } from '@/components/forecast/area-types';
import { AreaTotalDashboard } from '@/components/forecast/area-total-dashboard';
import { AreaBottleneckMatrix } from '@/components/forecast/area-bottleneck-matrix';
import { TransferModal } from '@/components/forecast/transfer-modal';
import { ForecastGrid } from '@/components/forecast/forecast-grid';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface AreaForecastClientProps {
    year: number;
}

export default function AreaForecastClient({ year }: AreaForecastClientProps) {
    const [stations, setStations] = useState<StationData[]>([]);
    const [employees, setEmployees] = useState<EmployeeForecast[]>([]);
    const [transfers, setTransfers] = useState<ResourceTransfer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const { toast } = useToast();

    // Fetch original data
    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch(`/api/forecast/area?year=${year}`);
                if (!res.ok) throw new Error('Failed to fetch data');

                const data = await res.json();

                const emps = data.employees.map((emp: any) => ({
                    ...emp,
                    standard_hours: calculateStandardHours(emp.category, emp.night_share, emp.employment_rate)
                }));

                setStations(data.stations || []);
                setEmployees(emps || []);
                setTransfers(data.transfers || []);
            } catch (err: any) {
                toast({ variant: 'destructive', title: 'Fel vid hämtning', description: err.message });
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [year, toast]);

    // Compute aggregated planned hours including transfers
    const aggregatedData = useMemo<AreaCalculatedData>(() => {
        const plannedHoursByWeek: Record<number, Record<string, number>> = {};
        const stationPlannedHours: Record<string, Record<number, Record<string, number>>> = {};

        const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

        weeks.forEach(w => {
            plannedHoursByWeek[w] = { 'VUB/SSK': 0, 'AMB': 0, 'LÄKARE': 0 };
        });

        stations.forEach(s => {
            stationPlannedHours[s.id] = {};
            weeks.forEach(w => {
                stationPlannedHours[s.id][w] = { 'VUB/SSK': 0, 'AMB': 0, 'LÄKARE': 0 };
            });
        });

        // Loop baseline employees
        employees.forEach(emp => {
            if (!stationPlannedHours[emp.station_id]) return;
            let catGroup = '';
            if (emp.category === 'VUB' || emp.category === 'SSK') catGroup = 'VUB/SSK';
            else if (emp.category === 'AMB') catGroup = 'AMB';
            else if (emp.category === 'LÄKARE' || emp.category === 'Läkare') catGroup = 'LÄKARE';

            if (!catGroup) return;

            weeks.forEach(w => {
                const exc = emp.exceptions?.find(x => x.week_number === w && x.year === year);
                const hours = exc ? exc.hours : emp.standard_hours;

                stationPlannedHours[emp.station_id][w][catGroup] += hours;
                plannedHoursByWeek[w][catGroup] += hours;
            });
        });

        // Apply transfers
        transfers.forEach(t => {
            if (t.year !== year) return;
            const emp = employees.find(e => e.id === t.employee_id);
            if (!emp) return;

            let catGroup = '';
            if (emp.category === 'VUB' || emp.category === 'SSK') catGroup = 'VUB/SSK';
            else if (emp.category === 'AMB') catGroup = 'AMB';
            else if (emp.category === 'LÄKARE' || emp.category === 'Läkare') catGroup = 'LÄKARE';

            if (!catGroup) return;

            // Subtract from source, add to target
            if (stationPlannedHours[t.from_station_id]) {
                stationPlannedHours[t.from_station_id][t.week_number][catGroup] -= t.hours;
            }
            if (stationPlannedHours[t.to_station_id]) {
                stationPlannedHours[t.to_station_id][t.week_number][catGroup] += t.hours;
            }
            // Note: The total VO `plannedHoursByWeek` doesn't change since transfer is internal to VO.
        });

        return { plannedHoursByWeek, stationPlannedHours };
    }, [employees, transfers, stations, year]);


    // Mutation handlers for the drill-down grid
    const handleEmployeeChange = async (id: string, field: 'employment_rate' | 'night_share' | 'category', value: number | string) => {
        setEmployees(prev => prev.map(emp => {
            if (emp.id !== id) return emp;
            const updated = { ...emp, [field]: value };
            updated.standard_hours = calculateStandardHours(updated.category, updated.night_share, updated.employment_rate);
            return updated;
        }));

        try {
            await fetch('/api/forecast/employees', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: id, [field]: value })
            });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Fel vid uppdatering', description: err.message });
        }
    };

    const handleExceptionChange = async (employeeId: string, week: number, hours: number | null) => {
        setEmployees(prev => prev.map(emp => {
            if (emp.id !== employeeId) return emp;
            let newExceptions = [...(emp.exceptions || [])];
            const existingIdx = newExceptions.findIndex(x => x.week_number === week && x.year === year);

            if (hours === null) {
                if (existingIdx >= 0) newExceptions.splice(existingIdx, 1);
            } else {
                if (existingIdx >= 0) newExceptions[existingIdx].hours = hours;
                else newExceptions.push({ id: 'temp-' + Date.now(), employee_id: employeeId, year, week_number: week, hours, created_at: '', updated_at: '' });
            }
            return { ...emp, exceptions: newExceptions };
        }));

        try {
            await fetch('/api/forecast/exceptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employee_id: employeeId, year, week_number: week, hours })
            });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Fel vid uppdatering', description: err.message });
        }
    };

    // Save transfer
    const handleTransferSave = async (data: { employee_id: string, from_station_id: string, to_station_id: string, start_week: number, end_week: number, hours: number }) => {
        const newTransfers: ResourceTransfer[] = [];

        for (let w = data.start_week; w <= data.end_week; w++) {
            // Optimistic insert
            const tempId = 'temp-trans-' + Date.now() + '-' + w;
            newTransfers.push({
                id: tempId,
                employee_id: data.employee_id,
                from_station_id: data.from_station_id,
                to_station_id: data.to_station_id,
                year,
                week_number: w,
                hours: data.hours,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            // Actual insert
            fetch('/api/forecast/transfers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_id: data.employee_id,
                    from_station_id: data.from_station_id,
                    to_station_id: data.to_station_id,
                    year,
                    week_number: w,
                    hours: data.hours
                })
            });
        }

        setTransfers(prev => [...prev, ...newTransfers]);
        toast({ title: 'Resursflytt sparad', description: `${data.hours}h per vecka har omallokerats.` });
    };

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin w-8 h-8 text-muted-foreground" /></div>;

    // Multiply target levels by number of stations for the area total
    const areaTargetLevels = mockTargetLevels.map(t => ({
        ...t,
        hours: t.hours * (stations.length || 1) // Rough approximation because mock target is per station
    }));

    return (
        <div className="flex flex-col space-y-6">

            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsTransferModalOpen(true)} className="gap-2">
                    <ArrowRightLeft className="w-4 h-4" />
                    Låna ut resurs
                </Button>
            </div>

            <AreaTotalDashboard
                year={year}
                aggregatedData={aggregatedData}
                targetLevels={areaTargetLevels}
            />

            <AreaBottleneckMatrix
                year={year}
                stations={stations}
                aggregatedData={aggregatedData}
                targetLevels={mockTargetLevels}
            />

            <div>
                <h2 className="text-xl font-semibold mb-4">Detaljerad planering per Station (Drill-down)</h2>
                <Accordion type="single" collapsible className="w-full">
                    {stations.map(station => {
                        const stationEmployees = employees.filter(e => e.station_id === station.id);
                        return (
                            <AccordionItem key={station.id} value={station.id}>
                                <AccordionTrigger className="bg-slate-50 px-4 py-3 hover:bg-slate-100 rounded-md">
                                    <div className="flex justify-between w-full">
                                        <span>{station.name}</span>
                                        <span className="text-sm font-normal text-muted-foreground mr-4">
                                            {stationEmployees.length} medarbetare
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-white border border-t-0 rounded-b-md">
                                    <ForecastGrid
                                        year={year}
                                        employees={stationEmployees}
                                        onEmployeeChange={handleEmployeeChange}
                                        onExceptionChange={handleExceptionChange}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            </div>

            <TransferModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                stations={stations}
                employees={employees}
                onTransferSave={handleTransferSave}
            />
        </div>
    );
}
