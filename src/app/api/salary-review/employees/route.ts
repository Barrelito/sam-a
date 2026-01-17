// API Route: GET /api/salary-review/employees
// Hämtar medarbetare för inloggad chef

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

        // Hämta medarbetare (RLS hanterar behörigheter)
        // Station managers ser sina egna, VO chiefs ser alla i sina VO
        const { data: employees, error } = await supabase
            .from('employees')
            .select(`
        *,
        station:stations (
          id,
          name,
          vo_id
        ),
        manager:profiles!employees_manager_id_fkey (
          id,
          full_name,
          email
        )
      `)
            .order('last_name', { ascending: true })

        if (error) {
            console.error('Error fetching employees:', error)
            return NextResponse.json(
                { error: 'Failed to fetch employees' },
                { status: 500 }
            )
        }

        return NextResponse.json({ employees })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// API Route: POST /api/salary-review/employees
// Registrerar ny medarbetare

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

        const body = await request.json()
        const {
            employee_number,
            first_name,
            last_name,
            email,
            category,
            station_id,
            employment_date,
            current_salary
        } = body

        // Validera required fields
        if (!first_name || !last_name || !category || !station_id) {
            return NextResponse.json(
                { error: 'Missing required fields: first_name, last_name, category, station_id' },
                { status: 400 }
            )
        }

        // Validera kategori
        if (!['VUB', 'SSK', 'AMB'].includes(category)) {
            return NextResponse.json(
                { error: 'Invalid category. Must be VUB, SSK, or AMB' },
                { status: 400 }
            )
        }

        // Verifiera att användaren har tillgång till stationen
        const { data: userStation } = await supabase
            .from('user_stations')
            .select('station_id')
            .eq('user_id', user.id)
            .eq('station_id', station_id)
            .single()

        if (!userStation) {
            return NextResponse.json(
                { error: 'You do not have access to this station' },
                { status: 403 }
            )
        }

        // Skapa medarbetare
        const { data: employee, error } = await supabase
            .from('employees')
            .insert({
                employee_number,
                first_name,
                last_name,
                email,
                category,
                station_id,
                manager_id: user.id,
                employment_date,
                current_salary
            })
            .select(`
        *,
        station:stations (
          id,
          name,
          vo_id
        )
      `)
            .single()

        if (error) {
            console.error('Error creating employee:', error)
            return NextResponse.json(
                { error: 'Failed to create employee' },
                { status: 500 }
            )
        }

        return NextResponse.json({ employee }, { status: 201 })
    } catch (error) {
        console.error('Unexpected error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
