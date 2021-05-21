import dotenv from 'dotenv';

dotenv.config();

const SQLITE_FILE = process.env.SQLITE_FILE || 'database.sqlite3';

const SQLITE = {
    file: SQLITE_FILE
};

const SERVER_HOSTNAME = process.env.SERVER_HOSTNAME || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || 1337;

const SERVER = {
    hostname: SERVER_HOSTNAME,
    port: SERVER_PORT
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_FW_NAME = process.env.FW_NAME_SHORT || 'FF Test';

const TELEGRAM = {
    bot_token: TELEGRAM_BOT_TOKEN,
    fw_name: TELEGRAM_FW_NAME
};

const APP_HTTPS_ENABLED = process.env.APP_DNS ? true : false;

const APP = {
    https_enabled: APP_HTTPS_ENABLED,
    password_length: 10
};

const FOLDER_DIASHOW = './filesDiashow/';
const FOLDER_THUMBNAIL_PREFIX = 'thumbnail-';

const FOLDERS = {
    diashow: FOLDER_DIASHOW,
    thumbnailPrefix: FOLDER_THUMBNAIL_PREFIX
};

const FWVV_ENABLED = process.env.FWVV_DAT_FOLDER ? true : false;
const FWVV_DAT_FOLDER = process.env.FWVV_DAT_FOLDER;

const FWVV = {
    enabled: FWVV_ENABLED,
    dat_folder: FWVV_DAT_FOLDER
};

const ALARM_TELEGRAM = process.env.BOT_SENDALARM ? true : false;
const ALARM_APP = process.env.APP_SENDALARM ? true : false;

const ALARM = {
    telegram: ALARM_TELEGRAM,
    app: ALARM_APP
};

const config = {
    sqlite: SQLITE,
    server: SERVER,
    telegram: TELEGRAM,
    app: APP,
    folders: FOLDERS,
    fwvv: FWVV,
    alarm: ALARM
};

export default config;
