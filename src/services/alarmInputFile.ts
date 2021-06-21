'use strict';

import chokidar from 'chokidar';
import moveFile from 'move-file';
import logging from '../utils/logging';
import config from '../utils/config';
import {
    timeout,
    execShellCommand,
    checkFolderOrFile,
    getFormattedAlarmTime
} from '../utils/common';
import AlarmParserService from './alarmParser';
import globalEvents from '../utils/globalEvents';
import printService from './printing';

const NAMESPACE = 'AlarmInputFileService';

class AlarmInputFileService {
    private async convertPdfToTiff(file: string, targetPath: string) {
        await execShellCommand(
            `"${config.programs.ghostscript}" -dBATCH -sDEVICE=tiffg4 -dNOPAUSE -r${config.programs.ghostscript_res} -sOutputFile="${targetPath}" "${file}"`
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
                printService.print(path.substring(0, path.lastIndexOf('.')));
            } catch (error) {
                logging.exception(NAMESPACE, error);
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
            const alarmdate = new Date();

            logging.info(NAMESPACE, `File ${path} has been added`);
            await timeout(config.folders.fileInput_delay * 1000);

            let filetype = (path.split('.').pop() || '').toLowerCase();
            let file = getFormattedAlarmTime(alarmdate); //path.split(/[/\\]/g).pop().split('.')[0];

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
            await moveFile(path, config.folders.archive + '/' + file + '.' + filetype);
            path = config.folders.archive + '/' + file + '.' + filetype;

            await timeout(1000);

            if (filetype == 'pdf') {
                // Drucken
                if (config.printing.printFile_fax) this.printPdf(path);

                // PDF -> TIFF
                await this.convertPdfToTiff(path, config.folders.temp + file + '.tiff');

                // Move -> Archiv
                moveFile(
                    config.folders.temp + file + '.tiff',
                    config.folders.archive + '/' + file + '.tiff'
                );
                path = config.folders.archive + '/' + file + '.tiff';

                // TIFF -> TXT
                await this.tiffToTxt(path, config.folders.temp + file);

                // Textdatei verarbeiten
                AlarmParserService.parseFile(config.folders.temp + file + '.txt', alarmdate);

                return;
            }

            if (filetype == 'tif' || filetype == 'tiff') {
                // TIFF -> TXT
                await this.tiffToTxt(path, config.folders.temp + file);

                // TIFF -> PDF
                await this.tiffToPdf(path, config.folders.temp + file);

                // Move -> Archiv
                await moveFile(
                    config.folders.temp + file + '.pdf',
                    config.folders.archive + '/' + file + '.pdf'
                );

                /// Drucken
                if (config.printing.printFile_fax)
                    this.printPdf(config.folders.archive + '/' + file + '.pdf');

                // Textdatei verarbeiten
                AlarmParserService.parseFile(config.folders.temp + file + '.txt', alarmdate);

                return;
            }

            // Textdatei verarbeiten
            AlarmParserService.parseFile(path, alarmdate);
        });

        let lastStatus = true;
        async function check_inputFolder() {
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
        }
        let interval = setInterval(async () => {
            check_inputFolder();
        }, 60000 * 5);
        check_inputFolder();
    }
}

export default new AlarmInputFileService();
