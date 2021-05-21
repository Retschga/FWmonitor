'use strict';

import logging from '../utils/logging';
import * as AlarmModel from '../models/alarm';
import config from '../utils/config';

const NAMESPACE = 'Statistic_Service';

class StatisticService {
    public async get(year?: number): Promise<AlarmModel.StatisticRow[]> {
        const response = await AlarmModel.model.getStatistic(year);
        return response;
    }

    /**
     * Berechnet die Einsatzzeit eines Users (FWVV)
     * @param id
     * @returns minutes
     */
    public async einsatzzeit(id: number): Promise<number> {
        if (!config.fwvv.enabled) {
            throw new Error(NAMESPACE + ' fwvv is not enabled');
        }
        return 21;
    }
}

export default new StatisticService();
