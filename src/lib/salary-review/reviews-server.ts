// Hämtar en medarbetares lönesättning i en löneöversyn och skapar den om den
// saknas. I en stängd löneöversyn skapas inga nya lönesättningar.

import type { SupabaseClient } from '@supabase/supabase-js'
import {
    isOpenCycle,
    pickPreviousReview,
    toPreviousLonesattning,
    type AssessmentSnapshot,
    type PreviousLonesattning,
} from './lonesattning'
import type { SalaryReviewCycle } from './types'

type Client = SupabaseClient<any, 'public', any>

export async function getOrCreateReview(
    supabase: Client,
    cycle: SalaryReviewCycle,
    employeeId: string,
    userId: string,
    options: {
        /** Kolumner och relationer att hämta, t.ex. bedömningarna */
        select?: string
        /** Status för en nyskapad lönesättning */
        initialStatus?: 'not_started' | 'in_progress'
    } = {}
) {
    const { select = '*', initialStatus = 'not_started' } = options

    const { data: existing } = await supabase
        .from('salary_reviews')
        .select(select)
        .eq('employee_id', employeeId)
        .eq('cycle_id', cycle.id)
        .maybeSingle()

    if (existing || !isOpenCycle(cycle)) return (existing as any) ?? null

    const { data: created } = await supabase
        .from('salary_reviews')
        .insert({
            cycle_id: cycle.id,
            employee_id: employeeId,
            manager_id: userId,
            status: initialStatus,
        })
        .select(select)
        .single()

    return (created as any) ?? null
}

/**
 * Det bedömningsstegen jämför med: fjolårets lönesättning och bedömningen
 * när medarbetarsamtalet genomfördes (null om det inte är genomfört).
 */
export async function getAssessmentComparison(
    supabase: Client,
    employeeId: string,
    cycle: SalaryReviewCycle,
    reviewId: string
) {
    const [previous, meeting] = await Promise.all([
        getPreviousLonesattning(supabase, employeeId, cycle.year),
        getEmployeeMeeting(supabase, reviewId),
    ])
    const atEmployeeMeeting: AssessmentSnapshot | null =
        meeting?.completed_at ? meeting.assessment_snapshot : null
    return { previous, atEmployeeMeeting }
}

/** Medarbetarsamtalet i en lönesättning, eller null om det inte påbörjats. */
export async function getEmployeeMeeting(supabase: Client, reviewId: string) {
    const { data, error } = await supabase
        .from('salary_employee_meetings')
        .select('*')
        .eq('salary_review_id', reviewId)
        .maybeSingle()

    if (error) {
        console.error('Error fetching employee meeting:', error)
        return null
    }
    return data
}

/**
 * Medarbetarens föregående lönesättning, sammanställd för medarbetarsamtalet.
 * Åtkomst följer RLS: stationens chef ser tidigare lönesättningar även om en
 * annan chef gjorde dem.
 */
export async function getPreviousLonesattning(
    supabase: Client,
    employeeId: string,
    currentYear: number
): Promise<PreviousLonesattning | null> {
    const { data, error } = await supabase
        .from('salary_reviews')
        .select(`
            id,
            is_particularly_skilled,
            final_salary,
            final_increase,
            skilled_amount,
            meeting_notes,
            cycle:salary_review_cycles (year),
            salary_criteria_assessments (sub_criterion_key, rating),
            particularly_skilled_assessments (criterion_key, is_met),
            meeting_preparation:salary_meeting_preparations (development_needs)
        `)
        .eq('employee_id', employeeId)

    if (error) {
        console.error('Error fetching previous reviews:', error)
        return null
    }

    const previous = pickPreviousReview((data ?? []) as any[], currentYear)
    if (!previous) return null

    const meeting = await getEmployeeMeeting(supabase, previous.id)
    return toPreviousLonesattning(previous, meeting)
}
