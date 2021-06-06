'use strict';

import logging from '../utils/logging';
import * as AlarmModel from '../models/alarm';
import config from '../utils/config';
// @ts-ignore
import Dbfparser from '@episage/dbf-parser';
import userService from './user';
import fs from 'fs';

const NAMESPACE = 'Statistic_Service';

class StatisticService {
    // https://stackoverflow.com/questions/10473745/compare-strings-javascript-return-of-likely
    private editDistance(s1: string, s2: string) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();

        var costs = new Array();
        for (var i = 0; i <= s1.length; i++) {
            var lastValue = i;
            for (var j = 0; j <= s2.length; j++) {
                if (i == 0) costs[j] = j;
                else {
                    if (j > 0) {
                        var newValue = costs[j - 1];
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
        var longer = s1;
        var shorter = s2;
        if (s1.length < s2.length) {
            longer = s2;
            shorter = s1;
        }
        var longerLength = longer.length;
        if (longerLength == 0) {
            return 1.0;
        }
        return (longerLength - this.editDistance(longer, shorter)) / longerLength;
    }

    public async get(year?: number): Promise<AlarmModel.StatisticRow[]> {
        const response = await AlarmModel.model.getStatistic(year);
        return response;
    }

    /**
     * Berechnet die Einsatzzeit eines Users (FWVV)
     * @param id
     * @returns minutes
     */
    public async einsatzzeit(id: number, year: number) {
        return new Promise(async (resolve, reject) => {
            if (!config.fwvv.enabled) {
                throw new Error(NAMESPACE + ' fwvv is not enabled');
            }

            const response = await userService.find_by_userid(id);
            if (!response || response.length < 1) {
                throw new Error('User not found');
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

            var parser = Dbfparser(fs.createReadStream(config.fwvv.dat_folder + '/E_PERSON.DBF'));

            parser.on('header', (h: any) => {
                //debug('dBase file header has been parsed');
                //debug(h);
            });

            parser.on('record', (record: any) => {
                if (record['@deleted'] == true) {
                    return;
                }

                var eintragJahr = record.E_DATUM.substring(0, 4);
                if (
                    eintragJahr != year ||
                    record.NAME != user.name ||
                    this.similarity(record.VORNAME, user.vorname) < 0.25
                ) {
                    return;
                }

                anzahl++;
                if (record.E_VON != '' && record.BIS_DATUM != '' && record.E_BIS != '') {
                    var eintragMonat = record.E_DATUM.substring(4, 6);
                    var eintragTag = record.E_DATUM.substring(6, 8);

                    var bisJahr = record.BIS_DATUM.substring(0, 4);
                    var bisMonat = record.BIS_DATUM.substring(4, 6);
                    var bisTag = record.BIS_DATUM.substring(6, 8);

                    var startTime = new Date(
                        eintragJahr +
                            '-' +
                            eintragMonat +
                            '-' +
                            eintragTag +
                            'T' +
                            record.E_VON +
                            'Z'
                    );
                    var endTime = new Date(
                        bisJahr + '-' + bisMonat + '-' + bisTag + 'T' + record.E_BIS + 'Z'
                    );

                    var diff = (startTime.getTime() - endTime.getTime()) / 1000;
                    diff /= 60;

                    zeit += Math.abs(Math.round(diff));

                    //debug(record);
                    //debug(record.E_DATUM + ":  " + Math.abs(Math.round(diff)));
                }
            });

            parser.on('end', () => {
                logging.debug(NAMESPACE, 'ergebnis', { zeit, anzahl });
                resolve({ time: zeit, count: anzahl });
            });
        });
    }
}

export default new StatisticService();
