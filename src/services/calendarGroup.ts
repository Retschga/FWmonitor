'use strict';

import logging from '../utils/logging';
import * as CalendarGroupModel from '../models/calendarGroup';
import globalEvents from '../utils/globalEvents';

const NAMESPACE = 'CalendarGroupService';

class CalendarGroupService {
    public async find_all(): Promise<CalendarGroupModel.CalendarGroupRow[]> {
        let response = await CalendarGroupModel.model.find();
        return response;
    }

    public async update(id: number, name: String, pattern: String) {
        logging.debug(NAMESPACE, 'update', { id, name, pattern });

        let affectedRows = await CalendarGroupModel.model.update(id, {
            name: name,
            pattern: pattern
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update - No rows changed');
        }

        globalEvents.emit('calendar-change');
    }
}

export default new CalendarGroupService();
