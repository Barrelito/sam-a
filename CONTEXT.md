# Station Manager Portal

Portal där chefer inom ett verksamhetsområde följer sina stationers återkommande
HR- och ekonomiåtaganden över året, tillsammans med löneöversyn, övertid och
bemanningsprognos.

## Organisation

**Station**:
En fysisk arbetsplats. Tillhör exakt ett verksamhetsområde.

**Verksamhetsområde**:
Den organisatoriska nivån ovanför stationerna. Förkortas VO i kod och tal.
_Undvik_: region, distrikt

**Stationsområde**:
En namngiven gruppering av stationer inom ett verksamhetsområde, till för att ge
en områdeschef ett ansvar som spänner över flera stationer.
_Undvik_: stationsgrupp, kluster

**Stationschef**:
Chef med ansvar för en eller flera enskilda stationer. Ansvaret uttrycks som
tilldelade stationer, inte som ett stationsområde.

**Områdeschef**:
Chef med ansvar för ett helt stationsområde. Skiljer sig från en stationschef som
råkar ha flera stationer: ansvaret följer området, inte de enskilda stationerna.
_Undvik_: stationsområdeschef

## Årshjulet

**Årshjul**:
Den centralt fastställda uppsättningen återkommande åtaganden som varje station
ska utföra under ett år, ordnad per månad. Samma hjul gäller alla stationer.
_Undvik_: årscykel, kalendarium

**Aktivitet**:
En post i årshjulet: en sak som ska göras, i en viss månad, av en viss roll. En
mall, inte ett arbetsmoment i sig.
_Undvik_: moment, kriterium, årshjulspost

**Kadens**:
Hur ofta en aktivitet återkommer under året. En månadsvis aktivitet är *en*
aktivitet med tolv förfallotillfällen, inte tolv aktiviteter.
_Undvik_: frekvens, upprepning

**Materialisering**:
Att skapa den konkreta uppgiften för en aktivitet på en viss station ett visst år.
Sker automatiskt, och är det som knyter årshjulet till uppgiftslistan.
_Undvik_: generering, utrullning

## Uppgifter

**Uppgift**:
Ett konkret åtagande knutet till en station och ett år. Antingen materialiserad ur
en aktivitet i årshjulet, eller skapad för hand.
_Undvik_: task, ärende, todo

**Utförare**:
Den person en uppgift är tilldelad. En materialiserad uppgift saknar utförare tills
någon tar den: den tillhör stationen, inte en person.
_Undvik_: ansvarig, mottagare

**Avfärdad**:
En aktivitet som en station har stängt av för att den inte gäller dem. Skilt från
klar: arbetet utfördes aldrig, och skulle inte utföras.
_Undvik_: struken, ignorerad

**Arkiverad**:
Att en uppgift inte längre ska synas i arbetsvyerna. Oberoende av om den är klar —
en uppgift kan arkiveras oavslutad.
_Undvik_: borttagen, dold

## Avgränsning mot löneöversyn

**Kriterium**:
Ett lönekriterium i löneöversynen. Hör inte ihop med årshjulet, trots att båda är
återkommande och årsbundna.
