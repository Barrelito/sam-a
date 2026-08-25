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
import { Search, UserCircle, MoreHorizontal, Pencil, Trash2, Eye, ClipboardCheck, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import EmployeeFormDialog from '@/components/employees/employee-form-dialog'
import DeleteEmployeeDialog from '@/components/employees/delete-employee-dialog'

interface EmployeeListProps {
    employees: any[] // TODO: Type this properly once we have the full type from Supabase
    stations?: { id: string; name: string }[]
    onEmployeeDeleted?: (employeeId: string) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEmployeeUpdated?: (employee: any) => void
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

export default function EmployeeList({ employees, stations = [], onEmployeeDeleted, onEmployeeUpdated }: EmployeeListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    // Dialogerna renderas utanför dropdown-menyn, annars avmonteras de när menyn stängs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [editing, setEditing] = useState<any | null>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [deleting, setDeleting] = useState<any | null>(null)
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [stationFilter, setStationFilter] = useState<string>('all')
    const [sortBy, setSortBy] = useState<'name' | 'salary_asc' | 'salary_desc'>('name')

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

    // Group by category and sort within each group
    const groupedEmployees = filteredEmployees.reduce((acc, employee) => {
        if (!acc[employee.category]) {
            acc[employee.category] = []
        }
        acc[employee.category].push(employee)
        return acc
    }, {} as Record<string, EmployeeWithDetails[]>)

    // Sort each category group
    Object.keys(groupedEmployees).forEach(category => {
        groupedEmployees[category].sort((a: any, b: any) => {
            if (sortBy === 'salary_asc') {
                const salaryA = a.current_salary || 0
                const salaryB = b.current_salary || 0
                return salaryA - salaryB
            } else if (sortBy === 'salary_desc') {
                const salaryA = a.current_salary || 0
                const salaryB = b.current_salary || 0
                return salaryB - salaryA
            } else {
                // Sort by name (default)
                return `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
            }
        })
    })

    return (
        <div className="space-y-6">
            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filter och sök</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px] relative">
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
                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'name' | 'salary_asc' | 'salary_desc')}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Sortering" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="name">Namn (A-Ö)</SelectItem>
                                <SelectItem value="salary_asc">Lön (låg → hög)</SelectItem>
                                <SelectItem value="salary_desc">Lön (hög → låg)</SelectItem>
                            </SelectContent>
                        </Select>
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
                                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground border-b pb-2 px-4">
                                    <div className="col-span-4">Medarbetare</div>
                                    <div className="col-span-2 text-center">Bedömning</div>
                                    <div className="col-span-2 text-center">Lönesamtal</div>
                                    <div className="col-span-2 text-right">Ny Lön</div>
                                    <div className="col-span-2"></div>
                                </div>
                                {(categoryEmployees as any[]).map((employee) => {
                                    const review = employee.active_review
                                    // Robust check: if it's an array (from new query) use length, if object (legacy) try count
                                    const assessmentCount = Array.isArray(review?.salary_criteria_assessments)
                                        ? review.salary_criteria_assessments.length
                                        : (review?.salary_criteria_assessments?.[0]?.count || 0)

                                    const isAssessed = assessmentCount > 0
                                    const isMeetingDone = review?.status === 'completed'
                                    const newSalary = review?.final_salary

                                    return (
                                        <div
                                            key={employee.id}
                                            className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                                        >
                                            {/* Name & Basic Info */}
                                            <div className="col-span-4 flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                    <UserCircle className="h-6 w-6 text-slate-500" />
                                                </div>
                                                <div>
                                                    <Link href={`/salary-review/employees/${employee.id}`} className="font-medium hover:underline">
                                                        {employee.first_name} {employee.last_name}
                                                    </Link>
                                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                        {employee.station && (
                                                            <span>{employee.station.name}</span>
                                                        )}
                                                        {employee.current_salary && (
                                                            <span>• {employee.current_salary.toLocaleString('sv-SE')} kr</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status: Assessment */}
                                            <div className="col-span-2 flex justify-center">
                                                {isAssessed ? (
                                                    <div className="flex flex-col items-center">
                                                        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
                                                            <ClipboardCheck className="w-3 h-3 mr-1" />
                                                            Klar
                                                        </Badge>
                                                        <span className="text-[10px] text-muted-foreground mt-1">{assessmentCount} kriterier</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <Badge variant="outline" className="text-muted-foreground border-dashed">
                                                            Ej påbörjad
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status: Meeting */}
                                            <div className="col-span-2 flex justify-center">
                                                {isMeetingDone ? (
                                                    <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">
                                                        <MessageSquare className="w-3 h-3 mr-1" />
                                                        Genomfört
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground border-dashed">
                                                        Ej klart
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* New Salary */}
                                            <div className="col-span-2 text-right font-medium">
                                                {newSalary ? (
                                                    <span className="text-green-700">
                                                        {newSalary.toLocaleString('sv-SE')} kr
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="col-span-2 flex justify-end gap-2">
                                                {!isAssessed ? (
                                                    <Link href={`/salary-review/employees/${employee.id}/criteria`}>
                                                        <Button size="sm" variant="default" className="h-8">
                                                            Betygsätt
                                                        </Button>
                                                    </Link>
                                                ) : !isMeetingDone ? (
                                                    <Link href={`/salary-review/employees/${employee.id}/meeting`}>
                                                        <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50">
                                                            Lönesamtal
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Link href={`/salary-review/employees/${employee.id}`}>
                                                        <Button size="sm" variant="ghost" className="h-8">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                )}

                                                {/* Dropdown Menu */}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
                                                        <DropdownMenuItem asChild>
                                                            <Link
                                                                href={`/salary-review/employees/${employee.id}/criteria`}
                                                                className="flex items-center cursor-pointer"
                                                            >
                                                                <ClipboardCheck className="mr-2 h-4 w-4" />
                                                                Hantera bedömning
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link
                                                                href={`/salary-review/employees/${employee.id}/meeting`}
                                                                className="flex items-center cursor-pointer"
                                                            >
                                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                                Hantera lönesamtal
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="cursor-pointer"
                                                            onSelect={() => setEditing(employee)}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Redigera
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="cursor-pointer text-destructive focus:text-destructive"
                                                            onSelect={() => setDeleting(employee)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Ta bort
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}

            {editing && (
                <EmployeeFormDialog
                    stations={stations}
                    employee={editing}
                    open
                    onOpenChange={(open) => !open && setEditing(null)}
                    onSaved={(saved) => {
                        setEditing(null)
                        onEmployeeUpdated?.(saved)
                    }}
                />
            )}

            {deleting && (
                <DeleteEmployeeDialog
                    employee={deleting}
                    open
                    onOpenChange={(open) => !open && setDeleting(null)}
                    onDeleted={(employeeId) => {
                        setDeleting(null)
                        onEmployeeDeleted?.(employeeId)
                    }}
                />
            )}
        </div>
    )
}
