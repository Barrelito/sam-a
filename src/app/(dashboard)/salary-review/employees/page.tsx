// Medarbetare - Lista och hantering
// /salary-review/employees

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import EmployeeList from '@/components/salary-review/EmployeeList'
import RegisterEmployeeDialog from '@/components/salary-review/RegisterEmployeeDialog'

export default async function EmployeesPage() {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check user role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || !['station_manager', 'assistant_manager', 'vo_chief', 'admin'].includes(profile.role)) {
        redirect('/salary-review')
    }

    // Fetch employees for this manager
    const { data: employees } = await supabase
        .from('employees')
        .select(`
      *,
      station:stations (
        id,
        name,
        vo_id
      )
    `)
        .order('last_name', { ascending: true })

    // Fetch stations for this user (for the create form)
    const { data: userStations } = await supabase
        .from('user_stations')
        .select(`
      station:stations (
        id,
        name
      )
    `)
        .eq('user_id', user.id)

    const stations = userStations?.map(us => us.station).filter(Boolean) || []

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

            {employees && employees.length > 0 ? (
                <EmployeeList employees={employees} />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Inga medarbetare registrerade</CardTitle>
                        <CardDescription>
                            Börja med att registrera dina medarbetare för att kunna påbörja löneöversynen.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Du behöver registrera medarbetare i kategorierna VUB (Vårdare), SSK (Sjuksköterska) eller AMB (Ambulanssjukvårdare).
                        </p>
                        <RegisterEmployeeDialog stations={stations} />
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
