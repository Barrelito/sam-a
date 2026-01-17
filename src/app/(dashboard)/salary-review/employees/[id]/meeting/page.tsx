// Lönesamtal - Förberedelse och genomförande
// /salary-review/employees/[id]/meeting

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import MeetingPreparationForm from '@/components/salary-review/MeetingPreparationForm'
import MeetingGuideDisplay from '@/components/salary-review/MeetingGuideDisplay'
import MeetingDocumentationForm from '@/components/salary-review/MeetingDocumentationForm'

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
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

    // Hämta aktiv cykel och review
    const { data: activeCycle } = await supabase
        .from('salary_review_cycles')
        .select('*')
        .eq('status', 'active')
        .single()

    if (!activeCycle) {
        return (
            <div className="container mx-auto py-8">
                <Card className="border-yellow-200 bg-yellow-50">
                    <CardHeader>
                        <CardTitle className="text-yellow-800">Ingen aktiv löneöversynscykel</CardTitle>
                        <CardDescription>
                            Det finns ingen aktiv löneöversynscykel för tillfället.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    // Hämta review med alla relaterade data
    const { data: review, error: reviewError } = await supabase
        .from('salary_reviews')
        .select(`
      *,
      particularly_skilled_assessments (*),
      salary_criteria_assessments (*),
      meeting_preparation:salary_meeting_preparations (*)
    `)
        .eq('employee_id', employeeId)
        .eq('cycle_id', activeCycle.id)
        .single()

    if (reviewError || !review) {
        notFound()
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

    return (
        <div className="container mx-auto py-8">
            {/* Back button */}
            <Link href={`/salary-review/employees/${employeeId}`}>
                <Button variant="ghost" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tillbaka till medarbetare
                </Button>
            </Link>

            {/* Header */}
            <div className="mb-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">
                            Lönesamtal - {employee.first_name} {employee.last_name}
                        </h1>
                        <p className="text-muted-foreground">
                            Förbered, genomför och dokumentera lönesättande samtal
                        </p>
                    </div>
                    <Badge
                        variant="outline"
                        className={CATEGORY_COLORS[employee.category as keyof typeof CATEGORY_COLORS]}
                    >
                        {CATEGORY_LABELS[employee.category as keyof typeof CATEGORY_LABELS]}
                    </Badge>
                </div>
            </div>

            {/* Main Content - Tabs */}
            <Tabs defaultValue="preparation" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="preparation">1. Förberedelse</TabsTrigger>
                    <TabsTrigger value="guide">2. Samtalsguide</TabsTrigger>
                    <TabsTrigger value="documentation">3. Dokumentation</TabsTrigger>
                </TabsList>

                <TabsContent value="preparation" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Förberedelser inför lönesamtal</CardTitle>
                            <CardDescription>
                                Samla dokumentation och förbered dig inför samtalet med medarbetaren
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MeetingPreparationForm
                                reviewId={review.id}
                                employeeCategory={employee.category}
                                currentSalary={employee.current_salary}
                                initialData={review.meeting_preparation?.[0] || null}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="guide" className="mt-6">
                    <MeetingGuideDisplay
                        reviewId={review.id}
                        employee={employee}
                        criteriaAssessments={review.salary_criteria_assessments || []}
                        particularlySkillfulAssessments={review.particularly_skilled_assessments || []}
                        preparation={review.meeting_preparation?.[0] || null}
                    />
                </TabsContent>

                <TabsContent value="documentation" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dokumentera lönesamtal</CardTitle>
                            <CardDescription>
                                Spara resultat från samtalet och slutför löneöversynen
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MeetingDocumentationForm
                                reviewId={review.id}
                                employee={employee}
                                currentSalary={employee.current_salary}
                                initialData={{
                                    proposed_salary: review.proposed_salary,
                                    final_salary: review.final_salary,
                                    meeting_date: review.meeting_date,
                                    meeting_notes: review.meeting_notes
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
