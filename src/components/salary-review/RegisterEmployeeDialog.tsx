'use client'

// RegisterEmployeeDialog - tunn wrapper runt den delade medarbetardialogen.
// Behålls för bakåtkompatibilitet med löneöversynens vyer.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import EmployeeFormDialog from '@/components/employees/employee-form-dialog'

interface RegisterEmployeeDialogProps {
    stations: Array<{ id: string; name: string }>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onRegistered?: (employee: any) => void
}

export default function RegisterEmployeeDialog({ stations, onRegistered }: RegisterEmployeeDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)

    return (
        <EmployeeFormDialog
            stations={stations}
            open={open}
            onOpenChange={setOpen}
            trigger={
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrera medarbetare
                </Button>
            }
            onSaved={(employee) => {
                onRegistered?.(employee)
                router.refresh()
            }}
        />
    )
}
