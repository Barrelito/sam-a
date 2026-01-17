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
import { Search, UserCircle } from 'lucide-react'
import Link from 'next/link'

interface EmployeeListProps {
    employees: any[] // TODO: Type this properly once we have the full type from Supabase
}

const CATEGORY_LABELS = {
    VUB: 'VUB - Vårdare',
    SSK: 'SSK - Sjuksköterska',
    AMB: 'AMB - Ambulanssjukvårdare'
}

const CATEGORY_COLORS = {
    VUB: 'bg-blue-100 text-blue-800 border-blue-200',
    SSK: 'bg-green-100 text-green-800 border-green-200',
    AMB: 'bg-purple-100 text-purple-800 border-purple-200'
}

export default function EmployeeList({ employees }: EmployeeListProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')

    // Filter employees
    const filteredEmployees = employees.filter(employee => {
        const matchesSearch =
            employee.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            employee.employee_number?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesCategory = categoryFilter === 'all' || employee.category === categoryFilter

        return matchesSearch && matchesCategory
    })

    // Group by category
    const groupedEmployees = filteredEmployees.reduce((acc, employee) => {
        if (!acc[employee.category]) {
            acc[employee.category] = []
        }
        acc[employee.category].push(employee)
        return acc
    }, {} as Record<string, any[]>)

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
                                        {categoryEmployees.length}
                                    </Badge>
                                </CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                {categoryEmployees.map((employee) => (
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
                                            <Link href={`/salary-review/employees/${employee.id}`}>
                                                <Button variant="outline" size="sm">
                                                    Hantera
                                                </Button>
                                            </Link>
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
