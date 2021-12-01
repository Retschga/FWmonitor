#!/usr/bin/env python3
import asyncio
import websockets
import subprocess
import gpsd
import time
import RPi.GPIO as GPIO
import sys, time, datetime
import os

bashCommand_stopGPSD1  = "sudo systemctl stop gpsd.socket"
bashCommand_stopGPSD2  = "sudo killall gpsd"
bashCommand_stopGPSD3  = "sudo rm /run/gpsd.sock"
bashCommand_startGPSD1 = "sudo gpsd "
bashCommand_startGPSD2 = " -F /var/run/gpsd.sock"
bashCommand_usbOFF     = "sudo echo '1-1'| sudo tee /sys/bus/usb/drivers/usb/unbind"
bashCommand_usbON      = "sudo echo '1-1'| sudo tee /sys/bus/usb/drivers/usb/bind"
bashCommand_reboot     = "sudo /sbin/shutdown -r now"
bashCommand_cpuTemp    = "sudo vcgencmd measure_temp | egrep -o '[0-9]*\.[0-9]*'"
bashCommand_memTotal   = "sudo free -m | egrep Mem | tr -s ' ' | cut -d' ' -f2"
bashCommand_memFree    = "sudo free -m | egrep Mem | tr -s ' ' | cut -d' ' -f3"
bashCommand_wpaSupp    = "sudo cat /etc/wpa_supplicant/wpa_supplicant.conf"
bashCommand_setWpaSupp = " > /etc/wpa_supplicant/wpa_supplicant.conf; sudo systemctl daemon-reload"
bashCommand_cpuTemp    = "sudo vcgencmd measure_temp | egrep -o '[0-9]*\.[0-9]*'"
bashCommand_connWlan   = "sudo iwgetid | cut -d : -f2"
bashCommand_cpuIdle    = "sudo top -b -n 1 | awk '/Cpu\(s\):/ {print $8}'"
bashCommand_hostname   = "sudo hostname"
bashCommand_restWlan   = "sudo /home/pi/./restartWlan.sh"
bashCommand_listNetw   = "sudo ip a"
bashCommand_screen_on  = "vcgencmd display_power 1"
bashCommand_screen_off = "vcgencmd display_power 0"
bashCommand_updateNTP  = "sudo systemctl status systemd-timesyncd.service"
bashCommand_cpuFreq    = "sudo cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_cur_freq"

if len(sys.argv) < 4:
    print("Aufruf: auto.py UBLOX_API_KEY SERVER_IP:PORT GPS_DEVICE")
    sys.exit()

VERSION = "3.0.1"

TOOGLE_USB_ON_NO_TETHER = True
TIME_TILL_OFF = 60 # sekunden
PIN_PIR = 11
PIN_TASTER = 13


asyncState = type('', (), {})()
targetserver = sys.argv[2]
starttime = str(datetime.datetime.now())




# ---- Konsolenausgabe ----
async def printLog(*args):
    time = datetime.datetime.now()
    print(str(time), args)
    sys.stdout.flush()

# ---- Displaysteuerung ----
async def dispON(asyncState):
    try:
        output = subprocess.call(bashCommand_screen_on, shell=True)
        await asyncio.wait_for(printLog("SCREEN ON OUT: " + str(output)), 5) 
        await asyncio.sleep(5)   
        await asyncio.wait_for(printLog("Disp ON OK"), 5)
        asyncState.dispstat = True

    except Exception as e:
        await asyncio.wait_for(printLog("Disp ON Fehler", e), 5)

async def dispOFF(asyncState):
    try:
        output = subprocess.call(bashCommand_screen_off, shell=True)
        await asyncio.wait_for(printLog("SCREEN OFF OUT: " + str(output)), 5)  
        await asyncio.sleep(5)
        await asyncio.wait_for(printLog("Disp OFF OK"), 5)
        asyncState.dispstat = False
        
    except Exception as e:
        await asyncio.wait_for(printLog("Disp OFF Fehler", e), 5)

# ---- Websocket ----
def getPositionData(gps):
    try:
        p = gpsd.get_current()
        pos = "{\"mode\":"+str(p.mode)+",\"sats\":"+str(p.sats)+",\"lat\":"+str(p.lat)+",\"lng\":"+str(p.lon)+",\"alt\":"+str(p.alt)+",\"speed\":"+str(p.speed())+",\"track\":"+str(p.track)+",\"climb\":"+str(p.climb)+",\"precision\":\""+str(p.position_precision())+"\"}"
        return str(pos)
    except gpsd.NoFixError:
        print("GPS NO FIX!")
        return "-1"
    except:
        return "-2"

async def checkUsbTether():
    output = subprocess.Popen(bashCommand_listNetw, shell=True , stdout=subprocess.PIPE)
    output.wait()
    output = (output.stdout.read()).decode('utf-8')
    if "usb0" in output:
        await printLog("usbtether OUT: true")
        return True
    else:
        await printLog("usbtether OUT: false")
        return False

async def echo(websocket, path):
    global asyncState
    async for message in websocket:
        await printLog("Msg IN: " + str(message))
        if message == "dispOFF":
            await printLog("Display OFF")
            await dispOFF(asyncState)
        if message == "getGPS":
            pos = getPositionData(gpsd)
            await websocket.send(pos)
        if message == "dispON":
            await printLog("Display ON")
            await dispON(asyncState)
        if message == "restart":
            await printLog("---- reboot ----")
            output = subprocess.call(bashCommand_reboot, shell=True)
            await printLog("Reboot OUT: " + output)
        if message == "getMemTotal":
            output = subprocess.Popen(bashCommand_memTotal, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            await printLog("memTotal OUT: " + output)
            await websocket.send("memTotal:" + output.rstrip("\n"))
        if message == "getMemFree":
            output = subprocess.Popen(bashCommand_memFree, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            await printLog("memFree OUT: " + output)
            await websocket.send("memFree:" + output.rstrip("\n"))
        if message == "getWpaSupp":
            output = subprocess.Popen(bashCommand_wpaSupp, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            await printLog("wpaSupp OUT: " + output)
            await websocket.send("wpaSupp:" + output)
        if "setWpaSupp" in message:
            newstr = "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\nupdate_config=1\ncountry=DE\n\n" + message.split(":")[1].replace("\"", "\\\"")
            output = subprocess.Popen("echo \"" + newstr + "\"" + bashCommand_setWpaSupp + "; " + bashCommand_restWlan, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            await printLog("setWpaSupp SAVE: " + newstr)
            await printLog("setWpaSupp OUT: " + output)
            await websocket.send("setWpaSupp:" + output)
        if message == "getCpuTemp":
            output = subprocess.Popen(bashCommand_cpuTemp, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            await printLog("cpuTemp OUT: " + output)
            await websocket.send("cpuTemp:" + output.rstrip("\n"))
        if message == "getConnWlan":
            output = subprocess.Popen(bashCommand_connWlan, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            await printLog("connWlan OUT: " + output)
            await websocket.send("connWlan:" + output.rstrip("\n"))
        if message == "getCpuIdle":
            output = subprocess.Popen(bashCommand_cpuIdle, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            await printLog("cpuIdle OUT: " + output)
            await websocket.send("cpuIdle:" + output.rstrip("\n"))
        if message == "getCpuFreq":
            output = subprocess.Popen(bashCommand_cpuFreq, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            await printLog("cpuFreq OUT: " + output)
            await websocket.send("cpuFreq:" + output.rstrip("\n"))
        if message == "getTimeToSleep":
            await printLog("timeToSleep OUT: " + asyncState.timeToSleep)
            await websocket.send("timeToSleep:" + asyncState.timeToSleep)
        if message == "getHostname":
            output = subprocess.Popen(bashCommand_hostname, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            await printLog("hostname OUT: " + output)
            await websocket.send("hostname:" + output.rstrip("\n"))
        if message == "getUsbtether":
            output = await checkUsbTether()            
            if output == True:
                await websocket.send("usbtether:true")
            else:
                await websocket.send("usbtether:false")                
        if message == "update": 
            await websocket.send("beginUpdate") 
            websocket.close()                            
            os.system("sudo bash /home/pi/autoUpdate.sh \"" + targetserver + "\" >> update.log")

# ------- PIR/Taster -------
async def checkPIR(asyncState):
    await asyncio.wait_for(printLog("PIR Status: " + str(GPIO.input(PIN_PIR) )), 5)
    if GPIO.input(PIN_PIR) == GPIO.HIGH:
        if asyncState.timeToSleep < TIME_TILL_OFF *2 and asyncState.offViaTaster == False:
            await asyncio.wait_for(dispON(asyncState), 20)
        asyncState.timeToSleep = TIME_TILL_OFF *2 +1

    elif asyncState.timeToSleep > 0:
        asyncState.timeToSleep -= 2

    if asyncState.timeToSleep < 0:
        await asyncio.wait_for(dispOFF(asyncState), 120)
        asyncState.offViaTaster = False
        asyncState.timeToSleep = 0

    await asyncio.wait_for(printLog("TimerOFF: " + str(asyncState.timeToSleep)), 5)

async def checkTaster(asyncState):
    if GPIO.input(PIN_TASTER) == GPIO.HIGH:
        if asyncState.lastTasterState == False:
            await asyncio.wait_for(printLog("Display Taster Pressed"), 5)
            if asyncState.dispstat == True:
                await asyncio.wait_for(dispOFF(asyncState), 20)
                await asyncio.wait_for(printLog("Display OF Taster"), 5)
                asyncState.offViaTaster = True
                await asyncio.wait_for(printLog("dispstat: " + str(asyncState.dispstat)), 5)
            else:
                await asyncio.wait_for(dispON(asyncState), 20)
                await asyncio.wait_for(printLog("Display ON Taster"), 5)
                asyncState.offViaTaster = False
                await asyncio.wait_for(printLog("dispstat: " + str(asyncState.dispstat)), 5)
        asyncState.lastTasterState = True
    else:
        asyncState.lastTasterState = False


# ---- Hilfsfunktionen ----
def stop_GPSD():
    output = subprocess.Popen(bashCommand_stopGPSD1, shell=True, stdout=subprocess.PIPE)
    output.wait()
    print("--GPSD STOP 1: " + str(output.stdout.read()))
    time.sleep(2)
    output = subprocess.Popen(bashCommand_stopGPSD2, shell=True, stdout=subprocess.PIPE)
    output.wait()
    print("--GPSD STOP 2: " + str(output.stdout.read()))
    time.sleep(2)
    output = subprocess.Popen(bashCommand_stopGPSD3, shell=True, stdout=subprocess.PIPE)
    output.wait()
    print("--GPSD STOP 3: " + str(output.stdout.read()))

def init_GPS():
    output = subprocess.Popen(["python3", "/home/pi/u-blox_agps.py", sys.argv[1], sys.argv[3]], stdout=subprocess.PIPE)
    output.wait()
    print("--INIT GPS: " + str(output.stdout.read()))

def toggle_USB_POWER():
    print("--TOOGLE USB POWER")
    time.sleep(1)
    output = subprocess.call(bashCommand_usbOFF, shell=True)
    time.sleep(1)
    output = subprocess.call(bashCommand_usbON, shell=True)
    time.sleep(5)

def setup_GPIO():
    # GPIO setup
    GPIO.setmode(GPIO.BOARD)
    # Taster
    GPIO.setup(PIN_TASTER, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
    # PIR
    GPIO.setup(PIN_PIR, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

def start_GPSD():
    output = subprocess.Popen(bashCommand_startGPSD1 + sys.argv[3] + bashCommand_startGPSD2, shell=True, stdout=subprocess.PIPE)
    output.wait()
    print("--GPSD START: " + str(output.stdout.read()))
    time.sleep(2)
    # GPSD verbinden
    gpsd.connect()

def updateNTP():
    bashCommand_updateNTP
    output = subprocess.Popen(bashCommand_updateNTP, shell=True, stdout=subprocess.PIPE)
    output.wait()
    print("--bashCommand_updateNTP: " + str(output.stdout.read()))

async def mainLoop(asyncState):
    while True:
        try:
            await asyncio.sleep(0)   

            await checkPIR(asyncState)
            await checkTaster(asyncState)
            
            asyncState.timer300 += 1
            if asyncState.timer300 >= 300:
                asyncState.timer300 = 0
                if TOOGLE_USB_ON_NO_TETHER == True:
                    output = await checkUsbTether()            
                    if output == False:
                        toggle_USB_POWER()

        except Exception as e: 
            await asyncio.wait_for(printLog("MAIN LOOP error"), 5)
            print(e)

async def endProgram(asyncState):
    await asyncio.wait_for(printLog("Steuerskript Auto-Display", "VERSION " + VERSION, "ENDE"), 5)


# -------------- Programmstart --------------
if __name__ == '__main__':

    loop = asyncio.get_event_loop()    

    asyncState.lastTasterState = False
    asyncState.offViaTaster = False
    asyncState.dispstat = True
    asyncState.timeToSleep = 1
    asyncState.timer300 = 0

    stop_GPSD()
    time.sleep(1)
    init_GPS()
    setup_GPIO()
    start_GPSD()
    updateNTP()
    

    try:

        # Programmstart Ausgabe auf Konsole
        asyncio.ensure_future(printLog("FWmonitor (c) 2021 Resch"))
        asyncio.ensure_future(printLog("Steuerskript Auto-Display", "VERSION " + VERSION, "START"))
        asyncio.ensure_future(printLog("Steuerskript Server", targetserver))
        asyncio.ensure_future(printLog("#"))        

        # WebSocket
        asyncio.ensure_future(websockets.serve(echo, "localhost", 8765))
        asyncio.ensure_future(mainLoop(asyncState))

        # Starte AsyncIO Eventloop
        loop.run_forever()
     

    # Beende bei Tastendruck
    except KeyboardInterrupt:
        pass

    # Beende AsyncIO Eventloop
    finally:
        loop.run_until_complete(endProgram(asyncState))
        
