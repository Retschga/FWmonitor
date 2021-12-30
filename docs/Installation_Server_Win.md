# Installation Server

## Windows 10 (64 bit)

### Vorraussetzungen

-   NodeJS 14: https://nodejs.org/download/release/v14.18.1/
-   FoxitReader: https://www.foxitsoftware.com/de/pdf-reader/
-   Git: https://git-scm.com/downloads
-   Ghostscript: https://www.ghostscript.com/releases/gsdnld.html
-   Tesseract: https://digi.bib.uni-mannheim.de/tesseract/

    -   Bei Installation auswählen: Additional Language Data > German

## Faxeingang

-   Faxeingang über Fritzbox:
    1. Fritzbox Konfiguration Faxweiterleitung zu Email
    2. Konfiguration Email Alarmeingang
-   Faxeingang über Fritzbox:
    1. Frtitzbox Konfiguration Faxempfang 'Intern ablegen'
    2. Netzwerklaufwerk für `\\Fritzbox\fritzbox\FRITZ\faxbox` einrichten
    3. Konfiguration Datei Alarmeingang

## Installation Server

1. Aktuelle Versions-Datei unter Releases herunterladen, extrahieren
   (https://github.com/Retschga/FWmonitor/releases)
2. In Konsole (Rechtsklick - Git Bash here)
    - `cd "FWmonitor"`
    - `npm install --production`
    - `npm i puppeteer`
3. Wenn bei der Installation von better-sqlite ein fehler auftritt, muss Python installiert werden
   und bei der Installation von Node der Haken mit den Buildtools gesetzt werden.

## Einstellungen bearbeiten

-   [Einstellungen Server](Einstellungen_Server.md)

## Programmstart (manuell)

In Konsole (Rechtsklick - Git Bash here):

-   Windows: `start.bat` oder `./start.bat`

## Programmstart (automatisch)

-   unter `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp` Verknüpfung zu start.bat
    erstellen, oder
-   unter `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp` Verknüpfung zu
    start_ueberwacht.bat erstellen (vorher `npm install pm2@latest -g`)

-   [Für überwachte Ausführung siehe...](Ueberwachung.md)
