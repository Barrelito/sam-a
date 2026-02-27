import { EmployeeCategory } from '../salary-review/types';

/**
 * Beräknar veckoarbetstid (lathunden) för en anställd baserat på yrkesroll, andel natt och anställningsgrad.
 */
export function calculateStandardHours(
    category: EmployeeCategory | undefined | string,
    nightShare: number = 0,
    employmentRate: number = 100
): number {
    let baseFullTimeHours = 40.0; // Default full time fallback
    const upperCategory = category?.toUpperCase() || '';

    const isNurse = upperCategory === 'VUB' || upperCategory === 'SSK';
    const isAmb = upperCategory === 'AMB';

    if (isNurse || isAmb) {
        if (isNurse && nightShare > 30) {
            // Kategori B: (VUB+SSK och Natt > 30%) = 34,33 timmar/vecka
            baseFullTimeHours = 34.33;
        } else if ((isNurse && nightShare > 10) || (isAmb && nightShare > 20)) {
            // Kategori A: Om (VUB+SSK och Natt > 10%) ELLER (Amb.sjkv och Natt > 20%) = 36,33 timmar/vecka
            baseFullTimeHours = 36.33;
        } else if (isAmb && nightShare <= 20) {
            // Kategori C: Om (Amb.sjkv och Natt <= 20%) = 37,00 timmar/vecka
            baseFullTimeHours = 37.0;
        } else if (isNurse && nightShare <= 10) {
            // Kategori D: Om (VUB+SSK och Natt <= 10% / 2-skift) = 38,25 timmar/vecka
            baseFullTimeHours = 38.25;
        }
    } else if (upperCategory === 'LÄKARE') {
        // Kategori E (Läkare m.fl.): Specialavtal.
        baseFullTimeHours = 40.0; // This can be overriden or handled specially.
    }

    // Multiply by employment rate percentage
    const decimalRate = Math.max(0, employmentRate) / 100.0; // No negative rates
    const standardHours = baseFullTimeHours * decimalRate;

    // Round to 2 decimals
    return Math.round(standardHours * 100) / 100;
}
