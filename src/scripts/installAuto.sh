#!/bin/bash
# Installation FWmonitor-Autoclient on Raspberry PI - Raspberry PI OS
# Für Raspian/Raspberry OS Full
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

echo "#    $(date)    FWmonitor-Autoclient-RPI Setup"

# Prüfen ob Script als root ausgeführt wird
if [ "$(id -u)" != "0" ]; then
    echo "#    This script must be run as root." 1>&2
    exit 1
fi

# Prüfe ob Server IP übergeben wurde
if [[ $# -lt 6 ]] ; then
    echo "# Aufruf: installDisplay.sh SERVER_ADRESSE:SERVER_PORT CLIENT_NAME UBLOX_API_KEY WLAN_SSID WLAN_PASSWORD GPS_DEVICE"
    exit 1
fi
echo '# Server Adresse: ' ${1}
echo '# Clientname:     ' ${2}
echo '# U-Blox API Kex: ' ${3}
echo '# WLAN SSID:      ' ${4}
echo '# WLAN Password:  ' ${5}
echo '# GPS DEVICE:     ' ${6}
echo ''

# Setup Wlan
cat > /etc/wpa_supplicant/wpa_supplicant.conf << EOF0
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=DE

network={
ssid="${4}"
psk="${5}"
priority=20
}
network={
ssid="Auto"
psk="123456789"
priority=10
}		
EOF0
# Restart Wlan
systemctl restart dhcpcd
/sbin/dhclient -v -r
/sbin/ifconfig 'wlan0' down
sleep 1
/sbin/ifconfig 'wlan0' up
/sbin/dhclient -r
# Warte auf Internetverbindung
while true
do
    if ping -q -c 1 -W 1 8.8.8.8 >/dev/null; then
        echo "IPv4 is up"
        break
    else
        echo "IPv4 is down"
    fi
    sleep 5
done


## Unnötige Programme entfernen
## https://github.com/dumbo25/unsed_rpi/
#echo remove unused raspbian packages
#echo size before removal 
#df -h

#echo packages to remove:
#sudo apt-get remove --purge libreoffice* -y
#sudo apt-get remove --purge wolfram-engine -y
#sudo apt-get remove -—purge chromium-browser -y
#sudo apt-get remove --purge scratch2 -y
#sudo apt-get remove --purge minecraft-pi  -y
#sudo apt-get remove --purge sonic-pi  -y
#sudo apt-get remove --purge dillo -y
#sudo apt-get remove --purge gpicview -y
#sudo apt-get remove --purge penguinspuzzle -y
#sudo apt-get remove --purge oracle-java8-jdk -y
#sudo apt-get remove --purge openjdk-7-jre -y
#sudo apt-get remove --purge oracle-java7-jdk -y 
#sudo apt-get remove --purge openjdk-8-jre -y

#sudo apt-get clean
#sudo apt-get autoremove -y

#echo size after removing packages
#df -h

## Installationsfenster entfernen
sudo mv /etc/xdg/autostart/piwiz.desktop /etc/xdg/autostart/piwiz.desktop.bak


## RPI Update
#apt update
#apt upgrade -y 
#apt autoremove -y
#apt autoclean -y

# Herunterladen der Skripte
echo "Lade Skripte herunter"
/usr/bin/wget -O /home/pi/autoUpdate.sh "https://$1/scripts/autoUpdate.sh" --no-check-certificate
sudo chmod +x /home/pi/autoUpdate.sh

# Installiere Programme
echo "Installiere Programme"
sudo apt -y install --no-install-recommends unclutter
sudo apt -y install python3-pip
sudo apt -y install gpsd gpsd-clients
sudo pip3 install websockets
sudo pip3 install gpsd-py3
sudo gpsd install pyserial

#Einstellungen
sudo systemctl stop gpsd.socket
sudo systemctl disable gpsd.socket

# Autostarteinträge für gui hinzufügen
varAutostart=/home/pi/.bash_profile
cat > ${varAutostart} << EOF1
if [ -z $DISPLAY ] && [ $(tty) = /dev/tty1 ]
then
  startx
fi
EOF1

# Autostarteinträge für chromium hinzufügen
mkdir -p /home/pi/.config/lxsession/LXDE-pi/
varAutostart=/home/pi/.config/lxsession/LXDE-pi/autostart
cat > ${varAutostart} << EOF2
#!/usr/bin/env sh

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
--app=https://${1}/car/?name=${2}&auto=true
EOF2

# Autostart für Steuerskripte
cronentry="@reboot sleep 30  && /usr/bin/python3 /home/pi/auto.py ${3} ${1} ${6}                # >> /home/pi/log.txt 2>&1"
sudo crontab -l | grep -q "${cronentry}"  && echo 'entry already exists' || ( (sudo crontab -l ; echo "${cronentry}")| sudo crontab - )
cronentry="* * * * * /home/pi/autoSwitchWlan.sh"
sudo crontab -l | grep -q "${cronentry}"  && echo 'entry already exists' || ( (sudo crontab -l ; echo "${cronentry}")| sudo crontab - )

# Don't change the following lines unless you know what you are doing
# They execute the config options starting with 'do_' below
grep -E -v -e '^\s*#' -e '^\s*$' <<END | \
sed -e 's/$//' -e 's/^\s*/\/usr\/bin\/raspi-config nonint /' | bash -x -
#
############# INSTRUCTIONS ###########
#
# Change following options starting with 'do_' to suit your configuration
#
# Anything after a has '#' is ignored and used for comments
#
# If on Windows, edit using Notepad++ or another editor that can save the file
# using UNIX-style line endings
#
# macOS and GNU/Linux use UNIX-style line endings - use whatever editor you like
#
# Then drop the file into the boot partition of your SD card
#
# After booting the Raspberry Pi, login as user 'pi' and run following command:
#
# sudo /boot/raspi-config.txt
#
############# EDIT raspi-config SETTINGS BELOW ###########

# Hardware Configuration
do_boot_wait 0            # Turn on waiting for network before booting
do_boot_splash 1          # Disable the splash screen
do_overscan 1             # Enable overscan
#do_camera 1               # Enable the camera
do_ssh 0                  # Enable remote ssh login
do_spi 1                  # Disable spi bus
do_memory_split 256        # Set the GPU memory limit to 64MB
do_i2c 1                  # Disable the i2c bus
#do_serial 1               # Disable the RS232 serial bus
do_boot_behaviour B4
#                 B1      # Boot to CLI & require login
#                 B2      # Boot to CLI & auto login as pi user
#                 B3      # Boot to Graphical & require login
#                 B4      # Boot to Graphical & auto login as pi user
do_onewire 1              # Disable onewire on GPIO4
do_audio 2                # 0 Auto select audio output device
#        1                # Force audio output through 3.5mm analogue jack
#        2                # Force audio output through HDMI digital interface
#do_gldriver G1           # Enable Full KMS Opengl Driver - must install deb package first
#            G2           # Enable Fake KMS Opengl Driver - must install deb package first
#            G3           # Disable opengl driver (default)
#do_rgpio 1               # Enable gpio server - must install deb package first

# System Configuration
do_configure_keyboard de                     # Specify DE Keyboard
#do_hostname rpi-auto                       # Set hostname to 'rpi-test'
do_wifi_country DE                           # Set wifi country as Australia
#do_wifi_ssid_passphrase wifi_name password   # Set wlan0 network to join 'wifi_name' network using 'password'
do_change_timezone Europe/Berlin        # Change timezone to Brisbane Australia
do_change_locale de_DE.UTF-8                 # Set language to Australian English

#Don't add any raspi-config configuration options after 'END' line below & don't remove 'END' line
END

# Setze RPI Hostname
/usr/bin/raspi-config nonint do_hostname rpi-${2}

# Installation watchdog
if promptyn "# Watchdog installieren? (y/n) (empfohlen)"; then
    echo "# Installation watchdog"
    sudo apt -y install watchdog
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


############# CUSTOM COMMANDS ###########
# You may add your own custom GNU/Linux commands below this line
# These commands will execute as the root user

# Some examples - uncomment by removing '#' in front to test/experiment

#/usr/bin/raspi-config do_wifi_ssid_passphrase # Interactively configure the wifi network

#/usr/bin/raspi-config do_change_pass          # Interactively set password for your login



sudo bash /home/pi/autoUpdate.sh $1


/sbin/shutdown -r now                         # Reboot after all changes above complete
