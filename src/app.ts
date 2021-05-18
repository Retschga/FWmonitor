'use strict';

import express from 'express';
import http from 'http';
import path from 'path';
import logging from './utils/logging';
import config from './utils/config';
import routerApi from './routerApi';
import routermobile from './routerMobile';
import TelegramBot from './telegramBot';

import UserService from './services/user';
import telegramBot from './telegramBot';

const NAMESPACE = 'app';

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

// Starte Fax/Email Auswertung

// Starte Kalender-Terminüberwachung

// Starte Verfügbarkeits-Planüberwachung

// Starte Drucker-Papierüberwachung

// Starte Telegram-Bot
const telbot = telegramBot;

process.on('SIGINT', () => {
    httpServer.close();
    process.exit(1);
});
