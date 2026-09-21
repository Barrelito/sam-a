# Arkiverad är en flagga, inte ett statusvärde

Uppgifters `status` är en CHECK-begränsad kolumn (`not_started`, `in_progress`,
`done`, `reported`), och det låg nära till hands att lägga till `archived` som ett
femte värde. Vi gör inte det: arkiverad blir en egen flagga vid sidan av status.

Skälet är att de två svarar på olika frågor. Status säger om arbetet är gjort;
arkiverad säger om uppgiften ska synas. Slås de ihop blir det omöjligt att arkivera
något som aldrig blev gjort — vilket är precis det vanligaste fallet, eftersom det
är gammalt skräp man vill få bort ur vyn.

## Konsekvenser

Varje vy som listar uppgifter måste aktivt filtrera på flaggan. En uppgift som är
både oavslutad och arkiverad är ett giltigt tillstånd och får inte räknas som
försenad.
