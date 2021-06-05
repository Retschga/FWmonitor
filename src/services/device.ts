'use strict';

import logging from '../utils/logging';
import { Websocket as _Websocket, SocketInfo } from '../websocket';

const NAMESPACE = 'DeviceService';

class DeviceService {
    private sockets: _Websocket[];

    constructor(sockets: _Websocket[]) {
        this.sockets = sockets;
    }

    public get_all(params: object = {}) {
        let devices: SocketInfo[] = [];

        for (let i = 0; i < this.sockets.length; i++) {
            const response: SocketInfo[] = this.sockets[i].getOpenSockets();

            for (let j = 0; j < response.length; j++) {
                devices.push(response[j]);
            }
        }

        return devices;
    }

    public send_action(id: string, action: number, value: string) {
        for (let i = 0; i < this.sockets.length; i++) {
            this.sockets[i].sendToID(id, 'action_' + action, value);
        }
        return false;
    }
}

let instance: DeviceService | undefined = undefined;

const init = (sockets: _Websocket[]) => {
    instance = new DeviceService(sockets);
};

export { instance, init, DeviceService };
