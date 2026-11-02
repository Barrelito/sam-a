// Hämtar en medarbetares lönesättning i en löneöversyn och skapar den om den
// saknas. I en stängd löneöversyn skapas inga nya lönesättningar.

import type { SupabaseClient } from '@supabase/supabase-js'
import { isOpenCycle } from './lonesattning'
import type { SalaryReviewCycle } from './types'

type Client = SupabaseClient<any, 'public', any>

export async function getOrCreateReview(
    supabase: Client,
    cycle: SalaryReviewCycle,
    employeeId: string,
    userId: string
) {
    const { data: existing } = await supabase
        .from('salary_reviews')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('cycle_id', cycle.id)
        .maybeSingle()

    if (existing || !isOpenCycle(cycle)) return existing ?? null

    const { data: created } = await supabase
        .from('salary_reviews')
        .insert({
            cycle_id: cycle.id,
            employee_id: employeeId,
            manager_id: userId,
            status: 'not_started',
        })
        .select()
        .single()

    return created ?? null
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
