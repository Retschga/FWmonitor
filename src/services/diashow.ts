'use strict';

import logging from '../utils/logging';
import config from '../utils/config';
import fs from 'fs';
import { createThumbnail, getImageSize } from '../utils/thumbnail';
import { fileExists } from '../utils/common';

const NAMESPACE = 'DiashowService';

class DiashowService {
    /**
     * Liste der Dateien im Diashow Verzeichnis
     * @returns { enabled, disabled }
     */
    public async get_list() {
        let enabled = [];
        let disabled = [];

        //const filenames = await fs.promises.readdir(config.folders.diashow);

        // https://stackoverflow.com/questions/10559685/using-node-js-how-do-you-get-a-list-of-files-in-chronological-order
        const filenames = fs
            .readdirSync(config.folders.diashow)
            .map(function (v) {
                return {
                    name: v,
                    time: fs.statSync(config.folders.diashow + '/' + v).mtime.getTime()
                };
            })
            .sort(function (a, b) {
                return a.time - b.time;
            })
            .map(function (v) {
                return v.name;
            });

        for (var i = 0; i < filenames.length; i++) {
            if (
                filenames[i] != '.gitignore' &&
                filenames[i].indexOf('.') != -1 &&
                filenames[i].indexOf(config.folders.thumbnailPrefix) == -1
            )
                if (filenames[i].indexOf('.disabled') == -1) {
                    enabled.push(filenames[i]);
                } else {
                    disabled.push(filenames[i]);
                }
        }

        return { enabled, disabled };
    }

    /**
     * Generiert Thumbnails für die Dateien im Diashowverzeichnis
     */
    public async createThumbnails() {
        const { enabled, disabled } = await this.get_list();

        for (var i = 0; i < enabled.length; i++) {
            if (
                !(await fileExists(
                    config.folders.diashow + '/' + config.folders.thumbnailPrefix + enabled[i]
                ))
            ) {
                await createThumbnail(config.folders.diashow, enabled[i]);
            }
        }
        for (var i = 0; i < disabled.length; i++) {
            if (
                !(await fileExists(
                    config.folders.diashow + '/' + config.folders.thumbnailPrefix + disabled[i]
                ))
            ) {
                await createThumbnail(config.folders.diashow, disabled[i]);
            }
        }
    }

    /**
     * Aktiviert ein Bild für die Diashow
     * @param filename
     */
    public async enable_pic(filename: string) {
        const response1 = await fs.promises.rename(
            config.folders.diashow + '/' + filename,
            config.folders.diashow + '/' + filename.replace('.disabled', '')
        );
        const response2 = await fs.promises.rename(
            config.folders.diashow + '/' + config.folders.thumbnailPrefix + filename,
            config.folders.diashow +
                '/' +
                config.folders.thumbnailPrefix +
                filename.replace('.disabled', '')
        );

        return true;
    }

    /**
     * Deaktiviert ein Bild für die Diashow
     * @param filename
     */
    public async disable_pic(filename: string) {
        const name = filename.substr(0, filename.lastIndexOf('.') - 1);
        const ext = filename.substr(filename.lastIndexOf('.') + 1);

        const response1 = await fs.promises.rename(
            config.folders.diashow + '/' + filename,
            config.folders.diashow + '/' + name + '.disabled.' + ext
        );
        const response2 = await fs.promises.rename(
            config.folders.diashow + '/' + config.folders.thumbnailPrefix + filename,
            config.folders.diashow +
                '/' +
                config.folders.thumbnailPrefix +
                name +
                '.disabled.' +
                ext
        );

        return true;
    }

    /**
     * Löscht ein Bild aus dem Diashowverzeichnis
     * @param filename
     */
    public async delete_pic(filename: string) {
        const response1 = await fs.promises.unlink(config.folders.diashow + '/' + filename);
        const response2 = await fs.promises.unlink(
            config.folders.diashow + '/' + config.folders.thumbnailPrefix + filename
        );

        return true;
    }
}

export default new DiashowService();
