'use strict';

import { fileExists, getFormattedAlarmTime } from '../utils/common';

import { AlarmRow } from '../models/alarm';
import alarmPrintService from './alarmPrint';
import alarmService from './alarm';
import config from '../utils/config';
import fs from 'fs';
import geocodeService from './geocode';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import moveFile from 'move-file';

const NAMESPACE = 'AlarmParser_Service';

export class AlarmFields {
    // ---------------- Fax Suchworte (RegEx) ----------------
    // Filtert Teil aus dem Fax zwischen Filter Beginn und Filter Ende (\n ist neue Zeile)
    public EINSATZSTICHWORT = '';
    public SCHLAGWORT = '';
    public OBJEKT = '';
    public BEMERKUNG = '';
    public STRASSE = '';
    public ORTSTEIL = '';
    public ORT = '';
    public EINSATZMITTEL = '';
    public cars1: string[] = []; // Variable Fahrzeuge eigen
    public cars2: string[] = []; // Variable Fahrzeuge andere
    public kreuzung = '';
    public hinweis = '';
    public prio = '';
    public tetra = '';
    public mitteiler = '';
    public rufnummer = '';
    public patient = '';
    public einsatzplan = '';
    public einsatznummer = '';

    private removeTrailingAndLeading(str: string) {
        str = str.replace(/2{6,}/g, '');
        return str.replace(/(^[-—\s]+)|([-—\s]+$)/g, '');
    }

    /**
     * Sucht ein Element mit Start und Stop Regex
     */
    private searchElement(start: string, end: string, data: string) {
        const start_regex = new RegExp(start, 'i');
        const end_regex = new RegExp(end, 'i');
        let s = data.search(start_regex);
        const start_matchdata = (data.match(start_regex) || [''])[0];
        logging.info(NAMESPACE, 'match', { von: start, bis: end });
        if (s >= 0) {
            s += start_matchdata.length;
            const e = data.slice(s).search(end_regex);
            const elem = data.slice(s, s + e);
            logging.info(NAMESPACE, ' >>', this.removeTrailingAndLeading(elem.trim()));
            logging.info(NAMESPACE, '++++++++++++++++++++++++++++++++++++');
            return this.removeTrailingAndLeading(elem.trim());
        }
        return null;
    }

    /**
     * Parst den gesamten Alarmtext
     */
    public parseData(data: string): void {
        // Variablen leeren
        this.EINSATZSTICHWORT = '';
        this.SCHLAGWORT = '';
        this.OBJEKT = '';
        this.BEMERKUNG = '';
        this.STRASSE = '';
        this.ORTSTEIL = '';
        this.ORT = '';
        this.EINSATZMITTEL = '';
        this.cars1 = [];
        this.cars2 = [];
        this.kreuzung = '';
        this.hinweis = '';
        this.prio = '';
        this.tetra = '';
        this.mitteiler = '';
        this.rufnummer = '';
        this.patient = '';
        this.einsatzplan = '';

        this.EINSATZSTICHWORT =
            this.searchElement(
                config.alarmfields.s_EINSATZSTICHWORT,
                config.alarmfields.e_EINSATZSTICHWORT,
                data
            ) || config.alarmfields.EMPTY;

        if (config.alarmfields.REPLACE_NEWLINE)
            this.EINSATZSTICHWORT = this.EINSATZSTICHWORT.replace(/\n/g, ' ');

        this.SCHLAGWORT =
            this.searchElement(
                config.alarmfields.s_SCHLAGWORT,
                config.alarmfields.e_SCHLAGWORT,
                data
            ) || config.alarmfields.EMPTY;

        this.SCHLAGWORT = this.SCHLAGWORT.replace('#', ' ');
        this.SCHLAGWORT = this.SCHLAGWORT.substr(this.SCHLAGWORT.search('#'));
        this.SCHLAGWORT = this.SCHLAGWORT.replace(/#/g, ' ');

        if (config.alarmfields.REPLACE_NEWLINE)
            this.SCHLAGWORT = this.SCHLAGWORT.replace(/\n/g, ' ');

        this.OBJEKT =
            this.searchElement(config.alarmfields.s_OBJEKT, config.alarmfields.e_OBJEKT, data) ||
            config.alarmfields.EMPTY;

        if (config.alarmfields.REPLACE_NEWLINE) this.OBJEKT = this.OBJEKT.replace(/\n/g, ' ');

        this.BEMERKUNG =
            this.searchElement(
                config.alarmfields.s_BEMERKUNG,
                config.alarmfields.e_BEMERKUNG,
                data
            ) || config.alarmfields.EMPTY;

        //this.BEMERKUNG = this.BEMERKUNG.replace(/-/g, '');

        if (config.alarmfields.REPLACE_NEWLINE) this.BEMERKUNG = this.BEMERKUNG.replace(/\n/g, ' ');

        this.STRASSE =
            this.searchElement(config.alarmfields.s_STRASSE, config.alarmfields.e_STRASSE, data) ||
            config.alarmfields.EMPTY;

        if (config.alarmfields.REPLACE_NEWLINE) this.STRASSE = this.STRASSE.replace(/\n/g, ' ');

        this.ORTSTEIL =
            this.searchElement(
                config.alarmfields.s_ORTSTEIL,
                config.alarmfields.e_ORTSTEIL,
                data
            ) || config.alarmfields.EMPTY;

        if (config.alarmfields.REPLACE_NEWLINE) this.ORTSTEIL = this.ORTSTEIL.replace(/\n/g, ' ');

        this.ORT =
            this.searchElement(config.alarmfields.s_ORT, config.alarmfields.e_ORT, data) ||
            config.alarmfields.EMPTY;

        if (config.alarmfields.REPLACE_NEWLINE) this.ORT = this.ORT.replace(/\n/g, ' ');

        this.EINSATZMITTEL =
            this.searchElement(
                config.alarmfields.s_EINSATZMITTEL,
                config.alarmfields.e_EINSATZMITTEL,
                data
            ) || config.alarmfields.EMPTY;

        //this.EINSATZMITTEL = this.EINSATZMITTEL.replace(/-/g, '');

        const cars = this.EINSATZMITTEL.split(config.alarmfields.split_EINSATZMITTEL);
        for (const i in cars) {
            const c = this.searchElement(
                config.alarmfields.s_CAR,
                config.alarmfields.e_CAR,
                cars[i] + '\n'
            );

            const regex = RegExp(config.alarmfields.CAR1, 'gi');

            if (c != null) {
                if (regex.test(cars[i])) this.cars1.push(c);
                else this.cars2.push(c);
            }
        }

        this.kreuzung =
            this.searchElement(
                config.alarmfields.s_KREUZUNG,
                config.alarmfields.e_KREUZUNG,
                data
            ) || config.alarmfields.EMPTY;

        if (config.alarmfields.REPLACE_NEWLINE) this.kreuzung = this.kreuzung.replace(/\n/g, ' ');

        this.hinweis =
            this.searchElement(config.alarmfields.s_HINWEIS, config.alarmfields.e_HINWEIS, data) ||
            config.alarmfields.EMPTY;

        //this.hinweis = this.hinweis.replace(/-/g, '');
        if (config.alarmfields.REPLACE_NEWLINE) this.hinweis = this.hinweis.replace(/\n/g, ' ');

        this.prio =
            this.searchElement(config.alarmfields.s_PRIO, config.alarmfields.e_PRIO, data) ||
            config.alarmfields.EMPTY;

        if (config.alarmfields.REPLACE_NEWLINE) this.prio = this.prio.replace(/\n/g, ' ');

        this.tetra =
            this.searchElement(config.alarmfields.s_TETRA, config.alarmfields.e_TETRA, data) ||
            config.alarmfields.EMPTY;

        //this.tetra = this.tetra.replace(/-/g, '');
        if (config.alarmfields.REPLACE_NEWLINE) this.tetra = this.tetra.replace(/\n/g, ' ');

        this.mitteiler =
            this.searchElement(
                config.alarmfields.s_MITTEILER,
                config.alarmfields.e_MITTEILER,
                data
            ) || config.alarmfields.EMPTY;

        if (config.alarmfields.REPLACE_NEWLINE) this.mitteiler = this.mitteiler.replace(/\n/g, ' ');

        this.rufnummer =
            this.searchElement(
                config.alarmfields.s_RUFNUMMER,
                config.alarmfields.e_RUFNUMMER,
                data
            ) || config.alarmfields.EMPTY;

        if (config.alarmfields.REPLACE_NEWLINE) this.rufnummer = this.rufnummer.replace(/\n/g, ' ');

        this.patient =
            this.searchElement(config.alarmfields.s_PATIENT, config.alarmfields.e_PATIENT, data) ||
            config.alarmfields.EMPTY;

        //this.patient = this.patient.replace(/-/g, '');
        if (config.alarmfields.REPLACE_NEWLINE) this.patient = this.patient.replace(/\n/g, ' ');

        this.einsatzplan =
            this.searchElement(
                config.alarmfields.s_EINSATZPLAN,
                config.alarmfields.e_EINSATZPLAN,
                data
            ) || config.alarmfields.EMPTY;

        if (config.alarmfields.REPLACE_NEWLINE)
            this.einsatzplan = this.einsatzplan.replace(/\n/g, ' ');

        this.einsatznummer =
            this.searchElement(
                config.alarmfields.s_EINSATZNUMMER,
                config.alarmfields.e_EINSATZNUMMER,
                data
            ) || new Date().toISOString();
    }
}

class AlarmParserService {
    private replaceErrors(data: string) {
        if (config.alarm_replace.disable_predefReplacements == true) return data;

        data = data.replace(/[—_*`]/g, '-');
        data = data.replace(/2222+/g, '--------');
        data = data.replace(/---([-\s.](?!\n))+/g, '--------');
        data = data.replace(/\|\]/g, '1');
        data = data.replace(/]l/g, '1');
        data = data.replace(/]1/g, '1');

        // Stichworte B ...
        data = data.replace(/BI/g, 'B1');
        data = data.replace(/Bl/g, 'B1');
        data = data.replace(/B.(?=[1-8])/g, 'B ');
        data = data.replace(/B.(?=BMA)/g, 'B ');
        data = data.replace(/B.(?=ELEKTROANLAGE)/g, 'B ');
        data = data.replace(/B.(?=WALD)/g, 'B ');
        data = data.replace(/B.(?=ZUG)/g, 'B ');

        // Stichworte INF
        data = data.replace(/1NF/g, 'INF');

        // Stichworte THL
        data = data.replace(/TH1/g, 'THL');
        data = data.replace(/THL.(?=[1-5])/g, 'THL ');
        data = data.replace(/THL.(?=P\s)/g, 'THL ');

        // Stichworte RD
        data = data.replace(/\({RD/g, '(RD');
        data = data.replace(/{RD/g, '(RD');
        data = data.replace(/RD.(?=[1-9])/g, 'RD ');

        // Klammern ( ... ) zu (...)
        data = data.replace(/\(\s/g, '(');
        data = data.replace(/\s\)/g, ')');

        data = data.replace(/Kinsatz/g, 'Einsatz');
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
        data = data.replace(/kEinsatzplan/g, 'Einsatzplan');
        data = data.replace(/Binsatz/g, 'Einsatz');
        data = data.replace(/fBergwald/g, 'Bergwald');
        data = data.replace(/IndustriefSägewert/g, 'Industrie / Sägewerk');
        data = data.replace(/7immer/g, 'Zimmer');

        if (
            config.alarm_replace.regex &&
            config.alarm_replace.text &&
            config.alarm_replace.regex.length == config.alarm_replace.text.length
        ) {
            for (let i = 0; i < config.alarm_replace.regex.length; i++) {
                data = data.replace(
                    new RegExp(config.alarm_replace.regex[i], 'g'),
                    config.alarm_replace.text[i]
                );
            }
        }

        return data;
    }

    public async parseTextFile(path: string, alarmdate: Date) {
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

        await this.processAlarmData(alarmFields, alarmdate);
    }

    private async processAlarmData(alarmFields: AlarmFields, alarmdate: Date) {
        const alarmRow: AlarmRow = {
            einsatzstichwort: alarmFields.EINSATZSTICHWORT,
            schlagwort: alarmFields.SCHLAGWORT,
            objekt: alarmFields.OBJEKT,
            bemerkung: alarmFields.BEMERKUNG,
            strasse: alarmFields.STRASSE,
            ortsteil: alarmFields.ORTSTEIL,
            ort: alarmFields.ORT,
            lat: '',
            lng: '',
            cars1: alarmFields.cars1.join('|'),
            cars2: alarmFields.cars2.join('|'),
            isAddress: /\d/.test(alarmFields.STRASSE) ? true : false,
            kreuzung: alarmFields.kreuzung,
            hinweis: alarmFields.hinweis,
            prio: alarmFields.prio,
            tetra: alarmFields.tetra,
            mitteiler: alarmFields.mitteiler,
            rufnummer: alarmFields.rufnummer,
            patient: alarmFields.patient,
            einsatzplan: alarmFields.einsatzplan,
            date: alarmdate.toISOString(),
            einsatznummer: alarmFields.einsatznummer,
            id: undefined
        };

        // Geocoding
        let geoData = { lat: '0', lng: '0', isAddress: false };
        try {
            geoData = await geocodeService.geocode(alarmRow);
            alarmRow.lat = geoData.lat;
            alarmRow.lng = geoData.lng;
            alarmRow.isAddress = geoData.isAddress;
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }

        // Daten in Datenbank schreiben
        alarmService.createOrUpdate(alarmRow, false);

        const pdfPath =
            config.folders.archive + '/' + getFormattedAlarmTime(new Date(alarmRow.date)) + '.pdf';

        if (await fileExists(pdfPath)) {
            globalEvents.emit('alarm-pdf', pdfPath);
        }
    }
}

export default new AlarmParserService();
