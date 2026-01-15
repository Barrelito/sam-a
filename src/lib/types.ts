export type TaskStatus = 'not_started' | 'in_progress' | 'done';
export type TaskCategory = 'HR' | 'Finance' | 'Safety' | 'Operations';
export type UserRole = 'admin' | 'vo_chief' | 'station_manager' | 'assistant_manager';

export interface Verksamhetsomrade {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export interface Station {
    id: string;
    name: string;
    vo_id: string;
    vo?: Verksamhetsomrade;
    address: string | null;
    created_at: string;
    updated_at: string;
}

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    vo_id: string | null;
    verksamhetsomraden?: { id: string; name: string } | null;
    user_stations?: Array<{
        station: { id: string; name: string; vo_id: string }
    }>;
    created_at: string;
    updated_at: string;
}

export interface UserStation {
    id: string;
    user_id: string;
    station_id: string;
    user?: Profile;
    station?: Station;
    created_at: string;
}

export interface RecurringTask {
    id: string;
    title: string;
    description: string | null;
    month: number | null;
    tertial: number;
    category: TaskCategory;
    status: TaskStatus;
    assigned_to: string | null;
    assigned_to_profile?: Profile;
    station_id: string | null;
    station?: Station;
    notes: string | null;
    is_recurring_monthly: boolean;
    year: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface TaskLog {
    id: string;
    task_id: string;
    user_id: string;
    user?: Profile;
    action: 'status_change' | 'comment' | 'assignment' | 'created';
    old_status: TaskStatus | null;
    new_status: TaskStatus | null;
    comment: string | null;
    created_at: string;
}

// Helper type for role display
export const roleLabels: Record<UserRole, string> = {
    admin: 'Administratör',
    vo_chief: 'VO Chef',
    station_manager: 'Stationschef',
    assistant_manager: 'Bitr. Stationschef',
};
