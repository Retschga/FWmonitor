'use strict';

import fs from 'fs';
import config from '../utils/config';

//const NAMESPACE = 'Praesentation_Service';

class DiashowService {
    /**
     * Liste der Dateien im Präsentations-Verzeichnis
     * @returns { enabled, disabled }
     */
    public async get_list() {
        const files = [];

        // https://stackoverflow.com/questions/10559685/using-node-js-how-do-you-get-a-list-of-files-in-chronological-order
        const filenames = fs
            .readdirSync(config.folders.praesentation)
            .map(function (v) {
                return {
                    name: v,
                    time: fs.statSync(config.folders.praesentation + '/' + v).mtime.getTime()
                };
            })
            .sort(function (a, b) {
                return a.time - b.time;
            })
            .map(function (v) {
                return v.name;
            });

        for (let i = 0; i < filenames.length; i++) {
            if (filenames[i] != '.gitignore') files.push(filenames[i]);
        }

        return files;
    }
}

export default new DiashowService();
