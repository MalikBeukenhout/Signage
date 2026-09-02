# Gebruikershandleiding

## Doel van het systeem

Dit systeem wordt gebruikt om een digitaal signage-scherm te ontwerpen, op te slaan, te deployen en te beheren. Het ondersteunt:

- presets voor verschillende schermopstellingen
- widgets zoals logo's, mededelingen en hexagonale inhoud
- live informatie voor trein- en weersinformatie
- beheer van mededelingen die op het scherm worden getoond

## Wat is getest?

De applicatie is lokaal getest op 30 juni 2026. Tijdens de test zijn de volgende onderdelen gecontroleerd:

- de server start en is bereikbaar op poort 4173
- de hoofdpagina laadt in de browser
- de API voor weer geeft geldige JSON terug
- de editor toont de preset-, widget- en rasterinstellingen

## 1. Systeem starten

### Editor openen

Als de server draait, opent u de editor via:

```text
http://localhost:4173/
```

Gebruik bij externe toegang het IP-adres van de server, bijvoorbeeld:

```text
http://<server-ip>:4173/
```

Open een terminal en voer uit:

```bash
cd /home/living/signage-test
python3 server.py
```

Vervolgens opent u de applicatie via:

```text
http://localhost:4173/
```

## 2. Werken met presets

Een preset is een complete schermopstelling. U kunt meerdere presets aanmaken voor verschillende situaties, zoals:

- ochtendspits
- lunch
- evenementen
- speciale mededelingen

### Preset acties

In de linker zijbalk vindt u:

- Preset kiezen: selecteer een bestaande preset
- Presetnaam: geef de preset een duidelijke naam
- Preset opslaan: sla de huidige inhoud op
- Preset deployen: maak de preset actief voor het scherm
- Nieuwe preset: maak een kopie van de huidige preset aan
- Preset verwijderen: verwijder een preset
- Voorbeeld herstellen: maak een standaardvoorbeeldpreset aan

## 3. De editor gebruiken

### 3.1 Widgets toevoegen

In het paneel “Widgets” kunt u drie typen elementen toevoegen:

- Logo: voor een bedrijfs- of organisatielogo
- Mededelingen: voor een ticker of blok met berichten
- Hexagon: voor een hexagonale inhoudsblok die later kan worden ingericht als pictogram, treininfo, weer of mededelingen

### 3.2 Widgets bewegen en aanpassen

Na het toevoegen van een widget kunt u:

- het widget slepen over het canvas
- de grootte van een logo wijzigen met de resize-handle
- de selectie aanpassen in het rechter paneel “Selectie”

### 3.3 Raster en hexagonen

Het raster bepaalt hoe de hexagonale vlakken worden geplaatst.

U kunt:

- de hexagongrootte instellen (klein, middel, groot)
- de randdikte aanpassen
- de randkleur kiezen
- de rasterpositie verschuiven met Raster X en Raster Y

## 4. Achtergrond toevoegen

U kunt een achtergrondafbeelding toevoegen aan een preset.

1. Kies een preset.
2. Klik op “Afbeelding toevoegen”.
3. Selecteer een afbeelding.
4. De afbeelding wordt aan de preset gekoppeld.

U kunt de achtergrond later weer verwijderen met “Achtergrond wissen”.

## 5. Mededelingen beheren

Ga naar de tab “Beheer” om mededelingen te publiceren.

### Een mededeling toevoegen

Vul in:

- Titel
- Tekst
- Prioriteit
- Zichtbaar voor (uren of dagen)

Klik daarna op “Mededeling publiceren”.

### Een mededeling verwijderen

Klik op het kruisje achter een bestaande mededeling in de lijst.

## 6. Scherm tonen

U kunt het scherm openen in een eigen tab via de knop “Scherm”.

Daar ziet u de live preview van de gedeployde preset.

## 7. Deployen van een preset

Voordat een preset live wordt gezet, moet deze eerst worden opgeslagen.

1. Pas de preset aan.
2. Klik op “Preset opslaan”.
3. Klik op “Preset deployen”.

Als de deploy succesvol is, wordt de preset actief op het scherm.

## 8. Veelvoorkomende situaties

### De browser toont geen inhoud

- controleer of de server nog draait
- open http://localhost:4173/ opnieuw
- controleer of de preset is gedeployed

### Een afbeelding wordt niet getoond

- controleer of het bestand is geüpload
- controleer of de juiste preset actief is
- probeer de afbeelding opnieuw toe te voegen

### Mededelingen verschijnen niet

- controleer of de mededeling nog binnen de ingestelde zichtbaarheid valt
- controleer of de mededelingenwidget aanwezig is in de preset
