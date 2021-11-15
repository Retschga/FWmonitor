'use strict';

import { DecodeResult, checkToken } from './utils/security';

import { Socket } from 'net';
import WebSocket from 'ws';
import { getUniqueID } from './utils/common';
import http from 'http';
import https from 'https';
import logging from './utils/logging';

const NAMESPACE = 'WEBSOCKET';

type Action = {
    id: number;
    value?: string;
};

declare module 'ws' {
    class _WS extends WebSocket {}
    export interface WebSocket extends _WS {
        allowed: boolean;
        type: string;
        id: string;
        name: string;
        info: string;
        actions: Action[];
        interval_keepAlive: NodeJS.Timeout;
    }
}

interface SocketInfo {
    type: string;
    id: string;
    name: string;
    info: string;
    actions: Action[];
}

class Websocket {
    private socket;
    private secure;
    private keepAliveTime = 15000;

    constructor(server: http.Server | https.Server, secure: boolean) {
        this.secure = secure;

        // Socket erstellen
        this.socket = new WebSocket.Server(this.secure ? { noServer: true } : { server: server });

        // Sicherer Socket-Server
        if (this.secure) {
            server.on(
                'upgrade',
                async (request: http.IncomingMessage, socket: Socket, head: Buffer) => {
                    logging.debug(NAMESPACE, 'event upgrade');

                    if (!request.url) {
                        logging.error(NAMESPACE, 'wesocket upgrade no request.url');
                        socket.write('HTTP/1.1 500 internal server error\r\n\r\n');
                        socket.destroy();
                        return;
                    }

                    try {
                        const token = decodeURIComponent(request.url.split('=')[1]);
                        logging.debug(NAMESPACE, 'token', token);
                        const decodedToken: DecodeResult = checkToken(token);
                        if (decodedToken.type != 'valid') {
                            logging.debug(NAMESPACE, 'wesocket jwt unauthorized');
                            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                            socket.destroy();
                            return;
                        }
                    } catch (error) {
                        logging.exception(NAMESPACE, error);
                        socket.write('HTTP/1.1 500 internal server error\r\n\r\n');
                        socket.destroy();
                        return;
                    }

                    logging.debug(NAMESPACE, 'wesocket jwt ok');
                    this.socket.handleUpgrade(request, socket, head, (ws: WebSocket) => {
                        logging.debug(NAMESPACE, 'socket handle upgrade');
                        this.socket.emit('connection', ws, request);
                    });
                }
            );
        }

        this.socket.on('connection', (client) => {
            logging.debug(NAMESPACE, 'event connection');
            client.allowed = true;

            // KeepAlive
            client.interval_keepAlive = setInterval(function () {
                client.send(JSON.stringify({ topic: 'ping', message: new Date().toISOString() }));
                if (!client.id) {
                    client.send(JSON.stringify({ topic: 'init', message: '' }));
                }
                if (client.readyState === WebSocket.CLOSED) {
                    clearInterval(client.interval_keepAlive);
                    client.terminate();
                }
            }, this.keepAliveTime);

            client.on('message', function incoming(data) {
                try {
                    logging.debug(NAMESPACE, 'Websocket received: ', data);

                    /* Beispiel
                        {
                        "topic": "init/update",
                        "type":"WebClient/PySteuerClient",
                        "name":"Alarmdisplay - ${clientName}",
                        "info":"Index",
                        "actions":[
                            {"id":"-2"},
                            {"id":"0"},
                            {"id":"1"},
                            {"id":"2"},
                            {"id":"3", "value": ${kalenderElemente}},
                            {"id":"4"},
                            {"id":"6"},
                            {"id":"10", "value": ${pos_calendar}},
                            {"id":"11", "value": ${pos_dwd}},
                            {"id":"12", "value": ${diashow_time/1000}}
                        ]}
                    */
                    // {"id":"alles<1", "key":${key} "value": ${text}}   Textanzeige
                    // {"id":"0"}                           Button Reload
                    // {"id":"1"}                           Button Letzter Alarm
                    // {"id":"2"}                           Kann Diashow
                    // {"id":"3", "value": ${count}}        Eingabefeld Kalender Elemente
                    // {"id":"4"}                           Kann Präsentation  -> zurück mit "value": "{action:(start/stop/pause/page+/page-) file:(filename)}"
                    // {"id":"5"}                           Button Zurück
                    // {"id":"6"}                           Kann Kalender
                    // {"id":"7"}                           Button Restart
                    // {"id":"8", "value": ${version}}      Button Update
                    // {"id":"9", "value": ${lnglat}}       GPS Position
                    // {"id":"10", "value": ${pos}}         Eingabefeld Kalender Position
                    // {"id":"11", "value": ${pos}}         Eingabefeld DWD Position
                    // {"id":"12", "value": ${sec}}         Eingabefeld Diashow Wechselzeit
                    // {"id":"13", "value": ${status}}      Eingabefeld Anzeige Verfügbar
                    // {"id":"14", "value": ${status}}      Eingabefeld Anzeige Nicht Verfügbar
                    // {"id":"14", "value": ${min}}         Eingabefeld Anzeigezeit Alarm
                    // {"id":"15", "value": ${data}}        WebRtc Data
                    // {"id":"16", "value": ${data}}        Eingabefeld Diashow Bilddatum anzeigen

                    const data_json = JSON.parse(String(data));
                    const topic = data_json.topic;
                    //const message = data_json.message;

                    if (topic == 'init') {
                        if (data_json.type) {
                            client.type = data_json.type;
                            client.id = getUniqueID();
                            client.name = data_json.name;
                            client.info = data_json.info;
                            client.actions = data_json.actions;
                        }
                    }

                    if (topic == 'update') {
                        client.info = data_json.info;

                        for (let i = 0; i < data_json.actions.length; i++) {
                            if (!client.actions) continue;
                            const found = client.actions.findIndex(
                                (element) => element.id == data_json.actions[i].id
                            );
                            if (found != -1) {
                                client.actions[found] = data_json.actions[i];
                            } else {
                                client.actions.push(data_json.actions[i]);
                            }
                        }
                    }
                } catch (error) {
                    logging.exception(NAMESPACE, error);
                }
            });

            client.on('close', function close() {
                clearInterval(client.interval_keepAlive);
                logging.debug(NAMESPACE, 'Websocket disconnect');
            });
        });

        logging.debug(NAMESPACE, 'Websocket Server running.');
    }

    public broadcast(topic: string, message: string): void {
        this.socket.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.allowed == true) {
                client.send(JSON.stringify({ topic: topic, message: message }));
            }
        });
    }

    public sendToID(id: string, topic: string, message: string): boolean {
        let response = false;
        this.socket.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.allowed == true && client.id == id) {
                client.send(JSON.stringify({ topic: topic, message: message }));
                response = true;
            }
        });
        return response;
    }

    public getOpenSockets(): SocketInfo[] {
        const socks: SocketInfo[] = [];
        this.socket.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                if (!client.id) {
                    client.send(JSON.stringify({ topic: 'init', message: '' }));
                }
                socks.push({
                    type: client.type,
                    id: client.id,
                    name: client.name,
                    info: client.info,
                    actions: client.actions
                });
            }
        });
        return socks;
    }
}

export { Websocket, SocketInfo };
