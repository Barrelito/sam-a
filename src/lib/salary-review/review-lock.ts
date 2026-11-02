// En stängd löneöversyn går att läsa men inte ändra. Routes som skriver till
// en lönesättning frågar här först. Databasen har samma spärr (trigger), så
// det här är för ett begripligt svar, inte det enda skyddet.

import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isOpenCycle } from './lonesattning'
import type { CycleStatus } from './types'

type Client = SupabaseClient<any, 'public', any>

/** Ett 409-svar om lönesättningen ligger i en stängd löneöversyn, annars null. */
export async function closedCycleResponse(
    supabase: Client,
    reviewId: string
): Promise<NextResponse | null> {
    const { data } = await supabase
        .from('salary_reviews')
        .select('id, cycle:salary_review_cycles(year, status)')
        .eq('id', reviewId)
        .maybeSingle()

    const cycle = (data as { cycle?: { year: number; status: CycleStatus } | null } | null)?.cycle
    if (!cycle || isOpenCycle(cycle)) return null

    return NextResponse.json(
        { error: `Löneöversyn ${cycle.year} är stängd och kan inte ändras` },
        { status: 409 }
    )
}
