'use strict';

import { AttachmentStream, MailParser, MessageText } from 'mailparser';

import AlarmParserService from './alarmParser';
import Imap from 'imap';
import alarmInputFileService from './alarmInputFile';
import config from '../utils/config';
import fs from 'fs';
import { getFormattedAlarmTime } from '../utils/common';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';

const NAMESPACE = 'AlarmInputEmail_Service';

class AlarmInputEmailService {
    private imap: Imap;

    constructor() {
        //https://support.google.com/mail/answer/7126229?hl=de
        //https://myaccount.google.com/lesssecureapps
        this.imap = new Imap({
            user: config.email.email_address || '',
            password: config.email.email_password || '',
            host: config.email.email_host || '',
            port: Number(config.email.email_port),
            tls: true,
            tlsOptions: {
                servername: config.email.email_servername
            },
            keepalive: true,
            authTimeout: 5000,
            connTimeout: 5000
        });
    }

    private processMessage(msg: Imap.ImapMessage, seqno: number) {
        const parser = new MailParser();
        /*  parser.on('headers', function (headers) {
            logging.info(namespace, 'HEADER', headers);
        }); */

        parser.on('data', async (data: AttachmentStream | MessageText) => {
            logging.info(NAMESPACE, 'Email Sequenznummer: ' + seqno);
            if (data.type === 'text' && config.email.email_use_text && data.text) {
                // Faxfilter anwenden
                if (config.email.filter_inhalt != undefined) {
                    const regex = RegExp(config.email.filter_inhalt, 'gi');
                    if (!regex.test(data.text)) {
                        logging.debug(
                            NAMESPACE,
                            'Inhaltsfilter nicht passend -> Verwerfen',
                            data.text
                        );
                        return;
                    }
                }
                logging.info(NAMESPACE, 'Text', data.text); /* data.html*/

                try {
                    const alarmdate = new Date();
                    const alarmtime = getFormattedAlarmTime(alarmdate);
                    // Textdatei erzeugen
                    await fs.promises.writeFile(
                        config.folders.temp + '/' + alarmtime + '.txt',
                        data.text
                    );
                    // Textdatei verarbeiten
                    AlarmParserService.parseTextFile(
                        config.folders.temp + '/' + alarmtime + '.txt',
                        alarmdate
                    );
                } catch (error) {
                    logging.exception(NAMESPACE, error);
                }
            }
            const filepath = config.folders.temp;
            if (
                data.type === 'attachment' &&
                config.email.email_use_anhang &&
                filepath != undefined
            ) {
                logging.info(NAMESPACE, 'Anhang', data.filename);

                const output = fs.createWriteStream(filepath + '/' + data.filename);

                data.content.pipe(output);
                data.content.on('end', () => {
                    data.release();
                    alarmInputFileService.parseFile(filepath + '/' + data.filename);
                });
            }
        });

        let data = '';
        msg.on('body', (stream) => {
            stream.on('data', function (chunk) {
                data = data + chunk.toString('utf8');
                parser.write(chunk.toString('utf8'));
            });
            /* stream.on('end', (chunk) => {
                logging.info(NAMESPACE, 'stream body end');
            }); */
        });

        msg.once('end', function () {
            // logging.info(namespace, "Finished msg #" + seqno);
            parser.end();
        });
    }

    private async fetchMails() {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const mailBox = await this.openInbox();

            const searchCriteria: (string | string[])[] = ['UNSEEN'];

            if (process.env.FILTER_EMAIL_BETREFF != '') {
                searchCriteria.push(['HEADER', 'SUBJECT', config.email.filter_betreff || '']);
            }
            this.imap.search(searchCriteria, (err, results) => {
                if (!results || !results.length) {
                    logging.info(NAMESPACE, 'No unread mails');
                    //this.imap.end();
                    return;
                }
                //mark as seen
                this.imap.setFlags(results, ['\\Seen'], function (error: Error) {
                    if (!error) {
                        logging.info(NAMESPACE, 'marked as read');
                    } else {
                        logging.info(NAMESPACE, JSON.stringify(error, null, 2));
                    }
                });
                // fetch emails
                const f = this.imap.fetch(results, { bodies: '' });
                f.on('message', this.processMessage);
                f.once('error', function (err) {
                    return Promise.reject(err);
                });
                f.once('end', () => {
                    //this.imap.end();
                });
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    private connectImap() {
        logging.info(NAMESPACE, 'IMAP connecting...');
        this.imap.connect();
    }

    private openInbox(): Promise<Imap.Box> {
        return new Promise((resolve, reject) => {
            this.imap.openBox('INBOX', false, (err, mailBox) => {
                if (err != null) {
                    return reject(err);
                }
                resolve(mailBox);
            });
        });
    }

    public async init() {
        try {
            if (
                config.email.email_address == '' ||
                config.email.email_address == undefined ||
                config.email.email_password == '' ||
                config.email.email_password == undefined
            )
                return;

            //this.imap.once('ready', execute);
            this.imap.on('ready', async () => {
                try {
                    logging.info(NAMESPACE, 'IMAP connected');
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const mailBox = await this.openInbox();
                } catch (error) {
                    logging.exception(NAMESPACE, error);
                }
            });
            this.imap.on('error', (error: Error) => {
                logging.exception(NAMESPACE, error);
                globalEvents.emit('softwareinfo', 'Email-Postfach: Verbindung getrennt');
                setTimeout(() => {
                    this.connectImap();
                }, 5000);
            });
            this.imap.on('close', () => {
                logging.error(NAMESPACE, 'IMAP Connection closed');
                globalEvents.emit('softwareinfo', 'Email-Postfach: Verbindung getrennt');
                setTimeout(() => {
                    this.connectImap();
                }, 5000);
            });
            this.imap.on('mail', (newMessageCount: number) => {
                logging.info(NAMESPACE, 'Neue Emails: ' + newMessageCount);
                this.fetchMails();
            });

            this.connectImap();
            /* setInterval(() => {
            console.log(this.imap.state);
        }, 1000); */
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }
}

export default new AlarmInputEmailService();
