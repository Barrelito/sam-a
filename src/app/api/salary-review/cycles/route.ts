// API Route: GET /api/salary-review/cycles
// Hämtar alla löneöversynscykler

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()

        // Verifiera att användaren är autentiserad
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Hämta alla cykler (RLS hanterar behörigheter)
        const { data: cycles, error } = await supabase
            .from('salary_review_cycles')
            .select('*')
            .order('year', { ascending: false })

        if (error) {
            console.error('Error fetching cycles:', error)
            return NextResponse.json(
                { error: 'Failed to fetch cycles' },
                { status: 500 }
            )
        }

        return NextResponse.json({ cycles })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// API Route: POST /api/salary-review/cycles
// Skapar en ny löneöversynscykel

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        // Verifiera att användaren är autentiserad
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Kontrollera att användaren har rätt roll (admin eller vo_chief)
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'vo_chief'].includes(profile.role)) {
            return NextResponse.json(
                { error: 'Forbidden: Only admins and VO chiefs can create cycles' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { year, description, status, start_date, end_date } = body

        // Validera required fields
        if (!year) {
            return NextResponse.json(
                { error: 'Year is required' },
                { status: 400 }
            )
        }

        // Skapa cykel
        const { data: cycle, error } = await supabase
            .from('salary_review_cycles')
            .insert({
                year,
                description,
                status: status || 'planning',
                start_date,
                end_date,
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating cycle:', error)
            return NextResponse.json(
                { error: 'Failed to create cycle' },
                { status: 500 }
            )
        }

        return NextResponse.json({ cycle }, { status: 201 })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
