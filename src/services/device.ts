'use strict';

import * as AlarmModel from '../models/alarm';

import { SocketInfo, Websocket as _Websocket } from '../websocket';

import globalEvents from '../utils/globalEvents';

//const NAMESPACE = 'Device_Service';

class DeviceService {
    private sockets: _Websocket[];

    constructor(sockets: _Websocket[]) {
        this.sockets = sockets;

        globalEvents.on('alarm', (alarm: AlarmModel.AlarmRow) => {
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

    public get_all(): SocketInfo[] {
        const devices: SocketInfo[] = [];

        for (let i = 0; i < this.sockets.length; i++) {
            const response: SocketInfo[] = this.sockets[i].getOpenSockets();

            for (let j = 0; j < response.length; j++) {
                devices.push(response[j]);
            }
        }

        return devices;
    }

    public get_backchannel(id: string): any[] | undefined {
        for (let i = 0; i < this.sockets.length; i++) {
            const response = this.sockets[i].getBackchannel(id);
            return response;
        }
        return;
    }

    public get_praesentation(): SocketInfo[] {
        const devices: SocketInfo[] = [];

        for (let i = 0; i < this.sockets.length; i++) {
            const response: SocketInfo[] = this.sockets[i].getOpenSockets();

            for (let j = 0; j < response.length; j++) {
                if (response[j].actions && response[j].actions.find((action) => action.id == 4))
                    devices.push(response[j]);
            }
        }

        return devices;
    }

    public send_action(id: string, action: number, value: string): boolean {
        let response = false;
        for (let i = 0; i < this.sockets.length; i++) {
            if (this.sockets[i].sendToID(id, 'action_' + action, value)) response = true;
        }

        return response;
    }

    public broadcast_userstatus(userid: number, alarmid: number, value: boolean): void {
        for (let i = 0; i < this.sockets.length; i++) {
            this.sockets[i].broadcast(
                'userstatus_' + (value ? '1' : 0),
                JSON.stringify({ alarmid, userid })
            );
        }
    }
}

let instance: DeviceService | undefined = undefined;
function init(sockets: _Websocket[]): void {
    instance = new DeviceService(sockets);
}

export { instance, init, DeviceService };
