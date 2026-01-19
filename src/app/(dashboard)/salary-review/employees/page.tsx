'use client'

// Medarbetare - Lista och hantering
// /salary-review/employees

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import EmployeeList from '@/components/salary-review/EmployeeList'
import RegisterEmployeeDialog from '@/components/salary-review/RegisterEmployeeDialog'
import { StationFilter } from '@/components/station-filter'
import { createClient } from '@/lib/supabase/client'

export default function EmployeesPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState<any[]>([])
    const [stations, setStations] = useState<Array<{ id: string; name: string }>>([])
    const [selectedStation, setSelectedStation] = useState<string | null>(null)

    useEffect(() => {
        async function loadData() {
            const supabase = createClient()

            // Check authentication
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            // Check user role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (!profile || !['station_manager', 'assistant_manager', 'vo_chief', 'admin'].includes(profile.role)) {
                router.push('/salary-review')
                return
            }

            // Fetch employees for this manager
            const { data: employeesData, error: employeesError } = await supabase
                .from('employees')
                .select(`
                    *,
                    station:stations (
                        id,
                        name,
                        vo_id
                    ),
                    employee_managers (
                        role,
                        manager:manager_id (
                            id,
                            full_name,
                            email
                        )
                    )
                `)
                .order('last_name', { ascending: true })

            if (employeesError) {
                console.error('Error fetching employees:', employeesError)
            }

            // Fetch stations for this user
            const { data: userStations } = await supabase
                .from('user_stations')
                .select(`
                    station:stations (
                        id,
                        name
                    )
                `)
                .eq('user_id', user.id)

            const stationsData = userStations?.map(us => us.station as any).filter(Boolean) || []

            setEmployees(employeesData || [])
            setStations(stationsData)
            setLoading(false)
        }

        loadData()
    }, [router])

    // Filter employees by selected station
    const filteredEmployees = selectedStation
        ? employees.filter(e => e.station_id === selectedStation)
        : employees

    // Handle employee deletion
    const handleEmployeeDeleted = (employeeId: string) => {
        setEmployees(prev => prev.filter(e => e.id !== employeeId))
    }

    if (loading) {
        return (
            <div className="container mx-auto py-8">
                <p>Laddar medarbetare...</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Medarbetare</h1>
                    <p className="text-muted-foreground">
                        Hantera och registrera medarbetare för löneöversyn
                    </p>
                </div>
                <RegisterEmployeeDialog stations={stations} />
            </div>

            {/* Station Filter */}
            {stations.length > 1 && (
                <div className="mb-6">
                    <StationFilter
                        stations={stations}
                        selectedStationId={selectedStation}
                        onStationChange={setSelectedStation}
                    />
                </div>
            )}

            {filteredEmployees && filteredEmployees.length > 0 ? (
                <EmployeeList
                    employees={filteredEmployees}
                    stations={stations}
                    onEmployeeDeleted={handleEmployeeDeleted}
                />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            {selectedStation ? 'Inga medarbetare på denna station' : 'Inga medarbetare registrerade'}
                        </CardTitle>
                        <CardDescription>
                            {selectedStation
                                ? 'Det finns inga medarbetare registrerade på den valda stationen.'
                                : 'Börja med att registrera dina medarbetare för att kunna påbörja löneöversynen.'
                            }
                        </CardDescription>
                    </CardHeader>
                    {!selectedStation && (
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Du behöver registrera medarbetare i kategorierna VUB (Vårdare), SSK (Sjuksköterska) eller AMB (Ambulanssjukvårdare).
                            </p>
                            <RegisterEmployeeDialog stations={stations} />
                        </CardContent>
                    )}
                </Card>
            )}
        </div>
    )
}
