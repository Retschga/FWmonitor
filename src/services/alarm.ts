'use strict';

import logging from '../utils/logging';
import * as AlarmModel from '../models/alarm';
import config from '../utils/config';
import globalEvents from '../utils/globalEvents';
import axios from 'axios';
// @ts-ignore
import openrouteservice from 'openrouteservice-js';

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

        let list = await this.find({}, 1, 0, 'ORDER BY id DESC');
        if (!list || list.length < 1) {
            throw new Error(NAMESPACE + ' error on creating alarm');
        }

        this.sendAlarmEvents(list[0]);
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
            "WHERE strftime('%Y-%m-%d %H:%M',date) >= datetime('now', '-" +
                config.common.time_alarm +
                " minutes')"
        );

        return response.length > 0;
    }

    public async get_streetCache(id: number) {
        let response = await this.find_by_id(id);

        if (!response || response.length < 1 || response[0].lat == '') return;

        let overpassStrassenUrl = `http://overpass-api.de/api/interpreter?data=
            [out:json][timeout:25];
            (
            way[%22name%22~%22${response[0].strasse.replace(/ss|ß/g, '(ss|%C3%9F)')}%22]
            (around:1000,${response[0].lat}, ${response[0].lng});
            );
            out geom;
            %3E;
            out%20skel%20qt;`;

        let streetResponse: any = await axios.get(overpassStrassenUrl).catch(function (error) {
            logging.exception(NAMESPACE, error);
        });

        let responseJSON = streetResponse.data;
        let dataIn = responseJSON['elements'];
        let polylinePoints = [];

        if (dataIn.length < 1) return;

        for (let i = 0; i < dataIn.length; i++) {
            var dataElement = dataIn[i];

            if (dataElement.type == 'way') {
                let polyarr = [];
                for (let j = 0; j < dataElement.geometry.length; j++) {
                    polyarr.push([dataElement.geometry[j].lat, dataElement.geometry[j].lon]);
                }

                polylinePoints.push(polyarr);
            }
        }

        return polylinePoints;
    }

    public async get_route(id: number) {
        if (!config.common.fw_position || !config.geocode.ors_key) return;

        let response = await this.find_by_id(id);

        if (!response || response.length < 1 || response[0].lat == '') return;

        var Directions = new openrouteservice.Directions({
            api_key: process.env.ORS_KEY
        });

        try {
            let direct = await Directions.calculate({
                coordinates: [
                    [config.common.fw_position.lng, config.common.fw_position.lat],
                    [response[0].lng, response[0].lat]
                ],
                profile: 'driving-car',
                extra_info: ['waytype'],
                radiuses: [1000, 5000],
                format: 'json'
            });
            return JSON.stringify(direct);
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        return;
    }
}

export default new AlarmService();
