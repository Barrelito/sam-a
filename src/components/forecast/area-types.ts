import { EmployeeForecast, ResourceTransfer } from '@/lib/forecast/types';

export interface StationData {
    id: string;
    name: string;
}

export interface AreaCalculatedData {
    // Total planned hours for the whole VO per week and category
    plannedHoursByWeek: Record<number, Record<string, number>>;

    // Per-station balance: stationId -> weekNumber -> category -> balance (planned - target)
    // Actually, to make the bottleneck matrix simple, let's just store the plain planned hours
    // per station, and calculate balance in the component, OR we store balance here.
    // Let's store planned hours per station: stationId -> week -> category -> hours
    stationPlannedHours: Record<string, Record<number, Record<string, number>>>;
}

export interface AreaState {
    stations: StationData[];
    employees: EmployeeForecast[];
    transfers: ResourceTransfer[];
}
