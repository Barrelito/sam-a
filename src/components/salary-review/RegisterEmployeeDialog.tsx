'use client'

// RegisterEmployeeDialog - Dialog för att registrera ny medarbetare

import { useState } from 'react'
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
import { Plus, Loader2 } from 'lucide-react'

interface RegisterEmployeeDialogProps {
    stations: Array<{ id: string; name: string }>
}

export default function RegisterEmployeeDialog({ stations }: RegisterEmployeeDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const [formData, setFormData] = useState({
        employee_number: '',
        first_name: '',
        last_name: '',
        email: '',
        category: '',
        station_id: '',
        employment_date: '',
        current_salary: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Client-side validering
        if (!formData.first_name || !formData.last_name || !formData.category || !formData.station_id) {
            alert('Du måste fylla i alla obligatoriska fält (Förnamn, Efternamn, Kategori, Station)')
            return
        }

        setLoading(true)

        try {
            const response = await fetch('/api/salary-review/employees', {
                method: 'POST',
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
                    employment_date: formData.employment_date || null,
                    current_salary: formData.current_salary ? parseFloat(formData.current_salary) : null
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create employee')
            }

            alert(`Medarbetare registrerad: ${formData.first_name} ${formData.last_name}`)

            // Reset form
            setFormData({
                employee_number: '',
                first_name: '',
                last_name: '',
                email: '',
                category: '',
                station_id: '',
                employment_date: '',
                current_salary: ''
            })

            setOpen(false)
            router.refresh()
        } catch (error) {
            console.error('Error creating employee:', error)
            alert(`Fel: ${error instanceof Error ? error.message : 'Kunde inte registrera medarbetare'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrera medarbetare
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Registrera ny medarbetare</DialogTitle>
                        <DialogDescription>
                            Fyll i uppgifterna för den medarbetare du vill registrera för löneöversyn.
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
                                {formData.category === 'AMB' && (
                                    <p className="text-xs text-muted-foreground">
                                        AMB har inte bedömning av särskild yrkesskicklighet
                                    </p>
                                )}
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
                                <Label htmlFor="employment_date">Anställningsdatum</Label>
                                <Input
                                    id="employment_date"
                                    type="date"
                                    value={formData.employment_date}
                                    onChange={(e) => setFormData({ ...formData, employment_date: e.target.value })}
                                />
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
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Avbryt
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrera
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
