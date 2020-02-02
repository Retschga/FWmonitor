# FWMonitor

Diese Software kann bei Feuerwehren dazu verwendet werden, die Informationen des Alarmfax auf einem Bildschirm darzustellen. 
Insbesondere werden die Informationen so aufbereitet, dass der Einsatzort auf einer Karte visualisiert wird.

Die Faxauswertung ist derzeit auf die ILS Rosenheim abgestimmt.

## Funktionsumfang

* Standby Display mit Uhrzeit, Diashow, Google Kalender, Verfügbarkeitsanzeige der Einsatzkräfte, DWD Warnungen
* Telegram Messenger Integration mit Alarminfo (Einstellbar für verschiedene Personengruppen), Google Kalender, Verfügbarkeitsanzeige
* Alarmdisplay mit allen relevanten Infos aus dem Alarmfax, Kartenanzeige, Verfügbarkeitsanzeige der Einsatzkräfte

## Installation

Windows: Empfehlung: EM-OCR https://feuersoftware.com/forum/index.php?thread/2125-em-ocr-einsatzmonitor-pdf-tiff-txt-fax-konverter-mit-ordner%C3%BCberwachung/

Benötigte Programme:
 - (Ghostscript: https://www.ghostscript.com/download/gsdnld.html)
 - NodeJS: https://nodejs.org/de/
 - FoxitReader: https://www.foxitsoftware.com/de/pdf-reader/
 - Git: https://git-scm.com/downloads

In Konsole:
 - git clone https://github.com/Retschga/FWMonitor.git
 - cd "FWMonitor"
 - npm install package.json
 - npm i puppeteer

"save.sqlite3 - Leer" zu "save.sqlite3" umbenennen

".env - Leer" Datei zu ".env" umbenennen

Alle relevanten Einstellungen in der .env Datei bearbeiten
Der Archivordner sollte der gleiche sein, in dem die Orginal Fax PDF´s / TIFF´s abgelegt sind (für Telegram Alarmfaxsendefunktion)

Logo unter "public/images/logo.png" austauschen

Bilder für Diashow im Standby unter "public/images/slideshow" einfügen

Forst Rettungspunkte Datei  (https://www.kwf-online.de/index.php/wissenstransfer/waldarbeit/84-rettungspunkte-download) Filtern (mit Excel/LibreOffice), dann
alle Kommas durch Punkte ersetzen (über suchen und ersetzen), dann mit http://www.convertcsv.com/csv-to-geojson.htm zu GeoJSON umwandeln, 
dann unter /public/rettPunkte.geojson speichern

## Programmstart

node app

## Hydrantenfunktion

Mit Telegram unter Einstellungen können Positionen von Hydranten gesendet werden.
Diese befinden sich dann im Hydrantenordner. Mithilfe von https://www.osmhydrant.org/de/ können diese
in OpenStreetMap eingetragen werden.

## Built With

* nodejs - The web framework used
* npm - Dependency Management
* jquery
* leaflet
* Bing Geocode
* openstreetmap - https://www.openstreetmap.org/fixthemap
*   Hillshading - https://klokantech.github.io/dare-raster-tiles/hillshade/
* 	Overpass - https://wiki.openstreetmap.org/wiki/DE:Overpass_API
* 	OpenFireMap - https://wiki.openstreetmap.org/wiki/DE:OpenFireMap
* Ghostscript https://www.ghostscript.com/download/gsdnld.html


## Authors

*  *Freiwillige Feuerwehr Fischbachau*

## License

This project is licensed under the GNU GPLv3  License - see the [LICENSE.md](LICENSE.md) file for details

## Haftungsausschluss und Datenschutz

Ich übernehme keine Haftung für die Funktion der Software vor Ort. Da über diese Software sensible personenbezogene Daten verarbeitet werden, ist der Datenschutz vor Ort insbesondere zu beachten. Vor allem sollte ein Augenmerk auf die Datensparsamkeit gelegt werden. Damit verbunden ist die strenge Entscheidung, wer welche Daten per E-Mail, SMS oder externen Systemen weitergeleitet bekommt. Im Zweifel ist der Programmcode entsprechend anzupassen.

