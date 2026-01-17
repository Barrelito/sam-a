// =============================================
// Löneöversynsmodul - TypeScript Types
// =============================================

export type EmployeeCategory = 'VUB' | 'SSK' | 'AMB'
export type ReviewStatus = 'not_started' | 'in_progress' | 'completed'
export type CycleStatus = 'planning' | 'active' | 'completed'
export type CriteriaRating = 'behover_utvecklas' | 'bra' | 'mycket_bra' | 'utmarkt'

// =============================================
// Database Types
// =============================================

export interface SalaryReviewCycle {
    id: string
    year: number
    description?: string
    status: CycleStatus
    start_date?: string
    end_date?: string
    created_at: string
    created_by?: string
    updated_at: string
}

export interface Employee {
    id: string
    employee_number?: string
    first_name: string
    last_name: string
    email?: string
    category: EmployeeCategory
    station_id: string
    manager_id: string
    employment_date?: string
    current_salary?: number
    created_at: string
    updated_at: string
}

export interface SalaryReview {
    id: string
    cycle_id: string
    employee_id: string
    manager_id: string
    status: ReviewStatus
    is_particularly_skilled?: boolean
    proposed_salary?: number
    final_salary?: number
    meeting_date?: string
    meeting_notes?: string
    created_at: string
    updated_at: string
    completed_at?: string
}

export interface ParticularlySkillfulAssessment {
    id: string
    salary_review_id: string
    criterion_key: string
    is_met: boolean
    evidence?: string
    notes?: string
    created_at: string
    updated_at: string
}

export interface SalaryCriteriaAssessment {
    id: string
    salary_review_id: string
    criterion_key: string
    sub_criterion_key: string
    rating: CriteriaRating
    evidence: string
    notes?: string
    created_at: string
    updated_at: string
}

export interface SalaryMeetingPreparation {
    id: string
    salary_review_id: string
    previous_agreements?: string
    goals_achieved?: boolean
    contribution_summary?: string
    salary_statistics?: Record<string, any>
    development_needs?: string
    strengths_summary?: string
    ai_generated_summary?: string
    prepared_at: string
    updated_at: string
}

// =============================================
// Extended Types (with joins)
// =============================================

export interface EmployeeWithDetails extends Employee {
    station?: {
        id: string
        name: string
        vo_id: string
    }
    manager?: {
        id: string
        full_name: string
        email: string
    }
}

export interface SalaryReviewWithDetails extends SalaryReview {
    employee?: EmployeeWithDetails
    cycle?: SalaryReviewCycle
    particularly_skilled_assessments?: ParticularlySkillfulAssessment[]
    salary_criteria_assessments?: SalaryCriteriaAssessment[]
    meeting_preparation?: SalaryMeetingPreparation
}

// =============================================
// UI Helper Types
// =============================================

export interface ReviewProgress {
    employee_id: string
    employee_name: string
    category: EmployeeCategory
    status: ReviewStatus
    completion_percentage: number
    has_particularly_skilled_assessment: boolean
    criteria_assessments_count: number
    total_criteria_required: number
    meeting_scheduled: boolean
}

export interface CriterionDefinition {
    id: string
    text: string
    description?: string
    examples?: string[]
}

export interface CategoryDefinition {
    id: string
    category_number: number
    name: string
    description: string
    subcriteria: CriterionDefinition[]
}
