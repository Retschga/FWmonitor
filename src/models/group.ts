'use strict';

import Model from './model';

//const NAMESPACE = 'Group_Model';
const TABLENAME = 'groups';

interface GroupRow {
    id: number;
    name: string;
    pattern: string;
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
    public async find(params: Record<string, unknown> = {}): Promise<GroupRow[]> {
        return await super.findElement<GroupRow>(params);
    }
}

const model = new GroupModel();

export { GroupRow, model };
