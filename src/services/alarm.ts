'use strict';

import logging from '../utils/logging';
import * as AlarmModel from '../models/alarm';

const NAMESPACE = 'Alarm_Service';

class AlarmService {
    public getAlarmColor(einsatzstichwort: string) {
        if (!einsatzstichwort) return 0;

        let stichwort = einsatzstichwort.toLowerCase();

        // Info/Sonstiges - Green
        if (stichwort.includes('inf') || stichwort.includes('1nf') || stichwort.includes('son'))
            return 3;

        // THL - Blue
        if (stichwort.includes('thl')) return 2;

        // Brand - Red
        if (stichwort.includes('b ')) return 0;

        // Rettungsdienst - Orange
        if (stichwort.includes('rd')) return 1;

        // Rest - Red
        return 0;
    }

    public async find(
        params: object = {},
        limit = -1,
        offset = -1,
        extra?: string
    ): Promise<AlarmModel.AlarmRow[]> {
        let response = await AlarmModel.model.find(params, limit, offset, extra);
        return response;
    }

    public async find_by_id(id: Number): Promise<AlarmModel.AlarmRow[] | undefined> {
        let response = await AlarmModel.model.find({ id: id });
        if (response.length < 1) return;
        return response;
    }

    public async create(alarm: AlarmModel.AlarmRow) {
        logging.debug(NAMESPACE, 'create', alarm);
        let affectedRows = await AlarmModel.model.insert(alarm);

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' create - No rows changed');
        }
    }
}

export default new AlarmService();
