// Individuell medarbetarvy
// /salary-review/employees/[id]
// Trigger recompilation

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ClipboardList, MessageSquare, CheckCircle2, Circle, Clock } from 'lucide-react'
import Link from 'next/link'
import { hasParticularlySkillfulCriteria } from '@/lib/salary-review/particularly-skilled-criteria'
import { getTotalCriteriaCount } from '@/lib/salary-review/salary-criteria'

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { id: employeeId } = await params

    // Hämta medarbetare
    const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select(`
      *,
      station:stations (
        id,
        name,
        vo_id
      )
    `)
        .eq('id', employeeId)
        .single()

    if (employeeError || !employee) {
        notFound()
    }

    // Hämta eller skapa review för aktiv cykel
    const { data: activeCycle } = await supabase
        .from('salary_review_cycles')
        .select('*')
        .eq('status', 'active')
        .single()

    let review = null
    let particularlySkillfulCount = 0
    let criteriaCount = 0

    if (activeCycle) {
        // Försök hämta befintlig review
        const { data: existingReview } = await supabase
            .from('salary_reviews')
            .select(`
        *,
        particularly_skilled_assessments (*),
        salary_criteria_assessments (*)
      `)
            .eq('employee_id', employeeId)
            .eq('cycle_id', activeCycle.id)
            .single()

        if (!existingReview) {
            // Skapa ny review
            const { data: newReview } = await supabase
                .from('salary_reviews')
                .insert({
                    cycle_id: activeCycle.id,
                    employee_id: employeeId,
                    manager_id: user.id,
                    status: 'not_started'
                })
                .select()
                .single()

            review = newReview
        } else {
            review = existingReview
            particularlySkillfulCount = existingReview.particularly_skilled_assessments?.filter((a: any) => a.is_met).length || 0
            criteriaCount = existingReview.salary_criteria_assessments?.length || 0
        }
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

    const STATUS_CONFIG = {
        not_started: { label: 'Ej påbörjad', color: 'bg-gray-100 text-gray-800', icon: Circle },
        in_progress: { label: 'Pågående', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
        completed: { label: 'Slutförd', color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
    }

    const hasParticularlySkillful = hasParticularlySkillfulCriteria(employee.category)
    const totalCriteria = getTotalCriteriaCount()
    const statusInfo = review ? STATUS_CONFIG[review.status as keyof typeof STATUS_CONFIG] : STATUS_CONFIG.not_started
    const StatusIcon = statusInfo.icon

    return (
        <div className="container mx-auto py-8">
            {/* Back button */}
            <Link href="/salary-review/employees">
                <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tillbaka till medarbetare
                </Button>
            </Link>

            {/* Employee Header */}
            <div className="mb-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            {employee.first_name} {employee.last_name}
                        </h1>
                        <div className="flex items-center gap-4 text-muted-foreground">
                            {employee.employee_number && (
                                <span>Personalnummer: {employee.employee_number}</span>
                            )}
                            {employee.station && (
                                <span>• {employee.station.name}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge
                            variant="outline"
                            className={CATEGORY_COLORS[employee.category as keyof typeof CATEGORY_COLORS]}
                        >
                            {CATEGORY_LABELS[employee.category as keyof typeof CATEGORY_LABELS]}
                        </Badge>
                        {review && (
                            <Badge variant="outline" className={statusInfo.color}>
                                <StatusIcon className="mr-1 h-3 w-3" />
                                {statusInfo.label}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Employee Info Card */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Medarbetarinformation</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-2 gap-4">
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">E-post</dt>
                            <dd className="text-sm">{employee.email || 'Ej angiven'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">Anställningsdatum</dt>
                            <dd className="text-sm">
                                {employee.employment_date ? new Date(employee.employment_date).toLocaleDateString('sv-SE') : 'Ej angiven'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">Nuvarande lön</dt>
                            <dd className="text-sm">
                                {employee.current_salary ? `${employee.current_salary.toLocaleString('sv-SE')} kr/mån` : 'Ej angiven'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">Station</dt>
                            <dd className="text-sm">{employee.station?.name || 'Ej angiven'}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>

            {/* Review Status - Only show if there's an active cycle */}
            {!activeCycle && (
                <Card className="mb-6 border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <CardTitle className="text-yellow-800">Ingen aktiv löneöversynscykel</CardTitle>
                        <CardDescription>
                            Det finns ingen aktiv löneöversynscykel för tillfället. Be en administratör eller VO-chef att skapa en cykel för att påbörja löneöversyn.
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {activeCycle && review && (
                <>
                    {/* Assessment Progress */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Bedömningsöversikt - {activeCycle.year}</CardTitle>
                            <CardDescription>
                                Slutför alla bedömningar för att kunna genomföra lönesamtal
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Particularly Skillful (only for VUB/SSK) */}
                            {hasParticularlySkillful && (
                                <div className={`flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors ${particularlySkillfulCount > 0 ? 'border-l-4 border-l-green-500 bg-green-50/30' : ''
                                    }`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-medium">Särskild yrkesskicklighet</h3>
                                            {particularlySkillfulCount > 0 && (
                                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {particularlySkillfulCount > 0
                                                ? `✅ ${particularlySkillfulCount} kriterier bedömda`
                                                : 'Bedömning ej påbörjad'}
                                        </p>
                                    </div>
                                    <Link href={`/salary-review/employees/${employeeId}/particularly-skilled`}>
                                        <Button variant="outline">
                                            <ClipboardList className="mr-2 h-4 w-4" />
                                            {particularlySkillfulCount > 0 ? 'Redigera' : 'Bedöm'}
                                        </Button>
                                    </Link>
                                </div>
                            )}

                            {/* Salary Criteria */}
                            <div className={`flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors ${criteriaCount > 0 ? 'border-l-4 border-l-green-500 bg-green-50/30' : ''
                                }`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-medium">Lönekriterier</h3>
                                        {criteriaCount >= totalCriteria && (
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {criteriaCount > 0
                                            ? `${criteriaCount >= totalCriteria ? '✅' : '⏳'} ${criteriaCount} av ${totalCriteria} kriterier bedömda`
                                            : 'Bedömning ej påbörjad'}
                                    </p>
                                </div>
                                <Link href={`/salary-review/employees/${employeeId}/criteria`}>
                                    <Button variant="outline">
                                        <ClipboardList className="mr-2 h-4 w-4" />
                                        {criteriaCount > 0 ? 'Redigera' : 'Bedöm'}
                                    </Button>
                                </Link>
                            </div>

                            {/* Meeting Preparation */}
                            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                <div className="flex-1">
                                    <h3 className="font-medium mb-1">Lönesamtal</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Förbered och genomför lönesamtal
                                    </p>
                                </div>
                                <Button variant="outline" disabled>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Förbered (Kommer snart)
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
