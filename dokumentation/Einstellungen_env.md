# Einstellungen .env

Optionale Einstellungen können durch ein `#` am Zeilenanfang deaktiviert werden

## Allgemeine Einstellungen

-   `RASPIVERSION: <true|false>`

    -   false: Server läuft auf Windows PC
    -   true: Server läuft auf Raspberry PI

-   `FW_KOORD_LAT: <number> optional`

    -   Breitengrad des Feuerwehrhauses (47.xxxxx)

-   `FW_KOORD_LNG: <number> optional`
    -   Längengrad des Feuerwehrhauses (11.xxxxx)

## API Key´s

-   `TELEGRAM_BOT_TOKEN: <string>`

    -   Bot Token für den Telegram-Bot
    -   Erstellung eines Telegram-Bots: https://core.telegram.org/bots#3-how-do-i-create-a-bot

-   `GEOBING_KEY: <string> optional`

    -   Geobing API Key zur Bestimmung der Koordinaten aus den Ortsangaben

-   `ORS_KEY: <string> optional`
    -   OpenRouteService API Key zur Bestimmung der Route zum Ziel

## Programmpfade

-   `TESSERACT_PATH: <string>`

    -   Pfad zur tesseract.exe (Bei Tesseract Installation merken)
    -   Typisch: C:/Program Files/Tesseract-OCR/tesseract.exe

-   `GHOSTSCRIPT_PATH: <string>`

    -   Pfad zur gswin64c.exe oder gswin32c.exe (Bei Ghostscript Installation merken)
    -   Typisch: C:/Program Files/gs/gs9.53.3/bin/gswin32c.exe
    -   Typisch: C:/Program Files/gs/gs9.53.3/bin/gswin64c.exe

## Ordnerpfade

-   `FOLDER_ARCHIVE: <string> optional`

    -   Pfad zu einem Ordner, in dem die Faxe/Emails archiviert werden sollen
    -   Ist die Einstellung nicht angegeben, so werden diese im Programmverzeichnis unter
        `filesArchive` abgelegt

## Alarmeinstellungen

-   `SENDALARM_TELEGRAM: <true|false>`

    -   false: Es werden keine Alarme über Telegram versendet
    -   true: Es werden Alarme über Telegram versendet

-   `SENDALARM_APP: <true|false>`

    -   false: Es werden keine Alarme über die App Pushbenachrichtigungen versendet
    -   true: Es werden Alarme über die App Pushbenachrichtigungen versendet

-   `ALARM_VISIBLE: <number>`

    -   Zeit in Minuten, wie lange ein Alarm auf den Bildschirmen angezeigt werden soll
    -   Standardwert; kann über die App > Verbundene Geräte jeweils einzeln überschrieben werden

-   `ALARMFIELDS_..._S: <regex>`

    -   Reguläre Ausdrücke die den Start des jeweiligen Feldes markieren

-   `ALARMFIELDS_..._E: <regex>`

    -   Reguläre Ausdrücke die das Ende des jeweiligen Feldes markieren

-   `ALARMFIELDS_REPLACE_NEWLINE: <true|false>`

    -   Gibt an, ob bei Alarmfeldern die Zeilenumbrüche entfernt werden sollen

-   `ALARM_REPLACE_REGEX: <regex>`

    -   Fehlerhafte Texte, welche ersetzt werden sollen
    -   Texte getrennt durch '|' Bsp: 8aum|Ha11e

-   `ALARM_REPLACE_TEXT: <string>`

    -   Korrekte Texte, zu obrigen fehlerhaften
    -   Texte getrennt durch '|' Bsp: Baum|Halle

-   `ALARMFIELDS_FW_NAME: <string>`

    -   Text der in einem Einsatzmittel vorkommen muss, um als eigenes erkannt zu werden

-   `ALARMFIELDS_KOMBI_FW_NAME: <string> optional`
    -   Hat nur eine Funktion, wenn in einem Alarm kein eigenes Einsatzmittel erkannt wurde
    -   Text der in einem Einsatzmittel vorkommen muss, um einen Alarm als Kombi-Mitalarm zu
        erkennen

## EMAIL Alarmeingang

-   `FILTER_EMAIL_BETREFF: <regex> optional`

    -   Regulärer Ausdruck der auf den Betreff einer Email zutreffen muss um diese auszuwerten
        -   Achtung: `ALARM_FILE_TEXTFILTER` wird darauffolgend auch auf die Email Daten angewandt

-   `FILTER_EMAIL_INHALT: <regex> optional`

    -   Regulärer Ausdruck der auf den Inhalt einer Email zutreffen muss um diese auszuwerten
        -   Achtung: `ALARM_FILE_TEXTFILTER` wird darauffolgend auch auf die Email Daten angewandt

-   `ALARM_IN_EMAIL_TEXT: <true|false>`

    -   Gibt an, ob die Alarminformationen im Text der Email enthalten sind

-   `ALARM_IN_EMAIL_ANHANG: <true|false>`

    -   Gibt an, ob die Alarminformationen in einem Anhang der Email enthalten sind
    -   z.B. bei Fax-Email Weiterleitung der FritzBox

-   `Emailadresse: <string> optional`

    -   Email-Adresse/Benutzername des Email-Accounts
    -   Wenn diese Einstellung angegeben ist wird der Email-Alarmeingang aktiviert -> Alle folgenden
        Email-Einstellungen sind nicht mehr optional

-   `ALARM_IN_EMAIL_PASSWORT: <string> optional abhängig`

    -   Passwort des Email-Accounts

-   `ALARM_IN_EMAIL_HOST: <string> optional abhängig`

    -   IMAP Serveradresse/Host des Email-Accounts
    -   Bei Gmail: imap.gmail.com

-   `ALARM_IN_EMAIL_PORT: <number> optional abhängig`

    -   SSL/TLS Port des IMAP Email-Servers
    -   Typisch: 993

-   `ALARM_IN_EMAIL_SERVERNAME: <string> optional`

    -   SSL/TLS Servername des IMAP Email-Servers
    -   Wird gebraucht, falls es Anmeldefehler am Server gibt
    -   Bei Gmail: imap.gmail.com

## FAX/Datei Alarmeingang

-   `ALARM_FILE_FOLDER_IN: <string> optional`

    -   Ordnerpfad in dem ankommende Dateien/Faxe abgelegt werden (.txt, .pdf, .tif)
    -   Wird diese Einstellung angegeben, so ist der Datei-Alarmeingang aktiviert

-   `GHOSTSCRIPT_RESOLUTION: <string> optional`

    -   Auflösung die Ghostskript verwendet um Dateien vorzuverarbeiten (z.B. 600x600)
    -   Je höher die Auflösung, desto besser das Ergebnis
    -   Je häher die Auflösung, desto langsamer die Texterkennung bei .pdf und .tif

## STANDBY Bildschirm

-   `DWD_WARCELLID: <number> optional`

    -   Warnzellen ID des Deutschen Wetterdienstes
    -   Ist diese Einstellung angegeben, so werden Unwetterwarnungen im Standby-Bildschirm angezeigt
    -   Herauszufinden über:
        https://www.dwd.de/DE/leistungen/opendata/help/warnungen/cap_warncellids_csv.csv

-   `SCREEN_DWD_POS: <number>`

    -   Standardposition für Unwetterwarnungen auf dem Standby-Bildschirm
    -   Option kann für jeden Bildschirm einzeln über die App > Verbundene Geräte überschrieben
        werden
    -   0: linker Bildschirmrand
    -   1: rechter Bildschirmrand

-   `SCREEN_CALENDAR_POS: <number>`

-   Standardposition für den Kalender auf dem Standby-Bildschirm
-   Option kann für jeden Bildschirm einzeln über die App > Verbundene Geräte überschrieben werden
-   0: linker Bildschirmrand
-   1: rechter Bildschirmrand

-   `FW_NAME_LONG: <string>`

    -   Feuerwehrname zur Anzeige am oberen Bildschirmrand im Standby-Bildschirm
    -   Typisch: Freiwillige Feuerwehr ...

-   `FW_NAME_SHORT: <string>`

    -   Kurzer Feuerwehrname zur Anzeige am beim Telegram-Bot und in der App
    -   Typisch: FF ...

-   `DIASHOW_DELAY: <number>`

    -   Standardzeit in Millisekunden, nach der ein neues Diashowbild im Standby-Bildschirm
        angezeigt wird
    -   Option kann für jeden Bildschirm einzeln über die App > Verbundene Geräte überschrieben
        werden

-   `SCREEN_VERF: <true|false>`

    -   Standardeinstellung ob verfügbare Mitglieder auf dem Standby-Bildschirm angezeigt werden
        sollen wird
    -   Option kann für jeden Bildschirm einzeln über die App > Verbundene Geräte überschrieben
        werden

-   `SCREEN_NVERF: <true|false>`

    -   Standardeinstellung ob nicht verfügbare Mitglieder auf dem Standby-Bildschirm angezeigt
        werden sollen wird
    -   Option kann für jeden Bildschirm einzeln über die App > Verbundene Geräte überschrieben
        werden

-   `ICAL_LINK: <string> optional`

    -   ICAL-Link zu einem Kalender, welcher zusätlich zum Programmeigenen Kalender angezeigt werden
        soll
    -   Terminnamen sollten im Format
        `🚒 Hauptübung {{alle}} also EMOJI NAME {{GRUPPE1}} {{GRUPPE2}} ...` angegeben werden
    -   Google Kalender:
        -   https://support.google.com/calendar/answer/37648?hl=de
        -   Unter Einstellungen, Betreffenden Kalender auswählen, "Privatadresse im iCal-Format"
            kopieren

## FWVV Anbindung

-   `FWVV_DAT_FOLDER: <string> optional`
    -   Ordnerpfad zum dat Ordner des FWVV Programms
    -   Dadurch können die Einsatzzeiten der jeweiligen Benutzer im Jahr über Telegram und App
        angezeigt werden, sofern die Alarme in FWVV angelegt sind

## DRUCKEN

-   `PRINT_FAX_ORIGINAL: <true|false>`

    -   true: Orginalfax wird ausgedruckt
    -   false: Orginalfax wird nicht gedruckt

-   `PRINT_EMAIL_ORIGINAL: <true|false>`

    -   true: Orginal Email wird ausgedruckt
    -   false: Orginal Email wird nicht gedruckt

-   `PRINT_FAX_ORIGINAL_PAGES: <number>`

    -   Anzahl der Kopien für das Orginal Fax/Email

-   `PRINT_ALARM_PAGES: <number>`
    -   Anzahl der Kopien für den Alarmausdruck mit Karte

### Drucken Version A

-   `PRINT_IPP_URL: <string> optional`
    -   Ist diese Einstellung angegeben wird über das IPP Protokoll an einem Netzwerkdrucker
        gedruckt
    -   Diese Option wird nicht von allen Druckern unterstützt
    -   Es gibt keine möglichkeit außer ausprobieren, ob dies funktioniert
    -   Drucker URL´s werden beim Programmstart für erreichbare Netzwerkdrucker angezeigt

### Drucken Version B

-   `PRINT_PRINTERNAME: <string> optional`

    -   CUPS Druckername, an dem gedruckt werden soll
    -   Ist diese Einstellung aktiviert wird beim Raspberry PI über CUPS an diesem Drucker gedruckt

-   `READER_PATH: <string> optional`
    -   Pfad zur FoxitReader.exe (Bei FoxitReader Installation merken)
    -   Ist diese Einstellung aktiviert wird unter Windows der Foxit-Reader dazu verwendet auf dem
        Windows-Standard Drucker auszudrucken
    -   Typisch: C:/Program Files (x86)/Foxit Software/Foxit Reader/FoxitReader.exe

### Papierüberwachung

-   Ist Druckoption A aktiviert wird versucht über das IPP-Protokoll der Papierstatus auszulesen,
    dies funktioniert aber nicht bei allen Druckern

-   `PAPER_PRINTER_PATH: <string> optional`

    -   Webseiten Adresse eines Netzwerkdruckers, auf der der Papierstatus angezeigt wird
    -   Wird diese Einstellung verwendet, ist folgende nicht mehr optional

-   `PAPER_PRINTER_REGEX: <regex> optional abhängig`

    -   Regulärer Ausdruck der im Seitenquelltext vorhanden sein muss, damit 'Nicht leer' erkannt
        wird
    -   Herauszufinden über: Seite im Browser aufrufen -> Quelltext anzeigen -> Stelle mit
        Papierlevel finden
    -   Beispiel: CassLevel[1] = "Nicht Leer";

## APP Einstellungen

### VAPID Einstellungen für Push-Benachrichtigungen

-   `VAPID_PUBLIC: <string> optional`
-   `VAPID_PRIVATE: <string> optional`

    -   Im Programmverzeichnis Konsole öffnen
    -   `./node_modules/.bin/web-push generate-vapid-keys`
    -   Hinweise befolgen

-   `VAPID_EMAIL: <string> optional`

-   Wird die Push-Funktion verwendet, so ist hier die Email des Administrator einzutragen

### DNS

-   `APP_DNS: <string> optional`
    -   Für Funktion im LAN kann hier Beispielsweise HOSTNAME.local oder auch die IP des Servers
        eingetragen werden
    -   Für die Verwendung im LAN ist diese Option nicht notwendig, aber empfohlen, da dadurch ein
        Link zur App im Telegram Menü angezeigt wird
    -   Für die Funktion übers Web ist hier die DynDns einzutragen
    -   Siehe Installation

### SSL/TLS

-   `SSL_KEY: <string>`
-   `SSL_CERT: <string>`
    -   Für Funktion im LAN kann hier der Pfad zu einem selbst signierten zertifikat eingetragen
        werden; siehe https://www.selfsignedcertificate.com/
    -   Für die Funktion übers Web kann hier der Pfad zu einem Let´s Encrypt Zertifikat angegeben
        werden; siehe Installation

## Updates

-   `UPDATE_CHECK: <true|false>`

    -   true: Es wird einmal pro Tag und beim Programmstart auf neue Versionen geprüft und
        gegebenenfalls eine Info an alle Benutzer, welche die Option Softwareinfo aktiviert haben,
        gesendet
    -   false: Es wird nicht auf Updates geprüft
