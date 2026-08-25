'use client'

// DeleteEmployeeDialog - tunn wrapper runt den delade borttagningsdialogen.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import SharedDeleteEmployeeDialog from '@/components/employees/delete-employee-dialog'

interface DeleteEmployeeDialogProps {
    employee: { id: string; first_name: string; last_name: string }
    trigger?: React.ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
    onDeleteSuccess?: () => void
}

export default function DeleteEmployeeDialog({
    employee,
    trigger,
    open: controlledOpen,
    onOpenChange,
    onDeleteSuccess,
}: DeleteEmployeeDialogProps) {
    const router = useRouter()
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false)

    const isControlled = controlledOpen !== undefined
    const open = isControlled ? controlledOpen : uncontrolledOpen
    const setOpen = (value: boolean) => {
        if (onOpenChange) onOpenChange(value)
        if (!isControlled) setUncontrolledOpen(value)
    }

    const defaultTrigger = (
        <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Ta bort
        </Button>
    )

    return (
        <SharedDeleteEmployeeDialog
            employee={employee}
            open={open}
            onOpenChange={setOpen}
            trigger={isControlled ? undefined : (trigger ?? defaultTrigger)}
            onDeleted={() => {
                if (onDeleteSuccess) {
                    onDeleteSuccess()
                } else {
                    router.push('/salary-review/employees')
                    router.refresh()
                }
            }}
        />
    )
}
