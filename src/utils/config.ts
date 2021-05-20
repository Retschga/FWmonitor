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

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '';
const TELEGRAM_FW_NAME = process.env.FW_NAME_BOT || '';

const TELEGRAM = {
    bot_token: TELEGRAM_BOT_TOKEN,
    fw_name: TELEGRAM_FW_NAME
};

const APP_HTTPS_ENABLED = process.env.APP_DNS != '';

const APP = {
    https_enabled: APP_HTTPS_ENABLED,
    password_length: 10
};

const FOLDER_DIASHOW = './filesHTTP/images/slideshow/';
const FOLDER_THUMBNAIL_PREFIX = 'thumbnail-';

const FOLDERS = {
    diashow: FOLDER_DIASHOW,
    thumbnailPrefix: FOLDER_THUMBNAIL_PREFIX
};

const config = {
    sqlite: SQLITE,
    server: SERVER,
    telegram: TELEGRAM,
    app: APP,
    folders: FOLDERS
};

export default config;
