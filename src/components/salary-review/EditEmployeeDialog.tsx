'use client'

// EditEmployeeDialog - tunn wrapper runt den delade medarbetardialogen.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import EmployeeFormDialog, { type EmployeeFormValues } from '@/components/employees/employee-form-dialog'

interface EditEmployeeDialogProps {
    employee: EmployeeFormValues & { id: string }
    stations: Array<{ id: string; name: string }>
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSaved?: (employee: any) => void
}

export default function EditEmployeeDialog({
    employee,
    stations,
    trigger,
    open: controlledOpen,
    onOpenChange,
    onSaved,
}: EditEmployeeDialogProps) {
    const router = useRouter()
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : uncontrolledOpen
    const setOpen = (value: boolean) => {
        if (onOpenChange) onOpenChange(value)
        if (!isControlled) setUncontrolledOpen(value)
    }

    const defaultTrigger = (
        <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Redigera
        </Button>
    )

    return (
        <EmployeeFormDialog
            stations={stations}
            employee={employee}
            open={open}
            onOpenChange={setOpen}
            trigger={isControlled ? undefined : (trigger ?? defaultTrigger)}
            onSaved={(saved) => {
                onSaved?.(saved)
                router.refresh()
            }}
        />
    )
}
