'use strict';

// Modul Drucken
module.exports = function () {

    // ----------------  LIBRARIES ---------------- 
    const debug = require('debug')('update');
    const axios = require('axios')
    
    /**
     * Gibt die aktuelle Version auf Github zurück
     */
    async function getRemoteVersion() {
        try {
            const response = await axios.get('https://api.github.com/repos/retschga/fwmonitor/releases/latest');
            debug('Aktuelle Version: ' + response['data']['tag_name']);
            debug('Info:\n' + response['data']['body']);
            return {'version': response['data']['tag_name'], 'text': response['data']['body']};
        } catch (error) {
            console.error(error);
            return undefined;
        }
    }

    /**
     * Vergleicht die installierte Version mit der aktuellen Version auf Github
     */
    async function checkForUpdate() {
        try {
            const response = await getRemoteVersion();
            if(response != undefined && process.env.VERSION != response.version) {
                return {'availible': true, 'version': response.version, 'text': response.text};
            } else {
                return {'availible': false, 'version': '', 'text': ''};
            }
        } catch (error) {
            console.error(error);
            return {'availible': false, 'version': '', 'text': ''};
        }
    }


    return {
        checkForUpdate
    };
}