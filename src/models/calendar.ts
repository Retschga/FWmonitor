'use strict';

import Model from './model';

const NAMESPACE = 'CalendarModel';
const TABLENAME = 'kalender';

interface CalendarRow {
    id: number;
    summary: string;
    start: Date;
    remind: Date | null;
    group: string | null;
}

class CalendarModel extends Model {
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
    ): Promise<CalendarRow[]> {
        return await super.findElement<CalendarRow>(params, limit, offset, extra);
    }
}

const model = new CalendarModel();

export { CalendarRow, model };
