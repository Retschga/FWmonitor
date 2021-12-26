# Installation Server

## Raspberry PI

### Vorraussetzungen

-   GIT `sudo apt-get install git`
-   CUPS https://www.elektronik-kompendium.de/sites/raspberry-pi/2007081.htm
    -   im Browser unter `127.0.0.1:631` CUPS konfigurieren (Login gleich wie Raspberry):
        gewünschten Drucker als `Alarmdrucker` (Name) einrichten;
-   NodeJS 14 https://www.w3schools.com/nodejs/nodejs_raspberrypi.asp
-   Tesseract `sudo apt-get install tesseract-ocr`
    -   (Test mit: `tesseract -v`)
-   Ghostscript `sudo apt-get install ghostscript`

## Faxeingang

-   Faxeingang über Fritzbox - Email:
    1. Fritzbox Konfiguration Faxweiterleitung zu Email
    2. Konfiguration Email Alarmeingang
-   Faxeingang über Fritzbox - Datei:
    -   siehe https://strobelstefan.org/?p=5405
    -   siehe:
        https://forum-raspberrypi.de/forum/thread/40061-netzwerkfreigabe-mounten-mit-systemd-mount-unit/
-   Faxeingang über USB Faxmodem: siehe https://wiki.ubuntuusers.de/HylaFAX/

## Installation Server

1. Aktuelle Version Datei unter Releases herunterladen, extrahieren
2. In Konsole

-   `cd "FWmonitor"`
-   `sudo npm install --production`
-   `sudo npm i puppeteer`

## Programmstart (manuell)

In Konsole:

-   Raspberry: `sudo ./start.sh`

## Programmstart (automatisch)

-   `sudo crontab -e`
-   `@reboot PFAD_ZU_FWMONITOR/start.sh` hinzufügen oder
-   `@reboot PFAD_ZU_FWMONITOR/start_ueberwacht.sh` hinzufügen (vorher `npm install pm2@latest -g`)

-   [Für überwachte Ausführung siehe...](Ueberwachung.md)
