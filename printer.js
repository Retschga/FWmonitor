'use strict';

// Modul Drucken
module.exports = function () {

    // ----------------  STANDARD LIBRARIES ---------------- 
    const debug = require('debug')('print');
    const puppeteer = require('puppeteer');
    const ipp = require('ipp');
    const fs = require('fs');

    // ----------------  Papierüberwachung ---------------- 
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
            console.error(err);
            return null;
        }
        await browser.close();
        debug('null');
        return null;
    };

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
                return console.log(err);
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
    function print(path) {
        if (process.env.DRUCKERURL != '') {
            print2(path);
        }
        if (process.env.AREADER != "" || process.env.DRUCKERNAME != "") {
            print1(path);
        }
    }

    function print1(path) {
        debug('print1');
        if (process.env.RASPIVERSION == "false") {
            // Drucke mit FoxitReader
            if (process.env.AREADER != "") {
                var exec = require('child_process').exec;
                var cmd = '\"' + process.env.AREADER + '\" /p \"' + path + '\"';
                debug(cmd);

                exec(cmd, function (error, stdout, stderr) {
                    if (error) {
                        console.log('error:', err);
                    }

                    debug(stdout)
                    debug(stderr)
                });
            }
        } else {
            // Drucke mit lp -> CUPS
            debug('Drucke PDF');
            setTimeout(function () {
                var exec = require('child_process').exec;
                var cmd = 'lp -d ' + process.env.DRUCKERNAME + ' \"' + path + '\"';
                debug(cmd);

                exec(cmd, function (error, stdout, stderr) {
                    if (error) {
                        console.log('error:', err);
                    }

                    debug(stdout)
                    debug(stderr)
                });
            }, 100);

        }
    }

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
                console.log('err', err);
                console.log('res', res);
            });

        });

    }




    return {
        print,
        isNotFull
    };
}