'use strict';

import Model from './model';

//const NAMESPACE = 'Car_Model';
const TABLENAME = 'autos';

interface CarRow {
    id: number;
    name: string;
    appBenutzer: string;
    appPasswort: string;
    funk_name: string;
    funk_status: string;
}

class CarModel extends Model {
    constructor() {
        super(TABLENAME);
    }

    /**
     * Findet einen Eintrag anhand der Suchparameter
     * @param params //{spalte: wert, ...}
     * @returns {Promise<undefined | CarRow[]}
     */
    public async find(params: Record<string, unknown> = {}): Promise<CarRow[]> {
        return await super.findElement<CarRow>(params);
    }
}

const model = new CarModel();

export { CarRow, model };
