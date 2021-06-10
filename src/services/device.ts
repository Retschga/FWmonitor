'use strict';

import logging from '../utils/logging';
import { Websocket as _Websocket, SocketInfo } from '../websocket';
import * as AlarmModel from '../models/alarm';
import globalEvents from '../utils/globalEvents';

const NAMESPACE = 'DeviceService';

class DeviceService {
    private sockets: _Websocket[];

    constructor(sockets: _Websocket[]) {
        this.sockets = sockets;

        globalEvents.on('alarm', (alarm: AlarmModel.AlarmRow) => {
            console.log('alarm##################', alarm);
            for (let i = 0; i < this.sockets.length; i++) {
                this.sockets[i].broadcast('alarm', String(alarm.id));
            }
        });

        globalEvents.on('calendar-change', () => {
            for (let i = 0; i < this.sockets.length; i++) {
                this.sockets[i].broadcast('calendar-change', '');
            }
        });

        globalEvents.on('userstatus-change', () => {
            for (let i = 0; i < this.sockets.length; i++) {
                this.sockets[i].broadcast('userstatus-change', '');
            }
        });

        globalEvents.on('diashow-change', () => {
            for (let i = 0; i < this.sockets.length; i++) {
                this.sockets[i].broadcast('diashow-change', '');
            }
        });
    }

    public get_all() {
        let devices: SocketInfo[] = [];

        for (let i = 0; i < this.sockets.length; i++) {
            const response: SocketInfo[] = this.sockets[i].getOpenSockets();

            for (let j = 0; j < response.length; j++) {
                devices.push(response[j]);
            }
        }

        return devices;
    }

    public get_praesentation() {
        let devices: SocketInfo[] = [];

        for (let i = 0; i < this.sockets.length; i++) {
            const response: SocketInfo[] = this.sockets[i].getOpenSockets();

            for (let j = 0; j < response.length; j++) {
                if (response[j].actions && response[j].actions.find((action) => action.id == 4))
                    devices.push(response[j]);
            }
        }

        return devices;
    }

    public send_action(id: string, action: number, value: string) {
        for (let i = 0; i < this.sockets.length; i++) {
            this.sockets[i].sendToID(id, 'action_' + action, value);
        }

        return true;
    }

    public broadcast_userstatus(userid: number, alarmid: number, value: boolean) {
        for (let i = 0; i < this.sockets.length; i++) {
            this.sockets[i].broadcast(
                'userstatus_' + (value ? '1' : 0),
                JSON.stringify({ alarmid, userid })
            );
        }
    }
}

let instance: DeviceService | undefined = undefined;

const init = (sockets: _Websocket[]) => {
    instance = new DeviceService(sockets);
};

export { instance, init, DeviceService };
