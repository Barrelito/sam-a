# En chef kan starta årets löneöversyn, och flera år kan vara öppna samtidigt

Löneöversynen är en per år och gemensam för hela organisationen. Hittills har bara
admin och VO-chef kunnat skapa den, och flera delar av systemet förutsätter att
exakt en löneöversyn är aktiv. Inför 2027 börjar löneöversynen med medarbetarsamtal
redan under hösten, medan lönesamtal från 2026 fortfarande pågår. Därför får
stationschef och områdeschef (utöver VO-chef och admin) starta nästa års
löneöversyn, och en ny löneöversyn kan vara öppen samtidigt som föregående år.
Chefen väljer år i vyn, och nyaste året är förvalt.

Att starta är begränsat till nästa år, och bara om det inte redan finns. Starten
loggas med vem som gjorde den. Att stänga en löneöversyn påverkar alla stationer
och är fortfarande förbehållet admin och VO-chef. Biträdande chef får inte starta.

## Övervägda alternativ

- **Bara admin/VO-chef startar, som tidigare.** Avvisat eftersom stationscheferna
  annars får vänta på någon annan för att kunna börja hålla medarbetarsamtal.
- **En löneöversyn per station eller VO.** Avvisat. Året och budgeten är
  gemensamma, och statistik på VO-nivå bygger på ett gemensamt år.
- **Bara en aktiv löneöversyn åt gången.** Avvisat. Kvarvarande lönesamtal skulle
  då blockera nästa års medarbetarsamtal.

## Konsekvenser

Kod får inte längre slå upp "den aktiva löneöversynen" som en enda rad. Det valda
året måste skickas med explicit. Budget för ett nystartat år kan saknas, och det
ska visas som ett tillstånd i vyerna, inte som ett fel.
