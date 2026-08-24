import { TaskCategory, TaskStatus } from './types'

/**
 * annual_cycle_items use lowercase categories ('hr', 'finance', 'environment', 'other')
 * while tasks/UI use TaskCategory ('HR', 'Finance', 'Safety', 'Operations').
 * Normalize when materializing tasks from templates or rendering template data.
 */
export function mapAnnualCategory(category: string | null | undefined): TaskCategory {
    switch ((category || '').toLowerCase()) {
        case 'hr':
            return 'HR'
        case 'finance':
            return 'Finance'
        case 'environment':
        case 'safety':
            return 'Safety'
        default:
            // 'operations', 'other' and anything unknown
            return 'Operations'
    }
}

/**
 * Normalize status values accepted by the tasks API to the tasks table vocabulary
 * ('not_started' | 'in_progress' | 'done' | 'reported'). Accepts the legacy
 * completion vocabulary ('todo', 'completed') as well. Returns null for unknown values.
 */
export function normalizeTaskStatus(status: string | null | undefined): TaskStatus | null {
    switch (status) {
        case 'not_started':
        case 'todo':
            return 'not_started'
        case 'in_progress':
            return 'in_progress'
        case 'done':
        case 'completed':
            return 'done'
        case 'reported':
            return 'reported'
        default:
            return null
    }
}
