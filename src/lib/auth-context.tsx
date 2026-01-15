"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Profile } from '@/lib/types'

interface AuthContextType {
    user: User | null
    profile: Profile | null
    loading: boolean
    signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true

        async function init() {
            try {
                const supabase = createClient()
                console.log('Supabase client created:', !!supabase)

                // Get user
                const { data: { user } } = await supabase.auth.getUser()
                console.log('Got user:', user?.email)

                if (!mounted) return
                setUser(user)

                // Get profile if user exists
                if (user) {
                    console.log('Fetching profile for:', user.id)
                    const { data, error } = await supabase
                        .from('profiles')
                        .select(`
                            *,
                            verksamhetsomraden:vo_id (id, name),
                            user_stations (
                                station:station_id (id, name, vo_id)
                            )
                        `)
                        .eq('id', user.id)
                        .single()

                    console.log('Profile result:', data, error)
                    if (!mounted) return
                    if (data) setProfile(data)
                }
            } catch (err) {
                console.error('Auth init error:', err)
            } finally {
                if (mounted) setLoading(false)
            }
        }

        init()
        return () => { mounted = false }
    }, [])

    const signOut = () => {
        const supabase = createClient()
        supabase.auth.signOut().then(() => {
            window.location.href = '/login'
        })
    }

    return (
        <AuthContext.Provider value={{ user, profile, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
