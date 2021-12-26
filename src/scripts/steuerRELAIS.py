#!/usr/bin/env python
# -*- coding: utf-8 -*-


# RASPBERRY PI Steuerskript
# (c) 2020 Johannes Resch
# benötigt Python > 3.6

# -------------- Includes --------------
import subprocess
from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK
import sys


# -------------- Einstellungen --------------
if len(sys.argv) < 4:
    print("Aufruf: python3 "+sys.argv[0]+" SERVER_IP:SERVER_PORT CLIENT_NAME PIR_PIN UART_PORT/RELAIS_PIN RELAIS/UART/HDMI")
    sys.exit()

# IP Adresse des FWmonitor servers
targetserver = sys.argv[1]

# Name des Clienten
name = sys.argv[2]

# GPIO PIN Bewegungsmelder
pirpin = int(sys.argv[3])

# COM Port / Relais PIN (Fernseher)
uartport = sys.argv[4]
relaispin = uartport

subprocess.call(f"python3 Script1.py {targetserver} {name} {pirpin} {relaispin} RELAIS", shell=True)
