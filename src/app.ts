'use strict';

import express from 'express';
import http from 'http';
import path from 'path';
import logging from './utils/logging';
import config from './utils/config';
import routerApi from './routerApi';
import routermobile from './routerMobile';
import AlarmInputFileService from './services/alarmInputFile';

import telegramBot from './telegramBot';
import diashowService from './services/diashow';

const NAMESPACE = 'APP';

logging.info(NAMESPACE, 'Starte Software v' + config.version);
logging.info(NAMESPACE, config.raspiversion ? 'System: Raspberry PI' : 'System: Windows');

diashowService.createThumbnails();

const app = express();

/** Setup Express */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use('/api/v1', routerApi);
app.use('/app', routermobile);
app.use(express.static('filesPublic/'));

// Starte HTTP-Server fürs LAN
const httpServer = http.createServer(app);
httpServer.listen(config.server.port, () =>
    logging.info(NAMESPACE, `Server is running ${config.server.hostname}:${config.server.port}`)
);

// Starte HTTPS-Server für die WebApp

// Starte Telegram-Bot
const telbot = telegramBot;

// Starte Fax/Email Auswertung
AlarmInputFileService.init();

// Starte Kalender-Terminüberwachung

// Starte Verfügbarkeits-Planüberwachung

// Starte Drucker-Papierüberwachung

process.on('SIGINT', () => {
    httpServer.close();
    process.exit(1);
});
