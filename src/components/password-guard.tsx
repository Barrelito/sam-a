"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { ChangePasswordDialog } from "@/components/change-password-dialog"

export function PasswordGuard() {
    const { user, loading } = useAuth()
    const [showForceDialog, setShowForceDialog] = useState(false)

    useEffect(() => {
        if (!loading && user) {
            // Check if user has temp_password flag
            const isTempPassword = user.user_metadata?.temp_password === true
            if (isTempPassword) {
                setShowForceDialog(true)
            } else {
                setShowForceDialog(false)
            }
        }
    }, [user, loading])

    if (!showForceDialog) return null

    return (
        <ChangePasswordDialog
            open={showForceDialog}
            onOpenChange={setShowForceDialog}
            force={true}
        />
    )
}
