#!/usr/bin/env python
# -*- coding: utf-8 -*-


# RASPBERRY PI Bewegungsmelder (HC-SR501 PIR) Bildschirmsteuerung (Strom geschalten über Relais)
# (c) 2019 Johannes Resch

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

# GPIO PIN Relais
relaispin = 12

# IP Adresse des FWmonitor servers
targetserver = 'ws://192.168.178.28:8080/';



# ------- GPIO Setup -------
# RPi.GPIO Layout verwenden (wie Pin-Nummern)
GPIO.setmode(GPIO.BOARD)
# RASPBERRY GPIO Pins Setup
GPIO.setup(pirpin, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(relaispin, GPIO.OUT)


logtext = ""
schirmstatus = "????"
schirmstatusTime = "????"

# -------------- Hilfsfunktionen --------------

# ------- Konsolenausgabe -------
def printHard(*args):
    time = datetime.datetime.now()
    print(str(time), args)
    sys.stdout.flush()
    global logtext
    logtext = ', '.join(args)
    try:
        ws.send("PySteuerClient*Alarmdisplay*Steuerskript*7*LOG:" + logtext + ";SCHIRM:" + schirmstatus + " " + schirmstatusTime)
    except:
        print("No ws open")

# ------- Bildschirm AUS -------
def schirmaus():
    GPIO.output(relaispin, GPIO.LOW)
    # Konsolenausgabe
    global schirmstatus
    global schirmstatusTime
    if schirmstatus != "AUS":
        schirmstatus = "AUS"
        schirmstatusTime = str(datetime.datetime.now())
    printHard(" ---> Schirm AUS")
    taus.stop_timer()

# ------- Bildschirm AN -------
def schirman():
    GPIO.output(relaispin, GPIO.HIGH)
    # Konsolenausgabe
    global schirmstatus
    global schirmstatusTime
    if schirmstatus != "AN":
        schirmstatus = "AN"
        schirmstatusTime = str(datetime.datetime.now())
    printHard(" ---> Schirm AN")
    # Timer rücksetzen
    tpir.stop_timer()
    tpir.start_timer()

# ------- BewegMelder Signal? -------
def isPIRHIGH():
#    printHard(GPIO.input(pirpin))
    if GPIO.input(pirpin) == GPIO.HIGH:
        # Signal anliegend -> Bildschirm nicht ausschalten
        taus.stop_timer()
#        printHard(" --> STILL ON")
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

    reconn = False

    # (Event) WebSocket geöffnet
    def opened(self):
        self.send("WS Connection...")
        printHard("WS Opened")
        self.send("PySteuerClient*Alarmdisplay*Steuerskript*7")

    # WebSocket Setup
    def setup(self, timeout=5):
        # Verbindungsaufbau zum Ziel
        try:
            self.reconn = False
            self.__init__(self.url)
            self.connect()
            self.run_forever()

        # Bei Tastendruck schließen
        except KeyboardInterrupt:
            self.close()

        # Fehler / Verbindungsabbruch
        except:
            newTimeout = timeout + 1
            printHard("Error > Timing out for %i seconds. . ." % newTimeout)
            time.sleep(newTimeout)
            if self.reconn == False:
                self.reconn = True
                printHard("Attempting reconnect. . .")
                self.setup(newTimeout)

    # (Event) WebSocket geschlossen
    def closed(self, code, reason=None):
        printHard("Closed down", code, reason)
        if self.reconn == False:
            printHard("Closed > Timing out for a bit. . .")
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
            ws.send("PySteuerClient*Alarmdisplay*Steuerskript**RESTARTING")
            ws.close()
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
        tpir.stop_timer()
        GPIO.remove_event_detect(pirpin)
        GPIO.cleanup()
        ws.close()
