'use strict';

import Model from './model';

//const NAMESPACE = 'Car_Model';
const TABLENAME = 'autos_funkstatus';

interface CarFunkstatusRow {
    id: number;
    name: string;
    appBenutzer: string;
    appPasswort: string;
    funk_name: string;
    funk_status: string;
}

class CarFunkstatusModel extends Model {
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
    ): Promise<CarFunkstatusRow[]> {
        return await super.findElement<CarFunkstatusRow>(params, limit, offset, extra);
    }
}

const model = new CarFunkstatusModel();

export { CarFunkstatusRow, CarFunkstatusModel, model };
