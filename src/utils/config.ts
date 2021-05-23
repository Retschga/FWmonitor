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
const FOLDER_ARCHIVE = process.env.FOLDER_ARCHIVE || './filesArchive/';
const FOLDER_FILE_INPUT = process.env.FOLDER_IN;
const FOLDER_FILE_INPUT_DELAY = Number(process.env.FAX_INPUT_DELAY || 0);
const FOLDER_FILE_INPUT_FILTER = process.env.FAXFILTER;
const FOLDER_TEMP = './temp/';

const FOLDERS = {
    diashow: FOLDER_DIASHOW,
    thumbnailPrefix: FOLDER_THUMBNAIL_PREFIX,
    archive: FOLDER_ARCHIVE,
    fileInput: FOLDER_FILE_INPUT,
    fileInput_delay: FOLDER_FILE_INPUT_DELAY,
    fileInput_filter: FOLDER_FILE_INPUT_FILTER,
    temp: FOLDER_TEMP
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

const PROGRAM_GHOSTSCRIPT = process.env.GHOSTSCRIPT_PATH;
const PROGRAM_TESSERACT = process.env.TESSERACT_PATH;

const PROGRAMS = {
    ghostscript: PROGRAM_GHOSTSCRIPT,
    tesseract: PROGRAM_TESSERACT
};

const PRINTING_PAGECOUNT_ORIGINAL = Number(process.env.FAX_DRUCK_SEITENZAHL || 0);
const PRINTING_PAGECOUNT_ALARM = Number(process.env.ALARMDRUCKSEITENZAHL || 0);
const PRINTING_PRINT_FILE = process.env.FAX_DRUCK ? true : false;

const PRINTING = {
    pagecountOriginal: PRINTING_PAGECOUNT_ORIGINAL,
    pagecountAlarm: PRINTING_PAGECOUNT_ALARM,
    printFile: PRINTING_PRINT_FILE
};

const COMMON_FW_NAME = process.env.FW_NAME || 'Freiwillige Feuerwehr Test';

const COMMON = {
    fwName: COMMON_FW_NAME
};

const ALARMFIELDS = {
    s_EINSATZSTICHWORT: 'Stichwort : ', // Filter Beginn
    e_EINSATZSTICHWORT: '\n', // Filter Ende
    s_SCHLAGWORT: 'Schlagw. : ', // Filter Beginn
    e_SCHLAGWORT: '\n', // Filter Ende
    s_OBJEKT: 'Objekt : ', // Filter Beginn
    e_OBJEKT: '\n', // Filter Ende
    s_BEMERKUNG: 'BEMERKUNG', // Filter Beginn
    e_BEMERKUNG: 'EINSATZHINWEIS', // Filter Ende
    s_STRASSE: 'Straße : ', // Filter Beginn
    e_STRASSE: '\n', // Filter Ende
    s_ORTSTEIL: 'Ortsteil : ', // Filter Beginn
    e_ORTSTEIL: '\n', // Filter Ende
    s_ORT: 'Gemeinde : ', // Filter Beginn
    e_ORT: '\n', // Filter Ende
    s_EINSATZMITTEL: 'EINSATZMITTEL', // Filter Beginn
    e_EINSATZMITTEL: 'BEMERKUNG', // Filter Ende
    s_CAR: 'Name : ', // Filter Beginn
    e_CAR: '\n', // Filter Ende
    CAR1: COMMON.fwName, // Filter um als eigenes Fahrzeug erkannt zu weden
    EMPTY: '-/-'
};

const config = {
    sqlite: SQLITE,
    server: SERVER,
    telegram: TELEGRAM,
    app: APP,
    folders: FOLDERS,
    fwvv: FWVV,
    alarm: ALARM,
    programs: PROGRAMS,
    printing: PRINTING,
    raspiversion: process.env.RASPIVERSION ? true : false,
    common: COMMON,
    alarmfields: ALARMFIELDS
};

export default config;
