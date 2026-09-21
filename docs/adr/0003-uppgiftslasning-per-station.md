# En stationschef läser bara sina egna stationers uppgifter

Uppgiftsläsningen har hittills omfattat hela verksamhetsområdet, både genom RLS-
policyn och genom att API:et lägger tillbaka `vo_id` i sitt filter. Vi stramar åt
till de stationer chefen faktiskt är satt på. VO-chef och områdeschef behåller sin
bredare insyn.

Beslutet är ett avsteg från hur systemet fungerat och kommer att se ut som en
regression för den som är van vid att se grannstationernas uppgifter. Det är
avsiktligt: en sammanslagen lista över *mina* stationer är oförenlig med att hela
verksamhetsområdet ligger i samma vy, och bredden var i praktiken en bieffekt av att
materialiserade stationsuppgifter får `vo_id` ifyllt.

## Konsekvenser

Insyn mellan stationer på samma nivå måste i fortsättningen gå via en uttrycklig
delning eller via VO-nivån, inte via att allt råkar vara läsbart.
