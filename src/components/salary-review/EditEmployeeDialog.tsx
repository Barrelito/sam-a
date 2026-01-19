'use client'

// EditEmployeeDialog - Dialog för att redigera medarbetare

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Pencil, Loader2 } from 'lucide-react'

interface Manager {
    id: string
    full_name: string
    email: string
}

interface EditEmployeeDialogProps {
    employee: {
        id: string
        employee_number?: string
        first_name: string
        last_name: string
        email?: string
        category: string
        station_id: string
        employment_date?: string
        experience_level?: string
        current_salary?: number
        managers?: Array<{
            manager: Manager
            role: string
        }>
    }
    stations: Array<{ id: string; name: string }>
    trigger?: React.ReactNode // Optional custom trigger
}

export default function EditEmployeeDialog({ employee, stations, trigger }: EditEmployeeDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [formData, setFormData] = useState({
        employee_number: employee.employee_number || '',
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email || '',
        category: employee.category,
        station_id: employee.station_id,
        experience_level: employee.experience_level || '',
        current_salary: employee.current_salary?.toString() || ''
    })

    // Reset form when employee changes
    useEffect(() => {
        setFormData({
            employee_number: employee.employee_number || '',
            first_name: employee.first_name,
            last_name: employee.last_name,
            email: employee.email || '',
            category: employee.category,
            station_id: employee.station_id,
            experience_level: employee.experience_level || '',
            current_salary: employee.current_salary?.toString() || ''
        })
    }, [employee])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Client-side validation
        if (!formData.first_name || !formData.last_name || !formData.category || !formData.station_id) {
            alert('Du måste fylla i alla obligatoriska fält (Förnamn, Efternamn, Kategori, Station)')
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`/api/salary-review/employees/${employee.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    category: formData.category,
                    station_id: formData.station_id,
                    employee_number: formData.employee_number || null,
                    email: formData.email || null,
                    experience_level: formData.experience_level || null,
                    current_salary: formData.current_salary ? parseFloat(formData.current_salary) : null
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update employee')
            }

            alert(`Medarbetare uppdaterad: ${formData.first_name} ${formData.last_name}`)
            setOpen(false)
            router.refresh()
        } catch (error) {
            console.error('Error updating employee:', error)
            alert(`Fel: ${error instanceof Error ? error.message : 'Kunde inte uppdatera medarbetare'}`)
        } finally {
            setLoading(false)
        }
    }

    const defaultTrigger = (
        <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Redigera
        </Button>
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || defaultTrigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Redigera medarbetare</DialogTitle>
                        <DialogDescription>
                            Uppdatera uppgifterna för {employee.first_name} {employee.last_name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">Förnamn *</Label>
                                <Input
                                    id="first_name"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Efternamn *</Label>
                                <Input
                                    id="last_name"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="employee_number">Personalnummer</Label>
                                <Input
                                    id="employee_number"
                                    value={formData.employee_number}
                                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                                    placeholder="valfritt"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">E-post</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="valfritt"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Kategori *</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Välj kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="VUB">VUB - Specialistsjuksköterska</SelectItem>
                                        <SelectItem value="SSK">SSK - Grundsjuksköterska</SelectItem>
                                        <SelectItem value="AMB">AMB - Ambulanssjukvårdare</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="station_id">Station *</Label>
                                <Select
                                    value={formData.station_id}
                                    onValueChange={(value) => setFormData({ ...formData, station_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Välj station" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stations.map((station) => (
                                            <SelectItem key={station.id} value={station.id}>
                                                {station.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="experience_level">Erfarenhet</Label>
                                <Select
                                    value={formData.experience_level}
                                    onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Välj erfarenhet" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0-3">0-3 år</SelectItem>
                                        <SelectItem value="3-5">3-5 år</SelectItem>
                                        <SelectItem value="5-10">5-10 år</SelectItem>
                                        <SelectItem value="10+">10+ år</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="current_salary">Nuvarande lön (kr/mån)</Label>
                                <Input
                                    id="current_salary"
                                    type="number"
                                    value={formData.current_salary}
                                    onChange={(e) => setFormData({ ...formData, current_salary: e.target.value })}
                                    placeholder="t.ex. 35000"
                                />
                            </div>
                        </div>

                        {employee.managers && employee.managers.length > 0 && (
                            <div className="space-y-2">
                                <Label>Chefer</Label>
                                <div className="text-sm text-muted-foreground">
                                    {employee.managers.map((m, i) => (
                                        <div key={i}>
                                            • {m.manager.full_name} ({m.role === 'primary' ? 'Huvudchef' : 'Biträdande'})
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    Kontakta en administratör för att ändra chefer
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Avbryt
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Spara ändringar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
