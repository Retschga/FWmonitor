#!/bin/bash

systemctl restart dhcpcd
/sbin/dhclient -v -r
/sbin/ifconfig 'wlan0' down
sleep 5
/sbin/ifconfig 'wlan0' up
/sbin/dhclient -r
