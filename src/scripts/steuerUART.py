#!/usr/bin/env python
# -*- coding: utf-8 -*-


# RASPBERRY PI Bewegungsmelder (HC-SR501 PIR) Bildschirmsteuerung (Samsung Smart Signage Display ED65E LED)
# (c) 2020 Johannes Resch
# benötigt Python > 3.6

# -------------- Includes --------------
import asyncio
import websockets
from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK
import sys, time, datetime
import RPi.GPIO as GPIO
import os
import serial


# -------------- Einstellungen --------------
if len(sys.argv) < 4:
    print("Aufruf: python3 "+sys.argv[0]+" SERVER_IP:SERVER_PORT CLIENT_NAME PIR_PIN UART_PORT")
    sys.exit()

# IP Adresse des FWmonitor servers
targetserver = sys.argv[1]

# Name des Clienten
name = sys.argv[2]

# GPIO PIN Bewegungsmelder
pirpin = int(sys.argv[3])

# COM Port (Fernseher)
uartport = sys.argv[4]

starttime = str(datetime.datetime.now())
version = "2.3.1"

# Befehl "Bildschirm AN"  siehe Anleitung Fersneher
poweron = b'\xAA\x11\xFE\x01\x01\x11'
# Befehl "Bildschirm AUS" siehe Anleitung Fersneher
poweroff = b'\xAA\x11\xFE\x01\x00\x10'

# ------- GPIO Setup -------
# RPi.GPIO Layout verwenden (wie Pin-Nummern)
GPIO.setmode(GPIO.BOARD)
# RASPBERRY GPIO Pins Setup
GPIO.setup(pirpin, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

# ------- Konsolenausgabe -------
async def printLog(*args):
    time = datetime.datetime.now()
    print(str(time), args)
    sys.stdout.flush()

# ------- 3h Log -------
async def create3hLog(asyncState):
    if asyncState.schirmstatus == "AN":
        asyncState.logbuff = asyncState.logbuff[1:] + "#"
    else:
        asyncState.logbuff = asyncState.logbuff[1:] + "_"

def openSerial():
    return serial.Serial(
        port=uartport,
        baudrate=9600,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        bytesize=serial.EIGHTBITS,
        xonxoff=False
    )

# ------- Bildschirm AUS -------
async def schirmaus(asyncState):
    # Öffne Seriellen Port
    ser = openSerial()
    # Sende Daten
    ser.write(poweroff)
    # Schließe Seriellen Port
    ser.close()
    if asyncState.schirmstatus != "AUS":
        asyncState.schirmstatus = "AUS"
        asyncState.schirmstatusTime = str(datetime.datetime.now())
    await asyncio.wait_for(printLog(" ---> Schirm AUS"), 5)

# ------- Bildschirm AN -------
async def schirman(asyncState):
    # Öffne Seriellen Port
    ser = openSerial()
    # Sende Daten
    ser.write(poweron)
    # Schließe Seriellen Port
    ser.close()
    # Konsolenausgabe
    if asyncState.schirmstatus != "AN":
        asyncState.schirmstatus = "AN"
        asyncState.schirmstatusTime = str(datetime.datetime.now())
    await asyncio.wait_for(printLog(" ---> Schirm AN"), 5)

# ------- BewegMelder Signal? -------
def isPIRHIGH():
    return GPIO.input(pirpin) == GPIO.HIGH

# ------- Neue Bewegung erkannt -------
async def checkPIR(asyncState):
    if isPIRHIGH():
        if asyncState.timeToSleep < 299:
            await asyncio.wait_for(schirman(asyncState), 10)
        asyncState.timeToSleep = 299

    elif asyncState.timeToSleep > 0:
        asyncState.timeToSleep -= 5

    if asyncState.timeToSleep < 0:
        await asyncio.wait_for(schirmaus(asyncState), 10)
        asyncState.timeToSleep = 0

    await asyncio.wait_for(printLog("TimerOFF: " + str(asyncState.timeToSleep)), 5)

# ------- Websocket -------
class WebSocketRetry:
    def __init__(self, uri, timeout=1):
        """
        IF __INIT__ WAS CALLED DIRECTLY
        THEN GENERATOR MUST SETUP MANUALLY
        """
        self.timeout = timeout
        self._flag_closed = False
        self._dataToSend = ""

    @property
    def closed(self):
        return self._flag_closed

    @classmethod
    async def create(cls, uri, timeout=1):        
        asyncio.ensure_future(printLog("Websocket: Create..."))
        self = cls(uri, timeout=timeout)
        self.connected = False
        asyncio.ensure_future(self.get_websocket_connection(uri))
        return self

    async def get_websocket_connection(self, uri):
        while not self.closed:
            await asyncio.sleep(2)
            try:
                await asyncio.wait_for(printLog("Websocket: Verbindung aufbauen..."), 5)

                async with websockets.connect(uri) as ws:
                    self._websocket_connection = ws
                    self.connected = True
                    await asyncio.wait_for(printLog("Websocket: Verbindung aufbauen... OK"), 5)

                    while self.connected:               
                        # Senden         
                        if self._dataToSend != "":
                            await asyncio.wait_for(printLog("Websocket: ...sende", self._dataToSend), 5)
                            await ws.send(self._dataToSend)
                            self._dataToSend  = ""

                        # Empfangen
                        try:
                            data = await asyncio.wait_for(ws.recv(), self.timeout)
                            asyncState.log = data
                            await asyncio.wait_for(printLog(data), 5)
                            if 'alarm' in str(data):
                                await asyncio.wait_for(schirman(asyncState), 10)
                                await asyncio.wait_for(schirman(asyncState), 10)
                                await asyncio.wait_for(schirman(asyncState), 10)
                            if 'rebootScreen' in str(data):                                
                                ws.close()
                                os.system('sudo shutdown -r now')
                            if 'updateScript' in str(data):    
                                ws.close()                            
                                os.system("sudo bash /home/pi/steuerUpdate.sh \"" + targetserver + "\" >> update.log")
                                
                        except (asyncio.TimeoutError):
                            #await asyncio.wait_for(printLog("No IN Data"), 5)
                            pass
                        except:
                            await asyncio.wait_for(printLog("Connection error"), 5)
                            self.connected = False
                            raise
                        

            except (asyncio.TimeoutError, ConnectionClosedOK, ConnectionClosedError):
                await asyncio.wait_for(printLog("Loop error2"), 5)
                self.connected = False
            except:
                await asyncio.wait_for(printLog("Connection error2"), 5)
                self.connected = False

    async def send(self, data):
        await asyncio.wait_for(printLog("Websocket: Senden...", data), 5)
        self._dataToSend = data

    async def sendPing(self, data):
        if self.connected:
            try:
                await asyncio.wait_for(printLog("Websocket: PING"), 5)
                await self._websocket_connection.ping()
            except:
                await asyncio.wait_for(printLog("PING error"), 5)


    async def close(self):
        if not self.closed:
            await asyncio.wait_for(printLog("Websocket: Verbindung schliessen..."), 5)
            self._flag_closed = True
            await self._websocket_connection.close()

async def connectWebsocket(asyncState):
    asyncState.client = await WebSocketRetry.create("ws://" + targetserver)
    await asyncState.client.send("Hi")

async def closeWebsocket(asyncState):
    await asyncState.client.close()

async def endProgram(asyncState):
    await asyncio.wait_for(printLog("Steuerskript UART", "Version " + version, "ENDE"), 5)
    await asyncio.wait_for(closeWebsocket(asyncState), 5)

async def keepAlive(asyncState):    
    await asyncState.client.sendPing("TESTPING")
    await asyncState.client.send("{\"type\":\"PySteuerClient\",\"name\":\"Alarmdisplay "+name+"\",\"info\":\"Steuerskript\",\"actions\":[{\"id\":\"-1\",\"key\":\"Bootzeit\",\"value\":\""+starttime+"\"},{\"id\":\"7\"},{\"id\":\"8\",\"key\":\"Version\",\"value\":\""+version+"\"},{\"id\":\"-1\",\"key\":\"LOG\",\"value\":\""+asyncState.log+"\"},{\"id\":\"-1\",\"key\":\"SCHIRM\",\"value\":\""+asyncState.schirmstatus + " " + asyncState.schirmstatusTime+"\"},{\"id\":\"-1\",\"key\":\"3h\",\"value\":\""+asyncState.logbuff+"\"},{\"id\":\"-1\",\"key\":\"Sek bis Aus\",\"value\":\""+str(asyncState.timeToSleep)+"\"}]}")

async def mainLoop(asyncState):
    while True:
        try:
            await asyncio.sleep(1)         

            asyncState.timer5 += 1
            if asyncState.timer5 >= 5:
                asyncState.timer5 = 0
                await checkPIR(asyncState)
            
            asyncState.timer15 += 1
            if asyncState.timer15 >= 15:
                asyncState.timer15 = 0
                await keepAlive(asyncState)
            
            asyncState.timer300 += 1
            if asyncState.timer300 >= 300:
                asyncState.timer300 = 0
                await create3hLog(asyncState)
        except:
            await asyncio.wait_for(printLog("MAIN LOOP error"), 5)


# -------------- Programmstart --------------
if __name__ == '__main__':

    loop = asyncio.get_event_loop()
    asyncState = type('', (), {})()

    asyncState.schirmstatus = "???"
    asyncState.schirmstatusTime = "???"
    asyncState.log = "???"
    asyncState.logbuff = "                                    "
    asyncState.timeToSleep = 1
    asyncState.timer5 = 0
    asyncState.timer15 = 0
    asyncState.timer300 = 0

    try:

        # Programmstart Ausgabe auf Konsole
        asyncio.ensure_future(printLog("FWmonitor (c) 2020 Resch"))
        asyncio.ensure_future(printLog("Steuerskript UART", "Version " + version, "START"))
        asyncio.ensure_future(printLog("Steuerskript Server", targetserver))
        asyncio.ensure_future(printLog("Steuerskript Client-Name", name))
        asyncio.ensure_future(printLog("#"))
        
        # WebSocket
        asyncio.ensure_future(connectWebsocket(asyncState))
        asyncio.ensure_future(mainLoop(asyncState))

        # Starte AsyncIO Eventloop
        loop.run_forever()
     

    # Beende bei Tastendruck
    except KeyboardInterrupt:
        pass

    # Beende AsyncIO Eventloop
    finally:
        loop.run_until_complete(endProgram(asyncState))
        
