"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { MFAEnrollmentDialog } from "@/components/mfa-enrollment-dialog"
import { useAuth } from "@/lib/auth-context"

/**
 * RequireMFAGuard
 * This component checks if the logged-in user has MFA enabled.
 * If not, it forces them to enroll before they can use the system.
 */
export function RequireMFAGuard({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth()
    const [mfaEnrolled, setMfaEnrolled] = useState<boolean | null>(null)
    const [checkingMFA, setCheckingMFA] = useState(true)
    const [forceEnrollOpen, setForceEnrollOpen] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        checkMFAStatus()
    }, [user])

    const checkMFAStatus = async () => {
        if (!user) {
            setCheckingMFA(false)
            return
        }

        try {
            const { data, error } = await supabase.auth.mfa.listFactors()

            if (error) {
                console.error('Error checking MFA status:', error)
                setCheckingMFA(false)
                return
            }

            const hasActiveFactor = data.totp.some(factor => factor.status === 'verified')
            setMfaEnrolled(hasActiveFactor)

            // If user does NOT have MFA, force enrollment
            if (!hasActiveFactor) {
                setForceEnrollOpen(true)
            }
        } catch (err) {
            console.error('Unexpected error checking MFA:', err)
        } finally {
            setCheckingMFA(false)
        }
    }

    const handleEnrollmentSuccess = () => {
        setMfaEnrolled(true)
        setForceEnrollOpen(false)
    }

    // Show loading state
    if (authLoading || checkingMFA) {
        return null // or a loading spinner
    }

    // User not logged in - show children (login page)
    if (!user) {
        return <>{children}</>
    }

    // User has MFA enrolled - show app
    if (mfaEnrolled) {
        return <>{children}</>
    }

    // User needs to enroll in MFA - show blocking dialog
    return (
        <>
            {children}
            <MFAEnrollmentDialog
                open={forceEnrollOpen}
                onOpenChange={() => { }} // Prevent closing - it's mandatory!
                onSuccess={handleEnrollmentSuccess}
                mandatory={true}
            />
        </>
    )
}
