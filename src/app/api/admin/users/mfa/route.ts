import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminSupabaseClient } from '@supabase/supabase-js'

// Create admin client with service role
function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase admin credentials')
    }

    return createAdminSupabaseClient(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}

// DELETE - Reset MFA for a specific user
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'userId krävs' }, { status: 400 })
        }

        const supabase = await createClient()

        // Check authentication and authorization (must be admin or vo_chief)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || !['admin', 'vo_chief'].includes(profile.role)) {
            return NextResponse.json({ error: 'Du har inte behörighet att återställa MFA' }, { status: 403 })
        }

        const adminAuthClient = createAdminClient()

        // Get all factors for the user
        const { data, error: factorsError } = await adminAuthClient.auth.admin.mfa.listFactors({
            userId: userId
        })

        if (factorsError) {
            console.error('Error fetching factors:', factorsError)
            return NextResponse.json({ error: 'Kunde inte hämta MFA-faktorer' }, { status: 500 })
        }

        const factors = data?.factors || []

        // Delete all factors
        for (const factor of factors) {
            if (factor.factor_type === 'totp') {
                const { error: unenrollError } = await adminAuthClient.auth.admin.mfa.deleteFactor({
                    id: factor.id,
                    userId: userId
                })

                if (unenrollError) {
                    console.error(`Error deleting factor ${factor.id}:`, unenrollError)
                    return NextResponse.json({ error: `Kunde inte ta bort faktor ${factor.id}` }, { status: 500 })
                }
            }
        }

        return NextResponse.json({ success: true, message: 'MFA har återställts för användaren' })

    } catch (error: any) {
        console.error('DELETE admin user mfa error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
