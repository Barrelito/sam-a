// =============================================
// Core Types
// =============================================

export type TaskStatus = 'not_started' | 'in_progress' | 'done' | 'reported';
export type TaskCategory = 'HR' | 'Finance' | 'Safety' | 'Operations';
export type UserRole = 'admin' | 'vo_chief' | 'station_manager' | 'assistant_manager';
export type TaskOwnerType = 'vo' | 'station' | 'personal';
export type ReportPeriodType = 'month' | 'tertial';

// =============================================
// Organization Types
// =============================================

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

// =============================================
// Task Types (New Dynamic System)
// =============================================

export interface Task {
    id: string;
    title: string;
    description: string | null;
    category: TaskCategory;

    // Ownership
    owner_type: TaskOwnerType;
    vo_id: string | null;
    station_id: string | null;
    created_by: string;

    // Relationships (populated)
    verksamhetsomraden?: Verksamhetsomrade | null;
    station?: Station | null;
    created_by_profile?: Profile;
    assigned_to_profile?: Profile;

    // Time period
    year: number;
    start_month: number | null;
    end_month: number | null;
    is_recurring_monthly: boolean;
    deadline_day: number;

    // Status
    status: TaskStatus;
    assigned_to: string | null;

    // Completion
    completed_at: string | null;
    completed_by: string | null;
    notes: string | null;

    // VO Review
    vo_reviewed: boolean;
    vo_reviewed_at: string | null;
    vo_reviewed_by: string | null;
    vo_comment: string | null;

    // Metadata
    created_at: string;
    updated_at: string;

    // Distribution (for VO tasks distributed to stations)
    parent_task_id?: string | null;

    // Related data (populated separately)
    comments?: TaskComment[];
    attachments?: TaskAttachment[];
    comments_count?: number;
    attachments_count?: number;

    // Annual Cycle Integration
    is_annual_cycle?: boolean;
    action_link?: string | null;
    annual_cycle_item_id?: string | null;
}

export interface TaskComment {
    id: string;
    task_id: string;
    user_id: string;
    user?: Profile;
    content: string;
    created_at: string;
}

export interface TaskAttachment {
    id: string;
    task_id: string;
    filename: string;
    file_path: string;
    file_size: number | null;
    content_type: string | null;
    uploaded_by: string;
    uploaded_by_profile?: Profile;
    created_at: string;
}

// =============================================
// Report Types
// =============================================

export interface VOReport {
    id: string;
    vo_id: string;
    verksamhetsomraden?: Verksamhetsomrade;
    year: number;
    period_type: ReportPeriodType;
    period_value: number; // 1-12 for month, 1-3 for tertial
    status: 'draft' | 'submitted';
    summary: string | null;
    created_by: string;
    created_by_profile?: Profile;
    submitted_at: string | null;
    created_at: string;
    updated_at: string;
}

// =============================================
// Legacy Types (for backward compatibility)
// =============================================

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

// =============================================
// Helper Constants
// =============================================

export const roleLabels: Record<UserRole, string> = {
    admin: 'Administratör',
    vo_chief: 'VO Chef',
    station_manager: 'Stationschef',
    assistant_manager: 'Bitr. Stationschef',
};

export const categoryLabels: Record<TaskCategory, string> = {
    HR: 'Personal',
    Finance: 'Ekonomi',
    Safety: 'Arbetsmiljö',
    Operations: 'Drift',
};

export const categoryColors: Record<TaskCategory, string> = {
    HR: 'bg-blue-100 text-blue-700 border-blue-200',
    Finance: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Safety: 'bg-amber-100 text-amber-700 border-amber-200',
    Operations: 'bg-purple-100 text-purple-700 border-purple-200',
};

export const statusLabels: Record<TaskStatus, string> = {
    not_started: 'Ej påbörjad',
    in_progress: 'Pågående',
    done: 'Klar',
    reported: 'Rapporterad',
};

export const statusColors: Record<TaskStatus, string> = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    done: 'bg-green-100 text-green-700',
    reported: 'bg-blue-100 text-blue-700',
};

export const ownerTypeLabels: Record<TaskOwnerType, string> = {
    vo: 'VO-uppgift',
    station: 'Stationsuppgift',
    personal: 'Personlig',
};

// =============================================
// Helper Functions
// =============================================

export function getMonthsForTask(task: Task): number[] {
    if (task.is_recurring_monthly) {
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
    if (task.start_month && task.end_month) {
        const months: number[] = [];
        for (let m = task.start_month; m <= task.end_month; m++) {
            months.push(m);
        }
        return months;
    }
    if (task.start_month) {
        return [task.start_month];
    }
    return [];
}

export function isTaskActiveInMonth(task: Task, month: number): boolean {
    if (task.is_recurring_monthly) return true;
    if (!task.start_month) return false;
    const end = task.end_month || task.start_month;
    return month >= task.start_month && month <= end;
}

export function getTaskDeadline(task: Task, month: number): Date {
    const year = task.year;
    const day = Math.min(task.deadline_day, new Date(year, month, 0).getDate());
    return new Date(year, month - 1, day);
}
