'use strict';

import logging from '../utils/logging';
import * as GroupModel from '../models/group';
import config from '../utils/config';
import fs from 'fs';
import { createThumbnail } from '../utils/thumbnail';
import { fileExists } from '../utils/common';

const NAMESPACE = 'DiashowService';

class DiashowService {
    public async get_list() {
        // TODO TryCatch
        const filenames = await fs.promises.readdir(config.folders.diashow);

        let enabled = [];
        let disabled = [];

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

    public async createThumbnails() {
        // TODO TryCatch
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

    public async enable_pic(filename: string) {
        // TODO TryCatch
        const name = filename.substr(0, filename.lastIndexOf('.') - 1);
        const ext = filename.substr(filename.lastIndexOf('.') + 1);

        const response = await fs.promises.rename(
            config.folders.diashow + '/' + filename,
            config.folders.diashow + '/' + name + '.disabled' + ext
        );
    }

    public async disable_pic(filename: string) {
        // TODO TryCatch
        const name = filename.substr(0, filename.lastIndexOf('.') - 1);
        const ext = filename.substr(filename.lastIndexOf('.') + 1);

        const response = await fs.promises.rename(
            config.folders.diashow + '/' + name + '.disabled' + ext,
            config.folders.diashow + '/' + filename.replace('.disabled', '')
        );
    }

    public async delete_pic(filename: string) {
        // TODO TryCatch
        const response1 = await fs.promises.unlink(config.folders.diashow + '/' + filename);
        const response2 = await fs.promises.unlink(
            config.folders.diashow + '/' + config.folders.thumbnailPrefix + filename
        );
    }
}

export default new DiashowService();
