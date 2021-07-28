'use strict';

import axios from 'axios';
import config from './config';
import globalEvents from './globalEvents';
import logging from './logging';

const NAMESPACE = 'SOFTWARE_UPDATE';

class Softwareupdate {
    private lastCheckedVersion = '----';

    /**
     * Gibt die aktuelle Version auf Github zurück
     */
    public async getRemoteVersion() {
        try {
            const response = await axios.get(
                'https://api.github.com/repos/retschga/fwmonitor/releases/latest'
            );

            return {
                version: String(response['data']['tag_name']),
                text: String(response['data']['body']),
                prerelease: response['data']['prerelease'] == true
            };
        } catch (error) {
            logging.exception(NAMESPACE, error);
            return undefined;
        }
    }

    /**
     * Vergleicht die installierte Version mit der aktuellen Version auf Github
     */
    public async checkForUpdate() {
        try {
            const remote_version = await this.getRemoteVersion();
            if (!remote_version) throw new Error('Could not get latest release');

            logging.info(
                NAMESPACE,
                'Aktuelle Remote-Version: ' +
                    remote_version.version +
                    ' - Prerelease: ' +
                    (remote_version.prerelease ? 'Ja' : 'Nein')
            );

            logging.info(NAMESPACE, 'Aktuelle Lokale-Version: ' + config.version);

            const remote_version_nr = remote_version.version.match(/[0-9.]+/g);
            if (!remote_version_nr) throw new Error('Remote version number not found');

            const remote_version_nr_parts = remote_version_nr[0].split('.');
            if (remote_version_nr_parts.length < 3)
                throw new Error('Remote version number could not be decoded');

            const local_version_nr_parts = config.version.split('.');
            if (local_version_nr_parts.length < 3)
                throw new Error('Local version number could not be decoded');

            const remoteChanged = this.lastCheckedVersion != remote_version.version;
            this.lastCheckedVersion = remote_version.version;

            //console.log(Number(local_version_nr_parts[0]), Number(remote_version_nr_parts[0]));
            //console.log(Number(local_version_nr_parts[1]), Number(remote_version_nr_parts[1]));
            //console.log(Number(local_version_nr_parts[2]), Number(remote_version_nr_parts[2]));
            if (
                Number(local_version_nr_parts[0]) < Number(remote_version_nr_parts[0]) // Major
            ) {
                logging.warn(NAMESPACE, 'Neue Software-Version verfügbar! (Major Release)');
                if (remoteChanged) {
                    globalEvents.emit(
                        'softwareinfo',
                        'Neue Software-Version verfügbar! (Major Release)\nVersion ' +
                            remote_version_nr +
                            '\n' +
                            remote_version.text
                    );
                }
                return {
                    availible: true,
                    version: remote_version.version,
                    text: remote_version.text
                };
            }

            if (
                Number(local_version_nr_parts[0]) == Number(remote_version_nr_parts[0]) && // Major
                Number(local_version_nr_parts[1]) < Number(remote_version_nr_parts[1]) // Minor
            ) {
                logging.warn(NAMESPACE, 'Neue Software-Version verfügbar! (Minor Release)');
                if (remoteChanged) {
                    globalEvents.emit(
                        'softwareinfo',
                        'Neue Software-Version verfügbar! (Minor Release)\n Version ' +
                            remote_version_nr +
                            '\n' +
                            remote_version.text
                    );
                }
                /*   if (
                    config.update.autoupdate &&
                    !remote_version.prerelease &&
                    !remote_version.text.toLowerCase().includes('breaking')
                ) {
                    console.log('AUTO UPDATE');
                }
                return {
                    availible: true,
                    version: remote_version.version,
                    text: remote_version.text
                }; */
            }

            if (
                Number(local_version_nr_parts[0]) == Number(remote_version_nr_parts[0]) && // Major
                Number(local_version_nr_parts[1]) == Number(remote_version_nr_parts[1]) && // Minor
                Number(local_version_nr_parts[2]) < Number(remote_version_nr_parts[2]) // Bugfix
            ) {
                logging.warn(NAMESPACE, 'Neue Software-Version verfügbar! (Bugfix Release)');
                if (remoteChanged) {
                    globalEvents.emit(
                        'softwareinfo',
                        'Neue Software-Version verfügbar! (Bugfix Release)\nVersion ' +
                            remote_version_nr +
                            '\n' +
                            remote_version.text
                    );
                }
                /*   if (
                    config.update.autoupdate &&
                    !remote_version.prerelease &&
                    !remote_version.text.toLowerCase().includes('breaking')
                ) {
                    console.log('AUTO UPDATE');
                }
                return {
                    availible: true,
                    version: remote_version.version,
                    text: remote_version.text
                }; */
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        return { availible: false, version: '', text: '' };
    }

    public init() {
        if (config.update.updateCheck) {
            setInterval(() => {
                this.checkForUpdate();
            }, 24 * 60 * 60 * 1000);

            this.checkForUpdate();
        }
    }
}

export default new Softwareupdate();
