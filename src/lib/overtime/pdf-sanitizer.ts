/**
 * PDF Sanitization Check
 *
 * Searches the generated PDF text stream for any personal data
 * that should have been removed during anonymization.
 *
 * If ANY match is found, the export MUST be aborted.
 */

interface SanitizationResult {
  passed: boolean
  violations: string[]
}

/**
 * Check a PDF text buffer for leaked personal data.
 * Returns { passed: true } if no personal data found.
 * Returns { passed: false, violations: [...] } if leaks detected.
 */
export function sanitizePdfContent(
  pdfText: string,
  employeeNames: { rawName: string; firstName: string; lastName: string }[]
): SanitizationResult {
  const violations: string[] = []
  const textLower = pdfText.toLowerCase()

  for (const emp of employeeNames) {
    // Check full "Efternamn, Förnamn" pattern
    if (emp.rawName && textLower.includes(emp.rawName.toLowerCase())) {
      violations.push(`Fullständigt namn hittat: "${emp.rawName}"`)
    }

    // Check last name individually (min 2 chars to avoid false positives)
    if (emp.lastName && emp.lastName.length >= 2) {
      if (textLower.includes(emp.lastName.toLowerCase())) {
        violations.push(`Efternamn hittat: "${emp.lastName}"`)
      }
    }

    // Check first name individually (min 2 chars)
    if (emp.firstName && emp.firstName.length >= 2) {
      if (textLower.includes(emp.firstName.toLowerCase())) {
        violations.push(`Förnamn hittat: "${emp.firstName}"`)
      }
    }
  }

  // Check for "Fmgrp" followed by a digit
  const fmgrpMatch = pdfText.match(/fmgrp\s*\d/i)
  if (fmgrpMatch) {
    violations.push(`Fmgrp-data hittat: "${fmgrpMatch[0]}"`)
  }

  return {
    passed: violations.length === 0,
    violations,
  }
}
