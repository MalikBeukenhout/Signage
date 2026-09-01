# Technische handleiding

## 1. Overzicht van de architectuur

Het systeem bestaat uit twee belangrijke onderdelen:

- een frontend in HTML, CSS en JavaScript
- een Python-server die statische bestanden en API-endpoints beheert

De frontend wordt geladen vanuit de webpagina en communiceert met de server voor:

- opslaan van state
- uploaden van assets
- ophalen van weersinformatie
- ophalen van treindata

## 2. Bestandsstructuur

Belangrijke bestanden en mappen:

- app.js – editorlogica, widgets, raster, presets en UI-interactie
- index.html – paginaopbouw en editorinterface
- server.py – webserver, API-endpoints, caching en assetverwerking
- styles.css – styling voor editor en live weergave
- signage-state.json – opgeslagen state van de server
- uploads/ – geüploade afbeeldingen en assets
- deploy/kiosk.sh – kiosk-startscript voor een volledig scherm
- deploy/signage.service – systemd-service voor automatische start
- .env – omgevingsvariabelen, inclusief NS API-sleutels

## 3. Vereisten

Voor een correcte werking hebt u nodig:

- Python 3
- een moderne browser
- toegang tot internet voor live weers- en treindata
- optional: Chromium voor kiosk-modus
- optional: systemd op Linux-systemen

## 4. Starten van de applicatie

### Handmatig starten

```bash
cd /home/living/signage-test
python3 server.py
```

De server luistert standaard op:

- host: 0.0.0.0
- poort: 4173

Open daarna:

```text
http://localhost:4173/
```

### Starten via systeemdienst

De service is geconfigureerd in:

- deploy/signage.service

Installatie en gebruik:

```bash
sudo cp deploy/signage.service /etc/systemd/system/signage.service
sudo systemctl daemon-reload
sudo systemctl enable signage.service
sudo systemctl start signage.service
```

## 5. Kiosk-opstartscript

Het script in deploy/kiosk.sh doet het volgende:

1. stopt een eerder lopende serverproces
2. start server.py opnieuw in de achtergrond
3. stopt Chromium als die actief is
4. start Chromium in kiosk-modus met de signage-pagina
5. zet het venster op volledige schermgrootte

### Belangrijk

Het script gebruikt momenteel een vaste URL met IP-adres:

```text
http://10.201.52.70:4173/?view=signage
```

Als het systeem op een ander netwerk of een andere host draait, moet dit worden aangepast naar het daadwerkelijke IP-adres of de hostnaam.

## 6. Netwerk en IP-adressen

### Lokale toegang

```text
http://localhost:4173/
http://127.0.0.1:4173/
```

### Toegang van andere computers in hetzelfde netwerk

Gebruik:

```text
http://<server-ip>:4173/
```

### Belangrijk voor de kiosk

De kiosk start de signage-pagina op een vaste URL. Controleer daarom altijd of:

- het apparaat op het juiste IP-adres bereikbaar is
- poort 4173 vrij is
- de firewall poort 4173 toestaat

## 7. Omgevingsvariabelen

De server laadt variabelen uit .env.

Voorbeeld:

```env
NS_API_KEY_PRIMARY=your-primary-key
NS_API_KEY_SECONDARY=your-secondary-key
```

Deze variabelen worden gebruikt voor de NS API. Zonder geldige API-sleutels zal de treinmodule fallback-data tonen of een foutmelding laten zien.

## 8. API-endpoints

De server biedt de volgende endpoints:

- GET /api/state – haalt de opgeslagen state op
- POST /api/state – slaat de state op
- GET /api/weather – haalt weersinformatie op
- GET /api/trains – haalt treindata op
- POST /api/assets – uploadt een asset
- DELETE /api/assets/<id> – verwijdert een asset

## 9. Opslag van state en assets

### State

De applicatie slaat de state op in:

- signage-state.json

Dit bevat presets, widgets, mededelingen en actieve deploy-instellingen.

### Assets

Geüploade afbeeldingen worden opgeslagen in:

- uploads/

Elke upload krijgt een unieke bestandsnaam. De browser gebruikt vervolgens een URL zoals:

```text
/uploads/<bestand>
```

## 10. Live data

### Weer

Weerdata wordt opgehaald via Open-Meteo.

Als de externe service niet beschikbaar is, valt de module terug op demo-data en toont zij een waarschuwing.

### Treinen

Treindata wordt opgehaald via de NS API.

Als de API niet beschikbaar is of sleutels ontbreken, wordt een fallback-weergave gebruikt.

## 11. Logging en onderhoud

De serverlog wordt geschreven naar:

- server.log

Gebruik dit bestand voor troubleshooting wanneer:

- de server niet start
- de API niet werkt
- uploads falen
- een preset niet wordt opgeslagen

## 12. Troubleshooting

### De server start niet

Controleer:

- of poort 4173 niet al in gebruik is
- of Python 3 aanwezig is
- of er syntaxfouten in server.py zitten

### De browser kan de pagina niet laden

Controleer:

- of de server actief is
- of het juiste IP-adres wordt gebruikt
- of de firewall poort 4173 niet blokkeert

### Uploads werken niet

Controleer:

- of de uploads-map schrijfbaar is
- of het bestand niet te groot is
- of de server nog draait

### Presets worden niet gedeployed

Controleer:

- of de preset is opgeslagen
- of de juiste preset is geselecteerd
- of de live weergave ook de gedeployde versie laat zien

## 13. Aanbevolen deploy-checklist

Voor een nieuwe installatie:

1. controleer de IP van de host
2. pas deploy/kiosk.sh aan indien nodig
3. configureer .env met NS-sleutels
4. start de server
5. test de editor in de browser
6. maak een preset aan
7. sla en deploy de preset
8. controleer de live weergave
