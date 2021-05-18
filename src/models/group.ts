'use strict';

import Model from './model';

const NAMESPACE = 'GroupModel';
const TABLENAME = 'groups';

interface GroupRow {
    id: Number;
    name: String;
    pattern: String;
}

class GroupModel extends Model {
    constructor() {
        super(TABLENAME);
        this.find();
    }

    /**
     * Findet einen Eintrag anhand der Suchparameter
     * @param params //{spalte: wert, ...}
     * @returns {Promise<undefined | GroupRow[]}
     */
    public async find(params: object = {}): Promise<GroupRow[]> {
        return await super.findElement<GroupRow>(params);
    }
}

const model = new GroupModel();

export { GroupRow, model };
