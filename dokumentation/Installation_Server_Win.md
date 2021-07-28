# Installation Server

## Windows 10

### Vorraussetzungen

-   NodeJS 14: https://nodejs.org/de/
-   FoxitReader: https://www.foxitsoftware.com/de/pdf-reader/
-   Git: https://git-scm.com/downloads
-   Ghostscript: https://www.ghostscript.com/download/gsdnld.html
-   Tesseract: https://digi.bib.uni-mannheim.de/tesseract/
    -   Bei Installation auswählen: Additional Language Data > German

## Installation Server

1. Aktuelle Version Datei unter Releases herunterladen, extrahieren
2. In Konsole (Rechtsklick - Git Bash here)
    - `cd "FWmonitor"`
    - `npm install --production`
    - `npm i puppeteer`

## Einstellungen bearbeiten

-   [Einstellungen Server](Einstellungen_Server.md)

## Programmstart (manuell)

In Konsole (Rechtsklick - Git Bash here):

-   Windows: `start.bat` oder `./start.bat`

## Programmstart (automatisch)

-   unter `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp` Verknüpfung zu start.bat
    erstellen
