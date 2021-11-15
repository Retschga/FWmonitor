'use strict';

import { createHd, createThumbnail, rotate } from '../utils/thumbnail';

import config from '../utils/config';
import exifr from 'exifr';
import { fileExists } from '../utils/common';
import fs from 'fs';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import moveFile from 'move-file';

const NAMESPACE = 'Diashow_Service';

class DiashowService {
    private exifCache: any = {};

    /**
     * Liste der Dateien im Diashow Verzeichnis
     * @returns { enabled, disabled }
     */
    public async get_list() {
        const enabled = [];
        const disabled = [];

        //const filenames = await fs.promises.readdir(config.folders.diashow);

        // https://stackoverflow.com/questions/10559685/using-node-js-how-do-you-get-a-list-of-files-in-chronological-order
        const files = fs
            .readdirSync(config.folders.diashow)
            .map(function (v) {
                return {
                    name: v,
                    time: fs.statSync(config.folders.diashow + '/' + v).mtime.getTime()
                };
            })
            .sort(function (a, b) {
                return b.time - a.time;
            })
            .map(function (v) {
                return v;
            });

        for (let i = 0; i < files.length; i++) {
            if (
                files[i].name != '.gitignore' &&
                files[i].name != 'undefined.png' &&
                files[i].name.indexOf('.') != -1 &&
                files[i].name.indexOf('.org') == -1 &&
                files[i].name.indexOf(config.folders.thumbnailPrefix) == -1
            ) {
                if (this.exifCache[files[i].name] != undefined) {
                    files[i].time = this.exifCache[files[i].name];
                } else {
                    const exifInfo = await exifr.parse(
                        config.folders.diashow + '/' + files[i].name,
                        ['DateTimeOriginal']
                    );
                    if (exifInfo != undefined && exifInfo['DateTimeOriginal'] != undefined) {
                        files[i].time = new Date(exifInfo['DateTimeOriginal']).getTime();
                    } else {
                        // files[i].time = 0;
                    }
                    this.exifCache[files[i].name] = files[i].time;
                }

                if (files[i].name.indexOf('.disabled') == -1) {
                    enabled.push(files[i]);
                } else {
                    disabled.push(files[i]);
                }
            }
        }

        return { enabled, disabled };
    }

    /**
     * Generiert Thumbnails für die Dateien im Diashowverzeichnis
     */
    public async createThumbnails() {
        const { enabled, disabled } = await this.get_list();

        for (let i = 0; i < enabled.length; i++) {
            if (
                !(await fileExists(
                    config.folders.diashow + '/' + config.folders.thumbnailPrefix + enabled[i]
                ))
            ) {
                await createThumbnail(config.folders.diashow, enabled[i].name);
            }
        }
        for (let i = 0; i < disabled.length; i++) {
            if (
                !(await fileExists(
                    config.folders.diashow + '/' + config.folders.thumbnailPrefix + disabled[i]
                ))
            ) {
                await createThumbnail(config.folders.diashow, disabled[i].name);
            }
        }
    }

    /**
     * Aktiviert ein Bild für die Diashow
     */
    public async enable_pic(filename: string) {
        await fs.promises.rename(
            config.folders.diashow + '/' + filename,
            config.folders.diashow + '/' + filename.replace('.disabled', '')
        );
        await fs.promises.rename(
            config.folders.diashow + '/' + config.folders.thumbnailPrefix + filename,
            config.folders.diashow +
                '/' +
                config.folders.thumbnailPrefix +
                filename.replace('.disabled', '')
        );

        globalEvents.emit('diashow-change');

        return true;
    }

    /**
     * Deaktiviert ein Bild für die Diashow
     */
    public async disable_pic(filename: string) {
        const name = filename.substr(0, filename.lastIndexOf('.') - 1);
        const ext = filename.substr(filename.lastIndexOf('.') + 1);

        await fs.promises.rename(
            config.folders.diashow + '/' + filename,
            config.folders.diashow + '/' + name + '.disabled.' + ext
        );
        await fs.promises.rename(
            config.folders.diashow + '/' + config.folders.thumbnailPrefix + filename,
            config.folders.diashow +
                '/' +
                config.folders.thumbnailPrefix +
                name +
                '.disabled.' +
                ext
        );

        globalEvents.emit('diashow-change');

        return true;
    }

    /**
     * Drefht ein Bild um -90°
     */
    public async rotate_pic_left(filename: string) {
        await rotate(config.folders.diashow, filename, 90);
        globalEvents.emit('diashow-change');

        return true;
    }

    /**
     * Drefht ein Bild um -90°
     */
    public async rotate_pic_right(filename: string) {
        await rotate(config.folders.diashow, filename, -90);
        globalEvents.emit('diashow-change');

        return true;
    }

    /**
     * Löscht ein Bild aus dem Diashowverzeichnis
     * @param filename
     */
    public async delete_pic(filename: string) {
        await fs.promises.unlink(config.folders.diashow + '/' + filename);
        await fs.promises.unlink(
            config.folders.diashow + '/' + config.folders.thumbnailPrefix + filename
        );

        globalEvents.emit('diashow-change');

        return true;
    }

    public async process_new(path: string, filename: string) {
        try {
            await moveFile(path + '/' + filename, config.folders.diashow + '/' + filename);
            await createThumbnail(config.folders.diashow, filename);
            await createHd(config.folders.diashow, filename);
            this.disable_pic(filename);
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }
}

export default new DiashowService();
