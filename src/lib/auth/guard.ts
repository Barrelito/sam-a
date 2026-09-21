import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/types'

export type RoleGuardResult =
    | { ok: true; userId: string; role: UserRole }
    | { ok: false; response: NextResponse }

/**
 * Establish who is calling and whether their role is allowed here.
 *
 * Call this before anything else in a route — in particular before creating a
 * service-role client, which bypasses row level security and so cannot be
 * relied on to deny anything by itself.
 */
export async function requireRole(
    allowed: readonly UserRole[]
): Promise<RoleGuardResult> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        }
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role as UserRole | undefined
    if (!role || !allowed.includes(role)) {
        return {
            ok: false,
            response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        }
    }

    return { ok: true, userId: user.id, role }
}
