"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react"
import QRCode from "qrcode"

interface MFAEnrollmentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

export function MFAEnrollmentDialog({ open, onOpenChange, onSuccess }: MFAEnrollmentDialogProps) {
    const [step, setStep] = useState<'init' | 'qr' | 'success'>('init')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const [factorId, setFactorId] = useState<string | null>(null)
    const [verifyCode, setVerifyCode] = useState("")

    const supabase = createClient()

    // Reset state when dialog opens
    useEffect(() => {
        if (open) {
            setStep('init')
            setError(null)
            setVerifyCode("")
            setLoading(false)
        }
    }, [open])

    const startEnrollment = async () => {
        setLoading(true)
        setError(null)
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
            })

            if (error) throw error

            setFactorId(data.id)

            // Generate QR Code
            const url = await QRCode.toDataURL(data.totp.uri)
            setQrCodeUrl(url)
            setStep('qr')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const verifyAndActivate = async () => {
        if (!factorId) return

        setLoading(true)
        setError(null)
        try {
            // Create a challenge
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId
            })

            if (challengeError) throw challengeError

            // Verify the challenge
            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challengeData.id,
                code: verifyCode
            })

            if (verifyError) throw verifyError

            setStep('success')
            if (onSuccess) onSuccess()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Tvåfaktorsautentisering (MFA)
                    </DialogTitle>
                    <DialogDescription>
                        Öka säkerheten på ditt konto genom att kräva en kod vid inloggning.
                    </DialogDescription>
                </DialogHeader>

                {step === 'init' && (
                    <div className="py-6 space-y-4">
                        <p className="text-sm text-muted-foreground">
                            När du aktiverar MFA måste du använda en app som <strong>Microsoft Authenticator</strong> eller <strong>Google Authenticator</strong> varje gång du loggar in.
                        </p>
                        <Button onClick={startEnrollment} className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Starta Aktivering
                        </Button>
                    </div>
                )}

                {step === 'qr' && (
                    <div className="py-4 space-y-6">
                        <div className="flex flex-col items-center justify-center space-y-2">
                            <Label className="text-center">1. Skanna QR-koden i din app</Label>
                            {qrCodeUrl ? (
                                <div className="border p-2 rounded-lg inline-block bg-white">
                                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                                </div>
                            ) : (
                                <div className="w-48 h-48 bg-muted flex items-center justify-center rounded-lg">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="code">2. Ange koden från appen</Label>
                            <Input
                                id="code"
                                placeholder="123456"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="text-center text-lg tracking-widest"
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}
                    </div>
                )}

                {step === 'success' && (
                    <div className="py-6 flex flex-col items-center text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">MFA Aktiverat!</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Ditt konto är nu skyddat. Du kommer behöva ange en kod nästa gång du loggar in.
                            </p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 'qr' && (
                        <div className="flex w-full gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setStep('init')}>Avbryt</Button>
                            <Button className="flex-1" onClick={verifyAndActivate} disabled={verifyCode.length !== 6 || loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verifiera
                            </Button>
                        </div>
                    )}
                    {(step === 'init' || step === 'success') && (
                        <Button variant="outline" onClick={handleClose} className="w-full">
                            Stäng
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
