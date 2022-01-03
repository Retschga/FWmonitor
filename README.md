# ![Logo](./docs/icon.png) FWmonitor

Diese Software kann bei Feuerwehren dazu verwendet werden, die Informationen des Alarmfax auf einem
Bildschirm darzustellen. Insbesondere werden die Informationen so aufbereitet, dass der Einsatzort
auf einer Karte visualisiert wird.

E-Mail Empfang ist zum Test verfügbar. Funktion nicht garantiert.

## 🔥 Funktionsumfang

-   Standby-Display mit Uhrzeit, Diashow, Kalender/Google Kalender, Verfügbarkeitsanzeige der
    Einsatzkräfte, DWD Warnungen
-   Alarm-Display
    -   Alle relevanten Infos aus dem Alarmfax
    -   Kartenanzeige
    -   Rückmeldungen der Einsatzkräfte
-   PDF-Display/Bildschirm-Teilen für Schulungspräsentationen etc.
-   Telegram Messenger
    -   Alarminfo (Einstellbar für verschiedene Personengruppen: Fax, Schlagwort, ...)
    -   Rückmeldungen zum Alarm
    -   Kalender mit Terminerinnerungen (Einstellbar für verschiedene Personengruppen)
    -   Verfügbarkeits Anzeige/Einstellung
    -   Einsatzstatistik
    -   Hydrantenposition eintragen
-   Installierbare WebApp für Android und IOS
    -   Alarminfo (Einstellbar für verschiedene Personengruppen: Fax, Schlagwort, ...)
    -   Rückmeldungen zum Alarm
    -   Kalender mit Terminerinnerungen (Einstellbar für verschiedene Personengruppen)
    -   Bearbeiten des Kalenders
    -   Verfügbarkeits Anzeige/Einstellung
    -   Verfügbarkeits Pläne (Wochentagsweise)
    -   Hydrantenkarte
    -   Einsatzstatistik
    -   Admin-Optionen
        -   Benutzereinstellungen
        -   Kalendergruppen
        -   Alarmgruppen
        -   Präsentationssteuerung
-   Kartenausdruck
-   Adress-Koordinaten Suche über
    -   Bing
    -   Nominatim
    -   OSM Gebäudenamen
    -   Bahnübergänge
-   Kalender mit Erinnerungen und Gruppen
-   Alarmdrucker Papierlevel-Warnung
-   ...

## 🖥️ Installation, Update, Einstellungen

[Siehe Dokumentation ...](./docs/Uebersicht.md)

## ❓ Fragen / Anregungen

Bei Fragen oder Anregungen einfach in GitHub oben unter Issues ein Issue erstellen.

## 🔨 Built With

-   nodejs - https://nodejs.org/
-   npm - https://www.npmjs.com/
-   OpenLayers - https://openlayers.org/
-   Bing Geocode - https://www.bing.com/api/maps/sdk/mapcontrol/isdk/searchbyaddress
-   openstreetmap - https://www.openstreetmap.org/fixthemap
-   Hillshading - https://klokantech.github.io/dare-raster-tiles/hillshade/
-   Overpass - https://wiki.openstreetmap.org/wiki/DE:Overpass_API
-   OpenFireMap - https://wiki.openstreetmap.org/wiki/DE:OpenFireMap
-   Nominatim Geocode - https://nominatim.openstreetmap.org/
-   diff-match-patch - https://github.com/google/diff-match-patch
-   Diashow - https://gist.github.com/mhulse/66bcbb7099bb4beae530
-   Bahnübergänge - https://data.deutschebahn.com/dataset/geo-bahnuebergang
-   Forst Rettungspunkte - https://rettungspunkte-forst.de
-   Google Noto Font - https://www.google.com/get/noto/help/emoji/
-   PDF.js - https://mozilla.github.io/pdf.js/
-   Taktische-Zeichen - https://github.com/jonas-koeritz/Taktische-Zeichen

## 📋 Authors

-   _Johannes Resch - Freiwillige Feuerwehr Fischbachau_

## ©️ License

This project is licensed under the GNU GPLv3 License - see the [LICENSE.md](LICENSE.md) file for
details

## ©️ Haftungsausschluss und Datenschutz

Ich übernehme keine Haftung für die Funktion der Software vor Ort. Da über diese Software sensible
personenbezogene Daten verarbeitet werden, ist der Datenschutz vor Ort insbesondere zu beachten. Vor
allem sollte ein Augenmerk auf die Datensparsamkeit gelegt werden. Damit verbunden ist die strenge
Entscheidung, wer welche Daten per E-Mail, SMS oder externen Systemen weitergeleitet bekommt. Im
Zweifel ist der Programmcode entsprechend anzupassen.

## 📷 Screenshots

| Standby                                | Alarm                                  |
| -------------------------------------- | -------------------------------------- |
| ![Bild](./docs/Screenshot1.PNG 'Bild') | ![Bild](./docs/Screenshot2.PNG 'Bild') |
| App                                    | Telegram                               |
| ![Bild](./docs/Screenshot4.PNG 'Bild') | ![Bild](./docs/Screenshot3.PNG 'Bild') |
| Auto Bildschirm                        | Auto Bildschirm                        |
| ![Bild](./docs//Auto/pic_1.png 'Bild') | ![Bild](./docs//Auto/pic_2.png 'Bild') |
