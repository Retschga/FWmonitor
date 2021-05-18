'use strict';

import Model from './model';

const NAMESPACE = 'CalendarGroupModel';
const TABLENAME = 'kalenderGroups';

interface CalendarGroupRow {
    id: number;
    name: string;
    pattern: string;
}

class CalendarGroupModel extends Model {
    constructor() {
        super(TABLENAME);
    }

    /**
     * Findet einen Eintrag anhand der Suchparameter
     * @param params //{spalte: wert, ...}
     * @returns {Promise<undefined | CalendarGroupRow[]}
     */
    public async find(params: object = {}): Promise<CalendarGroupRow[]> {
        return await super.findElement<CalendarGroupRow>(params);
    }
}

const model = new CalendarGroupModel();

export { CalendarGroupRow, model };
