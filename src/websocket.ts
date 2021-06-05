'use strict';

import logging from './utils/logging';
import WebSocket from 'ws';
import http from 'http';
import https from 'https';
import { Socket } from 'net';
import { checkToken, DecodeResult } from './utils/security';
import { getUniqueID } from './utils/common';

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
    private server;
    private socket;
    private secure;
    private keepAliveTime = 15000;

    constructor(server: http.Server | https.Server, secure: boolean) {
        this.server = server;
        this.secure = secure;

        // Socket erstellen
        this.socket = new WebSocket.Server(this.secure ? { noServer: true } : { server: server });

        // Sicherer Socket-Server
        if (this.secure) {
            server.on(
                'upgrade',
                async (request: http.IncomingMessage, socket: Socket, head: Buffer) => {
                    if (!request.url) {
                        logging.error(NAMESPACE, 'wesocket upgrade no request.url');
                        socket.write('HTTP/1.1 500 internal server error\r\n\r\n');
                        socket.destroy();
                        return;
                    }

                    try {
                        const decodedToken: DecodeResult = checkToken(request.url.split('=')[1]);
                        if (decodedToken.type != 'valid') {
                            logging.debug(NAMESPACE, 'wesocket jwt unauthorized');
                            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                            socket.destroy();
                            return;
                        }
                    } catch (error) {
                        logging.ecxeption(NAMESPACE, error);
                        socket.write('HTTP/1.1 500 internal server error\r\n\r\n');
                        socket.destroy();
                        return;
                    }

                    logging.debug(NAMESPACE, 'wesocket jwt ok');
                    this.socket.handleUpgrade(request, socket, head, function done(ws: WebSocket) {
                        ws.emit('connection', ws, request);
                    });
                }
            );
        }

        this.socket.on('connection', (ws) => {
            ws.allowed = true;

            // KeepAlive
            ws.interval_keepAlive = setInterval(function () {
                ws.send(JSON.stringify({ topic: 'ping', message: new Date().toISOString() }));
                if (ws.readyState === WebSocket.CLOSED) {
                    clearInterval(ws.interval_keepAlive);
                    ws.terminate();
                }
            }, this.keepAliveTime);

            ws.on('message', function incoming(data) {
                try {
                    logging.debug(NAMESPACE, 'Websocket received: ', data);

                    /** Beispiel
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
                    // {"id":"alles<1", "value": ${text}}   Textanzeige
                    // {"id":"0"}                           Button Reload
                    // {"id":"1"}                           Button Letzter Alarm
                    // {"id":"2"}                           Kann Diashow
                    // {"id":"3", "value": ${count}}        Eingabefeld Kalender Elemente
                    // {"id":"4"}                           Kann Präsentation
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

                    const data_json = JSON.parse(String(data));
                    const topic = data_json.topic;
                    const message = data_json.message;

                    if (topic == 'init') {
                        if (data_json.type) {
                            ws.type = data_json.type;
                            ws.id = getUniqueID();
                            ws.name = data_json.name;
                            ws.info = data_json.info;
                            ws.actions = data_json.actions;
                        }
                    }

                    if (topic == 'update') {
                        ws.info = data_json.info;

                        for (let i = 0; i < data_json.actions.length; i++) {
                            const found = ws.actions.findIndex(
                                (element) => element.id == data_json.actions[i].id
                            );
                            if (found != -1) {
                                ws.actions[found] = data_json.actions[i];
                            } else {
                                ws.actions.push(data_json.actions[i]);
                            }
                        }
                    }
                } catch (error) {
                    logging.ecxeption(NAMESPACE, error);
                }
            });

            ws.on('close', function close() {
                clearInterval(ws.interval_keepAlive);
                logging.debug(NAMESPACE, 'Websocket disconnect');
            });
        });

        logging.debug(NAMESPACE, 'Websocket Server running.');
    }

    public broadcast(topic: string, message: string) {
        this.socket.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.allowed == true) {
                client.send(JSON.stringify({ topic: topic, message: message }));
            }
        });
    }

    public sendToID(id: string, topic: string, message: string) {
        this.socket.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && client.allowed == true && client.id == id) {
                client.send(JSON.stringify({ topic: topic, message: message }));
            }
        });
    }

    public getOpenSockets(): SocketInfo[] {
        let socks: SocketInfo[] = [];
        this.socket.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
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
