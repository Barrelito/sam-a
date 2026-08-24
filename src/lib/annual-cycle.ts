import { TaskCategory, TaskStatus } from './types'

// Length of a UUID string (8-4-4-4-12)
const UUID_LENGTH = 36

/**
 * annual_cycle_items use lowercase categories ('hr', 'finance', 'environment', 'other')
 * while tasks/UI use TaskCategory ('HR', 'Finance', 'Safety', 'Operations').
 * Normalize at the API boundary so virtual tasks behave like regular tasks.
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
 * Inverse of mapAnnualCategory: which annual_cycle_items.category values
 * correspond to a TaskCategory filter.
 */
export function annualCategoryFilterValues(category: string): string[] {
    switch (category) {
        case 'HR':
            return ['hr']
        case 'Finance':
            return ['finance']
        case 'Safety':
            return ['environment', 'safety']
        case 'Operations':
            return ['operations', 'other']
        default:
            // Already a template-level value (e.g. 'hr') — filter on it directly
            return [category]
    }
}

/**
 * Virtual annual cycle tasks use composite ids:
 *   'annual-{itemUUID}'                → no station context
 *   'annual-{itemUUID}-{stationUUID}'  → bound to a specific station
 */
export function isVirtualAnnualId(id: string): boolean {
    return id.startsWith('annual-')
}

export function buildVirtualAnnualId(itemId: string, stationId?: string | null): string {
    return stationId ? `annual-${itemId}-${stationId}` : `annual-${itemId}`
}

export function parseVirtualAnnualId(id: string): { itemId: string; stationId: string | null } {
    const withoutPrefix = id.startsWith('annual-') ? id.slice('annual-'.length) : id

    if (withoutPrefix.length === UUID_LENGTH * 2 + 1) {
        return {
            itemId: withoutPrefix.slice(0, UUID_LENGTH),
            stationId: withoutPrefix.slice(UUID_LENGTH + 1),
        }
    }
    return { itemId: withoutPrefix, stationId: null }
}

/**
 * Map a TaskStatus to the status vocabulary used by annual_task_completions.
 */
export function toCompletionStatus(status: TaskStatus): 'completed' | 'in_progress' | 'todo' {
    if (status === 'done' || status === 'reported') return 'completed'
    if (status === 'in_progress') return 'in_progress'
    return 'todo'
}

/**
 * Map a completion status back to a TaskStatus.
 */
export function fromCompletionStatus(status: string | null | undefined): TaskStatus {
    if (status === 'completed') return 'done'
    if (status === 'in_progress') return 'in_progress'
    return 'not_started'
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
