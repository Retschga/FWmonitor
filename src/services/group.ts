'use strict';

import logging from '../utils/logging';
import * as GroupModel from '../models/group';

const NAMESPACE = 'Group_Service';

class GroupService {
    public async find_by_id(id: number): Promise<GroupModel.GroupRow[] | undefined> {
        const response = await GroupModel.model.find({ id: id });
        if (response.length < 1) return;
        return response;
    }

    public async find_all(): Promise<GroupModel.GroupRow[]> {
        const response = await GroupModel.model.find();
        return response;
    }

    public async update(id: number, name: string, pattern: string) {
        logging.debug(NAMESPACE, 'update', { id, name, pattern });

        const affectedRows = await GroupModel.model.update(id, {
            name: name,
            pattern: pattern
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update - No rows changed');
        }
    }
}

export default new GroupService();
