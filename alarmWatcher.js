'use strict';

// Modul Alarmverarbeitung
module.exports = function (_alarmManager) {

    var RASPIVERSION = process.env.RASPIVERSION;

    // ----------------  LIBRARIES ---------------- 
    const chokidar = require('chokidar');
    const moveFile = require('move-file');
    const fs = require('fs');
    const imaps = require('imap-simple');
    const simpleParser = require('mailparser').simpleParser;
    const print = require('./printer')();
    const debug = require('debug')('alarmWatcher');
 



    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getFormattedTime(date) {        
        var today = new Date();
        if(date) today = new Date(date);

        var y = today.getFullYear();
        // JavaScript months are 0-based.
        var m = today.getMonth() + 1;
        if(m<10) m = '0' + m;
        var d = parseInt(today.getDate());
        if(d<10) d = '0' + d;
        var h = parseInt(today.getHours());
        if(h<10) h = '0' + h;
        var mi = parseInt(today.getMinutes());
        if(mi<10) mi = '0' + mi;
        var s = parseInt(today.getSeconds());
        if(s<10) s = '0' + s;
        return y + "-" + m + "-" + d + " " + h + "-" + mi + "-" + s;
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
        await execShellCommand(`"${process.env.GHOSTSCRIPT_PATH}" -dBATCH -sDEVICE=tiffg4 -dNOPAUSE -r300x300 -sOutputFile="${targetPath}" "${file}"`);
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
        if(process.env.ALARM_IN_FAX == 'true') {
            startFax();
        }
        if(process.env.ALARM_IN_EMAIL == 'true') {
            startEmail();
        }
    }

    async function startFax() {

        console.log("[APP] FAX Auswertung gestartet");

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
            let file = getFormattedTime(); //path.split(/[/\\]/g).pop().split('.')[0];

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
    
    async function startEmail() {

        console.log("[APP] E-Mail Auswertung gestartet");

        let connection;
        var config = {
            imap: {
                user: process.env.ALARM_IN_EMAIL_ADRESSE,
                password: process.env.ALARM_IN_EMAIL_PASSWORT,
                host: process.env.ALARM_IN_EMAIL_HOST,
                tlsOptions: { 
                    servername: process.env.ALARM_IN_EMAIL_SERVERNAME, // See nodejs/node#28167
                },
                port: process.env.ALARM_IN_EMAIL_PORT,
                tls: true,
                authTimeout: 3000
            },
            onmail: function (numNewMail) {
                console.log("Neue Email empfangen - Anzahl:" + numNewMail);
                // -> Emails abrufen
                getEmails(connection);
            }
        };

        try {
            connection = await imaps.connect(config);  
            await connection.openBox('INBOX');
        } catch (error) {
            console.error(error);
            return;
        }         
             
    }

    async function getEmails(connection) { 

        var searchCriteria = [
            'UNSEEN'                    
        ];

        if(process.env.FILTER_EMAIL_BETREFF != '') {
            searchCriteria.push(['HEADER', 'SUBJECT', process.env.FILTER_EMAIL_BETREFF]);
        }  

        var fetchOptions = {
            bodies: [''],
            markSeen: false
        };
    
        return connection.search(searchCriteria, fetchOptions).then(function (results) {

            results.forEach(function (item) {

                let all = item.parts.filter(function (part) {
                    return part.which === '';
                })[0]

                var id = item.attributes.uid;
                var idHeader = "Imap-Id: "+id+"\r\n";
                simpleParser(idHeader+all.body, (err, mail) => {
                    console.log("\n---- EMAIL ----");
                    //console.log(mail.from)
                    console.log(mail.subject)
                    console.log(mail.date)
                    console.log(mail.text)
                    console.log()

                    // Faxfilter anwenden
                    var regex = RegExp(process.env.FILTER_EMAIL_INHALT, 'gi');
                    if (!regex.test(mail.text)) {
                        return;
                    }

                    connection.addFlags(id, ['\\Seen'], function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("Marked as read!")
                        }
                    });


                    console.log('Alarm Email eingegangen -> Verarbeiten');
                    processAlarmMail(mail.text, mail.date);

                });
            });
    
        });        

    }

    async function processAlarmMail(data, date) {
        let file = './temp/' + getFormattedTime(date) + '.txt';


        fs.writeFile(file, data, function (err) {
            if (err) return console.log(err);
            console.log(data + ' > ' + file);
        });

        // Textdatei verarbeiten
        _alarmManager[0].parseFile(file, true);
    }


	return {        
        start
	};
}