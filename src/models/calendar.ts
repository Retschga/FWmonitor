'use strict';

import Model from './model';

//const NAMESPACE = 'Calendar_Model';
const TABLENAME = 'kalender';

interface CalendarRow {
    id: number;
    summary: string;
    start: string;
    remind: string | null;
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
        params: Record<string, unknown> = {},
        limit: number = -1,
        offset: number = -1,
        extra?: string
    ): Promise<CalendarRow[]> {
        return await super.findElement<CalendarRow>(params, limit, offset, extra);
    }
}

const model = new CalendarModel();

export { CalendarRow, model };
