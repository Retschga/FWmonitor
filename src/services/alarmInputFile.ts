'use strict';

import chokidar from 'chokidar';
import moveFile from 'move-file';
import logging from '../utils/logging';
import config from '../utils/config';
import { timeout, execShellCommand, checkFolderOrFile } from '../utils/common';
import AlarmParserService from './alarmParser';
import globalEvents from '../utils/globalEvents';

const NAMESPACE = 'AlarmInputFileService';

class AlarmInputFileService {
    private getFormattedTime(date?: Date) {
        var today = new Date();
        if (date) today = new Date(date);

        var y = today.getFullYear();

        var m = ('0' + (today.getMonth() + 1)).slice(-2);
        var d = ('0' + today.getDate()).slice(-2);
        var h = ('0' + today.getHours()).slice(-2);
        var mi = ('0' + today.getMinutes()).slice(-2);
        var s = ('0' + today.getSeconds()).slice(-2);

        return y + '-' + m + '-' + d + ' ' + h + '-' + mi + '-' + s;
    }

    private async convertPdfToTiff(file: string, targetPath: string) {
        await execShellCommand(
            `"${config.programs.ghostscript}" -dBATCH -sDEVICE=tiffg4 -dNOPAUSE -r300x300 -sOutputFile="${targetPath}" "${file}"`
        );
        logging.info(NAMESPACE, 'PDF -> TIFF    FERTIG\n');
    }

    private async tiffToTxt(file: string, targetPath: string) {
        await execShellCommand(`"${config.programs.tesseract}" "${file}" "${targetPath}" -l deu`);
        logging.info(NAMESPACE, 'TIFF -> TXT    FERTIG\n');
    }

    private async tiffToPdf(file: string, targetPath: string) {
        await execShellCommand(
            `"${config.programs.tesseract}" "${file}" "${targetPath}" -l deu PDF`
        );
        logging.info(NAMESPACE, 'TIFF -> PDF    FERTIG\n');
    }

    private printPdf(path: string) {
        for (let i = 0; i < config.printing.pagecountOriginal; i++) {
            try {
                logging.info(
                    NAMESPACE,
                    'Print -> Seite ' + (i + 1) + ' von ' + config.printing.pagecountOriginal
                );
                //print.print(path);
            } catch (error) {
                logging.ecxeption(NAMESPACE, error);
            }
        }
    }

    public init() {
        if (!config.programs.ghostscript || !config.programs.tesseract) {
            logging.warn(
                NAMESPACE,
                'Ghostscript oder Tesseract nicht gefunden -> Keine Alarm-Dateiauswertung'
            );
            return;
        }
        if (!config.folders.fileInput) {
            logging.warn(NAMESPACE, 'Kein Dateieingangsordner -> Keine Alarm-Dateiauswertung');
            return;
        }

        const watcher = chokidar.watch(config.folders.fileInput, {
            ignored: /(^|[\/\\])\../,
            usePolling: true,
            interval: 3000,
            binaryInterval: 3000,
            awaitWriteFinish: {
                stabilityThreshold: 2000,
                pollInterval: 100
            }
        });

        watcher.on('add', async (path) => {
            logging.info(NAMESPACE, `File ${path} has been added`);
            await timeout(config.folders.fileInput_delay * 1000);

            let filetype = (path.split('.').pop() || '').toLowerCase();
            let file = this.getFormattedTime(); //path.split(/[/\\]/g).pop().split('.')[0];

            logging.info(NAMESPACE, `Filetype: ${filetype}`);

            if (filetype != 'pdf' && filetype != 'tif' && filetype != 'tiff' && filetype != 'txt') {
                logging.warn(NAMESPACE, `FEHLER: Filetype nicht unterstützt!`);
                return;
            }

            // Dateirerchte setzen
            if (config.raspiversion) {
                await execShellCommand(`sudo chmod 777 ${path}`);
                await timeout(1000);
            }

            // Datei ins Archiv verschieben
            await moveFile(path, process.env.FOLDER_ARCHIVE + '/' + file + '.' + filetype);
            path = process.env.FOLDER_ARCHIVE + '/' + file + '.' + filetype;

            await timeout(1000);

            if (filetype == 'pdf') {
                // Drucken
                if (config.printing.printFile) this.printPdf(path);

                // PDF -> TIFF
                await this.convertPdfToTiff(path, config.folders.temp + file + '.tiff');
                // Move -> Archiv
                moveFile(
                    config.folders.temp + file + '.tiff',
                    process.env.FOLDER_ARCHIVE + '/' + file + '.tiff'
                );
                path = process.env.FOLDER_ARCHIVE + '/' + file + '.tiff';

                // TIFF -> Tesseract
                await this.tiffToTxt(path, config.folders.temp + file);

                // Textdatei verarbeiten
                AlarmParserService.parseFile(config.folders.temp + file + '.txt');

                return;
            }

            if (filetype == 'tif' || filetype == 'tiff') {
                // TIFF -> Tesseract
                await this.tiffToTxt(path, config.folders.temp + file);

                // TIFF -> PDF
                await this.tiffToPdf(path, config.folders.temp + file);
                // Move -> Archiv
                await moveFile(
                    config.folders.temp + file + '.pdf',
                    process.env.FOLDER_ARCHIVE + '/' + file + '.pdf'
                );

                /// Drucken
                if (config.printing.printFile)
                    this.printPdf(process.env.FOLDER_ARCHIVE + '/' + file + '.pdf');

                // Textdatei verarbeiten
                AlarmParserService.parseFile(config.folders.temp + file + '.txt');

                return;
            }

            // Textdatei verarbeiten
            AlarmParserService.parseFile(path);
        });

        let lastStatus = true;
        let interval = setInterval(async () => {
            logging.debug(NAMESPACE, 'Folder-Input CHECK...');

            let status = await checkFolderOrFile(config.folders.fileInput);

            logging.debug(NAMESPACE, 'Check IN Folder: status=' + status + '; last=' + lastStatus);

            if (status != lastStatus) {
                globalEvents.emit(
                    'softwareinfo',
                    'Eingangsordner Status: ' + (status ? 'Verbunden' : 'Getrennt') + '!'
                );
            }

            lastStatus = status;
        }, 60000 * 5);
    }
}

export default new AlarmInputFileService();
