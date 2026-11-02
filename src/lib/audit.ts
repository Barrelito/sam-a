// Granskningslogg. Loggningen är "best effort": ett misslyckat loggförsök
// ska inte få själva åtgärden att misslyckas.

import type { SupabaseClient } from '@supabase/supabase-js'

export type AuditEntry = {
    user_id: string
    action: string
    resource_id: string
    resource_type: string
    details?: Record<string, unknown>
}

export async function logAudit(supabase: SupabaseClient<any, 'public', any>, entry: AuditEntry): Promise<void> {
    try {
        await supabase.from('audit_logs').insert(entry)
    } catch (e) {
        console.warn('Audit log failed', e)
    }
}
