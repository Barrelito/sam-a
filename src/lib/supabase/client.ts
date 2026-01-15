import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        console.warn('Supabase credentials not configured')
        // Return dummy client for type safety, but it won't work
        return null as unknown as ReturnType<typeof createBrowserClient>
    }

    return createBrowserClient(url, key)
}


