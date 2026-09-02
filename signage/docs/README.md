# Documentatie Signage Studio

Deze map bevat de volledige documentatie voor het signage-systeem in het Nederlands.

## Documenten

- [Gebruikershandleiding](handleiding-gebruiker.md) – volledige handleiding voor medewerkers die het scherm en de editor gebruiken.
- [Editorhandleiding](handleiding-editor.md) – gedetailleerde uitleg van alle functies en instellingen in de editor.
- [Technische handleiding](handleiding-technisch.md) – installatie, opstarten, services, netwerk, IP-adressen, scripts en onderhoud.

## Snelle start

### Editor openen

Open de editor via deze URL:

```text
http://localhost:4173/
```

Als u vanaf een andere computer of een kiosk toegang hebt, gebruikt u het IP-adres van de server gevolgd door :4173.

1. Start de server:
   ```bash
   cd /home/living/signage-test
   python3 server.py
   ```
2. Open de editor in de browser:
   ```text
   http://localhost:4173/
   ```
3. Maak of pas een preset aan, sla deze op en deploy deze wanneer de inhoud klaar is.

## Geteste omgeving

Op 30 juni 2026 is de applicatie lokaal getest:

- de server reageert op http://127.0.0.1:4173/
- de API voor het weer geeft JSON terug via /api/weather
- de editor laadt en toont de verschillende panelen en widgets
