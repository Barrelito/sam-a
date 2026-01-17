// Validation schemas för löneöversyn
import { z } from 'zod'

// Lönekriterier bedömning
export const criteriaAssessmentSchema = z.object({
    rating: z.enum(['behover_utvecklas', 'bra', 'mycket_bra', 'utmarkt'], {
        required_error: 'Du måste välja en bedömning'
    }),
    evidence: z.string().optional(),
    notes: z.string().optional()
}).refine((data) => {
    // Kräv evidence för höga ratings
    if (['mycket_bra', 'utmarkt'].includes(data.rating)) {
        return data.evidence && data.evidence.length >= 10
    }
    return true
}, {
    message: 'För bedömningen "Mycket bra" eller "Utmärkt" krävs konkreta exempel (minst 10 tecken)',
    path: ['evidence']
})

export type CriteriaAssessmentFormData = z.infer<typeof criteriaAssessmentSchema>

// Särskild yrkesskicklighet
export const particularlySkillfulSchema = z.object({
    is_met: z.boolean(),
    evidence: z.string().optional(),
    notes: z.string().optional()
}).refine((data) => {
    if (data.is_met) {
        return data.evidence && data.evidence.length >= 10
    }
    return true
}, {
    message: 'När kriteriet är uppfyllt krävs konkreta exempel (minst 10 tecken)',
    path: ['evidence']
})

export type ParticularlySkillfulFormData = z.infer<typeof particularlySkillfulSchema>

// Medarbetare
export const employeeSchema = z.object({
    first_name: z.string().min(2, 'Förnamn måste vara minst 2 tecken'),
    last_name: z.string().min(2, 'Efternamn måste vara minst 2 tecken'),
    email: z.string().email('Ogiltig e-postadress').optional().or(z.literal('')),
    category: z.enum(['VUB', 'SSK', 'AMB'], {
        required_error: 'Du måste välja en kategori'
    }),
    station_id: z.string({
        required_error: 'Du måste välja en station'
    }),
    employee_number: z.string().optional(),
    employment_date: z.string().optional(),
    current_salary: z.coerce.number().min(0, 'Lön kan inte vara negativ').optional()
})

export type EmployeeFormData = z.infer<typeof employeeSchema>
