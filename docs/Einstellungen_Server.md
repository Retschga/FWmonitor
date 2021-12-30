# Einstellungen

# PC/Raspberry Netzwerkeinstellungen

-   Für den Server PC/Raspberry PI sollte eine statische IP-Adresse vergeben sein!
-   Raspberry PI:
    https://www.ionos.de/digitalguide/server/konfiguration/raspberry-pi-mit-fester-ip-adresse-versehen/
-   Windows: https://www.windows-faq.de/2018/02/11/statische-ip-adresse-bei-windows-10-einrichten/

## Einstellungen Server

### .env Datei erstellen

-   `.env - Leer` Datei zu `.env` umbenennen
    -   Konsole: Windows: `ren ".env - Leer" ".env"`
    -   Raspberry: `mv ".env - Leer" ".env"`)
-   oder: Programm einmalig starten, dann wird .env automatisch erzeugt

### .env Datei bearbeiten

-   .env Datei mit einem Texteditor öffnen (z.B. Notepad++)
-   Alle relevanten Einstellungen in der bearbeiten
-   Veränderte Einstellungen erfordern immer einen Software Neustart! (`pm2 restart FWmonitorV3`)

-   [Beschreibung aller Einstellungen](Einstellungen_env.md)

### Diashowbilder

-   Bilder für Diashow im Standby im Ordner `./filesDiashow` einfügen
-   Neue Bilder können jeterzeit über den Telegram-Bot oder die App hinzugefügt werden, diese müssen
    dann in der App noch freigegeben werden
-   Bilder können jederzeit über die App aktiviert und deaktiviert werden

### Forst Rettungspunkte

1. Forst Rettungspunkte Datei herunterladen: https://kwf2020.kwf-online.de/rettungspunkte-download/
2. Mit Excel/Libre-Office öffnen und nicht benötigte Punkte herausfiltern
3. Datei mit Hilfe von http://www.convertcsv.com/csv-to-geojson.htm zu GeoJSON umwandeln
4. Umgewandelte Datei unter `./filesPublic/rettPunkte.geojson` speichern

## APP Funktion

### Nur im lokalen LAN

1. Hostname auslesen: Konsolebefehl `hostname`
2. Zertifikat für HOSTNAME.local erstellen https://www.selfsignedcertificate.com/
3. In .env unter 'SSL_KEY' und 'SSL_CERT' Pfad zu Dateien eintragen
4. In .env unter 'APP_DNS' HOSTNAME.local eintragen
5. Nun kann App über Telegram aufgerufen werden, es muss aber immer über 'Erweitert' - 'Weiter zu
   ... (unsicher)' bestätigt werden

### Übers Internet

#### Fritzbox

1.  In Fritzbox mit MyFritz (Internet > MyFRITZ!-Konto) anmelden
2.  Unten "Ihre MyFritz!-Adresse" kopieren und in .env unter "APP_DNS" einfügen
3.  In Fritzbox Portfreigabe einrichten (Internet > Freigaben > Portfreigaben > Gerät für Freigaben
    hinzufügen)
4.  Gerät, auf dem FWmonitor läuft auswählen
5.  dann unten "Neue Freigabe", dann "MyFRITZ!-Freigabe" HTTP-Server
6.  dann unten "Neue Freigabe", dann "MyFRITZ!-Freigabe" HTTPS-Server

#### Anderer DynDns Dienst

-   Alternativ zu MyFritz kann auch ein anderer DynDNS Dienst verwendet werden

1. DynDns Dienst einrichten
2. Im Router die Ports 80 und 443 für den Server-PC freigeben

#### Let´s Encrypt

-   Windows:
    1.  https://certbot.eff.org/instructions?ws=other&os=windows befolgen
    2.  Cert und Key von C:\Certbot\live\ unter .env als "HTTPS_KEY" und "HTTPS_CERT" eintragen
    3.  Auto Renew:
        1. Aufgabenplanung öffnen
        2. Einfache Aufgabe erstellen (rechts)
            - Name: certbot
            - Wöchentlich
            - Sonntag
            - Programm Starten
            - Programm/Skript: certbot
            - Argumente hinzufügen: renew
-   Raspberry Pi:
    1. `cd ~`
    2. `git clone https://github.com/letsencrypt/letsencrypt`
    3. `cd letsencrypt`
    4. `./letsencrypt-auto -d ERSTE_DOMAIN -d ZWEITE_DOMAIN --redirect -m DEINE_MAIL --standalone`
    5. Auto Renew:
        1. `sudo crontab -e`
        2. `0 0 \* \* 0 ./letsencrypt-auto -d ERSTE_DOMAIN --redirect -m DEINE_MAIL --agree-tos --renew-by-default --standalone`
           eintragen

#### Web Push Notifications

-   In Konsole: `./node_modules/.bin/web-push generate-vapid-keys` ausführen
-   Werte in .env unter "VAPID" eintragen
