'use strict';

import logging from '../utils/logging';
import * as CarModel from '../models/car';

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

    public async update(id: number, name: string, appBenutzer: string, appPasswort?: string) {
        logging.debug(NAMESPACE, 'update', { id, name, appBenutzer, appPasswort });

        if (appPasswort) {
            const affectedRows = await CarModel.model.update(id, {
                name: name,
                appBenutzer: appBenutzer,
                appPasswort: appPasswort
            });

            if (affectedRows < 1) {
                throw new Error(NAMESPACE + ' update - No rows changed');
            }
        } else {
            const affectedRows = await CarModel.model.update(id, {
                name: name,
                appBenutzer: appBenutzer
            });

            if (affectedRows < 1) {
                throw new Error(NAMESPACE + ' update - No rows changed');
            }
        }
    }
}

export default new CarService();
