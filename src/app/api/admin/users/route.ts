import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Create admin client with service role
function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase admin credentials')
    }

    return createClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

// Generate random password
function generatePassword(length = 12) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}

// GET - List all users with profiles
export async function GET() {
    try {
        const supabase = createAdminClient()

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select(`
                *,
                verksamhetsomraden:vo_id (id, name),
                user_stations (
                    station:station_id (id, name, vo_id)
                )
            `)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ profiles })
    } catch (error: any) {
        console.error('GET users error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST - Create new user
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, full_name, role, vo_id, station_ids } = body

        if (!email || !full_name || !role) {
            return NextResponse.json(
                { error: 'Email, namn och roll krävs' },
                { status: 400 }
            )
        }

        const supabase = createAdminClient()

        // Generate temporary password
        const tempPassword = generatePassword()

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name,
                temp_password: true
            }
        })

        if (authError) {
            console.error('Auth create error:', authError)
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        const userId = authData.user.id

        // Update profile (trigger may have already created it)
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                email,
                full_name,
                role,
                vo_id: vo_id || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            })

        if (profileError) {
            console.error('Profile upsert error:', profileError)
            // Try to clean up auth user
            await supabase.auth.admin.deleteUser(userId)
            return NextResponse.json({ error: profileError.message }, { status: 400 })
        }

        // Create user-station assignments
        if (station_ids && station_ids.length > 0) {
            const stationAssignments = station_ids.map((stationId: string) => ({
                user_id: userId,
                station_id: stationId
            }))

            const { error: stationError } = await supabase
                .from('user_stations')
                .insert(stationAssignments)

            if (stationError) {
                console.error('Station assignment error:', stationError)
            }
        }

        return NextResponse.json({
            success: true,
            user_id: userId,
            temp_password: tempPassword,
            message: `Användare skapad. Temporärt lösenord: ${tempPassword}`
        })

    } catch (error: any) {
        console.error('POST user error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { user_id, full_name, role, vo_id, station_ids } = body

        if (!user_id) {
            return NextResponse.json({ error: 'user_id krävs' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Update profile
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name,
                role,
                vo_id: vo_id || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', user_id)

        if (profileError) {
            return NextResponse.json({ error: profileError.message }, { status: 400 })
        }

        // Update station assignments
        if (station_ids !== undefined) {
            // Remove old assignments
            await supabase
                .from('user_stations')
                .delete()
                .eq('user_id', user_id)

            // Add new assignments
            if (station_ids.length > 0) {
                const stationAssignments = station_ids.map((stationId: string) => ({
                    user_id,
                    station_id: stationId
                }))

                await supabase
                    .from('user_stations')
                    .insert(stationAssignments)
            }
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('PUT user error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('user_id')

        if (!userId) {
            return NextResponse.json({ error: 'user_id krävs' }, { status: 400 })
        }

        const supabase = createAdminClient()

        // Delete auth user (cascades to profile due to FK)
        const { error } = await supabase.auth.admin.deleteUser(userId)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 })
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('DELETE user error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
