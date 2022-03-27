'use strict';

import * as CarFunkstatusModel from '../models/carFunkstatus';
import * as CarModel from '../models/car';

import logging from '../utils/logging';

const NAMESPACE = 'Car_Service';

class CarService {
    public async find(params: Record<string, unknown> = {}): Promise<CarModel.CarRow[]> {
        const response = await CarModel.model.find(params);
        return response;
    }

    public async find_by_id(id: number): Promise<CarModel.CarRow[] | undefined> {
        const response = await CarModel.model.find({ id: id });
        if (response.length < 1) return;
        return response;
    }

    public async get_login_carid(carid: string) {
        const result = await this.find({ appBenutzer: carid });
        if (result.length < 1) return;
        const car = result[0];
        return {
            id: car.id,
            username: car.appBenutzer,
            passwordHash: car.appPasswort
        };
    }

    public async create(name: string, appBenutzer: string, appPasswort: string) {
        logging.debug(NAMESPACE, 'create', { name, appBenutzer, appPasswort });
        const affectedRows = await CarModel.model.insert({
            name: name,
            appBenutzer: appBenutzer,
            appPasswort: appPasswort
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' create - No rows changed');
        }
    }

    public async delete(id: number) {
        logging.debug(NAMESPACE, 'delete', id);

        const affectedRows = await CarModel.model.delete(id);

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' delete - No rows changed');
        }
    }

    public async update(
        id: number,
        name: string,
        appBenutzer: string,
        funk_name: string,
        appPasswort?: string
    ) {
        logging.debug(NAMESPACE, 'update', { id, name, appBenutzer, appPasswort });

        if (appPasswort) {
            const affectedRows = await CarModel.model.update(id, {
                name: name,
                appBenutzer: appBenutzer,
                appPasswort: appPasswort,
                funk_name: funk_name
            });

            if (affectedRows < 1) {
                throw new Error(NAMESPACE + ' update - No rows changed');
            }
        } else {
            const affectedRows = await CarModel.model.update(id, {
                name: name,
                appBenutzer: appBenutzer,
                funk_name: funk_name
            });

            if (affectedRows < 1) {
                throw new Error(NAMESPACE + ' update - No rows changed');
            }
        }
    }

    public async update_FunkStatus(id: number, status: string, log: boolean = true) {
        logging.debug(NAMESPACE, 'update', { id, status });

        const affectedRows = await CarModel.model.update(id, {
            funk_status: status
        });

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' update - No rows changed');
        }

        if (!log) return;

        const affectedRows2 = await CarFunkstatusModel.model.insert({
            timestamp: new Date().toISOString(),
            auto: id,
            status: status
        });

        if (affectedRows2 < 1) {
            throw new Error(NAMESPACE + ' update - No rows changed');
        }
    }

    /**
     * Findet einen Alarm
     */
    public async find_FunkStatus(
        params: Record<string, unknown> = {},
        limit = -1,
        offset = -1,
        extra?: string
    ): Promise<CarFunkstatusModel.CarFunkstatusRow[]> {
        const response = await CarFunkstatusModel.model.find(params, limit, offset, extra);

        return response;
    }
}

export default new CarService();
