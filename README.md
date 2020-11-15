# FWMonitor

Diese Software kann bei Feuerwehren dazu verwendet werden, die Informationen des Alarmfax auf einem Bildschirm darzustellen. 
Insbesondere werden die Informationen so aufbereitet, dass der Einsatzort auf einer Karte visualisiert wird.

Die Faxauswertung ist derzeit auf die ILS Rosenheim abgestimmt (kann aber am Anfang der alarmFax.js Datei angepasst werden).

## Funktionsumfang

* Standby-Display mit Uhrzeit, Diashow, Kalender/Google Kalender, Verfügbarkeitsanzeige der Einsatzkräfte, DWD Warnungen
* Alarm-Display
	* Alle relevanten Infos aus dem Alarmfax
	* Kartenanzeige
	* Rückmeldungen der Einsatzkräfte
* PDF-Display für Schulungspräsentationen etc.
* Telegram Messenger 
	* Alarminfo (Einstellbar für verschiedene Personengruppen: Fax, Schlagwort, ...)
	* Rückmeldungen zum Alarm
	* Kalender mit Terminerinnerungen (Einstellbar für verschiedene Personengruppen)
	* Verfügbarkeits Anzeige/Einstellung
	* Einsatzstatistik
	* Hydrantenposition eintragen
* Installierbare WebApp für Android und IOS
	* Alarminfo (Einstellbar für verschiedene Personengruppen: Fax, Schlagwort, ...)
	* Rückmeldungen zum Alarm
	* Kalender mit Terminerinnerungen (Einstellbar für verschiedene Personengruppen)
	* Bearbeiten des Kalenders
	* Verfügbarkeits Anzeige/Einstellung
	* Verfügbarkeits Pläne (Wochentagsweise)
	* Hydrantenkarte
	* Einsatzstatistik
	* Admin-Optionen
		* Benutzereinstellungen
		* Kalendergruppen
		* Alarmgruppen
		* Präsentationssteuerung
* Kartenausdruck
* Adress-Koordinaten Suche über
	* Bing
	* Nominatim
	* OSM Gebäudenamen
	* Bahnübergänge
* Kalender mit Erinnerungen und Gruppen
* Alarmdrucker Papierlevel-Warnung
* ...

## Installation

Raspberry PI: 
 - GIT installieren `sudo apt-get install git`
 - CUPS installieren siehe https://www.elektronik-kompendium.de/sites/raspberry-pi/2007081.htm 
 - `sudo apt-get install printer-driver-cups-pdf`
 - im Browser unter `127.0.0.1:631` CUPS konfigurieren (Login gleich wie Raspberry): 
   gewünschten Drucker als `Alarmdrucker` (Name) einrichten; PDF-Printer als `PDFPrint` (Name) einrichten 
 - https://wiki.ubuntuusers.de/CUPS-PDF/#ndern-des-Speicherorts - Archivordner einstellen (am besten als ganzer Pfad /home/pi/...)
 - NodeJS installiern siehe https://www.w3schools.com/nodejs/nodejs_raspberrypi.asp
 - Tesseract installieren `sudo apt-get install tesseract-ocr`  
   (Test mit: `tesseract -v`)
 - `cd /home/pi/Desktop/`
 - Faxeingang über Fritzbox: siehe https://strobelstefan.org/?p=5405 und https://pypi.org/project/pdf2image/ und https://github.com/windele/alarmdisplay-ffw/blob/master/infos/Installation_auf_Raspberry_Pi.md
 - Faxeingang über USB Faxmodem: siehe https://wiki.ubuntuusers.de/HylaFAX/
 

Windows:	
 - Empfehlung: EM-OCR https://feuersoftware.com/forum/index.php?thread/2125-em-ocr-einsatzmonitor-pdf-tiff-txt-fax-konverter-mit-ordner%C3%BCberwachung/  
 - NodeJS: https://nodejs.org/de/
 - FoxitReader: https://www.foxitsoftware.com/de/pdf-reader/
 - Git: https://git-scm.com/downloads


Bei beiden: In Konsole (Windows: Rechtsklick - Git Bash here) sudo unter Windows evtl. nicht notwendig:
 - `git clone https://github.com/Retschga/FWMonitor.git`
 - `cd "FWMonitor"`
 - `sudo npm install --unsafe-perm`
 - `sudo npm i puppeteer`
 
 
## Update
 
- Einfach die Dateien nochmal herunterladen und die alten ersetzen
- .env (Ist-Stand) mit .env-leer (Soll-Stand) vergleichen, gegebenfalls Einträge hinzufügen/ändern/löschen
- Libraries updaten `npm install`
- Software neu starten 
 
## Autostart 

Raspberry:
 - `sudo crontab -e`; darin `@reboot PFAD_ZU_FWMONITOR/start.sh > /home/pi/Desktop/log.txt` hinzufügen (Nur bei Programminstallation direkt auf dem Raspberry)
 - Um Browser automatisch im Vollbild zu starten:
   mit `mkdir /home/pi/.config/lxsession/LXDE-pi/` erstellen
   dann `nano /home/pi/.config/lxsession/LXDE-pi/autostart` und Inhalt einfügen:
    ```
	@xset s off
	@xset -dpms
	@xset s noblank

	sed -i 's/"exited_cleanly": false/"exited_cleanly": true/' \
		~/.config/google-chrome/Default/Preferences

	sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$HOME/.config/google-chrome/Local State"

	sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/'Local State'
	sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]\+"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences

	sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' /home/pi/.config/chromium/Default/Preferences
	sed -i ‘s/”exit_type”: “Crashed”/”exit_type”: “Normal”/’ /home/pi/.config/chromium/Default/Preferences


	@chromium-browser --disable-features=InfiniteSessionRestore --disable-session-crashed-bubble --no-first-run --noerrors --disable-infobars --enable-webgl --ignore-gpu-blacklist --start-fullscreen --app=http://HIER_IP_ADRESSE_EINTRAGEN:8080/
	@unclutter -idle 0
	```
	
- evtl Neustart jeden Tag 09:00 Uhr:
	- `sudo crontab -e`
	-  darin `00 09 * * * /sbin/shutdown -r now` hinzufügen

Windows:
 - unter `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp` Verknüpfung zu start.bat erstellen
 - Um den Browser automatisch zu starten: siehe https://blog.moortaube.de/2017/02/21/google-chrome-im-fullscreen-%C3%B6ffnen/

## Einstellungen

`save.sqlite3 - Leer` zu `save.sqlite3` umbenennen (Konsole: Windows: `ren "save.sqlite3 - Leer" "save.sqlite3"`; Raspberry: `mv "save.sqlite3 - Leer" "save.sqlite3"`)

`.env - Leer` Datei zu `.env` umbenennen (Konsole: Windows: `ren ".env - Leer" ".env"`; Raspberry: `mv ".env - Leer" ".env"`)

Alle relevanten Einstellungen in der .env Datei bearbeiten
Der Archivordner sollte der gleiche sein, in dem die Orginal Fax PDF´s / TIFF´s abgelegt werden (für Telegram Alarmfaxsendefunktion)

Logo unter `public/images/logo.png` austauschen

Bilder für Diashow im Standby unter `public/images/slideshow` einfügen

Forst Rettungspunkte Datei  ( https://www.kwf-online.de/index.php/wissenstransfer/waldarbeit/84-rettungspunkte-download ) Filtern (mit Excel/LibreOffice), dann
alle Kommas durch Punkte ersetzen (über suchen und ersetzen), dann mit http://www.convertcsv.com/csv-to-geojson.htm zu GeoJSON umwandeln, 
dann unter `/public/rettPunkte.geojson` speichern


Veränderte Einstellungen erfordern immer einen Software Neustart!

## Fragen / Anregungen

Bei Fragen oder Anregungen einfach in GitHub oben unter Issues ein Issue erstellen.

## APP Funktion
- In Fritzbox mit MyFritz (Internet > MyFRITZ!-Konto) anmelden
- Unten "Ihre MyFritz!-Adresse" kopieren und in .env unter "APP_DNS" einfügen
- In Fritzbox Portfreigabe einrichten (Internet > Freigaben > Portfreigaben > Gerät für Freigaben hinzufügen)
- Gerät, auf dem FWmonitor läuft auswählen
- dann unten "Neue Freigabe", dann "MyFRITZ!-Freigabe" HTTP-Server
- dann unten "Neue Freigabe", dann "MyFRITZ!-Freigabe" HTTPS-Server

- Windows: 
	- https://certbot.eff.org/lets-encrypt/windows-other befolgen
	- Cert und Key von C:\Certbot\live\ unter .env als "HTTPS_KEY" und "HTTPS_CERT" eintragen
- Raspberry Pi:
	- `cd ~`
	- `git clone https://github.com/letsencrypt/letsencrypt`
	- `cd letsencrypt`
	- `./letsencrypt-auto -d ERSTE_DOMAIN -d ZWEITE_DOMAIN --redirect -m DEINE_MAIL --standalone`

- Alternativ zu MyFritz kann auch ein anderer DynDNS Dienst oder eine feste IP verwendet werden

- Port 8080 bzw. un .env eingestellter "HTML_PORT" darf keinesfalls freigegeben werden! (hier besteht kein Passwortschutz)

- In Konsole: `./node_modules/.bin/web-push generate-vapid-keys` ausführen
- Werte in .env unter "VAPID" eintragen

- Auto Renew Let´s Encrypt
	- Windows: Aufgabenplanung öffnen
		- Eingache aufgabe erstellen (rechts) 
		- Name: certbot 
		- Wöchentlich 
		- Sonntag 
		- Programm Starten
		- Programm/Skript: certbot
		- Argumente hinzufügen: renew
	- Raspberry Pi: `sudo crontab -e`
		- `0 0 * * 0 ./letsencrypt-auto -d ERSTE_DOMAIN --redirect -m DEINE_MAIL --agree-tos --renew-by-default --standalone


## Programmstart (manuell)

In Konsole (Windows: Rechtsklick - Git Bash here):
 - `node app`
 
Nun im Webbrowser die IP-Adresse:8080 des Computers eingeben, auf dem FWmonitor läuft.
(Herauszufinden in Konsole: Windows: ipconfig; Raspberry: ifconfig; Eigener PC: 127.0.0.1)
Bsp: 192.168.2.153:8080 oder 127.0.0.1:8080

## Benutzer hinzufügen
Einfach dem erstellten Telegram-Bot /start schreiben.
Nun kann der Benutzer über die Einstellungen freigegeben werden.

## Hydrantenfunktion

Mit Telegram unter Einstellungen können Positionen von Hydranten gesendet werden.
Diese befinden sich dann im Hydrantenordner. Mithilfe von https://www.osmhydrant.org/de/ können diese
in OpenStreetMap eingetragen werden.

## Telegram

- Nutzer-Erstverbindung: Dem erstellten bot /start schreiben bzw. Knopf drücken. Nun muss der Benutzer unter Einstellungen freigegeben werden.
- Falls die Telegram Tastatur nicht mehr angezeigt wird, einfach irgendeinen Text an den Bot senden und es sollte wider erscheinen.

## Alarmdrucker Papierüberwachung

Es wird eine Warnung an ausgewählte Personen gesendet, falls das Druckerpapier leer ist.
In .env die Internetseite des Alarm-Netzwerkdruckers und das zu suchende Pattern eintragen, auf der der Papierlevel angezeigt wird.

## Bewegungsmelder Steuerskript (Raspberry PI)
- Anschluss des PIR siehe anschlussplan.PNG (Bei Verwendung eines Relais an 230V: Anschluss nur durch berechtigte Personen. Verwenden auf eigene Gefahr!)
- Autostart: `sudo crontab -e` 
- darin `@reboot python "/home/pi/steuer.py" #>> "/home/pi/steuer.log"` hinzufügen

Alternativ siehe auch: https://github.com/t08094a/alarmDisplay/tree/master/kiosk/MonitorActivation


## Built With

* nodejs - The web framework used
* npm - Dependency Management
* jquery
* leaflet
* OpenLayers 3
* Bing Geocode
* openstreetmap - https://www.openstreetmap.org/fixthemap
*   Hillshading - https://klokantech.github.io/dare-raster-tiles/hillshade/
* 	Overpass - https://wiki.openstreetmap.org/wiki/DE:Overpass_API
* 	OpenFireMap - https://wiki.openstreetmap.org/wiki/DE:OpenFireMap
* 	Nominatim Geocode - https://nominatim.openstreetmap.org/
* diff-match-patch - https://github.com/google/diff-match-patch
* Diashow - https://gist.github.com/mhulse/66bcbb7099bb4beae530
* Python Timer - https://gist.github.com/aeroaks/ac4dbed9c184607a330c
* MobileUi - https://mobileui.github.io/
* Bahnübergänge - https://data.deutschebahn.com/dataset/geo-bahnuebergang

## Authors

*  *Resch - Freiwillige Feuerwehr Fischbachau*

## License

This project is licensed under the GNU GPLv3  License - see the [LICENSE.md](LICENSE.md) file for details

## Haftungsausschluss und Datenschutz

Ich übernehme keine Haftung für die Funktion der Software vor Ort. Da über diese Software sensible personenbezogene Daten verarbeitet werden, ist der Datenschutz vor Ort insbesondere zu beachten. Vor allem sollte ein Augenmerk auf die Datensparsamkeit gelegt werden. Damit verbunden ist die strenge Entscheidung, wer welche Daten per E-Mail, SMS oder externen Systemen weitergeleitet bekommt. Im Zweifel ist der Programmcode entsprechend anzupassen.


## Screenshots

![Bild](/Screenshot1.PNG "Bild")
![Bild](/Screenshot2.PNG "Bild")
![Bild](/Screenshot3.PNG "Bild")
![Bild](/Screenshot4.PNG "Bild" | width=250)
