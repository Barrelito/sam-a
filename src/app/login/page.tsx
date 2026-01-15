"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Ambulance, Mail, Lock, Loader2, AlertCircle } from "lucide-react"

type AuthMode = 'login' | 'signup' | 'reset'

export default function LoginPage() {
    const [mode, setMode] = useState<AuthMode>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        // Redirect will happen via middleware
        window.location.href = '/'
    }

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        setMessage('Kolla din e-post för att bekräfta ditt konto!')
        setLoading(false)
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        setMessage('Kolla din e-post för att återställa ditt lösenord!')
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                        <Ambulance className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">
                        {mode === 'login' && 'Logga in'}
                        {mode === 'signup' && 'Skapa konto'}
                        {mode === 'reset' && 'Återställ lösenord'}
                    </CardTitle>
                    <CardDescription>
                        {mode === 'login' && 'Ambulansledning - Station Manager Portal'}
                        {mode === 'signup' && 'Registrera dig för att komma igång'}
                        {mode === 'reset' && 'Ange din e-post för att få en återställningslänk'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {message && (
                        <div className="mb-4 p-3 rounded-lg bg-emerald-100 text-emerald-700 flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span className="text-sm">{message}</span>
                        </div>
                    )}

                    <form onSubmit={
                        mode === 'login' ? handleLogin :
                            mode === 'signup' ? handleSignup :
                                handleResetPassword
                    }>
                        <div className="space-y-4">
                            {mode === 'signup' && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                        Fullständigt namn
                                    </label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Anders Andersson"
                                        required
                                        className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                    E-post
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="din@email.se"
                                        required
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                            </div>

                            {mode !== 'reset' && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                                        Lösenord
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {mode === 'login' && 'Logga in'}
                                {mode === 'signup' && 'Skapa konto'}
                                {mode === 'reset' && 'Skicka återställningslänk'}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        {mode === 'login' && (
                            <>
                                <button
                                    onClick={() => { setMode('reset'); setError(null); setMessage(null) }}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    Glömt lösenord?
                                </button>
                                <div className="mt-2">
                                    <span className="text-muted-foreground">Inget konto? </span>
                                    <button
                                        onClick={() => { setMode('signup'); setError(null); setMessage(null) }}
                                        className="text-primary hover:underline font-medium"
                                    >
                                        Registrera dig
                                    </button>
                                </div>
                            </>
                        )}
                        {mode === 'signup' && (
                            <div>
                                <span className="text-muted-foreground">Har du redan ett konto? </span>
                                <button
                                    onClick={() => { setMode('login'); setError(null); setMessage(null) }}
                                    className="text-primary hover:underline font-medium"
                                >
                                    Logga in
                                </button>
                            </div>
                        )}
                        {mode === 'reset' && (
                            <button
                                onClick={() => { setMode('login'); setError(null); setMessage(null) }}
                                className="text-primary hover:underline font-medium"
                            >
                                Tillbaka till inloggning
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
