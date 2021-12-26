#!/bin/bash

# RASPBERRY PI Updateskript
# (c) 2021 Johannes Resch

echo "RASPBERRY PI Updateskript v1.1"

cd /home/pi/

## Python Skript beenden
echo "Stoppe Python Skripte"
pkill -9 -f steuerUART.py
pkill -9 -f steuerRELAIS.py
pkill -9 -f steuer.py

## Python Skript herunterladen
echo "Lade Skripte herunter"
/usr/bin/wget -O /home/pi/steuer.py.1 "$1/scripts/steuer.py"
/usr/bin/wget -O /home/pi/steuerUART.py.1 "$1/scripts/steuerUART.py"
/usr/bin/wget -O /home/pi/steuerRELAIS.py.1 "$1/scripts/steuerRELAIS.py"
/usr/bin/wget -O /home/pi/steuerUpdate.sh.1 "$1/scripts/steuerUpdate.sh"

## Alte Skripte überschreiben
echo "Alte Skripte ersetzen"
/bin/mv -f /home/pi/steuer.py.1 /home/pi/steuer.py
/bin/mv -f /home/pi/steuerUART.py.1 /home/pi/steuerUART.py
/bin/mv -f /home/pi/steuerRELAIS.py.1 /home/pi/steuerRELAIS.py
/bin/mv -f /home/pi/steuerUpdate.sh.1 /home/pi/steuerUpdate.sh

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