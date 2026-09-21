import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type RoleGuardResult =
    | { ok: true; userId: string; role: UserRole; supabase: SupabaseClient }
    | { ok: false; response: NextResponse }

/**
 * Establish who is calling and whether their role is allowed here.
 *
 * Call this before anything else in a route — in particular before creating a
 * service-role client, which bypasses row level security and so cannot be
 * relied on to deny anything by itself.
 *
 * Every outcome denies access, but they are told apart on purpose: a role that
 * is genuinely not allowed is a 403, while a role we failed to look up is a 500.
 * Reporting the second as the first would hide an outage behind a plausible
 * refusal.
 */
export async function requireRole(
    allowed: readonly UserRole[]
): Promise<RoleGuardResult> {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        }
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profileError) {
        console.error('Role lookup failed:', profileError)
        return {
            ok: false,
            response: NextResponse.json(
                { error: 'Could not establish role' },
                { status: 500 }
            ),
        }
    }

    const role = profile?.role as UserRole | undefined
    if (!role || !allowed.includes(role)) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        }
    }

    return { ok: true, userId: user.id, role, supabase }
}
