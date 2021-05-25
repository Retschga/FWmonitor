#!/bin/bash
# RASPBERRY PI Auto-Skript Updateskript
# (c) 2021 Johannes Resch


echo "FWmonitor-Autoclient-RPI Updateskript v1.0"

cd /home/pi/

## Python Skript beenden
echo "Stoppe Python Skripte"
pkill -9 -f auto.py
pkill -9 -f gps.py

## Python Skript herunterladen
echo "Lade Skripte herunter"
/usr/bin/wget -O /home/pi/auto.py.1 "https://$1/scripts/auto.py"  --no-check-certificate
/usr/bin/wget -O /home/pi/u-blox_agps.py.1 "https://$1/scripts/u-blox_agps.py"  --no-check-certificate
/usr/bin/wget -O /home/pi/autoSwitchWlan.sh.1 "https://$1/scripts/autoSwitchWlan.sh"  --no-check-certificate
/usr/bin/wget -O /home/pi/autoUpdate.sh.1 "https://$1/scripts/autoUpdate.sh"  --no-check-certificate
/usr/bin/wget -O /home/pi/restartWlan.sh.1 "https://$1/scripts/restartWlan.sh"  --no-check-certificate

## Alte Skripte überschreiben
echo "Alte Skripte ersetzen"
/bin/mv /home/pi/auto.py.1 /home/pi/auto.py
/bin/mv /home/pi/u-blox_agps.py.1 /home/pi/u-blox_agps.py
/bin/mv /home/pi/autoSwitchWlan.sh.1 /home/pi/autoSwitchWlan.sh
/bin/mv /home/pi/autoUpdate.sh.1 /home/pi/autoUpdate.sh
/bin/mv /home/pi/restartWlan.sh.1 /home/pi/restartWlan.sh

sudo chmod +x /home/pi/autoSwitchWlan.sh
sudo chmod +x /home/pi/autoUpdate.sh
sudo chmod +x /home/pi/restartWlan.sh

## RPI Update
#apt-get update
#apt-get upgrade -y 
#apt-get autoremove -y
#apt-get autoclean -y

## Raspberry PI neustarten
echo "System-Neustart"
/sbin/shutdown -r now