'use strict';

import logging from '../utils/logging';
import * as AlarmModel from '../models/alarm';
import config from '../utils/config';
import globalEvents from '../utils/globalEvents';

const NAMESPACE = 'Alarm_Service';

class AlarmService {
    /**
     * Gibt die Alarmfarbe zu einem Einsatzstichwort zurück
     * @param einsatzstichwort
     * @returns
     */
    public getAlarmColor(einsatzstichwort: string) {
        if (!einsatzstichwort) return 0;

        const stichwort = einsatzstichwort.toLowerCase();

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
        const response = await AlarmModel.model.find(params, limit, offset, extra);
        return response;
    }

    public async find_by_id(id: Number): Promise<AlarmModel.AlarmRow[] | undefined> {
        const response = await AlarmModel.model.find({ id: id });
        if (response.length < 1) return;
        return response;
    }

    public async create(alarm: AlarmModel.AlarmRow) {
        logging.debug(NAMESPACE, 'create', alarm);
        const affectedRows = await AlarmModel.model.insert(alarm);

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' create - No rows changed');
        }

        this.sendAlarmEvents(alarm);
    }

    private sendAlarmEvents(alarm: AlarmModel.AlarmRow) {
        globalEvents.emit('alarm', alarm);
    }

    public set_alarmsettings_telegram(value: boolean) {
        config.alarm.telegram = value;
    }

    public set_alarmsettings_app(value: boolean) {
        config.alarm.app = value;
    }

    public get_alarmsettings() {
        return { telegram: config.alarm.telegram, app: config.alarm.app };
    }

    public async isAlarm(): Promise<boolean> {
        const response = await this.find(
            undefined,
            undefined,
            undefined,
            'WHERE strftime("%Y-%m-%d %H:%M",date) >= datetime("now", "-' +
                config.common.time_alarm +
                ' minutes")'
        );

        return response.length > 0;
    }
}

export default new AlarmService();
