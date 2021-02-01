'use strict';

// Modul Alarmverarbeitung
module.exports = function (_alarmManager) {

    var RASPIVERSION = process.env.RASPIVERSION;

    // ----------------  LIBRARIES ---------------- 
    const chokidar = require('chokidar');
    const moveFile = require('move-file');
    var print = require('./printer')();

	const EventEmitter = require('events');
    var eventEmitter = new EventEmitter();

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
            const start = new Date();
            console.log("EXECUTE: " + cmd);
            exec(cmd, (error, stdout, stderr) => {
                if (error) {
                    console.warn(error);
                }
                const ms = new Date() - start;
    			console.log('EXECUTION TIME: %sms', ms);
                resolve(stdout? stdout : stderr);
            });
        });
    }


    async function convertPdfToTiff(file, targetPath) {
        await execShellCommand(`"${process.env.GHOSTSCRIPT_PATH}" -dBATCH -sDEVICE=tiffg4 -dNOPAUSE -r600x600 -sOutputFile="${targetPath}" "${file}"`);
        console.log("PDF -> TIFF    FERTIG\n")
    }

    async function tiffToTxt(file, targetPath) {
        await execShellCommand(`"${process.env.TESSERACT_PATH}" "${file}" "${targetPath}" -l deu`);
        console.log("TIFF -> TXT    FERTIG\n")
    }

    async function tiffToPdf(file, targetPath) {
        await execShellCommand(`"${process.env.TESSERACT_PATH}" "${file}" "${targetPath}" -l deu PDF`);
        console.log("TIFF -> PDF    FERTIG\n")
    }
    
    function printPdf(path) {
        for(let i = 0; i < parseInt(process.env.FAX_DRUCK_SEITENZAHL); i++) {
            try {
                debug('Seite ' + (i+1) + ' von ' +  process.env.FAX_DRUCK_SEITENZAHL);			
                print.print(path);                        
            } catch (error) {  
                console.error("DRUCKEN FEHLER", error);                  
            }    
        }
    }


    async function start() {

        // ---------------- Raspberry PI Version ----------------
        console.log("[APP] gestartet");

        // Verzeichnisüberwachung
        chokidar.watch(process.env.FOLDER_IN, {
            ignored: /(^|[\/\\])\../,
            usePolling: true,
            interval: 3000,
            binaryInterval: 3000,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            },
        }).on('add', async (path) => {

            // Konsolenausgabe
            let current_datetime = new Date()
            console.log("\n[App] " + current_datetime.toString());
            console.log(`[App] File ${path} has been added`);

            await timeout(parseInt(process.env.FAX_INPUT_DELAY) * 1000);

            let filetype = path.split('.').pop().toLowerCase();   
            let file = path.split(/[/\\]/g).pop().split('.')[0];

            console.log(`[App] Filetype: ${filetype}`);

            if(filetype != 'pdf' 
                && filetype != 'tif'
                && filetype != 'tiff'
                && filetype != 'txt' 
            ) {                
                console.log('FEHLER: Filetype nicht unterstützt!');
                return;
            }

            // Dateirerchte setzen
            if (RASPIVERSION == "true") {
                await execShellCommand(`sudo chmod 777 ${path}`);
                await timeout(1000);
            }

            // Datei ins Archiv verschieben
            await moveFile( path, process.env.FOLDER_ARCHIVE + '/' + file + '.' + filetype);
            path = process.env.FOLDER_ARCHIVE + '/' + file + '.' + filetype;

            await timeout(1000);


            if(filetype == 'pdf') {
                // Drucken
                if( process.env.FAX_DRUCK == 'true' )
                    printPdf(path);

                // PDF -> TIFF
                await convertPdfToTiff(path, './temp/' + file + '.tiff');
                // Move -> Archiv
                moveFile( './temp/' + file + '.tiff', process.env.FOLDER_ARCHIVE + '/' + file + '.tiff');
                path = process.env.FOLDER_ARCHIVE + '/' + file + '.tiff';          
                
                // TIFF -> Tesseract
                await tiffToTxt(path, './temp/' + file);

                // Textdatei verarbeiten
                _alarmManager[0].parseFile('./temp/' + file + '.txt');

                return;
            }

            if(filetype == 'tif' || filetype == 'tiff' || filetype == 'pdf') {
                // TIFF -> Tesseract
                await tiffToTxt(path, './temp/' + file);

                (async () => {
                    // TIFF -> PDF
                    await tiffToPdf(path, './temp/' + file);
                    // Move -> Archiv
                    await moveFile( './temp/' + file + '.pdf', process.env.FOLDER_ARCHIVE + '/' + file + '.pdf');

                    /// Drucken
                    if( process.env.FAX_DRUCK == 'true' )
                        printPdf(process.env.FOLDER_ARCHIVE + '/' + file + '.pdf');
                })();

                // Textdatei verarbeiten
                _alarmManager[0].parseFile('./temp/' + file + '.txt');

                return;
            }
            
            // Textdatei verarbeiten
            _alarmManager[0].parseFile(path);

        })

    }
    

	return {
        eventEmitter,
        start
	};
}