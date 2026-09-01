# Editorhandleiding

Deze handleiding beschrijft alle onderdelen van de editor en hoe elk onderdeel gebruikt moet worden.

## 1. Overzicht van de editor

### Editor openen

De editor is te openen via:

```text
http://localhost:4173/
```

Bij toegang vanaf een andere machine gebruikt u het IP-adres van de server gevolgd door :4173.

De editor bestaat uit:

- linker zijbalk met presets, opslag en deployopties
- instellingenpaneel voor widgets, raster en achtergrond
- groot canvas waarop het scherm wordt opgebouwd
- selectiepaneel waarin de eigenschappen van het gekozen element worden getoond
- beheer-tab voor mededelingen

## 2. Linker zijbalk

### Preset kiezen

Hier kunt u een bestaande preset selecteren. De geselecteerde preset wordt de actieve editorpreset.

### Presetnaam

Hier geeft u de preset een naam. Deze naam wordt zichtbaar in de lijst en in de actieve status.

### Preset opslaan

Slaat de huidige preset op. Dit is nodig voordat u de preset deployt.

### Preset deployen

Maakt de huidige preset actief voor het scherm. De gedeployde preset wordt gebruikt in de live weergave.

### Nieuwe preset

Maakt een kopie van de huidige preset aan. Dit is handig wanneer u een nieuwe variant wilt maken zonder de bestaande preset te overschrijven.

### Preset verwijderen

Verwijdert de huidige preset. De laatste preset kan niet worden verwijderd.

### Voorbeeld herstellen

Voegt een standaardvoorbeeldpreset toe, zodat u snel kunt beginnen met een werkende opzet.

## 3. Widgetpaneel

### Logo toevoegen

Voegt een logo-widget toe aan het scherm.

Gebruik dit wanneer u:

- een merklogo wilt tonen
- een instellingslogo wilt laten zien
- een visueel element wilt plaatsen in de linker of bovenste regio van het scherm

Na het toevoegen kunt u:

- het logo slepen
- de breedte en hoogte aanpassen
- een afbeelding koppelen als logo

### Mededelingen toevoegen

Voegt een widget toe dat actieve mededelingen toont.

Gebruik dit voor:

- belangrijke berichten
- service-informatie
- aankondigingen

### Hexagon toevoegen

Voegt een nieuwe hexagon toe aan het raster.

Gebruik dit voor:

- pictogrammen
- treininformatie
- weersinformatie
- mededelingenblokken

## 4. Rasterinstellingen

### Hexagongrootte

Bepaalt de grootte van elk hexagon.

- Klein: geschikt voor compacte schermopstellingen
- Middel: standaardkeuze voor een evenwichtige opstelling
- Groot: geschikt voor grotere, duidelijkere blokken

### Randdikte

Bepaalt hoe dik de rand van de hexagonen wordt getekend.

### Randkleur

Bepaalt de kleur van de rand van de hexagonen.

### Raster X / Raster Y

Verschuift het volledige raster horizontaal of verticaal. Dit is nuttig wanneer de inhoud niet precies in het midden of op de gewenste positie moet staan.

## 5. Achtergrondinstellingen

### Afbeelding toevoegen

Koppelt een achtergrondafbeelding aan de huidige preset.

Gebruik dit wanneer:

- de preset een specifieke huisstijl moet krijgen
- een achtergrondbeeld de inhoud visueel moet ondersteunen
- het scherm een meer “branding” look moet krijgen

### Achtergrond wissen

Verwijdert de achtergrond uit de preset.

## 6. Selectiepaneel

Wanneer u een widget of hexagon selecteert, worden de beschikbare instellingen hier getoond.

### Bij een widget

U kunt wijzigen:

- breedte en hoogte
- titel van het mededelingenwidget
- logo-afbeelding
- verwijderactie

### Bij een hexagon

U kunt wijzigen:

- label
- type (pictogram, treintijden, weer, mededelingen)
- kleur en randkleur
- kleurpreset
- geanimeerd of niet
- uitklappen ja/nee
- uitklaprichting links of rechts
- uitklapformaat
- uitklapgedrag
- gesloten en uitgeklapte duur in seconden
- inhoudsvolgorde
- pictogram (bij pictogrammen)
- weerweergave (bij weerhexagonen)
- verwijderactie

## 7. Canvas en interactie

### Widgets slepen

Klik en sleep een widget over het canvas.

Dit is geschikt voor:

- logo's verplaatsen
- mededelingenblokken positioneren

### Logo schalen

Een kleine resize-handle verschijnt bij een logo. Sleep deze om de grootte te veranderen.

### Hexagon slepen

Sleep een hexagon naar een andere positie in het raster.

## 8. Hexagon types

### Pictogram

Toont een pictogram met een label.

Gebruik dit voor:

- vervoersmiddelen
- informatiepunten
- service- of faciliteiteninformatie

### Treintijden

Toont actuele treindata of een demo-versie wanneer live data niet beschikbaar is.

Gebruik dit voor:

- vertrekinformatie
- richting Eindhoven/Maastricht
- spoornummers en vertragingen

### Weer

Toont weersinformatie.

U kunt kiezen tussen:

- dagdelen
- komende 3 dagen
- komende 7 dagen

### Mededelingen

Toont mededelingen uit de beheerlijst.

## 9. Uitklapopties voor hexagonen

Een hexagon kan worden uitgeklapt om meer inhoud te tonen.

### Uitklappen naar

Bepaalt of de uitklapuitbreiding naar links of rechts plaatsvindt.

### Uitklapformaat

Bepaalt de grootte van de uitgebreide weergave.

### Uitklapgedrag

- Altijd uitgeklapt: de hexagon blijft zichtbaar uitgebreid
- Automatisch wisselen: de hexagon wisselt tussen gesloten en geopend op basis van tijd

### Gesloten en uitgeklapt seconden

Bepaalt hoe lang de inhoud in de gesloten of geopende toestand zichtbaar blijft.

## 10. Mededelingenbeheer

In de beheer-tab kunt u mediaberichten maken en beheren.

### Een mededeling publiceren

Geef een titel, tekst, prioriteit en zichtbaarheidstijd op.

### Mededeling verwijderen

Verwijder een mededeling uit de lijst wanneer deze niet meer relevant is.

## 11. Praktische workflow

Een typische workflow is:

1. Kies of maak een preset.
2. Voeg een logo of mededelingenwidget toe.
3. Voeg hexagonen toe voor contentblokken.
4. Configureer raster, kleuren en inhoud.
5. Voeg een achtergrond toe indien gewenst.
6. Sla de preset op.
7. Deploy de preset.
8. Controleer de live weergave.
