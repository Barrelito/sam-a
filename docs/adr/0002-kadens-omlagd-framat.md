# Månadsvis återkommande aktiviteter modelleras som kadens, omlagt bara framåt

Årshjulet uttrycker idag en månadsvis aktivitet som tolv separata rader med samma
titel. Vi går över till en aktivitet med kadens, alltså ett åtagande med tolv
förfallotillfällen. Med 66 rader i hjulet och en materialiserad uppgift per station
och år är dubbleringen den enskilt största orsaken till att uppgiftslistan svämmar
över för en chef med flera stationer.

Omläggningen gäller **bara framåt**, från nästa årsskifte. Redan materialiserade
uppgifter för innevarande och tidigare år ligger kvar i sin gamla form.

## Konsekvenser

Två modeller samexisterar under en övergångsperiod, och kod som läser historik måste
tåla båda. Alternativet — att slå ihop befintliga rader — kräver att man uppfinner en
avbockningsmodell för historik som aldrig haft en, med risk att tappa vem som gjorde
vad. Den risken bedömdes som större än värdet av en enhetlig historik.
