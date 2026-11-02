import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ClipboardList, Calendar, FileText, Banknote } from 'lucide-react'
import VoChiefDashboard from '@/components/salary-review/VoChiefDashboard'
import { getSelectedCycle } from '@/lib/salary-review/cycles-server'
import { cycleStatusLabel, startableYear } from '@/lib/salary-review/lonesattning'
import StartCycleCard from '@/components/salary-review/StartCycleCard'

export default async function SalaryReviewPage() {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check user role - only station_manager, assistant_manager, vo_chief, and admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

    if (!profile || !['station_manager', 'assistant_manager', 'area_manager', 'vo_chief', 'admin'].includes(profile.role)) {
        return (
            <div className="container mx-auto py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Åtkomst nekad</CardTitle>
                        <CardDescription>
                            Du har inte behörighet att använda löneöversynsmodulen.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    // Get active cycle
    const { cycle: activeCycle, cycles } = await getSelectedCycle(supabase)
    // Nästa års löneöversyn kan startas av chefen själv (ADR 0004)
    const yearToStart = startableYear(profile.role, cycles, new Date())

    // VO CHIEF: Show VO-specific dashboard
    if (profile.role === 'vo_chief') {
        // Get user's VO
        const { data: userProfile } = await supabase
            .from('profiles')
            .select(`
                vo_id,
                vo:verksamhetsomraden(id, name)
            `)
            .eq('id', user.id)
            .single()

        if (!userProfile || !userProfile.vo_id || !activeCycle) {
            return (
                <div className="container mx-auto py-8">
                    <h1 className="text-2xl font-bold mb-4">Löneöversyn - VO-chef</h1>
                    {!userProfile && <p className="text-muted-foreground">Inget VO kopplat till ditt konto.</p>}
                    {!activeCycle && <p className="text-muted-foreground mb-4">Ingen öppen löneöversyn.</p>}
                    {!activeCycle && yearToStart && <StartCycleCard year={yearToStart} />}
                </div>
            )
        }

        return (
            <>
                {yearToStart && (
                    <div className="container mx-auto pt-8 -mb-8">
                        <StartCycleCard year={yearToStart} />
                    </div>
                )}
                <VoChiefDashboard
                    vo={userProfile.vo}
                    cycle={activeCycle}
                    userName={profile.full_name || 'VO-chef'}
                />
            </>
        )
    }

    // STATION MANAGER: Show station-specific dashboard
    // Fetch employees with their reviews for the active cycle to calculate stats
    const { data: employeesData } = await supabase
        .from('employees')
        .select(`
            id,
            salary_reviews (
                status,
                cycle_id,
                salary_criteria_assessments(id)
            )
        `)

    // Calculate Stats
    const totalEmployees = employeesData?.length || 0

    let completedReviews = 0
    let ongoingReviews = 0

    if (activeCycle && employeesData) {
        employeesData.forEach(emp => {
            const review = emp.salary_reviews?.find((r: any) => r.cycle_id === activeCycle.id)

            if (review) {
                if (review.status === 'completed') {
                    completedReviews++
                } else {
                    // Check if started (has assessments)
                    // Robust check for array or count object (legacy)
                    const r = review as any
                    const assessmentCount = Array.isArray(r.salary_criteria_assessments)
                        ? r.salary_criteria_assessments.length
                        : (r.salary_criteria_assessments?.[0]?.count || 0)

                    if (assessmentCount > 0) {
                        ongoingReviews++
                    }
                }
            }
        })
    }

    const completionPercentage = totalEmployees > 0
        ? Math.round((completedReviews / totalEmployees) * 100)
        : 0

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Löneöversyn</h1>
                <p className="text-muted-foreground">
                    Välkommen {profile.full_name}! Hantera och genomför löneöversyn för dina medarbetare.
                </p>
            </div>

            {/* Starta nästa års löneöversyn */}
            {yearToStart && <StartCycleCard year={yearToStart} />}

            {!activeCycle && !yearToStart && (
                <Card className="mb-6 border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <CardTitle className="text-yellow-900">Ingen öppen löneöversyn</CardTitle>
                        <CardDescription className="text-yellow-700">
                            Det finns ingen öppen löneöversyn. Din stationschef kan starta nästa års löneöversyn.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {/* Vald löneöversyn */}
            {activeCycle && (
                <Card className="mb-6 border-primary bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Löneöversyn {activeCycle.year}
                        </CardTitle>
                        <CardDescription>
                            Status: {cycleStatusLabel(activeCycle.status)}
                        </CardDescription>
                    </CardHeader>
                    {activeCycle.description && (
                        <CardContent>
                            <p className="text-sm">{activeCycle.description}</p>
                        </CardContent>
                    )}
                </Card>
            )}

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Medarbetare
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEmployees}</div>
                        <p className="text-xs text-muted-foreground">
                            Registrerade medarbetare
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pågående Reviews
                        </CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{ongoingReviews}</div>
                        <p className="text-xs text-muted-foreground">
                            Under bearbetning
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Slutförda
                        </CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedReviews}</div>
                        <p className="text-xs text-muted-foreground">
                            Klara löneöversyner
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Completion
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completionPercentage}%</div>
                        <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-500 ease-in-out"
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Medarbetare
                        </CardTitle>
                        <CardDescription>
                            Hantera och registrera dina medarbetare
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/salary-review/employees">
                            <Button className="w-full">
                                Visa medarbetare
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5" />
                            Bedömningar
                        </CardTitle>
                        <CardDescription>
                            Bedöm lönekriterier och yrkesskicklighet
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/salary-review/employees?tab=todo">
                            <Button className="w-full">
                                Hantera bedömningar
                            </Button>
                        </Link>
                        <p className="text-xs text-muted-foreground mt-2">
                            Välj medarbetare för att påbörja bedömning
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-blue-200 bg-blue-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-900">
                            <Banknote className="h-5 w-5" />
                            Lönefördelning
                        </CardTitle>
                        <CardDescription className="text-blue-700">
                            Fördela budget baserat på betyg
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/salary-review/distribution">
                            <Button className="w-full" variant="secondary">
                                Gå till fördelning
                            </Button>
                        </Link>
                        <p className="text-xs text-blue-700/70 mt-2">
                            Kräver att bedömningar är gjorda
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Lönesamtal
                        </CardTitle>
                        <CardDescription>
                            Förbered och genomför lönesamtal
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/salary-review/employees?tab=todo">
                            <Button className="w-full">
                                Hantera lönesamtal
                            </Button>
                        </Link>
                        <p className="text-xs text-muted-foreground mt-2">
                            Välj medarbetare för att förbereda eller genomföra samtal
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Getting Started Guide */}
            {(!totalEmployees || totalEmployees === 0) && (
                <Card className="mt-8 bg-blue-50 border-blue-200">
                    <CardHeader>
                        <CardTitle>Kom igång med Löneöversyn</CardTitle>
                        <CardDescription>
                            Följ dessa steg för att komma igång
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li>Registrera dina medarbetare (VUB, SSK, AMB)</li>
                            <li>Bedöm särskild yrkesskicklighet för VUB och SSK</li>
                            <li>Bedöm lönekriterier för alla medarbetare</li>
                            <li>Förbered lönesamtal</li>
                            <li>Genomför och dokumentera samtalen</li>
                        </ol>
                        <Link href="/salary-review/employees">
                            <Button className="mt-4">
                                Börja registrera medarbetare
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
