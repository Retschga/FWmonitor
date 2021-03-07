#!/usr/bin/env python3
import asyncio
import websockets
import subprocess
import gpsd
import time
import RPi.GPIO as GPIO
import sys
import os

bashCommand_stopGPSD2  = "sudo killall gpsd"
bashCommand_stopGPSD1  = "sudo systemctl stop gpsd.socket"
bashCommand_stopGPSD3  = "sudo rm /run/gpsd.sock"
bashCommand_startGPSD  = "sudo gpsd /dev/ttyACM0 -F /var/run/gpsd.sock"
bashCommand_dispOFF    = "sudo echo '1-1'|tee /sys/bus/usb/drivers/usb/unbind"
bashCommand_dispON     = "sudo echo '1-1'|tee /sys/bus/usb/drivers/usb/bind"
bashCommand_reboot     = "sudo /sbin/shutdown -r now"
bashCommand_cpuTemp    = "sudo vcgencmd measure_temp | egrep -o '[0-9]*\.[0-9]*'"
bashCommand_memTotal   = "sudo free -m | egrep Mem | tr -s ' ' | cut -d' ' -f2"
bashCommand_memFree    = "sudo free -m | egrep Mem | tr -s ' ' | cut -d' ' -f3"
bashCommand_wpaSupp    = "sudo cat /etc/wpa_supplicant/wpa_supplicant.conf"
bashCommand_setWpaSupp = " > /etc/wpa_supplicant/wpa_supplicant.conf"
bashCommand_cpuTemp    = "sudo vcgencmd measure_temp | egrep -o '[0-9]*\.[0-9]*'"
bashCommand_connWlan   = "sudo iwgetid | cut -d : -f2"
bashCommand_cpuIdle    = "sudo top -b -n 1 | awk '/Cpu\(s\):/ {print $8}'"
bashCommand_hostname   = "sudo hostname"
bashCommand_restWlan   = "sudo /home/pi/./restartWlan.sh"

running = True
dispstat = True
delayCommand = False

print("Start")

if len(sys.argv) < 3:
    print("Aufruf: auto.py UBLOX_API_KEY SERVER_IP:PORT")

# IP Adresse des FWmonitor servers
targetserver = sys.argv[2]

def dispON():
    try:
        global dispstat
        global delayCommand
        print(str(dispstat))
        print(str(delayCommand))
        if dispstat == False and delayCommand == False:
            delayCommand = True
            GPIO.output(7, GPIO.HIGH)
            time.sleep(1)
            GPIO.output(7, GPIO.LOW)
            time.sleep(3)
            dispstat = True
            print("Disp ON OK")
            delayCommand = False
            print("Dispstat")
            print(dispstat)
    except:
        delayCommand = False
        print("Disp ON Fehler")

def dispOFF():
    try:
        global dispstat
        global delayCommand
        print(dispstat)
        print(delayCommand)
        if dispstat == True and delayCommand == False:
            delayCommand = True
            GPIO.output(7, GPIO.HIGH)
            time.sleep(1)
            GPIO.output(7, GPIO.LOW)
            time.sleep(3)
            dispstat = False
            print("Disp OFF OK")
            delayCommand = False
            print("Dispstat")
            print(dispstat)
    except:
        delayCommand = False
        print("Disp OFF Fehler")

def getPositionData(gps):
    try:
        p = gpsd.get_current()
        pos = "{\"mode\":"+str(p.mode)+",\"sats\":"+str(p.sats)+",\"lat\":"+str(p.lat)+",\"lng\":"+str(p.lon)+",\"alt\":"+str(p.alt)+",\"speed\":"+str(p.speed())+",\"track\":"+str(p.track)+",\"climb\":"+str(p.climb)+",\"precision\":\""+str(p.position_precision())+"\"}"
#        print(pos)
        return str(pos)
    except gpsd.NoFixError:
        print("GPS NO FIX!")
        return "-1"
    except:
#        print("Application error!")
        return "-2"

async def echo(websocket, path):
    async for message in websocket:
        print("Msg IN: " + str(message))
        if message == "dispOFF":
            print("Display OFF")
            #output = subprocess.call(bashCommand_dispOFF, shell=True)
            #print(output)
            dispOFF()
        if message == "getGPS":
            pos = getPositionData(gpsd)
            await websocket.send(pos)
        if message == "dispON":
            print("Display ON")
            dispON()
        if message == "restart":
            print("---- reboot ----")
            output = subprocess.call(bashCommand_reboot, shell=True)
            print("Reboot OUT: " + output)
        if message == "getMemTotal":
            output = subprocess.Popen(bashCommand_memTotal, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            print("memTotal OUT: " + output)
            await websocket.send("memTotal:" + output.rstrip("\n"))
        if message == "getMemFree":
            output = subprocess.Popen(bashCommand_memFree, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            print("memFree OUT: " + output)
            await websocket.send("memFree:" + output.rstrip("\n"))
        if message == "getWpaSupp":
            output = subprocess.Popen(bashCommand_wpaSupp, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            print("wpaSupp OUT: " + output)
            await websocket.send("wpaSupp:" + output)
        if "setWpaSupp" in message:
            newstr = "ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev\nupdate_config=1\ncountry=DE\n\n" + message.split(":")[1].replace("\"", "\\\"")
            output = subprocess.Popen("echo \"" + newstr + "\"" + bashCommand_setWpaSupp + "; " + bashCommand_restWlan, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            print("setWpaSupp SAVE: " + newstr)
            print("setWpaSupp OUT: " + output)
            await websocket.send("setWpaSupp:" + output)
        if message == "getCpuTemp":
            output = subprocess.Popen(bashCommand_cpuTemp, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            print("cpuTemp OUT: " + output)
            await websocket.send("cpuTemp:" + output.rstrip("\n"))
        if message == "getConnWlan":
            output = subprocess.Popen(bashCommand_connWlan, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            print("connWlan OUT: " + output)
            await websocket.send("connWlan:" + output.rstrip("\n"))
        if message == "getCpuIdle":
            output = subprocess.Popen(bashCommand_cpuIdle, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            print("cpuIdle OUT: " + output)
            await websocket.send("cpuIdle:" + output.rstrip("\n"))
        if message == "getHostname":
            output = subprocess.Popen(bashCommand_hostname, shell=True , stdout=subprocess.PIPE)
            output.wait()
            output = (output.stdout.read()).decode('utf-8')
            print("hostname OUT: " + output)
            await websocket.send("hostname:" + output.rstrip("\n"))
        if message == "updateScript":  
            websocket.close()                            
            os.system("sudo bash /home/pi/autoUpdate.sh \"" + targetserver + "\" >> update.log")


def motion_sensor(event):
    print("Display ON KNOPF")
    #output = subprocess.call(bashCommand_dispON, shell=True)
    #print(output)
    dispON()




# STOP alle GPSD Prozesse
output = subprocess.Popen(bashCommand_stopGPSD1, shell=True, stdout=subprocess.PIPE)
output.wait()
print("--STOP1: " + str(output.stdout.read()))

time.sleep(2)

output = subprocess.Popen(bashCommand_stopGPSD2, shell=True, stdout=subprocess.PIPE)
output.wait()
print("--STOP2: " + str(output.stdout.read()))

time.sleep(2)

output = subprocess.Popen(bashCommand_stopGPSD3, shell=True, stdout=subprocess.PIPE)
output.wait()
print("--STOP3: " + str(output.stdout.read()))



time.sleep(1)

# GPS Daten laden
output = subprocess.Popen(["python3", "/home/pi/u-blox_agps.py", sys.argv[1]], stdout=subprocess.PIPE)
output.wait()
print("--GPS: " + str(output.stdout.read()))

time.sleep(1)

output = subprocess.call(bashCommand_dispOFF, shell=True)

time.sleep(1)

output = subprocess.call(bashCommand_dispON, shell=True)

time.sleep(5)

# GPIO setup
GPIO.setmode(GPIO.BOARD)
GPIO.setup(37, GPIO.IN, pull_up_down=GPIO.PUD_UP)
GPIO.add_event_detect(37, GPIO.RISING, callback=motion_sensor, bouncetime=500)

GPIO.setup(7, GPIO.OUT)
GPIO.output(7, GPIO.LOW)

# GPSD starten
output = subprocess.Popen(bashCommand_startGPSD, shell=True, stdout=subprocess.PIPE)
output.wait()
print("--GPSD: " + str(output.stdout.read()))

time.sleep(2)

# GPSD verbinden
gpsd.connect()

# Websocket Server starten
start_server = websockets.serve(echo, "localhost", 8765)
print("Server started")

# Eventloop
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()

