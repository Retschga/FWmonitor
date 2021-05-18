'use strict';

import logging from '../utils/logging';
import * as GroupModel from '../models/group';

const NAMESPACE = 'GroupService';

class GroupService {
    public async find_by_id(id: Number): Promise<GroupModel.GroupRow[] | undefined> {
        let response = await GroupModel.model.find({ id: id });
        if (response.length < 1) return;
        return response;
    }

    public async find_all(): Promise<GroupModel.GroupRow[]> {
        let response = await GroupModel.model.find();
        return response;
    }

    public async update(id: number, name: String, pattern: String) {
        logging.debug(NAMESPACE, 'update', { id, name, pattern });

        let affectedRows = await GroupModel.model.update(id, {
            name: name,
            pattern: pattern
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update - No rows changed');
        }
    }
}

export default new GroupService();
