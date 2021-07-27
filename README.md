# FWMonitor

Diese Software kann bei Feuerwehren dazu verwendet werden, die Informationen des Alarmfax auf einem
Bildschirm darzustellen. Insbesondere werden die Informationen so aufbereitet, dass der Einsatzort
auf einer Karte visualisiert wird.

Die Faxauswertung ist derzeit auf die ILS Rosenheim abgestimmt (kann aber am Anfang der alarmFax.js
Datei angepasst werden). E-Mail Empfang ist zum Test verfügbar. Funktion nicht garantiert.

## Funktionsumfang

-   Standby-Display mit Uhrzeit, Diashow, Kalender/Google Kalender, Verfügbarkeitsanzeige der
    Einsatzkräfte, DWD Warnungen
-   Alarm-Display
    -   Alle relevanten Infos aus dem Alarmfax
    -   Kartenanzeige
    -   Rückmeldungen der Einsatzkräfte
-   PDF-Display für Schulungspräsentationen etc.
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

## Installation Server

Raspberry PI:

-   GIT `sudo apt-get install git`
-   CUPS siehe https://www.elektronik-kompendium.de/sites/raspberry-pi/2007081.htm
-   im Browser unter `127.0.0.1:631` CUPS konfigurieren (Login gleich wie Raspberry): gewünschten
    Drucker als `Alarmdrucker` (Name) einrichten;
-   NodeJS 14 installiern siehe https://www.w3schools.com/nodejs/nodejs_raspberrypi.asp
-   Tesseract `sudo apt-get install tesseract-ocr`  
    (Test mit: `tesseract -v`)
-   Ghostscript `sudo apt-get install ghostscript`
-   `cd /home/pi/Desktop/`
-   Faxeingang über Fritzbox: siehe https://strobelstefan.org/?p=5405
-   Faxeingang über USB Faxmodem: siehe https://wiki.ubuntuusers.de/HylaFAX/

Windows:

-   NodeJS 14: https://nodejs.org/de/
-   FoxitReader: https://www.foxitsoftware.com/de/pdf-reader/
-   Git: https://git-scm.com/downloads
-   Ghostscript: https://www.ghostscript.com/download/gsdnld.html
-   Tesseract: https://digi.bib.uni-mannheim.de/tesseract/ Bei Installation auswählen: Additional
    Language Data > German

Bei beiden: In Konsole (Windows: Rechtsklick - Git Bash here) (sudo unter Windows weglassen):

-   Aktuelle Version Datei unter Releases herunterladen, extrahieren
-   `cd "FWmonitor"`
-   `npm install --production`
-   `npm i puppeteer`

## Update von Version 2 auf 3

-   Achtung: Es kann nur von Version 2.4.0 einfach auf 3.0.0 geupdatet werden
-   Achtung: Es wird Nodejs 12 vorausgesetzt; Bei Nutzung von Windows 7 am besten auf Windows 10
    updaten oder Nodejs Verion v12.21.0 verwenden
-   Zum Update auf Version 3 am besten Version 3 herunderladen und in einem neuen Verzeichnis
    installieren (Installation Server beachten), anschließend kann die Datenbank von Version 2.4.0
    in den neuen Ordner kopiert werden und somit die Daten/Benutzer übernommen werden.

## Update

-   NodeJS 14: https://nodejs.org/de/
-   npm: `npm install -g npm@latest`
-   Updatehinweise beachten
-   Einfach die neue Version unter Releases herunterladen und die alten ersetzen (evtl. vorher
    Sicherungskopie anlegen)
-   Achtung bei eigens veränderten Dateien (Wappen, ...), diese unter Umständen nicht überschreiben
-   .env (Ist-Stand) mit .env-leer (Soll-Stand) vergleichen, gegebenfalls Einträge
    hinzufügen/ändern/löschen
-   Libraries updaten `npm install --production`
-   Wenn nötig die verbundenen Geräte unter Einstellungen updaten
-   Software neu starten

## Einstellungen

Für den Server PC/Raspberry PI sollte eine feste IP-Adresse vergeben sein!

`.env - Leer` Datei zu `.env` umbenennen (Konsole: Windows: `ren ".env - Leer" ".env"`; Raspberry:
`mv ".env - Leer" ".env"`)

Alle relevanten Einstellungen in der .env Datei bearbeiten

Bilder für Diashow im Standby im Ordner `./filesDiashow` einfügen

Forst Rettungspunkte Datei ( https://kwf2020.kwf-online.de/rettungspunkte-download/ ) Filtern (mit
Excel/LibreOffice), dann alle Kommas durch Punkte ersetzen (über suchen und ersetzen), dann mit
http://www.convertcsv.com/csv-to-geojson.htm zu GeoJSON umwandeln, dann unter
`./filesPublic/rettPunkte.geojson` speichern

Veränderte Einstellungen erfordern immer einen Software Neustart!

## APP Funktion

-   In Fritzbox mit MyFritz (Internet > MyFRITZ!-Konto) anmelden
-   Unten "Ihre MyFritz!-Adresse" kopieren und in .env unter "APP_DNS" einfügen
-   In Fritzbox Portfreigabe einrichten (Internet > Freigaben > Portfreigaben > Gerät für Freigaben
    hinzufügen)
-   Gerät, auf dem FWmonitor läuft auswählen
-   dann unten "Neue Freigabe", dann "MyFRITZ!-Freigabe" HTTP-Server
-   dann unten "Neue Freigabe", dann "MyFRITZ!-Freigabe" HTTPS-Server

-   Windows:
    -   https://certbot.eff.org/lets-encrypt/windows-other befolgen
    -   Cert und Key von C:\Certbot\live\ unter .env als "HTTPS_KEY" und "HTTPS_CERT" eintragen
-   Raspberry Pi:

    -   `cd ~`
    -   `git clone https://github.com/letsencrypt/letsencrypt`
    -   `cd letsencrypt`
    -   `./letsencrypt-auto -d ERSTE_DOMAIN -d ZWEITE_DOMAIN --redirect -m DEINE_MAIL --standalone`

-   Alternativ zu MyFritz kann auch ein anderer DynDNS Dienst oder eine feste IP verwendet werden

-   Port 8080 bzw. in .env eingestellter "HTTP_PORT" darf keinesfalls freigegeben werden! (hier
    besteht kein Passwortschutz/Verschlüsselung)

-   In Konsole: `./node_modules/.bin/web-push generate-vapid-keys` ausführen
-   Werte in .env unter "VAPID" eintragen

-   Auto Renew Let´s Encrypt
    -   Windows: Aufgabenplanung öffnen
        -   Eingache aufgabe erstellen (rechts)
        -   Name: certbot
        -   Wöchentlich
        -   Sonntag
        -   Programm Starten
        -   Programm/Skript: certbot
        -   Argumente hinzufügen: renew
    -   Raspberry Pi: `sudo crontab -e`
        -   `0 0 \* \* 0 ./letsencrypt-auto -d ERSTE_DOMAIN --redirect -m DEINE_MAIL --agree-tos
            --renew-by-default --standalone

## Programmstart (manuell)

In Konsole (Windows: Rechtsklick - Git Bash here):

-   Windows: `start.bat` oder `./start.bat`
-   Raspberry: `sudo ./start.sh`

Nun im Webbrowser die IP-Adresse:8080 des Computers eingeben, auf dem FWmonitor läuft.
(Herauszufinden in Konsole: Windows: ipconfig; Raspberry: ifconfig; Eigener PC: 127.0.0.1) Bsp:
192.168.2.153:8080 oder 127.0.0.1:8080

## Autostart / Installation des Displays

Raspberry:

-   Benötigt min. Raspian buster
-   `sudo apt-get update`
-   `sudo apt-get upgrade`
-   Server:
    -   `sudo crontab -e`; darin `@reboot PFAD_ZU_FWMONITOR/start.sh > /home/pi/Desktop/log.txt`
        hinzufügen
-   Display: IP_ADRESSE=IP Adresse des Servers
    -   `wget IP_ADRESSE:PORT/scripts/installDisplay.sh`
    -   `sudo chmod +x installDisplay.sh`
    -   `sudo ./installDisplay.sh IP_ADRESSE:8080 CLIENT_NAME`

Windows:

-   Server:
    -   unter `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp` Verknüpfung zu
        start.bat erstellen
-   Display:
    -   Um den Browser automatisch zu starten: siehe
        https://blog.moortaube.de/2017/02/21/google-chrome-im-fullscreen-%C3%B6ffnen/

## Benutzer hinzufügen

Einfach dem erstellten Telegram-Bot /start schreiben. Nun kann der Benutzer über die Einstellungen
freigegeben werden. Der allererste Benutzer der dem Bot nach der Programmistallation schreibt wird
automatisch als Andministrator freigegeben.

## Telegram

-   Falls die Telegram Tastatur nicht mehr angezeigt wird, einfach irgendeinen Text an den Bot
    senden und es sollte wider erscheinen.

## Hydrantenfunktion

Mit Telegram unter Einstellungen können Positionen von Hydranten gesendet werden. Diese befinden
sich dann im Hydrantenordner. Mithilfe von https://www.osmhydrant.org/de/ können diese in
OpenStreetMap eingetragen werden.

## Alarmdrucker Papierüberwachung

Es wird eine Warnung an ausgewählte Personen gesendet, falls das Druckerpapier leer ist. In .env die
Internetseite des Alarm-Netzwerkdruckers und das zu suchende Pattern eintragen, auf der der
Papierlevel angezeigt wird.

## Bewegungsmelder Steuerskript (Raspberry PI)

-   Anschluss des PIR siehe anschlussplan.PNG (Bei Verwendung eines Relais an 230V: Anschluss nur
    durch berechtigte Personen. Verwenden auf eigene Gefahr!)
-   Autostart: `sudo crontab -e`
-   darin die Zeile `@reboot python "/home/pi/steuer####.py"` auskommentieren

Alternativ siehe auch: https://github.com/t08094a/alarmDisplay/tree/master/kiosk/MonitorActivation

## Fragen / Anregungen

Bei Fragen oder Anregungen einfach in GitHub oben unter Issues ein Issue erstellen.

## Built With

-   nodejs - https://nodejs.org/
-   npm - https://www.npmjs.com/
-   OpenLayers 3 - https://openlayers.org/
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
-   Kalender - https://codepen.io/peanav/pen/ulkof
-   PDF.js - https://mozilla.github.io/pdf.js/

## Hardware Empfehlung

-   Server:
    -   Windows 10 PC
    -   min. Raspberry PI 3
-   Client:
    -   min. Raspberry PI 2
    -   für WLAN min. Raspberry PI 3

## Getestete Aufbauten

```
---       Kabel
)))  (((  WiFi

----------     -------------     ----------------     -----------
| Router |-----| USB-Modem |-----| Raspberry PI |-----| Monitor |
---------- |   -------------     |  Server      |     -----------
           ----------------------|  Display     |
           |   -----------       ----------------
           ----| Drucker |
               -----------

------------     -------------------          ------------------------     -----------
| Fritzbox |-----| Win10 PC Server | )))  ((( | Raspberry PI Display |-----| Monitor |
------------ |   -------------------          ------------------------     -----------
             |   -----------
             ----| Drucker |
                 -----------

------------          -------------------          ------------------------     -----------
| Fritzbox | )))  ((( | Win10 PC Server | )))  ((( | Raspberry PI Display |-----| Monitor |
------------ |        -------------------          ------------------------     -----------
             |   -----------
             ----| Drucker |
                 -----------
```

## Authors

-   _Johannes Resch - Freiwillige Feuerwehr Fischbachau_

## License

This project is licensed under the GNU GPLv3 License - see the [LICENSE.md](LICENSE.md) file for
details

## Haftungsausschluss und Datenschutz

Ich übernehme keine Haftung für die Funktion der Software vor Ort. Da über diese Software sensible
personenbezogene Daten verarbeitet werden, ist der Datenschutz vor Ort insbesondere zu beachten. Vor
allem sollte ein Augenmerk auf die Datensparsamkeit gelegt werden. Damit verbunden ist die strenge
Entscheidung, wer welche Daten per E-Mail, SMS oder externen Systemen weitergeleitet bekommt. Im
Zweifel ist der Programmcode entsprechend anzupassen.

## Screenshots

![Bild](/Screenshot1.PNG 'Bild') ![Bild](/Screenshot2.PNG 'Bild') ![Bild](/Screenshot3.PNG 'Bild')
![Bild](/Screenshot4.PNG 'Bild') ![Bild]('/Auto Bildschirm/pic.png' "Bild")
