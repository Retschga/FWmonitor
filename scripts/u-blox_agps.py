#!/usr/bin/env python3

 #Autor: Jesús Sánchez Sänchez (gokuhs)
 #Based on veproza proyect: https://gist.github.com/veproza/55ec6eaa612781ac29e7
import requests
import serial
import sys

if len(sys.argv) < 2:
    print("Aufruf: u-blox_agps.py UBLOX_API_KEY")

#Edit me!!
token = sys.argv[1]      #Token getted from u-blox
comPort = "/dev/ttyACM0" #GPS Com port

print("Connecting to u-blox")
r = requests.get("http://online-live1.services.u-blox.com/GetOnlineData.ashx?token=" + token + ";gnss=gps;datatype=eph,alm,aux,pos;filteronpos;format=aid", stream=True)
print("Downloading A-GPS data")

ser = serial.Serial(comPort, 9600)
print("Waiting to GPS be free")

drainer = True
while drainer:
    drainer = ser.inWaiting()
    ser.read(drainer)

print("Writing AGPS data")
ser.write(r.content)
print("Done")

#buffer = True
#message = ""
#try:
#    while buffer:
#        buffer = ser.read()
#        if buffer == "$":
#            if message.startswith("$GPGGA"):
#                print(message.strip())
#            message = ""
#        message = message + buffer
#except KeyboardInterrupt:
#    ser.close()
