'use strict';

import express from 'express';
import { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import createMemoryStore from 'memorystore';
import session, { SessionOptions } from 'express-session';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';
import https from 'https';
import tls from 'tls';
import fs from 'fs';
import path from 'path';
import logging from './utils/logging';
import config from './utils/config';
import RouterApi from './routes/routerApi';
import routerScreen from './routes/routerScreen';
import routermobile from './routes/routerMobile';
import routerCar from './routes/routerCar';
import alarmInputFileService from './services/alarmInputFile';
import startupCheck from './utils/startupCheck';
import routePrint from './routes/print';
import globalEvents from './utils/globalEvents';
import TelegramBot from './telegram/bot';
import diashowService from './services/diashow';
import { calendarService } from './services/calendar';
import { Websocket } from './websocket';
import { init as initDeviceService } from './services/device';
import webpushService from './services/webpush';
import userService from './services/user';
import printingService from './services/printing';
import database from './database/connection';

const NAMESPACE = 'APP';
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
const MemoryStore = createMemoryStore(session);

function init__http(sessionOptions: SessionOptions) {
    const appHttp = express();
    appHttp.set('views', path.join(__dirname, 'views'));
    appHttp.set('view engine', 'ejs');
    appHttp.use(cookieParser());
    appHttp.use(session(sessionOptions));
    const routerApi_open = new RouterApi(false).router;
    appHttp.use('/api/v1', routerApi_open);
    appHttp.use('/screen', routerScreen);
    appHttp.use('/print', routePrint);
    appHttp.get('/', (req: Request, res: Response) => {
        res.redirect('/screen/index?name=' + req.query.name);
    });
    appHttp.use(express.static('./filesPublic/'));
    appHttp.use('/scripts', express.static('./build/scripts'));

    const httpServer = http.createServer(appHttp);
    httpServer.listen(config.server_http.port, () =>
        logging.info(
            NAMESPACE,
            `HTTP  Server is running ${config.server_http.hostname}:${config.server_http.port}`
        )
    );

    process.on('exit', () => httpServer.close());

    return httpServer;
}

function init_https(sessionOptions: SessionOptions) {
    const appHttps = express();
    appHttps.set('views', path.join(__dirname, 'views'));
    appHttps.set('view engine', 'ejs');
    appHttps.use(cookieParser());
    appHttps.use(compression());
    appHttps.use(
        helmet({
            contentSecurityPolicy: false
        })
    );
    appHttps.use(session(sessionOptions));
    const routerApi_secure = new RouterApi(true).router;
    appHttps.use('/api/v1', routerApi_secure);
    appHttps.use('/app', routermobile);
    appHttps.use('/car', routerCar);
    appHttps.use(express.static('./filesPublic/'));
    appHttps.use('/scripts', express.static('./build/scripts'));

    let secureContext: tls.SecureContext;
    function reloadCert(path_key: string, path_cert: string) {
        secureContext = tls.createSecureContext({
            key: fs.readFileSync(path_key, 'utf8'),
            cert: fs.readFileSync(path_cert, 'utf8')
        });
    }
    setInterval(() => {
        if (!config.server_https.key || !config.server_https.cert) return;
        reloadCert(config.server_https.key, config.server_https.cert);
    }, 1000 * 60 * 60 * 24);
    reloadCert(config.server_https.key || '', config.server_https.cert || '');

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
        cert: fs.readFileSync(config.server_https.cert || '', 'utf8')
    };
    const httpsServer = https.createServer(httpsOptions, appHttps);
    httpsServer.listen(config.server_https.port, () =>
        logging.info(
            NAMESPACE,
            `HTTPS Server is running ${config.server_http.hostname}:${config.server_http.port}`
        )
    );

    process.on('exit', () => httpsServer.close());

    return httpsServer;
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

    // -------- Starte Programmkomponenten --------
    // Initialisiere DeviceService
    initDeviceService([httpSocket, httpsSocket]);

    // Starte Telegram-Bot
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const telegramBot = new TelegramBot();

    // Starte Fax/Email Auswertung
    alarmInputFileService.init();

    // Starte Kalender-Terminüberwachung
    calendarService.init();

    // Starte Verfügbarkeits-Planüberwachung
    userService.init();

    // Starte Drucker-Papierüberwachung
    printingService.init();

    // Starte webpush service
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const webpush = webpushService;
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
