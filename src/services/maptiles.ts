'use strict';

import config from '../utils/config';
import fs from 'fs';

const NAMESPACE = 'MapService';

class MapService {
    public getLayerUrls() {
        return {
            layer1_url: config.map.layer1_url,
            layer1_attr: config.map.layer1_attr,
            layer1_hillshade_url: config.map.layer1_hillshade_url,
            layer1_hillshade_attr: config.map.layer1_hillshade_attr,
            layer2_url: config.map.layer2_url,
            layer2_attr: config.map.layer2_attr
        };
    }
}

export default new MapService();
