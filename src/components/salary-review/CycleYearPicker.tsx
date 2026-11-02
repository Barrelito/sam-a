'use client'

// Årsval för löneöversynen. Flera år kan vara öppna samtidigt (ADR 0004);
// valet sparas och gäller alla sidor i löneöversynen tills chefen byter.

import { usePathname } from 'next/navigation'
import { CalendarRange } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CycleStatus } from '@/lib/salary-review/types'

interface CycleYearPickerProps {
    cycles: { year: number; status: CycleStatus }[]
    selectedYear: number | null
}

export default function CycleYearPicker({ cycles, selectedYear }: CycleYearPickerProps) {
    const pathname = usePathname()

    const choose = (value: string) => {
        if (Number(value) === selectedYear) return
        const params = new URLSearchParams({ year: value, next: pathname || '/salary-review' })
        window.location.href = `/api/salary-review/select-year?${params}`
    }

    return (
        <div className="flex items-center gap-2 text-sm">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Löneöversyn</span>
            <div className="w-44">
                <Select value={selectedYear ? String(selectedYear) : ''} onValueChange={choose}>
                    <SelectTrigger aria-label="Välj löneöversyn">
                        <SelectValue placeholder="Välj år" />
                    </SelectTrigger>
                    <SelectContent>
                        {cycles.map(c => (
                            <SelectItem key={c.year} value={String(c.year)}>
                                {c.year} {c.status === 'completed' ? '(stängd)' : '(öppen)'}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
