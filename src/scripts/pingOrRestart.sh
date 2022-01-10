#!/bin/bash
# FWmonitor pingOrRestart - Wenn kein Ping möglich ist Raspberry neustarten
# Für Raspian/Raspberry OS mit GUI
# (c) 2021 Johannes Resch
# Version 1.0

# Prüfen ob Script als root ausgeführt wird
if [ "$(id -u)" != "0" ]; then
    echo "#    This script must be run as root." 1>&2
    exit 1
fi

# Prüfe ob 1. Prio SSID übergeben wurde
if [[ $# -lt 1 ]] ; then
    echo "# Aufruf: skript.sh ZIEL_IP_ADRESSE"
    exit 1
fi

if ping -c 1 "$1" -t 1 &> /dev/null
then
  echo "Ziel erreichbar!"
else
  echo "Ziel NICHT erreichbar! -> Neustart"
  shutdown -r 0
fi

