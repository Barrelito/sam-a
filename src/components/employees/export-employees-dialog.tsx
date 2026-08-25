'use client'

// Dialog för att exportera personallistan som PDF, grupperad på station.
// Användaren väljer själv vilka uppgifter som ska med.

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Download, FileText, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DEFAULT_EXPORT_COLUMNS, EXPORT_COLUMNS } from '@/lib/employees/export-columns'

export interface ExportFilters {
    search?: string
    stationId?: string | null
    category?: string | null
    /** Klartext om vad som är filtrerat, visas i dialogen. */
    description?: string | null
    /** Antal medarbetare som matchar filtret. */
    count?: number
}

interface ExportEmployeesDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    filters: ExportFilters
}

export function ExportEmployeesDialog({ open, onOpenChange, filters }: ExportEmployeesDialogProps) {
    const { toast } = useToast()
    const [selected, setSelected] = useState<string[]>(DEFAULT_EXPORT_COLUMNS)
    const [loading, setLoading] = useState(false)

    const toggle = (key: string, checked: boolean) =>
        setSelected((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)))

    const allSelected = selected.length === EXPORT_COLUMNS.length

    const sensitiveSelected = EXPORT_COLUMNS.filter(
        (column) => column.sensitive && selected.includes(column.key)
    )

    const handleExport = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/employees/export-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    columns: selected,
                    search: filters.search || undefined,
                    station_id: filters.stationId || undefined,
                    category: filters.category || undefined,
                }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.error || 'Kunde inte skapa PDF')
            }

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Personallista_${new Date().toISOString().split('T')[0]}.pdf`
            link.click()
            URL.revokeObjectURL(url)

            toast({
                title: 'Personallistan är exporterad',
                description: 'PDF:en har laddats ner.',
            })
            onOpenChange(false)
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Exporten misslyckades',
                description: error instanceof Error ? error.message : 'Kunde inte skapa PDF',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Exportera personallista
                    </DialogTitle>
                    <DialogDescription>
                        Listan grupperas på stationstillhörighet. Namn och station är alltid med -
                        välj vilka övriga uppgifter som ska tas med.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                        <div className="font-medium">
                            {filters.count !== undefined
                                ? `${filters.count} medarbetare tas med`
                                : 'Nuvarande urval tas med'}
                        </div>
                        <div className="text-muted-foreground text-xs mt-0.5">
                            {filters.description
                                ? `Urval – ${filters.description}`
                                : 'Alla medarbetare du har behörighet till'}
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold">Uppgifter att ta med</Label>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                                setSelected(allSelected ? [] : EXPORT_COLUMNS.map((c) => c.key))
                            }
                        >
                            {allSelected ? 'Avmarkera alla' : 'Markera alla'}
                        </Button>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                        {EXPORT_COLUMNS.map((column) => (
                            <label
                                key={column.key}
                                htmlFor={`export-${column.key}`}
                                className="flex items-center gap-2 rounded-md border p-2.5 text-sm cursor-pointer hover:bg-accent/50"
                            >
                                <Checkbox
                                    id={`export-${column.key}`}
                                    checked={selected.includes(column.key)}
                                    onCheckedChange={(checked) => toggle(column.key, checked === true)}
                                />
                                <span className="flex-1">{column.label}</span>
                                {column.sensitive && (
                                    <span className="text-[10px] uppercase tracking-wide text-amber-700">
                                        Känslig
                                    </span>
                                )}
                            </label>
                        ))}
                    </div>

                    {sensitiveSelected.length > 0 && (
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                                Du har valt att ta med{' '}
                                {sensitiveSelected.map((c) => c.label.toLowerCase()).join(' och ')}.
                                Dokumentet innehåller då känsliga personuppgifter och behöver
                                hanteras och förvaras enligt gällande rutin.
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Avbryt
                    </Button>
                    <Button type="button" onClick={handleExport} disabled={loading}>
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-4 w-4" />
                        )}
                        {loading ? 'Skapar PDF...' : 'Exportera PDF'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ExportEmployeesDialog
