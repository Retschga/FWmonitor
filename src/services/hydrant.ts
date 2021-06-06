'use strict';

import logging from '../utils/logging';
import * as GroupModel from '../models/group';
import axios from 'axios';

const NAMESPACE = 'HydrantService';

class HydrantService {
    public async find_latlng(lat: string, lng: string) {
        // URL Overpass-API für Hydranten    siehe Ovepass turbo
        let overpassHydrantenUrl = `https://overpass-api.de/api/interpreter?data=
            [out:json][timeout:25];(
            node[%22emergency%22=%22fire_hydrant%22](around:3000,${lat},${lng});
            node[%22emergency%22=%22water_tank%22](around:3000,${lat},${lng});
            node[%22emergency%22=%22suction_point%22](around:3000,${lat},${lng});
            );out;%3E;out%20skel%20qt;`.replace(/[\n\s]/g, '');

        console.log(overpassHydrantenUrl);

        try {
            const response = await axios.get(overpassHydrantenUrl);
            const responseJSON = response.data;

            // Hydranten ausgeben
            const dataIn = responseJSON['elements'];
            let features = [];

            for (let i = 0; i < dataIn.length; i++) {
                var dataElement = dataIn[i];
                var name = '';

                name = dataElement['tags']['fire_hydrant:type'];
                if (dataElement['tags']['emergency'] == 'water_tank') name = 'water_tank';
                if (dataElement['tags']['water_source'] == 'pond') name = 'pond';
                if (dataElement['tags']['emergency'] == 'suction_point') name = 'pond';

                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [dataElement['lon'], dataElement['lat']]
                    },
                    properties: {
                        title: name,
                        iconcategory: 'icons'
                    }
                });
            }

            return features;
        } catch (error) {
            logging.ecxeption(NAMESPACE, error);
            return;
        }
    }
}

export default new HydrantService();
