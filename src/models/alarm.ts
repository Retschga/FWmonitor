'use strict';

import Model from './model';
import logging from '../utils/logging';
import DatabaseConnection from '../database/connection';

const NAMESPACE = 'AlarmModel';
const TABLENAME = 'alarms';

interface AlarmRow {
    id: number;
    date: string;
    einsatzstichwort: string;
    schlagwort: string;
    objekt: string;
    bemerkung: string;
    strasse: string;
    ortsteil: string;
    ort: string;
    lat: string;
    lng: string;
    cars1: string;
    cars2: string;
    isAddress: boolean;
}

interface StatisticRow {
    einsatzstichwort: string;
    count: number;
}

class AlarmModel extends Model {
    constructor() {
        super(TABLENAME);
    }

    /**
     * Findet einen Eintrag anhand der Suchparameter
     * @param params //{spalte: wert, ...}
     * @returns {Promise<undefined | CalendarRow[]}
     */
    public async find(
        params: object = {},
        limit: number = -1,
        offset: number = -1,
        extra?: string
    ): Promise<AlarmRow[]> {
        return await super.findElement<AlarmRow>(params, limit, offset, extra);
    }

    public async getStatistic(year?: number): Promise<StatisticRow[]> {
        logging.debug(NAMESPACE, 'getStatistic', { year: year });

        if (!year) year = new Date().getFullYear();

        let sql = `SELECT einsatzstichwort, count(einsatzstichwort) AS count FROM ${this.tablename} WHERE strftime('%Y', date)=@year GROUP BY einsatzstichwort ORDER BY count DESC`;

        let response: undefined | StatisticRow[] = await DatabaseConnection.query<[StatisticRow]>(
            sql,
            {
                '@year': String(year)
            }
        );

        return response != undefined ? response : [];
    }
}

const model = new AlarmModel();

export { AlarmRow, StatisticRow, model };
