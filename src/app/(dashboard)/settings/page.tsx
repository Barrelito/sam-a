"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Settings, User, LogOut, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { roleLabels } from "@/lib/types"
import { ChangePasswordDialog } from "@/components/change-password-dialog"

export default function SettingsPage() {
    const { profile, user, loading, signOut } = useAuth()
    const [changePasswordOpen, setChangePasswordOpen] = useState(false)

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                    <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inställningar</h1>
                    <p className="text-muted-foreground mt-1">
                        Hantera ditt konto och preferenser
                    </p>
                </div>
            </div>

            {/* Profile Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Min Profil
                    </CardTitle>
                    <CardDescription>Din kontoinformation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Laddar profil...
                        </div>
                    ) : profile ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Namn</label>
                                <p className="text-lg">{profile.full_name || '-'}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">E-post</label>
                                <p className="text-lg">{profile.email}</p>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Roll</label>
                                <div className="mt-1">
                                    <Badge variant="secondary">{roleLabels[profile.role]}</Badge>
                                </div>
                            </div>
                        </div>
                    ) : user ? (
                        <div className="text-muted-foreground">
                            <p>Inloggad som: {user.email}</p>
                            <p className="text-sm mt-1">Profil kunde inte laddas.</p>
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Ingen användare inloggad</p>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Säkerhet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2"
                        onClick={() => setChangePasswordOpen(true)}
                    >
                        <Settings className="h-4 w-4" />
                        Byt Lösenord
                    </Button>
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                        onClick={signOut}
                    >
                        <LogOut className="h-4 w-4" />
                        Logga Ut
                    </Button>
                </CardContent>
            </Card>

            {/* Debug Info */}
            <Card className="bg-muted/50">
                <CardHeader>
                    <CardTitle className="text-sm">Debug Info</CardTitle>
                </CardHeader>
                <CardContent className="text-xs font-mono space-y-1">
                    <p>Loading: {loading ? 'true' : 'false'}</p>
                    <p>User: {user ? user.email : 'null'}</p>
                    <p>Profile: {profile ? profile.email : 'null'}</p>
                    <p>Role: {profile?.role || 'unknown'}</p>
                    <p>Temp Pass: {user?.user_metadata?.temp_password ? 'Yes' : 'No'}</p>
                </CardContent>
            </Card>

            <ChangePasswordDialog
                open={changePasswordOpen}
                onOpenChange={setChangePasswordOpen}
            />
        </div>
    )
}

