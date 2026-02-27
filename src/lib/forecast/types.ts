import { Employee } from '../salary-review/types';

export interface ForecastException {
    id: string;
    employee_id: string;
    year: number;
    week_number: number;
    hours: number;
    created_at: string;
    updated_at: string;
}

export interface EmployeeForecast extends Employee {
    exceptions: ForecastException[];
    standard_hours: number;
}

export interface TargetLevel {
    category: string; // 'VUB/SSK', 'AMB', 'LÄKARE'
    year: number;
    week_number: number;
    hours: number;
}
