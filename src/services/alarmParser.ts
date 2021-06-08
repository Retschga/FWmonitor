'use strict';

import puppeteer from 'puppeteer';
import moveFile from 'move-file';
import fs from 'fs';
import logging from '../utils/logging';
import config from '../utils/config';
import { timeout } from '../utils/common';
import { AlarmRow } from '../models/alarm';
import AlarmService from './alarm';
import GeocodeService from './geocode';
import PrintingServoce from './printing';

const NAMESPACE = 'AlarmParserService';

class AlarmFields {
    // ---------------- Fax Suchworte (RegEx) ----------------
    // Filtert Teil aus dem Fax zwischen Filter Beginn und Filter Ende (\n ist neue Zeile)
    public EINSATZSTICHWORT = '-/-';
    public SCHLAGWORT = '-/-';
    public OBJEKT = '-/-';
    public BEMERKUNG = '-/-';
    public STRASSE = '-/-';
    public ORTSTEIL = '-/-';
    public ORT = '-/-';
    public EINSATZMITTEL = '';
    public cars1: string[] = []; // Variable Fahrzeuge eigen
    public cars2: string[] = []; // Variable Fahrzeuge andere

    private searchElement(start: string, end: string, data: string) {
        var s = data.search(start);
        if (s >= 0) {
            s += start.length;
            var e = data.slice(s).search(end);
            var elem = data.slice(s, s + e);
            return elem.trim();
        }
        return null;
    }

    public parseData = (data: string) => {
        // Variablen leeren
        this.EINSATZSTICHWORT = '-/-';
        this.SCHLAGWORT = '-/-';
        this.OBJEKT = '-/-';
        this.BEMERKUNG = '-/-';
        this.STRASSE = '-/-';
        this.ORTSTEIL = '-/-';
        this.ORT = '-/-';
        this.EINSATZMITTEL = '-/-';
        this.cars1 = [];
        this.cars2 = [];

        this.EINSATZSTICHWORT =
            this.searchElement(
                config.alarmfields.s_EINSATZSTICHWORT,
                config.alarmfields.e_EINSATZSTICHWORT,
                data
            ) || config.alarmfields.EMPTY;

        this.SCHLAGWORT =
            this.searchElement(
                config.alarmfields.s_SCHLAGWORT,
                config.alarmfields.e_SCHLAGWORT,
                data
            ) || config.alarmfields.EMPTY;

        this.SCHLAGWORT = this.SCHLAGWORT.replace('#', ' ');
        this.SCHLAGWORT = this.SCHLAGWORT.substr(this.SCHLAGWORT.search('#'));
        this.SCHLAGWORT = this.SCHLAGWORT.replace(/#/g, ' ');

        this.OBJEKT =
            this.searchElement(config.alarmfields.s_OBJEKT, config.alarmfields.e_OBJEKT, data) ||
            config.alarmfields.EMPTY;

        this.BEMERKUNG =
            this.searchElement(
                config.alarmfields.s_BEMERKUNG,
                config.alarmfields.e_BEMERKUNG,
                data
            ) || config.alarmfields.EMPTY;

        this.BEMERKUNG = this.BEMERKUNG.replace(/-/g, '');

        this.STRASSE =
            this.searchElement(config.alarmfields.s_STRASSE, config.alarmfields.e_STRASSE, data) ||
            config.alarmfields.EMPTY;

        this.ORTSTEIL =
            this.searchElement(
                config.alarmfields.s_ORTSTEIL,
                config.alarmfields.e_ORTSTEIL,
                data
            ) || config.alarmfields.EMPTY;

        this.ORT =
            this.searchElement(config.alarmfields.s_ORT, config.alarmfields.e_ORT, data) ||
            config.alarmfields.EMPTY;

        this.EINSATZMITTEL =
            this.searchElement(
                config.alarmfields.s_EINSATZMITTEL,
                config.alarmfields.e_EINSATZMITTEL,
                data
            ) || config.alarmfields.EMPTY;

        this.EINSATZMITTEL = this.EINSATZMITTEL.replace(/-/g, '');

        var cars = this.EINSATZMITTEL.split('\n');
        for (let i in cars) {
            var c = this.searchElement(
                config.alarmfields.s_CAR,
                config.alarmfields.e_CAR,
                cars[i] + '\n'
            );

            var regex = RegExp(config.alarmfields.CAR1, 'gi');

            if (c != null) {
                if (regex.test(cars[i])) this.cars1.push(c);
                else this.cars2.push(c);
            }
        }
    };
}

class AlarmParserService {
    private replaceErrors = (data: string) => {
        data = data.replace(/[—_*`]/g, '-');

        data = data.replace(/2222+/g, '--------');
        data = data.replace(/---([-\s\.](?!\n))+/g, '--------');
        data = data.replace(/Kinsatz/g, 'Einsatz');

        data = data.replace(/BI/g, 'B1');
        data = data.replace(/Bl/g, 'B1');
        data = data.replace(/B\?1/g, 'B1');
        data = data.replace(/B\?2/g, 'B1');
        data = data.replace(/1NF/g, 'INF');
        data = data.replace(/TH1/g, 'THL');

        data = data.replace(/5tra/g, 'Stra');
        data = data.replace(/ßrand/g, 'Brand');
        data = data.replace(/1dean/g, 'ldean');
        data = data.replace(/1age/g, 'lage');
        data = data.replace(/ZUQ/g, 'ZUG');
        data = data.replace(/ßauteil/g, 'Bauteil');
        data = data.replace(/ßaum/g, 'Baum');
        data = data.replace(/ßerg/g, 'Berg');
        data = data.replace(/A1arm/g, 'Alarm');
        data = data.replace(/5tall/g, 'Stall');
        data = data.replace(/SonstigeS/g, 'Sonstiges');
        data = data.replace(/BEinsatzplan/g, 'Einsatzplan');
        data = data.replace(/Binsatz/g, 'Einsatz');

        data = data.replace(/1.5.3 MB/g, 'Dienststellenalarm');

        return data;
    };

    public async parseFile(path: string, alarmdate: Date) {
        let fileData = await fs.promises.readFile(path, 'utf8');

        logging.info(NAMESPACE, 'File OK -> Begin processing...');

        // Datei in Archiv verschieben
        const targetPath = config.folders.archive + '/' + path.split(/[/\\]/g).pop();
        await moveFile(path, targetPath);
        logging.info(NAMESPACE, 'File moved to archive');

        // Faxfilter anwenden
        if (config.folders.fileInput_filter) {
            const regex = RegExp(config.folders.fileInput_filter, 'gi');
            if (!regex.test(fileData)) {
                logging.warn(NAMESPACE, 'File filter not fount -> no alarm!');
                return;
            }
        }

        // Daten bereinigen
        fileData = this.replaceErrors(fileData);

        const alarmFields = new AlarmFields();

        // Daten Filtern
        alarmFields.parseData(fileData);

        // Geocoding
        var geoData = await GeocodeService.geocode(
            'Germany, Bayern, ' +
                alarmFields.ORT +
                ', ' +
                alarmFields.ORTSTEIL +
                ', ' +
                alarmFields.STRASSE,
            /\d/.test(alarmFields.STRASSE) ? true : false,
            alarmFields.OBJEKT,
            alarmFields.ORT
        );

        // Daten in Datenbank schreiben
        let alarmRow: AlarmRow = {
            einsatzstichwort: alarmFields.EINSATZSTICHWORT,
            schlagwort: alarmFields.SCHLAGWORT,
            objekt: alarmFields.OBJEKT,
            bemerkung: alarmFields.BEMERKUNG,
            strasse: alarmFields.STRASSE,
            ortsteil: alarmFields.ORTSTEIL,
            ort: alarmFields.ORT,
            lat: geoData.lat,
            lng: geoData.lng,
            cars1: alarmFields.cars1.join('|'),
            cars2: alarmFields.cars2.join('|'),
            isAddress: geoData.isAddress,
            date: alarmdate.toISOString(),
            id: undefined
        };

        AlarmService.create(alarmRow);

        // Alarmusdruck erzeugen
        logging.debug(NAMESPACE, 'Starte Puppeteer');
        const browser = await puppeteer.launch({
            args: ['--allow-file-access-from-files', '--enable-local-file-accesses']
        });
        var page = await browser.newPage();

        // Navigiere puppeteer zu Ausdruck Seite
        await page.goto(
            'http://' +
                config.server_http.hostname +
                ':' +
                config.server_http.port +
                '/print?varEINSATZSTICHWORT=' +
                alarmFields.EINSATZSTICHWORT +
                '&varSCHLAGWORT=' +
                alarmFields.SCHLAGWORT +
                '&varOBJEKT=' +
                alarmFields.OBJEKT +
                '&varBEMERKUNG=' +
                alarmFields.BEMERKUNG +
                '&varSTRASSE=' +
                alarmFields.STRASSE +
                '&varORTSTEIL=' +
                alarmFields.ORTSTEIL +
                '&varORT=' +
                alarmFields.ORT +
                '&lat=' +
                geoData.lat +
                '&lng=' +
                geoData.lng +
                '&isAddress=' +
                (geoData.isAddress == true ? 1 : 0) +
                '&noMap=' +
                (alarmFields.STRASSE == '' && geoData.isAddress == false ? 1 : 0),
            { waitUntil: 'networkidle2' }
        );

        // Warten bis gerendert
        await timeout(5000);

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

        if (process.env.ALARMDRUCK == 'true') {
            logging.debug(NAMESPACE, 'Alarmausdruck...');

            for (let i = 0; i < config.printing.pagecountAlarm; i++) {
                // Drucken
                logging.info(
                    NAMESPACE,
                    'Seite ' + (i + 1) + ' von ' + config.printing.pagecountAlarm
                );
                PrintingServoce.print(config.folders.temp + 'druck.pdf');
            }
        }
    }
}

export default new AlarmParserService();
