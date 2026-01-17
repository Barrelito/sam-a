// VO Budget Management Page
// Där VO-chefer sätter total budget och fördelar till stationer

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import VoBudgetClient from '@/components/salary-review/VoBudgetClient'

export default async function VoBudgetPage() {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check user role - must be VO chief
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'vo_chief') {
        return (
            <div className="container mx-auto py-8">
                <h1 className="text-2xl font-bold text-red-600">Åtkomst nekad</h1>
                <p className="text-muted-foreground mt-2">
                    Endast VO-chefer har tillgång till budgethantering.
                </p>
            </div>
        )
    }

    // Get user's VO from profile
    const { data: userProfile } = await supabase
        .from('profiles')
        .select(`
            vo_id,
            vo:verksamhetsomraden(id, name)
        `)
        .eq('id', user.id)
        .single()

    if (!userProfile || !userProfile.vo_id) {
        notFound()
    }

    // Get active cycle
    const { data: activeCycle } = await supabase
        .from('salary_review_cycles')
        .select('*')
        .eq('status', 'active')
        .single()

    if (!activeCycle) {
        return (
            <div className="container mx-auto py-8">
                <h1 className="text-2xl font-bold">Ingen aktiv cykel</h1>
                <p className="text-muted-foreground mt-2">
                    Det finns ingen aktiv löneöversynscykel för tillfället.
                </p>
            </div>
        )
    }

    // Get all stations in VO
    const { data: stations } = await supabase
        .from('stations')
        .select('id, name')
        .eq('vo_id', userProfile.vo_id)
        .order('name')

    return (
        <VoBudgetClient
            vo={userProfile.vo as any}
            cycle={activeCycle}
            stations={stations || []}
        />
    )
}
