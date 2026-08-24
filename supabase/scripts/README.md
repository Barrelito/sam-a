# Manuella SQL-skript

Diagnostik- och felsökningsskript som körs manuellt i Supabase SQL Editor vid behov.

Dessa är **inte** migrationer — de ändrar inte schemat och ska inte köras av
`supabase db push`/`db reset`. Nya schemaändringar läggs i `../migrations/`,
helst med tidsstämplat filnamn (`YYYYMMDDHHMMSS_beskrivning.sql`).

| Fil | Syfte |
| --- | --- |
| `debug_ratings.sql` | Inspektera bedömningsdata |
| `debug_salary_review_permissions.sql` | Felsöka RLS/behörigheter för löneöversynen |
| `find_duplicates.sql` | Hitta dubbletter i tasks/annual_cycle-data |
