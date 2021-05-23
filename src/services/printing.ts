'use strict';

import chokidar from 'chokidar';
import moveFile from 'move-file';
import fs from 'fs';
import logging from '../utils/logging';
import config from '../utils/config';
import { timeout, execShellCommand } from '../utils/common';

const NAMESPACE = 'PrintingService';

class PrintingService {
    public print(file: string) {}
}

export default new PrintingService();
