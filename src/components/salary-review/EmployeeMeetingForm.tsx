'use client'

// Medarbetarsamtalet: lönesättningens första samtal (se CONTEXT.md).
// Chefen dokumenterar samtalet här; bedömningen görs i de vanliga
// bedömningsstegen och sparas som den är när samtalet markeras genomfört.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, RotateCcw, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

export interface EmployeeMeetingData {
    held_on: string | null
    agreements: string | null
    development_needs: string | null
    notes: string | null
    completed_at: string | null
}

interface EmployeeMeetingFormProps {
    reviewId: string
    initialData: EmployeeMeetingData | null
}

export default function EmployeeMeetingForm({ reviewId, initialData }: EmployeeMeetingFormProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [saving, setSaving] = useState<null | 'save' | 'complete' | 'reopen'>(null)
    const [form, setForm] = useState({
        held_on: initialData?.held_on ?? '',
        agreements: initialData?.agreements ?? '',
        development_needs: initialData?.development_needs ?? '',
        notes: initialData?.notes ?? '',
    })
    const completedAt = initialData?.completed_at ?? null

    const set = (field: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm(prev => ({ ...prev, [field]: e.target.value }))

    const submit = async (action: 'save' | 'complete' | 'reopen') => {
        if (action === 'complete' && !form.held_on) {
            toast({ title: 'Datum saknas', description: 'Ange när samtalet hölls innan du markerar det genomfört.', variant: 'destructive' })
            return
        }
        setSaving(action)
        try {
            const body: Record<string, unknown> = { ...form }
            if (action === 'complete') body.completed = true
            if (action === 'reopen') body.completed = false

            const response = await fetch(`/api/salary-review/reviews/${reviewId}/employee-meeting`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data.error || 'Kunde inte spara medarbetarsamtalet')
            }

            toast({
                title: action === 'complete' ? 'Medarbetarsamtalet är genomfört' : action === 'reopen' ? 'Medarbetarsamtalet är öppnat igen' : 'Sparat',
                description: action === 'complete' ? 'Bedömningen är sparad som den var vid samtalet.' : undefined,
            })
            router.refresh()
        } catch (error) {
            toast({
                title: 'Fel',
                description: error instanceof Error ? error.message : 'Kunde inte spara medarbetarsamtalet',
                variant: 'destructive',
            })
        } finally {
            setSaving(null)
        }
    }

    return (
        <div className="space-y-6">
            {completedAt && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Genomfört {new Date(completedAt).toLocaleDateString('sv-SE')}
                </Badge>
            )}

            <div className="space-y-2">
                <Label htmlFor="held_on">Datum för samtalet</Label>
                <Input id="held_on" type="date" value={form.held_on} onChange={set('held_on')} className="max-w-xs" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="agreements">Överenskommelser</Label>
                <p className="text-sm text-muted-foreground">
                    Vad kommer ni överens om inför kommande period, till exempel mål och utveckling? Följs upp i lönesamtalet.
                </p>
                <Textarea id="agreements" rows={5} value={form.agreements} onChange={set('agreements')} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="development_needs">Utvecklingsbehov och kompetensutveckling</Label>
                <Textarea id="development_needs" rows={4} value={form.development_needs} onChange={set('development_needs')} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Anteckningar</Label>
                <p className="text-sm text-muted-foreground">Chefens egna anteckningar. Visas inte i presentationsläget.</p>
                <Textarea id="notes" rows={4} value={form.notes} onChange={set('notes')} />
            </div>

            <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => submit('save')} disabled={saving !== null}>
                    {saving === 'save' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Spara
                </Button>
                {completedAt ? (
                    <Button variant="outline" onClick={() => submit('reopen')} disabled={saving !== null}>
                        {saving === 'reopen' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                        Öppna igen
                    </Button>
                ) : (
                    <Button onClick={() => submit('complete')} disabled={saving !== null}>
                        {saving === 'complete' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Spara och markera genomfört
                    </Button>
                )}
            </div>
        </div>
    )
}
