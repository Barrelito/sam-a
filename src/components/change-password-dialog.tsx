"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, KeyRound } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface ChangePasswordDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    force?: boolean // If true, dialog cannot be closed without changing password
}

export function ChangePasswordDialog({ open, onOpenChange, force = false }: ChangePasswordDialogProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const supabase = createClient()
    const { user } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < 6) {
            setError("Lösenordet måste vara minst 6 tecken")
            return
        }

        if (password !== confirmPassword) {
            setError("Lösenorden matchar inte")
            return
        }

        setLoading(true)

        try {
            // Update password and remove temp_password flag
            const { error } = await supabase.auth.updateUser({
                password: password,
                data: { temp_password: false }
            })

            if (error) throw error

            setSuccess(true)

            // If not forced, close after a moment
            if (!force) {
                setTimeout(() => {
                    handleClose()
                }, 2000)
            } else {
                // Determine what to do after forced change - probably just close and let user continue
                setTimeout(() => {
                    handleClose()
                }, 1500)
            }

        } catch (err: any) {
            console.error('Password update error:', err)
            setError(err.message || 'Kunde inte uppdatera lösenordet')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        // If query processing or success state, allow close even if forced (to proceed)
        if (force && !success) return

        setPassword("")
        setConfirmPassword("")
        setError(null)
        setSuccess(false)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md" onInteractOutside={e => {
                if (force && !success) e.preventDefault()
            }}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-primary" />
                        {force ? 'Byt Lösenord (Krävs)' : 'Byt Lösenord'}
                    </DialogTitle>
                    <DialogDescription>
                        {force
                            ? 'Ditt konto har ett tillfälligt lösenord. Du måste välja ett nytt lösenord för att fortsätta.'
                            : 'Ange ditt nya lösenord nedan.'
                        }
                    </DialogDescription>
                </DialogHeader>

                {success ? (
                    <div className="py-6 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-4">
                            <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-emerald-900">Lösenord uppdaterat!</h3>
                        <p className="text-sm text-emerald-600 mt-1">Du kan nu logga in med ditt nya lösenord.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nytt lösenord</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Minst 6 tecken"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Bekräfta lösenord</label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="Upprepa lösenord"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            {!force && (
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    Avbryt
                                </Button>
                            )}
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Uppdatera Lösenord
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    )
}
