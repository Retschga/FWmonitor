'use strict';

import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Dbfparser from '@episage/dbf-parser';
import * as AlarmModel from '../models/alarm';
import userService from './user';
import logging from '../utils/logging';
import config from '../utils/config';

const NAMESPACE = 'Statistic_Service';

type einsatzzeit = {
    name: string;
    vorname: string;
    time: number;
    count: number;
};

class StatisticService {
    // https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely
    private editDistance(s1: string, s2: string) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();

        const costs = [];
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i == 0) costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1))
                            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    }
    private similarity(s1: string, s2: string) {
        let longer = s1;
        let shorter = s2;
        if (s1.length < s2.length) {
            longer = s2;
            shorter = s1;
        }
        const longerLength = longer.length;
        if (longerLength == 0) {
            return 1.0;
        }
        return (longerLength - this.editDistance(longer, shorter)) / longerLength;
    }

    public async get(year?: number): Promise<AlarmModel.StatisticRow[]> {
        const response = await AlarmModel.model.getStatistic(year);
        return response;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private calcTime(record: any, eintragJahr: string) {
        if (record.E_VON != '' && record.BIS_DATUM != '' && record.E_BIS != '') {
            const eintragMonat = record.E_DATUM.substring(4, 6);
            const eintragTag = record.E_DATUM.substring(6, 8);

            const bisJahr = record.BIS_DATUM.substring(0, 4);
            const bisMonat = record.BIS_DATUM.substring(4, 6);
            const bisTag = record.BIS_DATUM.substring(6, 8);

            const startTime = new Date(
                eintragJahr + '-' + eintragMonat + '-' + eintragTag + 'T' + record.E_VON + 'Z'
            );
            const endTime = new Date(
                bisJahr + '-' + bisMonat + '-' + bisTag + 'T' + record.E_BIS + 'Z'
            );

            let diff = (startTime.getTime() - endTime.getTime()) / 1000;
            diff /= 60;

            return Math.abs(Math.round(diff));
        }
        return 0;
    }

    /**
     * Berechnet die Einsatzzeit eines Users (FWVV)
     * @returns minutes
     */
    public async einsatzzeit(id: number, year: number) {
        const response = await userService.find_by_userid(id);
        if (!response || response.length < 1) {
            throw new Error('User not found');
        }

        return new Promise((resolve) => {
            if (!config.fwvv.enabled) {
                throw new Error(NAMESPACE + ' fwvv is not enabled');
            }

            const user = response[0];

            logging.debug(NAMESPACE, 'einsatzzeit', {
                id,
                year,
                name: user.name,
                vorname: user.vorname
            });

            let zeit = 0;
            let anzahl = 0;

            const parser = Dbfparser(fs.createReadStream(config.fwvv.dat_folder + '/E_PERSON.DBF'));

            /* parser.on('header', (h: any) => {
                //debug('dBase file header has been parsed');
                //debug(h);
            }); */

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parser.on('record', (record: any) => {
                // Abbruchbedingungen Zeile
                if (record['@deleted'] == true) {
                    return;
                }

                const eintragJahr = record.E_DATUM.substring(0, 4);
                if (
                    eintragJahr != year ||
                    record.NAME != user.name ||
                    this.similarity(record.VORNAME, user.vorname) < 0.25
                ) {
                    return;
                }

                // Zeit Verarbeitung
                zeit += this.calcTime(record, eintragJahr);
                anzahl++;
            });

            parser.on('end', () => {
                logging.debug(NAMESPACE, 'ergebnis', { zeit, anzahl });
                resolve({ time: zeit, count: anzahl });
            });
        });
    }

    public einsatzzeit_all(year: number) {
        return new Promise((resolve) => {
            if (!config.fwvv.enabled) {
                throw new Error(NAMESPACE + ' fwvv is not enabled');
            }

            logging.debug(NAMESPACE, 'einsatzzeit_all', {
                year
            });

            const times: einsatzzeit[] = [];

            const parser = Dbfparser(fs.createReadStream(config.fwvv.dat_folder + '/E_PERSON.DBF'));

            /* parser.on('header', (h: any) => {
                //debug('dBase file header has been parsed');
                //debug(h);
            });
 */
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parser.on('record', (record: any) => {
                // Abbruchbedingungen Zeile
                if (record['@deleted'] == true) {
                    return;
                }

                const eintragJahr = record.E_DATUM.substring(0, 4);
                if (
                    eintragJahr != year ||
                    record.PERS_NR.indexOf('F') != -1 ||
                    record.PERS_NR.indexOf('A') != -1 ||
                    Number(record.PERS_NR) >= 200000
                ) {
                    return;
                }

                // Benutzer Datensatz finden oder erstellen
                let user_index = times.findIndex(
                    (el) => el.name == record.NAME && el.vorname == record.VORNAME
                );

                if (user_index == -1) {
                    times.push({
                        name: record.NAME,
                        vorname: record.VORNAME,
                        time: 0,
                        count: 0
                    });
                    user_index = times.length - 1;
                }

                // Zeit Verarbeitung
                times[user_index].time += this.calcTime(record, eintragJahr);
                times[user_index].count++;
            });

            parser.on('end', () => {
                resolve(times);
            });
        });
    }
}

export default new StatisticService();
