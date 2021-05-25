#!/bin/bash

# RASPBERRY PI Bewegungsmelder-Skript Updateskript
# (c) 2020 Johannes Resch

echo "RASPBERRY PI Bewegungsmelder-Skript Updateskript v1.0"

cd /home/pi/

## Python Skript beenden
echo "Stoppe Python Skripte"
pkill -9 -f steuerUART.py
pkill -9 -f steuerRELAIS.py

## Python Skript herunterladen
echo "Lade Skripte herunter"
/usr/bin/wget -O /home/pi/steuerUART.py.1 "$1/scripts/steuerUART.py"
/usr/bin/wget -O /home/pi/steuerRELAIS.py.1 "$1/scripts/steuerRELAIS.py"
/usr/bin/wget -O /home/pi/steuerUpdate.sh.1 "$1/scripts/steuerUpdate.sh"

## Alte Skripte überschreiben
echo "Alte Skripte ersetzen"
/bin/mv /home/pi/steuerUART.py.1 /home/pi/steuerUART.py
/bin/mv /home/pi/steuerRELAIS.py.1 /home/pi/steuerRELAIS.py
/bin/mv /home/pi/steuerUpdate.sh.1 /home/pi/steuerUpdate.sh

sudo chmod +x /home/pi/steuerUpdate.sh

## RPI Update
apt-get update
apt-get upgrade -y 
apt-get autoremove -y
apt-get autoclean -y

## Abhängigkeiten installieren
pip3 install asyncio
pip3 install websockets

## Raspberry PI neustarten
echo "System-Neustart"
/sbin/shutdown -r now