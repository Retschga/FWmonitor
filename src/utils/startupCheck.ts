'use strict';

import logging from '../utils/logging';
import config from '../utils/config';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import mdns from 'mdns-js';
import { timeout, execShellCommand, checkFolderOrFile } from '../utils/common';

const NAMESPACE = 'StartupCheck';

class StartupCheck {
    public async check_tesseract(): Promise<boolean> {
        const out = await execShellCommand(`"${config.programs.tesseract}" --version`);
        return out.toLowerCase().indexOf('tesseract v') != -1;
    }

    public async check_ghostscript(): Promise<boolean> {
        const out = await execShellCommand(`"${config.programs.ghostscript}" --version`);
        return out.toLowerCase().indexOf('gpl ghostscript') != -1;
    }

    public async check_tiff2ps(): Promise<boolean> {
        if (!config.raspiversion) return false;
        const out = await execShellCommand('which tiff2ps');
        return out.length > 0 && out.toLowerCase().indexOf('no tiff2ps') == -1;
    }

    public async check_lpr(): Promise<boolean> {
        if (!config.raspiversion) return false;
        const out = await execShellCommand('which lpr');
        return out.length > 0 && out.toLowerCase().indexOf('no lpr') == -1;
    }

    public isRoot() {
        return process.getuid && process.getuid() === 0;
    }

    public drawHeader() {
        logging.info(NAMESPACE, '');
        logging.info(
            NAMESPACE,
            '    --------------------------------------------------------------'
        );
        logging.info(
            NAMESPACE,
            '    |            Feuerwehr Einsatzmonitor Software               |'
        );
        logging.info(
            NAMESPACE,
            '    |                                                            |'
        );
        logging.info(
            NAMESPACE,
            '    |             (c) 2021 Resch - FF Fischbachau                |'
        );
        logging.info(
            NAMESPACE,
            '    |                       VERSION ' + config.version + '                        |'
        );
        logging.info(
            NAMESPACE,
            '    |                                                            |'
        );
        logging.info(
            NAMESPACE,
            '    |               weitere Infos: siehe Readme                  |'
        );
        logging.info(
            NAMESPACE,
            '    |                                                            |'
        );
        logging.info(
            NAMESPACE,
            '    --------------------------------------------------------------'
        );
    }

    public async check() {
        this.drawHeader();

        logging.info(NAMESPACE, '----------------------');
        logging.info(NAMESPACE, '|    Start Check:    |');
        logging.info(NAMESPACE, '----------------------');

        // Alarm Eingangsordner - dateien
        logging.info(NAMESPACE, '');
        const stat_folderIn = await checkFolderOrFile(config.folders.fileInput);
        logging.info(
            NAMESPACE,
            ' - Eingangsordner         ' + (stat_folderIn ? ' OK' : ' -> FEHLER')
        );

        // Archivordner
        const stat_folderArchive = await checkFolderOrFile(process.env.FOLDER_ARCHIVE);
        logging.info(
            NAMESPACE,
            ' - Archivordner           ' + (stat_folderArchive ? ' OK' : ' -> FEHLER')
        );

        // Gebe Filtereinstellungen aus
        logging.info(NAMESPACE, '');
        logging.info(NAMESPACE, ' - Fax Filter:             ' + process.env.FAXFILTER);
        logging.info(NAMESPACE, ' - Einsatzmittel Filter:   ' + process.env.FW_NAME);

        // Prüfe Ausdruckeinstellungen
        logging.info(NAMESPACE, '');
        logging.info(
            NAMESPACE,
            ' - Ausdruck:              ' + (process.env.ALARMDRUCK == 'true' ? ' Ja' : ' -> Nein')
        );
        if (process.env.ALARMDRUCK == 'true') {
            // Version B
            if (config.raspiversion && process.env.AREADER != '') {
                const stat_folderReader = await checkFolderOrFile(process.env.AREADER);
                logging.info(
                    NAMESPACE,
                    ' - Programmpfad           ' + (stat_folderReader ? ' OK' : ' -> FEHLER')
                );
            }
            if (config.raspiversion) {
                logging.info(NAMESPACE, ' - Druckername:            ' + process.env.DRUCKERNAME);
            }

            // Version A
            if (process.env.DRUCKERURL != '') {
                logging.info(NAMESPACE, ' - Drucker URL:            ' + process.env.DRUCKERURL);
            }
        }

        // Tesseract
        logging.info(NAMESPACE, '');
        logging.info(
            NAMESPACE,
            ' - Tesseract              ' + (this.check_tesseract() ? ' OK' : ' -> FEHLER')
        );

        // Ghostscript
        logging.info(
            NAMESPACE,
            ' - Ghostscript            ' + (this.check_ghostscript() ? ' OK' : ' -> FEHLER')
        );

        if (config.raspiversion) {
            // tiff2ps
            logging.info(
                NAMESPACE,
                ' - tiff2ps                ' + (this.check_tiff2ps() ? ' OK' : ' -> FEHLER')
            );

            // lpr
            logging.info(
                NAMESPACE,
                ' - lpr                    ' + (this.check_lpr() ? ' OK' : ' -> FEHLER')
            );

            // is root
            logging.info(NAMESPACE, '');
            logging.info(
                NAMESPACE,
                ' - Program ist root       ' + (this.isRoot() ? ' OK' : ' -> FEHLER')
            );
        }

        // Alarmierung
        logging.info(NAMESPACE, '');
        logging.info(
            NAMESPACE,
            ' - Telegram Sende Alarme: ' +
                (process.env.BOT_SENDALARM == 'true' ? ' Ja' : ' ->  Nein')
        );
        logging.info(
            NAMESPACE,
            ' - APP Sende Alarme:      ' +
                (process.env.APP_SENDALARM == 'true' ? ' Ja' : ' ->  Nein')
        );

        logging.info(NAMESPACE, '');
        logging.info(NAMESPACE, '----------------------');
        logging.info(NAMESPACE, '|   IPP   Drucker:   |');
        logging.info(NAMESPACE, '----------------------');

        logging.info(NAMESPACE, '');

        //if you have another mdns daemon running, like avahi or bonjour, uncomment following line
        mdns.excludeInterface('0.0.0.0');
        const browser = mdns.createBrowser(mdns.tcp('ipp'));

        browser.on('ready', () => {
            browser.discover();
        });
        browser.on('update', (data: any) => {
            const txtRecord: any = {};
            for (const i in data.txt) {
                const e = data.txt[i].split('=');
                txtRecord[e[0]] = e[1];
            }
            logging.info(
                NAMESPACE,
                ' - ',
                /*data.fullname+ */
                txtRecord.ty +
                    ' ' +
                    txtRecord.note +
                    ' :  URL -->  http://' +
                    data.host +
                    ':' +
                    data.port +
                    '/' +
                    txtRecord.rp +
                    '  <--'
            );
        });
        await timeout(5000);

        logging.info(NAMESPACE, '');
        logging.info(NAMESPACE, '');
        logging.info(NAMESPACE, '');
    }
}

export default new StartupCheck();
