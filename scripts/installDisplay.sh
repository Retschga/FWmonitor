#!/bin/bash
# Installation FWmonitor-Alarmdisplay-WebClient on Raspberry PI
# Für Raspian/Raspberry OS mit GUI
# (c) 2020 Johannes Resch
# Version 1.0

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

echo '# Server IP: ${1}'

# Bind current directory
nomInstalDir=$(pwd)

# Herunterladen der Skripte
echo "Lade Skripte herunter"
/usr/bin/wget -O /home/pi/steuerUART.py "$1/scripts/steuerUART.py"
/usr/bin/wget -O /home/pi/steuerRELAIS.py "$1/scripts/steuerRELAIS.py"
/usr/bin/wget -O /home/pi/steuerUpdate.sh "$1/scripts/steuerUpdate.sh"

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
EOF
echo "@chromium-browser --disable-features=InfiniteSessionRestore --disable-session-crashed-bubble --no-first-run --noerrors --disable-infobars --enable-webgl --ignore-gpu-blacklist --start-fullscreen --app=http://${1}/?name=${2}" >> ${varAutostart}

# Installation watchdog
if promptyn "# Watchdog installieren? (y/n)"; then
    echo "# Installation watchdog"
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