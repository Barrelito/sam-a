// Quick script to check existing criteria in database
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCriteria() {
    const { data, error } = await supabase
        .from('salary_criteria_assessments')
        .select('sub_criterion_key, rating')
        .limit(50)

    if (error) {
        console.error('Error:', error)
        return
    }

    console.log('Existing assessments:')
    const keys = [...new Set(data.map(d => d.sub_criterion_key))].sort()
    console.log('Unique sub_criterion_keys:', keys)
    console.log('Total assessments:', data.length)
}

checkCriteria()
