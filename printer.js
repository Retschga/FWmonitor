'use strict';

// Modul Drucken
module.exports = function () {

    // ----------------  STANDARD LIBRARIES ---------------- 
    const debug = require('debug')('print');
    const puppeteer = require('puppeteer');
    const ipp = require('ipp');
    const fs = require('fs');

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

    // ----------------  Papierüberwachung ---------------- 
    /**
     * Drucker Papierüberwachung
     */
    async function isNotFull() {
        let ret = false;

        if (process.env.DRUCKERURL != '') {
            let r = await isNotFull2();
            if (r) {
                ret = true;
                return ret;
            }
        }
        if (process.env.PRINTER_PATH != '' && process.env.PRINTER_REGEX != '') {
            let r = await isNotFull1();
            if (r) {
                ret = true;
                return ret;
            }
        }

        return ret;
    }
    /**
     * Drucker Papierüberwachung HTTP GET
     */
    async function isNotFull1() {
        debug('isNotFull1');
        var browser = await puppeteer.launch();
        try {


            const [page] = await browser.pages();

            await page.goto(process.env.PRINTER_PATH, { waitUntil: ['load', 'domcontentloaded', 'networkidle0'] });


            let data = await page.evaluate(() => document.querySelector('*').outerHTML);
            await browser.close();

            // Faxfilter anwenden
            var regex = RegExp(process.env.PRINTER_REGEX, 'gi');
            if (!regex.test(data)) {
                debug('false');
                return false;
            }
            debug('true');
            return true;


        } catch (err) {
            await browser.close();
            console.error("[printer] ", err);
            return null;
        }
        await browser.close();
        debug('null');
        return null;
    };
    /**
     * Drucker Papierüberwachung IPP
     */
    async function isNotFull2() {
        debug('isNotFull2');
        let printerURI = process.env.DRUCKERURL;
        var data = ipp.serialize({
            "operation": "Get-Printer-Attributes",
            "operation-attributes-tag": {
                "attributes-charset": "utf-8",
                "attributes-natural-language": "en",
                "printer-uri": printerURI
            }
        });

        ipp.request(printerURI, data, function (err, res) {
            if (err) {
                return console.error("[printer] ", err);
            }
            debug("Status: " + res["printer-attributes-tag"]["printer-state"]);
            debug("Grund: " + res["printer-attributes-tag"]["printer-state-reasons"]);

            if(res["printer-attributes-tag"]["printer-state-reasons"].indexOf('media-empty') != -1) {
                return true;
            }
        })

        return null;
    };

    // ----------------  Drucken ----------------
    /**
     * Drucken einer Datei
     * @param {String} path 
     */
    function print(path) {
        debug("printing " + path);
        if (process.env.DRUCKERURL != '') {
            print2(path);
        }
        if (process.env.AREADER != "" || process.env.DRUCKERNAME != "") {
            print1(path);
        }
    }
    /**
     * Drucken FoxitReader/CUPS
     * @param {String} path 
     */
    async function print1(path) {
        debug('print1');
        if (process.env.RASPIVERSION == "false") {
            // Drucke mit FoxitReader
            let out = await execShellCommand('\"' + process.env.AREADER + '\" /p \"' + path + '\"');
            debug(out);
        } else {
            // Drucke PDF mit lp -> CUPS            
            let out = await execShellCommand('lp -d ' + process.env.DRUCKERNAME + ' \"' + path + '\"');
            debug(out);

            // TIFF
            // execShellCommand(`sudo /usr/bin/tiff2ps -a -p ${path} |lpr -P Alarmdrucker`);  
        }
    }
    /**
     * Drucken IPP
     * @param {String} filename 
     */
    function print2(filename) {
        debug('print2');
        let printerURI = process.env.DRUCKERURL;
        var ipp = require("ipp");
        var printer = ipp.Printer(printerURI);

        fs.readFile(filename, function (err, data) {
            var msg = {
                "operation-attributes-tag": {
                    "requesting-user-name": "User",
                    "job-name": "Print Job",
                    "document-format": "application/octet-stream",
                },
                data: Buffer.from(data)
            };

            printer.execute("Print-Job", msg, function (err, res) {
                debug('err', err);
                debug('res', res);
            });

        });

    }




    return {
        print,
        isNotFull
    };
}