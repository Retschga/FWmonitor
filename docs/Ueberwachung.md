# Überwachte Programmausführung

## Installation

### PM2 Installieren

npm install pm2@latest -g

### Start-Skript starten

-   Raspberry: start_ueberwacht.sh
-   Windows: start_ueberwacht.bat

### Befehle

-   pm2 stop FWmonitorV3
-   pm2 start FWmonitorV3
-   pm2 delete FWmonitorV3
-   pm2 logs FWmonitorV3
-   pm2 status

### Info

-   Zum überprüfen, ob die Software ausgeführt wird 'pm2 status' verwenden
-   Bei Fehlern im Log mit 'pm2 logs FWmonitorV3' nach der Ursache suchen
-   https://pm2.keymetrics.io/docs/usage/quick-start/
