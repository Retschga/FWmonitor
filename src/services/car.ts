'use strict';

import logging from '../utils/logging';
import * as CarModel from '../models/car';

const NAMESPACE = 'CarService';

class CarService {
    public async find(params: object = {}): Promise<CarModel.CarRow[]> {
        let response = await CarModel.model.find(params);
        return response;
    }

    public async find_by_id(id: Number): Promise<CarModel.CarRow[] | undefined> {
        let response = await CarModel.model.find({ id: id });
        if (response.length < 1) return;
        return response;
    }

    public async create(name: String, appBenutzer: String, appPasswort: String) {
        logging.debug(NAMESPACE, 'create', { name, appBenutzer, appPasswort });
        let affectedRows = await CarModel.model.insert({
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

        let affectedRows = await CarModel.model.delete(id);

        if (affectedRows < 1) {
            throw new Error(NAMESPACE + ' delete - No rows changed');
        }
    }

    public async update(
        id: number,
        name: String,
        appBenutzer: String,
        appPasswort: String | undefined
    ) {
        logging.debug(NAMESPACE, 'update', { id, name, appBenutzer, appPasswort });

        if (appPasswort) {
            let affectedRows = await CarModel.model.update(id, {
                name: name,
                appBenutzer: appBenutzer,
                appPasswort: appPasswort
            });

            if (affectedRows < 1) {
                throw new Error(NAMESPACE + ' update - No rows changed');
            }
        } else {
            let affectedRows = await CarModel.model.update(id, {
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
