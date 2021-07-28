# Installation

## Server

-   [Installation Server Windows 10](Installation_Server_Win.md)
-   [Installation Server Raspberry Pi](Installation_Server_RPi.md)

## Display

-   [Installation Display Windows 10](Installation_Client_Win.md)
-   [Installation Display Raspberry Pi](Installation_Client_RPi.md)

# Einrichtung

# Einstellungen Server

-   [Einstellungen Server](Einstellungen_Server.md)

## Benutzer hinzufügen

Einfach dem erstellten Telegram-Bot /start schreiben. Nun kann der Benutzer über die Einstellungen
freigegeben werden. Der allererste Benutzer der dem Bot nach der Programmistallation schreibt wird
automatisch als Andministrator freigegeben.

## Telegram

Falls die Telegram Tastatur nicht mehr angezeigt wird, einfach irgendeinen Text an den Bot senden
und es sollte wider erscheinen.

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

## Software selber bauen

-   Repository clonen
-   `npm install`
-   `npm run build` und `npm run debug`
