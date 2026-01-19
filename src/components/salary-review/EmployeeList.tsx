'use client'

// EmployeeList - Visar lista över medarbetare

import { useState } from 'react'
import type { EmployeeWithDetails } from '@/lib/salary-review/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, UserCircle, MoreHorizontal, Pencil, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'
import EditEmployeeDialog from './EditEmployeeDialog'
import DeleteEmployeeDialog from './DeleteEmployeeDialog'

interface EmployeeListProps {
    employees: any[] // TODO: Type this properly once we have the full type from Supabase
    stations?: { id: string; name: string }[]
    onEmployeeDeleted?: (employeeId: string) => void
}

const CATEGORY_LABELS = {
    VUB: 'VUB - Specialistsjuksköterska',
    SSK: 'SSK - Grundsjuksköterska',
    AMB: 'AMB - Ambulanssjukvårdare'
}

const CATEGORY_COLORS = {
    VUB: 'bg-blue-100 text-blue-800 border-blue-200',
    SSK: 'bg-green-100 text-green-800 border-green-200',
    AMB: 'bg-purple-100 text-purple-800 border-purple-200'
}

export default function EmployeeList({ employees, stations = [], onEmployeeDeleted }: EmployeeListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [stationFilter, setStationFilter] = useState<string>('all')

    const showStationFilter = stations.length > 1

    // Filter employees
    const filteredEmployees = employees.filter(employee => {
        const matchesSearch =
            employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.employee_number?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesCategory = categoryFilter === 'all' || employee.category === categoryFilter
        const matchesStation = stationFilter === 'all' || employee.station_id === stationFilter

        return matchesSearch && matchesCategory && matchesStation
    })

    // Group by category
    const groupedEmployees = filteredEmployees.reduce((acc, employee) => {
        if (!acc[employee.category]) {
            acc[employee.category] = []
        }
        acc[employee.category].push(employee)
        return acc
    }, {} as Record<string, EmployeeWithDetails[]>)

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filter och sök</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Sök medarbetare..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Alla kategorier</SelectItem>
                                <SelectItem value="VUB">VUB</SelectItem>
                                <SelectItem value="SSK">SSK</SelectItem>
                                <SelectItem value="AMB">AMB</SelectItem>
                            </SelectContent>
                        </Select>
                        {showStationFilter && (
                            <Select value={stationFilter} onValueChange={setStationFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Station" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Alla stationer</SelectItem>
                                    {stations.map(station => (
                                        <SelectItem key={station.id} value={station.id}>
                                            {station.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Visar {filteredEmployees.length} av {employees.length} medarbetare</span>
                    </div>
                </CardContent>
            </Card>

            {/* Employee List */}
            {Object.keys(groupedEmployees).length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">Inga medarbetare hittades</p>
                    </CardContent>
                </Card>
            ) : (
                Object.entries(groupedEmployees).map(([category, categoryEmployees]) => (
                    <Card key={category}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl flex items-center gap-2">
                                    {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                                    <Badge variant="outline" className="ml-2">
                                        {(categoryEmployees as EmployeeWithDetails[])?.length || 0}
                                    </Badge>
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                {(categoryEmployees as EmployeeWithDetails[]).map((employee) => (
                                    <div
                                        key={employee.id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <UserCircle className="h-6 w-6 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium">
                                                    {employee.first_name} {employee.last_name}
                                                </div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-4">
                                                    {employee.employee_number && (
                                                        <span>#{employee.employee_number}</span>
                                                    )}
                                                    {employee.station && (
                                                        <span>• {employee.station.name}</span>
                                                    )}
                                                    {employee.current_salary && (
                                                        <span>• {employee.current_salary.toLocaleString('sv-SE')} kr/mån</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={CATEGORY_COLORS[employee.category as keyof typeof CATEGORY_COLORS]}
                                            >
                                                {employee.category}
                                            </Badge>

                                            {/* Dropdown Menu */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={`/salary-review/employees/${employee.id}`}
                                                            className="flex items-center cursor-pointer"
                                                        >
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Visa detaljer
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                        <EditEmployeeDialog
                                                            employee={employee}
                                                            stations={stations}
                                                            trigger={
                                                                <div className="flex items-center w-full cursor-pointer">
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Redigera
                                                                </div>
                                                            }
                                                        />
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                        <DeleteEmployeeDialog
                                                            employee={employee}
                                                            onDeleteSuccess={() => onEmployeeDeleted?.(employee.id)}
                                                            trigger={
                                                                <div className="flex items-center w-full cursor-pointer text-destructive">
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    Ta bort
                                                                </div>
                                                            }
                                                        />
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    )
}
