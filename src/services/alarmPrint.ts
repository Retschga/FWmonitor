'use strict';

import { AlarmRow } from '../models/alarm';
import config from '../utils/config';
import logging from '../utils/logging';
import printingService from './printing';
import puppeteer from 'puppeteer';
import { timeout } from '../utils/common';

const NAMESPACE = 'AlarmPrint_Service';

class AlarmPrintService {
    public async createPrint(alarmRow: AlarmRow) {
        try {
            const url =
                'http://' +
                '127.0.0.1' + //config.server_http.hostname +
                ':' +
                config.server_http.port +
                '/print?varEINSATZSTICHWORT=' +
                alarmRow.einsatzstichwort +
                '&varSCHLAGWORT=' +
                alarmRow.schlagwort +
                '&varOBJEKT=' +
                alarmRow.objekt +
                '&varBEMERKUNG=' +
                alarmRow.bemerkung +
                '&varSTRASSE=' +
                alarmRow.strasse +
                '&varORTSTEIL=' +
                alarmRow.ortsteil +
                '&varORT=' +
                alarmRow.ort +
                '&lat=' +
                alarmRow.lat +
                '&lng=' +
                alarmRow.lng +
                '&isAddress=' +
                (alarmRow.isAddress == true ? 1 : 0) +
                '&noMap=' +
                (alarmRow.strasse == '' && alarmRow.isAddress == false ? 1 : 0);

            // Alarmusdruck erzeugen
            logging.debug(NAMESPACE, 'Starte Puppeteer');
            logging.debug(NAMESPACE, url);

            const browser = await puppeteer.launch({
                args: ['--allow-file-access-from-files', '--enable-local-file-accesses']
            });
            logging.debug(NAMESPACE, 'Erstelle neue Seite');
            const page = await browser.newPage();

            // Navigiere puppeteer zu Ausdruck Seite
            logging.debug(NAMESPACE, 'Gehe zu ', url);
            await page.goto(url, { waitUntil: 'networkidle2' });

            // Warten bis gerendert
            await timeout(10000);

            logging.debug(NAMESPACE, 'Erstelle PDF und JPG...');

            // Ausdruck erstellen
            const paperFormat: puppeteer.PaperFormat = 'a4';
            await page.pdf({
                path: config.folders.temp + 'druck.pdf',
                format: paperFormat,
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
                printBackground: false
            });

            await browser.close();

            logging.debug(NAMESPACE, 'Erstelle PDF und JPG... Fertig');

            if (config.printing.pagecountAlarm > 0) {
                logging.debug(NAMESPACE, 'Alarmausdruck...');

                for (let i = 0; i < config.printing.pagecountAlarm; i++) {
                    // Drucken
                    logging.info(
                        NAMESPACE,
                        'Seite ' + (i + 1) + ' von ' + config.printing.pagecountAlarm
                    );
                    printingService.print(config.folders.temp + 'druck');
                }
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }
}

export default new AlarmPrintService();
