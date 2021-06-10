'use strict';

import express, { application } from 'express';
import { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import session, { SessionOptions } from 'express-session';
import createMemoryStore from 'memorystore';
import http from 'http';
import https from 'https';
import tls from 'tls';
import fs from 'fs';
import path from 'path';
import logging from './utils/logging';
import config from './utils/config';
import RouterApi from './routerApi';
import routerScreen from './routerScreen';
import routermobile from './routerMobile';
import routerCar from './routerCar';
import alarmInputFileService from './services/alarmInputFile';
import startupCheck from './utils/startupCheck';
import routePrint from './routes/print';
import globalEvents from './utils/globalEvents';
import telegramBot from './telegramBot';
import diashowService from './services/diashow';
import { calendarService } from './services/calendar';
import { Websocket, SocketInfo } from './websocket';
import { init as initDeviceService, DeviceService } from './services/device';
import webpushService from './services/webpush';
import compression from 'compression';
import helmet from 'helmet';

const NAMESPACE = 'APP';
const MemoryStore = createMemoryStore(session);
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Programmstart
logging.info(NAMESPACE, 'Starte Software v' + config.version);
logging.info(NAMESPACE, config.raspiversion ? 'System: Raspberry PI' : 'System: Windows');
startupCheck.check();

if (!config.server_https.key || !config.server_https.cert) {
    logging.error(NAMESPACE, 'Es wurde kei SSL Zertifikat angegeben! -> Programmende');
    process.exit(1);
}
diashowService.createThumbnails();

const sessionstore = new MemoryStore({
    checkPeriod: 86400000 // clear expired every 24h
});
const sessionOptions: SessionOptions = {
    secret: process.env.BOT_TOKEN || 'Super SECRET',
    name: 'FWmonitor',
    store: sessionstore,
    saveUninitialized: false,
    resave: false,
    cookie: {
        secure: process.env.NODE_ENV != 'development',
        httpOnly: true,
        path: '/',
        //	  sameSite: true, //boolean | 'lax' | 'strict' | 'none';  IOS Fehler, keine Ahnung warum
        maxAge: 1000 * 60 * 30
        //    signed?: boolean;
        //    expires?: Date;
        //domain: config.app.enabled ? config.app.url : undefined
        //    encode?: (val: string) => string;
    }
};

// -------- Starte HTTP-Server fürs LAN --------
const appHttp = express();
appHttp.set('views', path.join(__dirname, 'views'));
appHttp.set('view engine', 'ejs');
appHttp.use(cookieParser());
appHttp.use(session(sessionOptions));
const routerApi_open = new RouterApi(false).router;
appHttp.use('/api/v1', routerApi_open);
appHttp.use('/screen', routerScreen);
appHttp.use('/print', routePrint);
appHttp.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.redirect('/screen/index');
});
appHttp.use(express.static('filesPublic/'));

const httpServer = http.createServer(appHttp);
httpServer.listen(config.server_http.port, () =>
    logging.info(
        NAMESPACE,
        `HTTP  Server is running ${config.server_http.hostname}:${config.server_http.port}`
    )
);

// -------- Starte Websocket-Server fürs LAN --------
const httpSocket = new Websocket(httpServer, false);

// -------- Starte HTTPS-Server für die WebApp --------
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
appHttps.use(express.static('filesPublic/'));

var secureContext: tls.SecureContext;
function reloadCert(path_key: string, path_cert: string) {
    secureContext = tls.createSecureContext({
        key: fs.readFileSync(path_key, 'utf8'),
        cert: fs.readFileSync(path_cert, 'utf8')
    });
}
setInterval(reloadCert, 1000 * 60 * 60 * 24);
reloadCert(config.server_https.key, config.server_https.cert);
var httpsOptions: https.ServerOptions = {
    SNICallback: function (domain, cb) {
        if (secureContext) {
            cb(null, secureContext);
        } else {
            throw new Error('No keys/certificates for domain requested ' + domain);
        }
    },
    // must list a default key and cert because required by tls.createServer()
    key: fs.readFileSync(config.server_https.key, 'utf8'),
    cert: fs.readFileSync(config.server_https.cert, 'utf8')
};
const httpsServer = https.createServer(httpsOptions, appHttps);
httpsServer.listen(config.server_https.port, () =>
    logging.info(
        NAMESPACE,
        `HTTPS Server is running ${config.server_http.hostname}:${config.server_http.port}`
    )
);
globalEvents.on('alarm', async () => {
    sessionstore.clear();
});

// -------- Starte Websocket-Server für die WebApp --------
const httpsSocket = new Websocket(httpsServer, true);

// Initialisiere DeviceService
initDeviceService([httpSocket, httpsSocket]);

// Starte Telegram-Bot
const telbot = telegramBot;

// Starte Fax/Email Auswertung
alarmInputFileService.init();

// Starte Kalender-Terminüberwachung
calendarService.init();

// Starte Verfügbarkeits-Planüberwachung

// Starte Drucker-Papierüberwachung

// Starte webpush service
const webpush = webpushService;

process.on('SIGINT', () => {
    httpServer.close();
    process.exit(1);
});
