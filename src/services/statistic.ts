'use strict';

import logging from '../utils/logging';
import * as AlarmModel from '../models/alarm';

const NAMESPACE = 'Statistic_Service';

class StatisticService {
    public async get(year?: number): Promise<AlarmModel.StatisticRow[]> {
        const response = await AlarmModel.model.getStatistic(year);
        return response;
    }

    /**
     * Berechnet die Einsatzzeit eines Users
     * @param id
     * @returns minutes
     */
    public async einsatzzeit(id: number): Promise<number> {
        return 21;
    }
}

export default new StatisticService();
