#!/bin/bash
# Installation FWmonitor-Alarmdisplay-WebClient on Raspberry PI
# Für Raspian/Raspberry OS
# (c) 2020 Johannes Resch
# Version 1.1

promptyn () {
    while true; do
        read -p "$1 " yn
        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

# Announce start
echo "#    $(date)    FWmonitor-Alarmdisplay-WebClient Installation"

# Prüfen ob Script als root ausgeführt wird
if [ "$(id -u)" != "0" ]; then
    echo "#    This script must be run as root." 1>&2
    exit 1
fi

# Prüfe ob Server IP übergeben wurde
if [[ $# -lt 2 ]] ; then
    echo "# Aufruf: installDisplay.sh SERVER_IP:SERVER_PORT CLIENT_NAME"
    exit 1
fi
echo '# Server Adresse: ' ${1}
echo '# Clientname:     ' ${2}

# Setze RPI Hostname
/usr/bin/raspi-config nonint do_hostname rpi-${2}

# Bind current directory
nomInstalDir=$(pwd)

# Installiere Programme
echo "Installiere Programme"
sudo apt -y install --no-install-recommends unclutter xscreensaver

# Herunterladen der Skripte
echo "Lade Skripte herunter"
/usr/bin/wget -O /home/pi/steuerUART.py "$1/scripts/steuerUART.py"
/usr/bin/wget -O /home/pi/steuerRELAIS.py "$1/scripts/steuerRELAIS.py"
/usr/bin/wget -O /home/pi/steuerUpdate.sh "$1/scripts/steuerUpdate.sh"
sudo chmod +x /home/pi/steuerUpdate.sh

# Autostarteinträge für chromium hinzufügen
mkdir -p /home/pi/.config/lxsession/LXDE-pi/
varAutostart=/home/pi/.config/lxsession/LXDE-pi/autostart
cat > ${varAutostart} << EOF
@xset s off
@xset -dpms
@xset s noblank

sed -i 's/"exited_cleanly": false/"exited_cleanly": true/' \
    ~/.config/google-chrome/Default/Preferences

sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$HOME/.config/google-chrome/Local State"

sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/'Local State'
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/; s/"exit_type":"[^"]\+"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences

sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' /home/pi/.config/chromium/Default/Preferences
sed -i ‘s/”exit_type”: “Crashed”/”exit_type”: “Normal”/’ /home/pi/.config/chromium/Default/Preferences

@unclutter -idle 0
@chromium-browser \
--disable-features=InfiniteSessionRestore \
--disable-session-crashed-bubble \
--disk-cache-dir=/dev/null \
--overscroll-history-navigation=0 \
--disable-pinch \
--no-first-run \
--noerrors \
--disable-infobars \
--enable-webgl \
--ignore-gpu-blacklist \
--start-fullscreen \
--disable-translate \
--disable-features=TranslateUI \
--fast \
--fast-start \
--app=http://${1}/screen/index?name=${2}
EOF

# Installation watchdog
if promptyn "# Watchdog installieren? (y/n)"; then
    echo "# Installation watchdog"
    sudo apt install watchdog
    watchdogentry="  watchdog-device        = /dev/watchdog"
    sudo cat /etc/watchdog.conf | grep -q "${watchdogentry}"  && echo 'entry already exists' || ( (echo "${watchdogentry}") >> /etc/watchdog.conf )
    watchdogentry="  max-load-5             = 24"
    sudo cat /etc/watchdog.conf | grep -q "${watchdogentry}"  && echo 'entry already exists' || ( (echo "${watchdogentry}") >> /etc/watchdog.conf )
    watchdogentry="  watchdog-device = /dev/watchdog"
    sudo cat /etc/watchdog.conf | grep -q "${watchdogentry}"  && echo 'entry already exists' || ( (echo "${watchdogentry}") >> /etc/watchdog.conf )
    watchdogentry="  watchdog-timeout=15"
    sudo cat /etc/watchdog.conf | grep -q "${watchdogentry}"  && echo 'entry already exists' || ( (echo "${watchdogentry}") >> /etc/watchdog.conf )
    sudo systemctl enable watchdog
    sudo systemctl start watchdog
else    
    echo "# Watchdog Installation übersprungen > Neustart 1x pro Tag"    
    cronentry="00 00 * * * /sbin/shutdown -r now"
    sudo crontab -l | grep -q ${cronentry}  && echo 'entry already exists' || ( (sudo crontab -l ; echo "${cronentry}")| sudo crontab - )
    sudo /etc/init.d/watchdog stop
    sudo update-rc.d watchdog remove
fi

# Autostart Demoeinträge für Steuerskripte
cronentry="# @reboot /usr/bin/python3 /home/pi/steuerRELAIS.py ${1} ${2} PIR_PIN UART_PORT"
sudo crontab -l | grep -q "${cronentry}"  && echo 'entry already exists' || ( (sudo crontab -l ; echo "${cronentry}")| sudo crontab - )
cronentry="# @reboot /usr/bin/python3 /home/pi/steuerUART.py ${1} ${2} PIR_PIN UART_PORT"
sudo crontab -l | grep -q "${cronentry}"  && echo 'entry already exists' || ( (sudo crontab -l ; echo "${cronentry}")| sudo crontab - )

pip3 install asyncio
pip3 install websockets


echo "# Installation fertig > Rasperry PI neustarten"