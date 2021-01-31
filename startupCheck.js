'use strict';

// Modul Alarmverarbeitung
module.exports = function () {

    var RASPIVERSION = process.env.RASPIVERSION;

	// ----------------  LIBRARIES ---------------- 
    const fs = require('fs');
    const { promisify } = require('util');
    const stat = promisify(fs.stat);

    // ---------------- Timeout Funktion ----------------
    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * https://ali-dev.medium.com/how-to-use-promise-with-exec-in-node-js-a39c4d7bbf77
     * Executes a shell command and return it as a Promise.
     * @param cmd {string}
     * @return {Promise<string>}
     */
    function execShellCommand(cmd) {
        const exec = require('child_process').exec;
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.warn(error);
                }
                resolve(stdout? stdout : stderr);
            });
        });
    }

    async function checkTesseract() {
        const out = await execShellCommand(`"${process.env.TESSERACT_PATH}" --version`);
        return out.toLowerCase().indexOf('tesseract v') != -1; 
    }

    async function checkGhostscript() {
        const out = await execShellCommand(`"${process.env.GHOSTSCRIPT_PATH}" -version`);
        return out.toLowerCase().indexOf('GPL Ghostscript') != -1; 
    }
    
    async function checkTiff2Ps() {	
        if (RASPIVERSION != "true") return false;
        const out = await execShellCommand('which tiff2ps');
        return out.length > 0 && out.toLowerCase().indexOf('no tiff2ps') == -1; 
    }
    async function checkLpr() {	
         if (RASPIVERSION != "true") return false;
        const out = await execShellCommand('which lpr');
        return out.length > 0 && out.toLowerCase().indexOf('no lpr') == -1; 
    }
    
    function isRoot(){
        return process.getuid && process.getuid() === 0 
    };

    async function checkFolderOrFile(folderPath) {
        try {
            var stats = await stat(folderPath);
            return true;
        } catch (err) {
            return false;
        }
    }

    function drawHeader() {
        console.log("\n\n    --------------------------------------------------------------");
        console.log("    |            Feuerwehr Einsatzmonitor Software               |");
        console.log("    |                                                            |");
        console.log("    |             (c) 2020 Resch - FF Fischbachau                |");
        console.log("    |                       VERSION "+process.env.VERSION+"                        |");
        console.log("    |                                                            |");
        console.log("    |               weitere Infos: siehe Readme                  |");
        console.log("    |                                                            |");
        console.log("    --------------------------------------------------------------\n");
    }

    var chechInFolder = async () => { return await checkFolderOrFile(process.env.FOLDER_IN) }
    
    async function check() {

        drawHeader();

        console.log("----------------------");
        console.log("|    Start Check:    |");
        console.log("----------------------");

        // Eingangsordner
        console.log('');
        let stat_folderIn = await chechInFolder();
        console.log(" - Eingangsordner         " + (stat_folderIn ? " OK" : " -> FEHLER"));

        // Archivordner
        let stat_folderArchive = await checkFolderOrFile(process.env.FOLDER_ARCHIVE);
        console.log(" - Archivordner           " + (stat_folderArchive ? " OK" : " -> FEHLER"));

        // Gebe Filtereinstellungen aus
        console.log('');
        console.log(' - Fax Filter:             ' + process.env.FAXFILTER);
        console.log(' - Einsatzmittel Filter:   ' + process.env.FW_NAME);

        // Prüfe Ausdruckeinstellungen
        console.log('');
        console.log(" - Ausdruck:              " + (process.env.ALARMDRUCK == "true" ? " Ja" : " -> Nein"));        
        if (process.env.ALARMDRUCK == "true") {

            // Version B
            if(RASPIVERSION != "true" && process.env.AREADER != "") {
                let stat_folderReader = await checkFolderOrFile(process.env.AREADER);
                console.log(" - Programmpfad           " + (stat_folderReader ? " OK" : " -> FEHLER"));
            }           
            if (RASPIVERSION == "true") {
                console.log(" - Druckername:            " + process.env.DRUCKERNAME);
            }

            // Version A
            if (process.env.DRUCKERURL != '') {
                console.log(" - Drucker URL:            " + process.env.DRUCKERURL);
            }
        }

        // Tesseract
        console.log('');
        console.log(" - Tesseract              " + (checkTesseract() ? " OK" : " -> FEHLER"));

        // Ghostscript
        console.log(" - Ghostscript            " + (checkGhostscript() ? " OK" : " -> FEHLER"));

        if (RASPIVERSION == "true") {
            // tiff2ps
            console.log(" - tiff2ps                " + (checkTiff2Ps() ? " OK" : " -> FEHLER"));

            // lpr
            console.log(" - lpr                    " + (checkLpr() ? " OK" : " -> FEHLER"));

            // is root
            console.log('');
            console.log(" - Program ist root       " + (isRoot() ? " OK" : " -> FEHLER"));
        }
    
        // Alarmierung
        console.log('');
        console.log(" - Telegram Sende Alarme: " + (process.env.BOT_SENDALARM == "true" ? " Ja" : " ->  Nein"));
        console.log(" - APP Sende Alarme:      " + (process.env.APP_SENDALARM == "true" ? " Ja" : " ->  Nein"));

        console.log('');
        console.log("----------------------");
        console.log("|   IPP   Drucker:   |");
        console.log("----------------------");

        console.log('');
        var mdns = require('mdns-js');
        //if you have another mdns daemon running, like avahi or bonjour, uncomment following line
        mdns.excludeInterface('0.0.0.0');
        var browser = mdns.createBrowser(mdns.tcp('ipp'));
        browser.on('ready', function () {
            browser.discover();
        });
        browser.on('update', function (data) {
            let txtRecord = {};
            for (let i in data.txt) {
                let e = data.txt[i].split('=');
                txtRecord[e[0]] = e[1];
            }
            console.log(' - ', /*data.fullname, */txtRecord.ty, txtRecord.note, ' :  URL -->  http://' + data.host + ':' + data.port + '/' + txtRecord.rp + "  <--");
        });
        await timeout(5000);

        console.log('');
        console.log('');
        console.log('');

    }

	return {
        check,
        chechInFolder
	};
}