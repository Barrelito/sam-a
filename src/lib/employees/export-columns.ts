// Vilka kolumner som går att välja vid PDF-export av personallistan.
// Delas mellan exportdialogen och API-rutten så att de aldrig glider isär.

export interface ExportColumn {
    key: string
    label: string
    /** Förvald i dialogen. */
    defaultOn: boolean
    /** Extra känslig uppgift - varnas för i dialogen och noteras i PDF:en. */
    sensitive?: boolean
    /** Högerställs i tabellen (tal). */
    numeric?: boolean
}

// Namn och station är alltid med - namnet är raden, stationen är grupperingen.
export const EXPORT_COLUMNS: ExportColumn[] = [
    { key: 'employee_number', label: 'Personalnummer', defaultOn: true },
    { key: 'category', label: 'Kategori', defaultOn: true },
    { key: 'email', label: 'E-post', defaultOn: true },
    { key: 'phone', label: 'Telefon', defaultOn: true },
    { key: 'address', label: 'Adress', defaultOn: false },
    { key: 'birthdate', label: 'Födelsedatum', defaultOn: false, sensitive: true },
    { key: 'employment_date', label: 'Anställningsdatum', defaultOn: true },
    { key: 'experience', label: 'Erfarenhet', defaultOn: false },
    { key: 'employment_rate', label: 'Sysselsättningsgrad', defaultOn: false, numeric: true },
    { key: 'night_share', label: 'Nattandel', defaultOn: false, numeric: true },
    { key: 'current_salary', label: 'Lön', defaultOn: false, sensitive: true, numeric: true },
]

export const EXPORT_COLUMN_KEYS = EXPORT_COLUMNS.map((c) => c.key)

export const DEFAULT_EXPORT_COLUMNS = EXPORT_COLUMNS.filter((c) => c.defaultOn).map((c) => c.key)

export function getExportColumns(keys: string[]): ExportColumn[] {
    // Behåll definitionsordningen oavsett i vilken ordning nycklarna kommer in
    const selected = new Set(keys)
    return EXPORT_COLUMNS.filter((column) => selected.has(column.key))
}
