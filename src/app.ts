'use strict';

import aedes, { AuthenticateError, Aedes } from 'aedes';
import { Request, Response } from 'express';
import session, { SessionOptions } from 'express-session';

import AlarmService from './services/alarm';
import RouterApi from './routes/routerApi';
import TelegramBot from './telegram/bot';
import { Websocket } from './websocket';
import alarmInputEmailService from './services/alarmInputEmail';
import alarmInputFileService from './services/alarmInputFile';
import { calendarService } from './services/calendar';
import compression from 'compression';
import config from './utils/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import createMemoryStore from 'memorystore';
import database from './database/connection';
import diashowService from './services/diashow';
import express from 'express';
import favicon from 'serve-favicon';
import fs from 'fs';
import globalEvents from './utils/globalEvents';
import helmet from 'helmet';
import http from 'http';
import https from 'https';
import { init as initDeviceService } from './services/device';
import logging from './utils/logging';
import path from 'path';
import printingService from './services/printing';
import routePrint from './routes/print';
import routerCar from './routes/routerCar';
import routerScreen from './routes/routerScreen';
import routermobile from './routes/routerMobile';
import softwareupdate from './utils/softwareupdate';
import startupCheck from './utils/startupCheck';
import tls from 'tls';
import userService from './services/user';
import webpushService from './services/webpush';
import { checkPassword, createNewPassword, hashPassword } from './utils/security';
import statusInputFe2 from './services/statusInputFe2';

const NAMESPACE = 'APP';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
const MemoryStore = createMemoryStore(session);

function init__http(sessionOptions: SessionOptions) {
    const appHttp = express();
    appHttp.set('views', path.join(__dirname, 'views'));
    appHttp.set('view engine', 'ejs');
    appHttp.use(cookieParser());
    appHttp.use(favicon(path.join('./filesPublic/', 'favicon.ico')));
    appHttp.use(session(sessionOptions));
    appHttp.use(
        cors({
            origin: config.server_http.cors || false
        })
    );
    const routerApi_open = new RouterApi(false).router;
    appHttp.use('/api/v1', routerApi_open);
    appHttp.use('/screen', routerScreen);
    appHttp.use('/print', routePrint);
    appHttp.get('/', (req: Request, res: Response) => {
        res.redirect('/screen/index?name=' + req.query.name);
    });
    appHttp.use(express.static('./filesPublic/'));
    appHttp.use(express.static('./filesLocal/'));
    appHttp.use('/scripts', express.static('./build/scripts'));

    const httpServer = http.createServer(appHttp);
    httpServer.listen(config.server_http.port, () =>
        logging.info(
            NAMESPACE,
            `HTTP  Server is running ${config.server_http.hostname}:${config.server_http.port}`
        )
    );

    process.on('exit', () => {
        logging.info(NAMESPACE, `exit => stop https`);
        httpServer.close();
    });

    httpServer.on('error', (e: any) => {
        if (e.code === 'EADDRINUSE') {
            logging.error(NAMESPACE, 'HTTP  Server: Address/Port already in use');
        } else {
            logging.exception(NAMESPACE, e);
        }
    });

    return httpServer;
}

function init_https(sessionOptions: SessionOptions) {
    const appHttps = express();
    appHttps.set('views', path.join(__dirname, 'views'));
    appHttps.set('view engine', 'ejs');
    appHttps.use(cookieParser());
    appHttps.use(compression());
    appHttps.use(favicon(path.join('./filesPublic/', 'favicon.ico')));
    appHttps.use(session(sessionOptions));
    appHttps.use(
        helmet({
            contentSecurityPolicy: false // TODO
        })
    );
    appHttps.use(
        cors({
            origin: config.server_https.cors || false
        })
    );

    const routerApi_secure = new RouterApi(true).router;
    appHttps.use('/api/v1', routerApi_secure);
    appHttps.use('/app', routermobile);
    appHttps.use('/car', routerCar);
    appHttps.use(express.static('./filesPublic/'));
    appHttps.use('/scripts', express.static('./build/scripts'));

    let secureContext: tls.SecureContext;
    function reloadCert(path_key: string, path_cert: string, path_ca?: string | undefined) {
        secureContext = tls.createSecureContext({
            key: fs.readFileSync(path_key, 'utf8'),
            cert: fs.readFileSync(path_cert, 'utf8'),
            ca: path_ca && [fs.readFileSync(path_ca, 'utf8')]
        });
    }
    setInterval(() => {
        if (!config.server_https.key || !config.server_https.cert) return;
        reloadCert(config.server_https.key, config.server_https.cert, config.server_https.ca);
    }, 1000 * 60 * 60 * 24);
    reloadCert(
        config.server_https.key || '',
        config.server_https.cert || '',
        config.server_https.ca
    );

    const httpsOptions: https.ServerOptions = {
        SNICallback: function (domain, cb) {
            if (secureContext) {
                cb(null, secureContext);
            } else {
                throw new Error('No keys/certificates for domain requested ' + domain);
            }
        },
        // must list a default key and cert because required by tls.createServer()
        key: fs.readFileSync(config.server_https.key || '', 'utf8'),
        cert: fs.readFileSync(config.server_https.cert || '', 'utf8'),
        ca: config.server_https.ca && [fs.readFileSync(config.server_https.ca, 'utf8')]
    };
    const httpsServer = https.createServer(httpsOptions, appHttps);
    httpsServer.listen(config.server_https.port, () =>
        logging.info(
            NAMESPACE,
            `HTTPS Server is running ${config.server_http.hostname}:${config.server_https.port}`
        )
    );

    process.on('exit', () => {
        logging.info(NAMESPACE, `exit => stop https`);
        httpsServer.close();
    });

    httpsServer.on('error', (e: any) => {
        if (e.code === 'EADDRINUSE') {
            logging.error(NAMESPACE, 'HTTPS  Server: Address/Port already in use');
        } else {
            logging.exception(NAMESPACE, e);
        }
    });

    return httpsServer;
}

function init_mqttBroker() {
    if (
        !config.mqtt_broker.cert ||
        !config.mqtt_broker.key ||
        !config.mqtt_broker.user ||
        !config.mqtt_broker.password
    ) {
        logging.error(NAMESPACE, 'MQTT Broker: Einstellungen nicht konfiguriert -> Abbruch');
        return;
    }

    config.mqtt_broker.password = hashPassword(config.mqtt_broker.password);
    config.mqtt_broker.internalUser = createNewPassword().password;
    const internalPassword = createNewPassword(32);
    config.mqtt_broker.internalPassword = internalPassword.password;
    const internalPassword_hash = internalPassword.hash;

    let secureContext: tls.SecureContext;
    function reloadCert(path_key: string, path_cert: string, path_ca?: string | undefined) {
        secureContext = tls.createSecureContext({
            key: fs.readFileSync(path_key, 'utf8'),
            cert: fs.readFileSync(path_cert, 'utf8'),
            ca: path_ca && [fs.readFileSync(path_ca, 'utf8')]
        });
    }
    setInterval(() => {
        if (!config.mqtt_broker.key || !config.mqtt_broker.cert) return;
        reloadCert(config.mqtt_broker.key, config.mqtt_broker.cert, config.mqtt_broker.ca);
    }, 1000 * 60 * 60 * 24);
    reloadCert(config.mqtt_broker.key || '', config.mqtt_broker.cert || '');

    const options: tls.TlsOptions = {
        SNICallback: function (domain, cb) {
            if (secureContext) {
                cb(null, secureContext);
            } else {
                throw new Error('No keys/certificates for domain requested ' + domain);
            }
        },
        // must list a default key and cert because required by tls.createServer()
        key: fs.readFileSync(config.mqtt_broker.key || '', 'utf8'),
        cert: fs.readFileSync(config.mqtt_broker.cert || '', 'utf8'),
        ca: config.mqtt_broker.ca && [fs.readFileSync(config.mqtt_broker.ca, 'utf8')]
    };

    const aedesInstance: Aedes = aedes();

    aedesInstance.authenticate = function (client, username, password, callback) {
        try {
            const text =
                new Date().toISOString() +
                '    ' +
                'authenticate Client \x1b[31m' +
                (client ? client.id : 'BROKER_' + aedesInstance.id) +
                '\x1b[0m username: ' +
                username +
                '  password: ' +
                password;

            logging.info(NAMESPACE, text);
            fs.appendFileSync('temp/mqttTest.txt', text + '\n');

            if (!config.mqtt_broker.password) throw new Error();
            callback(
                null,
                (username === config.mqtt_broker.user &&
                    checkPassword(password.toString(), config.mqtt_broker.password)) ||
                    (username === config.mqtt_broker.internalUser &&
                        checkPassword(password.toString(), internalPassword_hash))
            );
        } catch (error) {
            const e: AuthenticateError = <AuthenticateError>new Error('Auth error');
            e.returnCode = 4;
            callback(e, null);
        }
    };

    const server = tls.createServer(options, aedesInstance.handle);

    server.listen(config.mqtt_broker.port, function () {
        logging.info(
            NAMESPACE,
            `MQTT Broker is running ${config.mqtt_broker.hostname}:${config.mqtt_broker.port}`
        );
    });

    aedesInstance.on('subscribe', function (subscriptions, client) {
        const text =
            new Date().toISOString() +
            '    ' +
            'MQTT client \x1b[32m' +
            (client ? client.id : client) +
            '\x1b[0m subscribed to topics: ' +
            subscriptions.map((s) => s.topic).join('\n');
        'from broker ' + aedesInstance.id;

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });

    aedesInstance.on('unsubscribe', function (subscriptions, client) {
        const text =
            new Date().toISOString() +
            '    ' +
            'MQTT client \x1b[32m' +
            (client ? client.id : client) +
            '\x1b[0m unsubscribed to topics: ' +
            subscriptions.join('\n');
        'from broker ' + aedesInstance.id;

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });

    // fired when a client connects
    aedesInstance.on('client', function (client) {
        const text =
            new Date().toISOString() +
            '    ' +
            'Client Connected: \x1b[33m' +
            (client ? client.id : client) +
            '\x1b[0m';
        'to broker ' + aedesInstance.id;

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });
    aedesInstance.on('clientReady', function (client) {
        const text =
            new Date().toISOString() +
            '    ' +
            'Client Ready: \x1b[33m' +
            (client ? client.id : client) +
            '\x1b[0m';
        'to broker ' + aedesInstance.id;

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });
    aedesInstance.on('keepaliveTimeout', function (client) {
        const text =
            new Date().toISOString() +
            '    ' +
            'Client keepaliveTimeout: \x1b[33m' +
            (client ? client.id : client) +
            '\x1b[0m';
        'to broker ' + aedesInstance.id;

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });
    aedesInstance.on('connectionError', function (client, error: Error) {
        const text =
            new Date().toISOString() +
            '    ' +
            'Client connectionError: \x1b[33m' +
            (client ? client.id : client) +
            '\x1b[0m ' +
            error.message +
            ' ' +
            error.name;
        'to broker ' + aedesInstance.id;

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });
    aedesInstance.on('clientError', function (client, error: Error) {
        const text =
            new Date().toISOString() +
            '    ' +
            'Client Error: \x1b[33m' +
            (client ? client.id : client) +
            '\x1b[0m ' +
            error.message +
            ' ' +
            error.name;
        'to broker ' + aedesInstance.id;

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });

    // fired when a client disconnects
    aedesInstance.on('clientDisconnect', function (client) {
        const text =
            new Date().toISOString() +
            '    ' +
            'Client Disconnected: \x1b[31m' +
            (client ? client.id : client) +
            '\x1b[0m';
        'to broker ' + aedesInstance.id;

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });

    // fired when a message is published
    aedesInstance.on('publish', async function (packet, client) {
        const text =
            new Date().toISOString() +
            '    ' +
            'Client \x1b[31m' +
            (client ? client.id : 'BROKER_' + aedesInstance.id) +
            '\x1b[0m has published >' +
            packet.payload.toString() +
            '< on >' +
            packet.topic +
            '< to broker >' +
            aedesInstance.id +
            '<';

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });
    aedesInstance.on('connackSent', async function (packet, client) {
        const text =
            new Date().toISOString() +
            '    ' +
            'Client \x1b[31m' +
            (client ? client.id : 'BROKER_' + aedesInstance.id) +
            '\x1b[0m connackSent';

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });
    aedesInstance.on('ping', async function (packet, client) {
        const text =
            new Date().toISOString() +
            '    ' +
            'Client \x1b[31m' +
            (client ? client.id : 'BROKER_' + aedesInstance.id) +
            '\x1b[0m ping';

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });
    aedesInstance.on('ack', async function (packet, client) {
        const text =
            new Date().toISOString() +
            '    ' +
            'Client \x1b[31m' +
            (client ? client.id : 'BROKER_' + aedesInstance.id) +
            '\x1b[0m ack';

        logging.info(NAMESPACE, text);
        fs.appendFileSync('temp/mqttTest.txt', text + '\n');
    });
}

async function init() {
    logging.info(NAMESPACE, 'Starte Software v' + config.version);
    logging.info(NAMESPACE, config.raspiversion ? 'System: Raspberry PI' : 'System: Windows');
    startupCheck.drawHeader();
    await startupCheck.checkEnv();
    await startupCheck.checkCert();
    await startupCheck.check();

    // Diashow Thubnnails erstellen, falls noch nicht vorhanden
    diashowService.createThumbnails();

    // Initialisiere Datenbank
    database.init();

    // Session Store für App erstellen
    const sessionstore = new MemoryStore({
        checkPeriod: 86400000 // clear expired every 24h
    });
    const sessionOptions: SessionOptions = {
        secret: process.env.BOT_TOKEN || 'Super NOT SECRET',
        name: 'FWmonitor',
        store: sessionstore,
        saveUninitialized: false,
        resave: false,
        cookie: {
            secure: process.env.NODE_ENV != 'development',
            httpOnly: true,
            path: '/',
            sameSite: 'strict', //boolean | 'lax' | 'strict' | 'none';
            maxAge: 1000 * 60 * 30
            // domain: config.app.enabled ? config.app.url : undefined
            // expires?: Date;
            // signed?: boolean;
            // encode?: (val: string) => string;
        }
    };
    globalEvents.on('alarm', async () => {
        sessionstore.clear();
    });

    // -------- Starte HTTP-Server fürs LAN --------
    const httpServer = init__http(sessionOptions);

    // -------- Starte Websocket-Server fürs LAN --------
    const httpSocket = new Websocket(httpServer, false);

    // -------- Starte HTTPS-Server für die WebApp --------
    const httpsServer = init_https(sessionOptions);

    // -------- Starte Websocket-Server für die WebApp --------
    const httpsSocket = new Websocket(httpsServer, true);

    // -------- Starte MQTT Broker ----------
    if (config.mqtt_broker.internalBroker) {
        logging.info(
            NAMESPACE,
            config.mqtt_broker.internalBroker ? 'UInterner Broker' : 'ecterner broker'
        );
        init_mqttBroker();
    } else {
        config.mqtt_broker.internalUser = config.mqtt_broker.user || '';
        config.mqtt_broker.internalPassword = config.mqtt_broker.password || '';
    }

    // -------- Starte Programmkomponenten --------
    // Initialisiere DeviceService
    initDeviceService([httpSocket, httpsSocket]);

    // Starte Telegram-Bot
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const telegramBot = new TelegramBot();
    await telegramBot.init();

    // Starte Fax/Email Auswertung
    alarmInputFileService.init();
    alarmInputEmailService.init();

    // Starte Kalender-Terminüberwachung
    calendarService.init();

    // Starte Verfügbarkeits-Planüberwachung
    userService.init();

    // Starte Drucker-Papierüberwachung
    printingService.init();

    // Starte Alarmservice
    AlarmService.init();

    // Starte webpush service
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const webpush = webpushService;

    // Starte Update Checker
    softwareupdate.init();

    // Starte FE2 Auswertung
    if (config.mqtt_broker.topic_fe2_status) statusInputFe2.init();

    logging.info(NAMESPACE, `INIT done`);
}

// -------- Programmstart --------
init();

// -------- Programmende --------
function exit() {
    process.exit(1);
}
process.on('SIGINT', () => {
    // eslint-disable-next-line no-console
    console.log('Ctrl-C...');
    exit();
});
process.on('SIGTERM', () => {
    // eslint-disable-next-line no-console
    console.log('Terminate...');
    exit();
});
process.on('SIGHUP', () => {
    // eslint-disable-next-line no-console
    console.log('Terminate...');
    exit();
});
process.on('SIGUSR2', () => {
    // eslint-disable-next-line no-console
    console.log('Terminate...');
    exit();
});
process.on('exit', () => {
    // eslint-disable-next-line no-console
    console.log('exit');
    exit();
});
