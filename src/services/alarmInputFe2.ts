'use strict';

import fs from 'fs';
import logging from '../utils/logging';

const NAMESPACE = 'AlarmInputFE2_Service';

class AlarmInputFE2Service {
    constructor() {
        return;
    }

    public async init() {
        try {
            return;
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }
}

export default new AlarmInputFE2Service();
