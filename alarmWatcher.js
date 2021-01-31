'use strict';

// Modul Alarmverarbeitung
module.exports = function (_alarmManager) {

    var RASPIVERSION = process.env.RASPIVERSION;

    // ----------------  LIBRARIES ---------------- 
    const chokidar = require('chokidar');
    const moveFile = require('move-file');

	const EventEmitter = require('events');
    var eventEmitter = new EventEmitter();


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


    async function startWin() {
        // ---------------- PC Version ----------------
        console.log("[APP] PC Version gestartet");

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

            if(filetype == 'pdf') {
                // PDF -> TIFF
                await convertPdfToTiff(path, './temp/' + file + '.tiff');
                // TIFF -> Tesseract
                await tiffToTxt('./temp/' + file + '.tiff', './temp/' + file);

                // Move -> Archiv
                moveFile( path, process.env.FOLDER_ARCHIVE + '/' + file + '.' + filetype);
                moveFile( './temp/' + file + '.tiff', process.env.FOLDER_ARCHIVE + '/' + file + '.tiff');

                // Textdatei verarbeiten
                _alarmManager[0].parseFile('./temp/' + file + '.txt');

                return;
            }

            if(filetype == 'tif' || filetype == 'tiff') {
                // TIFF -> Tesseract
                await tiffToTxt('./temp/' + file + '.tiff', './temp/' + file);

                // Move -> Archiv
                moveFile( path, process.env.FOLDER_ARCHIVE + '/' + file + '.' + filetype);

                // Textdatei verarbeiten
                _alarmManager[0].parseFile('./temp/' + file + '.txt');

                return;
            }
            
            // Textdatei verarbeiten
            _alarmManager[0].parseFile(path);

        })
    }

    async function startRpi() {

        // ---------------- Raspberry PI Version ----------------
        console.log("[APP] Raspberry Pi Version gestartet");

        var sys = require('sys')
        var exec = require('child_process').exec;

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
        }).on('add', (path) => {

            // Konsolenausgabe
            let current_datetime = new Date()
            console.log("\n[App] " + current_datetime.toString());
            console.log(`[App] File ${path} has been added`);

            // Delay, da Hylafax sonst offenbar Datei noch nicht fertig geschrieben hat
            var delay = 20000;

            // Prüfe ob TIF/TIFF Datei
            if (path.split('.')[1] == "tiff" || path.split('.')[1] == "tif") {

                // Dateipfad im Archiv
                var file = process.env.FOLDER_ARCHIVE + "/" + String(path).split("/").pop();
                // Lokalisiertes Datum
                var d = new Date().toLocaleTimeString();

                // Dateirechte setzen
                setTimeout(function () {
                    console.log(`[App] ${d} sudo chmod 777 ${path}`);
                    exec(`sudo chmod 777 ${path}`, function (err, stdout, stderr) {
                        if (err) {
                            console.log('error:', err)
                        }
                        console.log("stdout -> " + stdout);
                        console.log("stderr -> " + stderr);
                    });
                }, delay);


                delay += 2000;
                setTimeout(function () {

                    // Datei ins Archiv verschieben
                    console.log(`[App] ${d} sudo mv ${path} ` + process.env.FOLDER_ARCHIVE);
                    exec(`sudo mv ${path} ` + process.env.FOLDER_ARCHIVE, function (err, stdout, stderr) {
                        if (err) {
                            console.log('error:', err)
                        }
                        console.log("stdout -> " + stdout);
                        console.log("stderr -> " + stderr);
                    });

                    // Datei in PDF ausdrucken/konvertieren
                    delay = 10000; // Warte etwas da es sonst aus nicht geht (keine Ahnung warum)
                    setTimeout(function () {
                        console.log(`${d} PDF Druck: sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P PDFPrint`);
                        exec(`sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P PDFPrint`, function (err, stdout, stderr) {
                            if (err) {
                                console.log('error:', err)
                            }
                            console.log("stdout -> " + stdout);
                            console.log("stderr -> " + stderr);
                        });
                    }, delay);


                    // Tesseract ausführen
                    delay = 20000; // Warte etwas da es sonst aus nicht geht (keine Ahnung warum)
                    setTimeout(function () {

                        console.log("[App] Tesseract!");

                        console.log(`[App] ${d} sudo tesseract ${file} -l deu -psm 6 stdout`);
                        exec(`sudo tesseract ${file} -l deu -psm 6 stdout`, function (err, stdout, stderr) {
                            var text = stdout;
                            if (err) {
                                console.log('error:', err)
                            } else {

                                // Prüfe ob Text erkannt wurde
                                if (text != "" && text != null && text != undefined && text != " ") {

                                    // Dateiname
                                    var arr = String(file).split(".");
                                    var filePath = arr[arr.length - 2];

                                    // Schreibe Text in Datei
                                    fs.writeFile(filePath + ".txt", text, function (err) {
                                        if (err) {
                                            return console.log(err);
                                        }
                                        console.log("[APP] Datei gespeichert");

                                        // Textdatei verarbeiten
                                        _alarmManager[0].parseFile(filePath + ".txt");

                                    });

                                }
                            }

                            console.log("stdout -> " + stdout);
                            console.log("stderr -> " + stderr);

                        });

                    }, delay);

                    // Datei ausdrucken
                    delay += 10000;
                    setTimeout(function () {
                        console.log(`${d} Druck 1: sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`);
                        exec(`sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`, function (err, stdout, stderr) {
                            if (err) {
                                console.log('error:', err)
                            }
                            console.log("stdout -> " + stdout);
                            console.log("stderr -> " + stderr);
                        });
                    }, delay);

                    // Datei nochmal ausdrucken
                    delay += 10000;
                    setTimeout(function () {
                        console.log(`${d} Druck 2: sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`);
                        exec(`sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`, function (err, stdout, stderr) {
                            if (err) {
                                console.log('error:', err)
                            }
                            console.log("stdout -> " + stdout);
                            console.log("stderr -> " + stderr);
                        });
                    }, delay);


                }, delay);

            }

        });

    }
    

    async function start() {

        if (RASPIVERSION == "false") {

           await startWin();

        } else {

           await startRpi();

        }

    }
    

	return {
        eventEmitter,
        start
	};
}