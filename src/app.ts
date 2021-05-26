'use strict';

import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import memorystore from 'memorystore';
import http from 'http';
import path from 'path';
import logging from './utils/logging';
import config from './utils/config';
import routerApi from './routerApi';
import routermobile from './routerMobile';
import AlarmInputFileService from './services/alarmInputFile';
import startupCheck from './utils/startupCheck';
import routePrint from './routes/print';

import telegramBot from './telegramBot';
import diashowService from './services/diashow';
import { calendarService } from './services/calendar';

const NAMESPACE = 'APP';

process.env.NODE_ENV == 'development';

logging.info(NAMESPACE, 'Starte Software v' + config.version);
logging.info(NAMESPACE, config.raspiversion ? 'System: Raspberry PI' : 'System: Windows');

diashowService.createThumbnails();

startupCheck.check();

const app = express();

/** Setup Express */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(cookieParser());

const _memorystore = memorystore(session);
const sessionstore = new _memorystore({
    checkPeriod: 86400000 // clear expired every 24h
});
app.use(
    session({
        secret: process.env.BOT_TOKEN || 'Super SECRET',
        name: 'FWmonitor',
        store: sessionstore,
        saveUninitialized: false,
        resave: false,
        cookie: {
            secure: true,
            httpOnly: true,
            path: '/'
            //	  sameSite: true, //boolean | 'lax' | 'strict' | 'none';  IOS Fehler, keine Ahnung warum
            //	  maxAge: (1000 * 60 * 30),
            //    signed?: boolean;
            //    expires?: Date;
            //    httpOnly?: boolean;
            //    domain?: string;
            //    encode?: (val: string) => string;
        }
    })
);

app.use('/api/v1', routerApi);
app.use('/app', routermobile);
app.use('/print', routePrint);
app.use(express.static('filesPublic/'));

// Starte HTTP-Server fürs LAN
const httpServer = http.createServer(app);
httpServer.listen(config.server_http.port, () =>
    logging.info(
        NAMESPACE,
        `Server is running ${config.server_http.hostname}:${config.server_http.port}`
    )
);

// Starte HTTPS-Server für die WebApp

// Starte Telegram-Bot
const telbot = telegramBot;

// Starte Fax/Email Auswertung
AlarmInputFileService.init();

// Starte Kalender-Terminüberwachung
calendarService.init();

// Starte Verfügbarkeits-Planüberwachung

// Starte Drucker-Papierüberwachung

process.on('SIGINT', () => {
    httpServer.close();
    process.exit(1);
});
