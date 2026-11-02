// API Route: GET /api/salary-review/select-year?year=2027&next=/salary-review/employees
// Sparar chefens valda år i löneöversynen och går tillbaka till sidan.
// Flera löneöversyner kan vara öppna samtidigt (ADR 0004); valet gäller
// alla sidor i löneöversynen tills chefen byter.
//
// year=next används av årshjulets medarbetarsamtal: höstens samtal inleder
// nästa års löneöversyn. Finns den inte än går chefen till översikten, där
// den kan startas.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SELECTED_YEAR_COOKIE } from '@/lib/salary-review/cycles-server'
import { nextCycleYear, parseYear } from '@/lib/salary-review/lonesattning'

const HOME = '/salary-review'

/** Bara sidor inom löneöversynen, så att länken inte kan skicka vidare någon annanstans. */
function safeNext(next: string | null): string {
    if (!next) return HOME
    if (next === HOME || next.startsWith(`${HOME}/`) || next.startsWith(`${HOME}?`)) return next
    return HOME
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)

    if (searchParams.get('year') === 'next') {
        const year = nextCycleYear(new Date())
        const supabase = await createClient()
        const { data: cycle } = await supabase
            .from('salary_review_cycles')
            .select('id')
            .eq('year', year)
            .maybeSingle()

        if (!cycle) return NextResponse.redirect(new URL(HOME, request.url))
        return withSelectedYear(
            NextResponse.redirect(new URL(safeNext(searchParams.get('next')), request.url)),
            year
        )
    }

    const year = parseYear(searchParams.get('year'))
    return withSelectedYear(
        NextResponse.redirect(new URL(safeNext(searchParams.get('next')), request.url)),
        year
    )
}

function withSelectedYear(response: NextResponse, year: number | null): NextResponse {
    if (year === null) {
        response.cookies.delete(SELECTED_YEAR_COOKIE)
    } else {
        response.cookies.set(SELECTED_YEAR_COOKIE, String(year), {
            path: '/',
            sameSite: 'lax',
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 365,
        })
    }
    return response
}
