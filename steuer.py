#!/usr/bin/env python
# -*- coding: utf-8 -*-


# RASPBERRY PI Bewegungsmelder (HC-SR501 PIR) Bildschirmsteuerung (Samsung Smart Signage Display ED65E LED)
# (c) 2019 Retschga

# IP Adresse des Server PC ganz unten!


# -------------- Includes --------------
from ws4py.client.threadedclient import WebSocketClient
import serial, time, sys, socket, datetime
from reset_timer import RU_Timer
import RPi.GPIO as GPIO
import os


# -------------- Einstellungen --------------
# GPIO PIN Bewegungsmelder
pirpin = 11

# COM Port (Fernseher)
uartport = "/dev/ttyAMA0"

# Befehl "Bildschirm AN"  siehe Anleitung Fersneher
poweron = "\xAA\x11\xFE\x01\x01\x11"
# Befehl "Bildschirm AUS" siehe Anleitung Fersneher
poweroff = "\xAA\x11\xFE\x01\x00\x10"

targetserver = 'ws://192.168.178.28:8080/';



# ------- GPIO Setup -------
# RPi.GPIO Layout verwenden (wie Pin-Nummern)
GPIO.setmode(GPIO.BOARD)
# RASPBERRY GPIO Pins Setup
GPIO.setup(pirpin, GPIO.IN)


# -------------- Hilfsfunktionen --------------

# ------- Konsolenausgabe -------
def printHard(*args):
    time = datetime.datetime.now()
    print(str(time), args)
    sys.stdout.flush()

# ------- Bildschirm AUS -------
def schirmaus():
    # Öffne Seriellen Port
    ser = serial.Serial(
        port=uartport,
        baudrate=9600,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        bytesize=serial.EIGHTBITS,
        xonxoff=False
    )
    # Sende Daten
    ser.write(poweroff)
    # Schließe Seriellen Port
    ser.close()
    # Konsolenausgabe
    printHard(" ---> Schirm AUS")
    taus.stop_timer()

# ------- Bildschirm AN -------
def schirman():
    # Öffne Seriellen Port
    ser = serial.Serial(
        port=uartport,
        baudrate=9600,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        bytesize=serial.EIGHTBITS,
        xonxoff=False
    )
    # Sende Daten
    ser.write(poweron)
    # Schließe Seriellen Port
    ser.close()
    # Konsolenausgabe
    printHard(" ---> Schirm AN")
    # Timer rücksetzen
    tpir.stop_timer()
    tpir.start_timer()

# ------- BewegMelder Signal? -------
def isPIRHIGH():    
    printHard(GPIO.input(pirpin))
    if GPIO.input(pirpin) == GPIO.HIGH:
        # Signal anliegend -> Bildschirm nicht ausschalten
        taus.stop_timer()
        printHard(" --> STILL ON")
        # Timer rücksetzen
        tpir.stop_timer()
        tpir.start_timer()
    else:
        # Kein Signal      -> Ausschalttimer starten
        taus.stop_timer()
        taus.start_timer()
		
# ------- Neue Bewegung erkannt -------
def doIfHigh(channel):
    printHard("Bewegung erkannt")
    # Bildschirm aktivieren
    schirman()
    # Ausschalttimer rücksetzen
    taus.stop_timer()
    taus.start_timer()
    # zur Sicherheit weils nicht schadet
    schirman()
    schirman()
    schirman()

# -------------- Klassen --------------
# ------- Websocket -------
# Verbindung über Websockets zum Hauptprogramm
# -> Schaltet Bildschirm bei Alarm sofort ein
class DummyClient(WebSocketClient):

    # (Event) WebSocket geöffnet
    def opened(self):
        printHard("Opened.")

    # WebSocket Setup
    def setup(self, timeout=1):
        # Verbindungsaufbau zum Ziel
        try:
            self.__init__(self.url)
            self.connect()
            self.run_forever()

        # Bei Tastendruck schließen		
        except KeyboardInterrupt:
            self.close()

        # Fehler / Verbindungsabbruch
        except:
            newTimeout = timeout + 1
            printHard("Timing out for %i seconds. . ." % newTimeout)
            time.sleep(newTimeout)
            printHard("Attempting reconnect. . .")
            self.sock.close()

    # (Event) WebSocket geschlossen
    def closed(self, code, reason=None):
        printHard("Closed down", code, reason)
        printHard("Timing out for a bit. . .")
        time.sleep(3)
        printHard("Reconnecting. . .")
        # self.sock.shutdown(socket.SHUT_RDWR)
        self.sock.close()
        self.setup()

    # (Event) WebSocket Daten empfangen
    def received_message(self, m):
        printHard("=> %d %s" % (len(m), str(m)))
		
        # Meldunf für Alarm empfangen
        if 'alarm' in str(m):
            schirman()
            schirman() # 2mal hält besser:)
            schirman() # und 3mal noch besser
            printHard("ScreenOn Time", str(m).split("|")[1])
            taus.stop_timer()
            taus.start_timer()
            schirman()
            schirman()
        if 'rebootScreen' in str(m):
            os.system('sudo shutdown -r now')


# -------------- Programmstart --------------
# Prüft irgendwas ??? -> siehe Internet :)
if __name__ == '__main__':
    try:	
	
        # Programmstart Ausgabe auf Konsole
        printHard(" --- PROGRAMMSTART --- ")
        
        # Programmstart Ausgabe auf COM Port (Notwendig = ?)
        # Hilfreich, wenn serieller Monitor angesteckt ist
        ser = serial.Serial(
            port=uartport,
            baudrate=9600,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            bytesize=serial.EIGHTBITS,
            xonxoff=False
        )
        ser.write("\n\rProgrammstart\n\r")
        ser.close()
		
        
        # ------- Setup Timer -------
        # "Bildschirm AUS"
        # Setup für 15min
        taus = RU_Timer(10 *60 *10, schirmaus)
        taus.start()
        taus.start_timer()
        
        # ------- Setup Timer -------
        # "Bewegungsmelder überprüfen"
        # Prüfen ob noch Signal anliegt
        # -> Noch Bewegung vorhanden
        # Setup für 5s
        tpir = RU_Timer(5 *10, isPIRHIGH)
        tpir.start()
        tpir.start_timer()
        
        # ------- Setup GPIO Events -------
        # GPIO Event "Steigende Flanke" 
        # an Bewegungsmelder Pin
        # -> Neue Bewegung erkannt
        GPIO.add_event_detect(pirpin, GPIO.RISING, callback = doIfHigh, bouncetime = 600)


        # ------- Starte Websocket -------
        #                            V-- IP Adresse Server PC
        ws = DummyClient(targetserver, protocols=['http-only', 'chat'])
        ws.setup()

    # Beende bei Tastendruck (Haut ned hi K.A. warum)
    except KeyboardInterrupt:
        ws.close()
