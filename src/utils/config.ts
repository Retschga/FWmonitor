'use strict';

import dotenv from 'dotenv';
import os from 'os';

enum LOGLEVEL {
    INFO = 1,
    WARNING = 2,
    ERROR = 4,
    DEBUG = 8
}

dotenv.config();

const SQLITE = {
    file: process.env.SQLITE_FILE || 'database.sqlite3'
};

const SERVER_HTTP = {
    hostname: process.env.SERVER_HOSTNAME || '127.0.0.1',
    port: process.env.SERVER_PORT_LAN || 8080
};

const SERVER_HTTPS = {
    hostname: process.env.SERVER_HOSTNAME || '127.0.0.1',
    port: process.env.SERVER_PORT_SSL || 443,
    key: process.env.HTTPS_KEY || 'zertifikat-key.key',
    cert: process.env.HTTPS_CERT || 'zertifikat-cert.crt'
};

const TELEGRAM = {
    bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
    fw_name: process.env.FW_NAME_SHORT || 'FF Test'
};

const APP = {
    https_enabled: process.env.APP_DNS?.toLocaleLowerCase() == 'true' ? true : false,
    password_length: 10,
    vapid_private: process.env.VAPID_PRIVATE,
    vapid_public: process.env.VAPID_PUBLIC,
    vapid_mail: process.env.VAPID_EMAIL,
    jwt_key:
        'jwt' +
        process.env.TELEGRAM_BOT_TOKEN +
        process.env.FOLDER_IN +
        process.env.FOLDER_ARCHIVE +
        process.env.GEOBING_KEY +
        process.env.DWD_WARCELLID +
        process.env.FW_NAME_STANDBY +
        process.env.VAPID_PRIVATE +
        os.homedir() +
        os.platform() +
        os.hostname() +
        os.networkInterfaces(),
    jwt_expire: 60 * 60 * 24 * 31
};

const FOLDERS = {
    diashow: './filesDiashow/',
    thumbnailPrefix: 'thumbnail-',
    archive: process.env.FOLDER_ARCHIVE || './filesArchive/',
    fileInput: process.env.FOLDER_IN,
    fileInput_delay: Number(process.env.FAX_INPUT_DELAY || 0),
    fileInput_filter: process.env.FAXFILTER,
    temp: './temp/'
};

const FWVV = {
    enabled: process.env.FWVV_DAT_FOLDER ? true : false,
    dat_folder: process.env.FWVV_DAT_FOLDER
};

const ALARM = {
    telegram: process.env.BOT_SENDALARM?.toLocaleLowerCase() == 'true' ? true : false,
    app: process.env.APP_SENDALARM?.toLocaleLowerCase() == 'true' ? true : false
};

const PROGRAMS = {
    ghostscript: process.env.GHOSTSCRIPT_PATH,
    tesseract: process.env.TESSERACT_PATH,
    ghostscript_res: process.env.GHOSTSCRIPT_RESOLUTION || '500x500'
};

const PRINTING = {
    pagecountOriginal: Number(process.env.FAX_DRUCK_SEITENZAHL || 0),
    pagecountAlarm: Number(process.env.ALARMDRUCKSEITENZAHL || 0),
    printFile: process.env.FAX_DRUCK?.toLocaleLowerCase() == 'true' ? true : false
};

const COMMON = {
    fwName: process.env.FW_NAME_STANDBY || 'Freiwillige Feuerwehr Test',
    fwName_short: process.env.FW_NAME_SHORT || 'FF Test',
    dwd_warncellid: process.env.DWD_WARCELLID || '',
    time_diashow: Number(process.env.DIASHOW_DELAY) || 15000,
    time_alarm: Number(process.env.ALARM_VISIBLE) || 60,
    fw_position: process.env.FW_KOORD || ''
};

const GEOCODE = {
    bing: process.env.GEOBING_KEY ? true : false,
    bing_apikey: process.env.GEOBING_KEY,
    osm_nominatim: true,
    osm_objects: true,
    bahn: true,
    ors_key: process.env.ORS_KEY
};

const ALARMFIELDS = {
    s_EINSATZSTICHWORT: 'Stichwort :', // Filter Beginn
    e_EINSATZSTICHWORT: '\n', // Filter Ende
    s_SCHLAGWORT: 'Schlagw. :', // Filter Beginn
    e_SCHLAGWORT: '\n', // Filter Ende
    s_OBJEKT: 'Objekt :', // Filter Beginn
    e_OBJEKT: '\n', // Filter Ende
    s_BEMERKUNG: 'BEMERKUNG', // Filter Beginn
    e_BEMERKUNG: 'EINSATZHINWEIS', // Filter Ende
    s_STRASSE: 'Straße :', // Filter Beginn
    e_STRASSE: '\n', // Filter Ende
    s_ORTSTEIL: 'Ortsteil :', // Filter Beginn
    e_ORTSTEIL: '\n', // Filter Ende
    s_ORT: 'Gemeinde :', // Filter Beginn
    e_ORT: '\n', // Filter Ende
    s_EINSATZMITTEL: 'EINSATZMITTEL', // Filter Beginn
    e_EINSATZMITTEL: 'BEMERKUNG', // Filter Ende
    s_CAR: 'Name :', // Filter Beginn
    e_CAR: '\n', // Filter Ende
    CAR1: process.env.FW_NAME || '123456789123456789', // Filter um als eigenes Fahrzeug erkannt zu weden
    EMPTY: '-/-'
};

const LOG = {
    pad_namespace: 20,
    loglevel: LOGLEVEL.ERROR | LOGLEVEL.INFO | LOGLEVEL.WARNING | LOGLEVEL.DEBUG
};

const config = {
    sqlite: SQLITE,
    server_http: SERVER_HTTP,
    server_https: SERVER_HTTPS,
    telegram: TELEGRAM,
    app: APP,
    folders: FOLDERS,
    fwvv: FWVV,
    alarm: ALARM,
    programs: PROGRAMS,
    printing: PRINTING,
    geocode: GEOCODE,
    common: COMMON,
    alarmfields: ALARMFIELDS,
    raspiversion: process.env.RASPIVERSION?.toLocaleLowerCase() == 'true' ? true : false,
    version: '3.0.0',
    logging: LOG
};

export default config;
