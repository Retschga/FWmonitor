'use strict';

import Model from './model';

const NAMESPACE = 'CarModel';
const TABLENAME = 'autos';

interface CarRow {
    id: number;
    name: string;
    appBenutzer: string;
    appPasswort: string;
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
    public async find(params: object = {}): Promise<CarRow[]> {
        return await super.findElement<CarRow>(params);
    }
}

const model = new CarModel();

export { CarRow, model };
