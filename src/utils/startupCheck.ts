'use strict';

import logging from '../utils/logging';
import config from '../utils/config';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import mdns from 'mdns-js';
import { timeout, execShellCommand, checkFolderOrFile } from '../utils/common';
import path from 'path';
import fs from 'fs';

const NAMESPACE = 'StartupCheck';

class StartupCheck {
    private async check_tesseract(): Promise<boolean> {
        const out = await execShellCommand(`"${config.programs.tesseract}" --version`);
        return out.toLowerCase().indexOf('tesseract v') != -1;
    }

    private async check_ghostscript(): Promise<boolean> {
        const out = await execShellCommand(`"${config.programs.ghostscript}" --version`);
        return out.toLowerCase().indexOf('gpl ghostscript') != -1;
    }

    private async check_tiff2ps(): Promise<boolean> {
        if (!config.raspiversion) return false;
        const out = await execShellCommand('which tiff2ps');
        return out.length > 0 && out.toLowerCase().indexOf('no tiff2ps') == -1;
    }

    private async check_lpr(): Promise<boolean> {
        if (!config.raspiversion) return false;
        const out = await execShellCommand('which lpr');
        return out.length > 0 && out.toLowerCase().indexOf('no lpr') == -1;
    }

    private isRoot() {
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
            '    |                      (c) 2021 Resch                        |'
        );
        logging.info(
            NAMESPACE,
            '    |              FWmonitor    VERSION ' + config.version + '                    |'
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

    public async checkEnv() {
        const exists = await checkFolderOrFile('.env');
        if (!exists) {
            logging.error(
                NAMESPACE,
                '.env Datei wurde neu erstellt. Bitte Einstellungen bearbeiten! -> Programmende'
            );
            await fs.promises.copyFile(
                path.resolve(process.cwd(), '.env - Leer'),
                path.resolve(process.cwd(), '.env')
            );
            process.exit(0);
        }
    }

    public async checkCert() {
        if (!config.server_https.key || !config.server_https.cert) {
            logging.error(NAMESPACE, 'Es wurde kein TLS Zertifikat angegeben! -> Programmende');
            process.exit(1);
        }
    }

    // https://stackoverflow.com/questions/46155/how-to-validate-an-email-address-in-javascript
    private validateEmail(email: string) {
        const re =
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    public async checkAdminMail() {
        if (!config.app.vapid_mail || !this.validateEmail(config.app.vapid_mail)) {
            logging.error(NAMESPACE, 'Es wurde keine Admin Email angegeben! -> Programmende');
            process.exit(1);
        }
    }

    public async check() {
        logging.info(NAMESPACE, '----------------------');
        logging.info(NAMESPACE, '|    Start Check:    |');
        logging.info(NAMESPACE, '----------------------');

        logging.info(NAMESPACE, '');
        logging.info(NAMESPACE, ' - Node ENV                ' + process.env.NODE_ENV);

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
        logging.info(NAMESPACE, ' - Fax Filter:             ' + config.folders.fileInput_filter);

        // Prüfe Ausdruckeinstellungen
        logging.info(NAMESPACE, '');
        logging.info(
            NAMESPACE,
            ' - Ausdruck Alarm:        ' + (config.printing.pagecountAlarm > 0 ? ' Ja' : ' -> Nein')
        );
        logging.info(
            NAMESPACE,
            ' - Ausdruck Orginal:      ' +
                (config.printing.pagecountOriginal > 0 ? ' Ja' : ' -> Nein')
        );
        if (process.env.ALARMDRUCK == 'true') {
            // Version B
            if (config.raspiversion && process.env.AREADER != '') {
                const stat_folderReader = await checkFolderOrFile(config.programs.foxit);
                logging.info(
                    NAMESPACE,
                    ' - Programmpfad           ' + (stat_folderReader ? ' OK' : ' -> FEHLER')
                );
            }
            if (config.raspiversion) {
                logging.info(
                    NAMESPACE,
                    ' - Druckername:            ' + config.printing.print_printername
                );
            }

            // Version A
            if (process.env.DRUCKERURL != '') {
                logging.info(
                    NAMESPACE,
                    ' - Drucker URL:            ' + config.printing.print_ipp_url
                );
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
            ' - Telegram Sende Alarme: ' + (config.alarm.telegram ? ' Ja' : ' ->  Nein')
        );
        logging.info(
            NAMESPACE,
            ' - APP Sende Alarme:      ' + (config.alarm.app ? ' Ja' : ' ->  Nein')
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        browser.on('update', (data: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
