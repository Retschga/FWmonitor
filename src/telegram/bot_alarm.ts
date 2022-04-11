'use-strict';

import { Context, InlineKeyboard, InputFile } from 'grammy';
import { getFormattedAlarmTime, timeout } from '../utils/common';

import { AlarmRow } from '../models/alarm';
import AlarmService from '../services/alarm';
import { instance as DeviceServiceInstance } from '../services/device';
import { GroupRow } from '../models/group';
import TelegramBot from './bot';
import { UserRow } from '../models/user';
import config from '../utils/config';
import fs from 'fs';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import userService from '../services/user';
import usergroupService from '../services/userGroup';

const NAMESPACE = 'TELEGRAM_BOT';

export default class BotAlarm {
    private bot: TelegramBot | undefined;

    public init(bot: TelegramBot): void {
        this.bot = bot;

        this.bot.inlineKeyboardEvents.on('KommenJa', this.bot_alarm_yes.bind(this));
        this.bot.inlineKeyboardEvents.on('KommenNein', this.bot_alarm_no.bind(this));

        globalEvents.on('alarm', this.alarm_send.bind(this));
        globalEvents.on('alarm-pdf', this.alarm_sendPdf.bind(this));
        globalEvents.on('alarm-update', this.alarm_sendUpdate.bind(this));
    }

    private async alarm_send(alarm: AlarmRow) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!config.alarm.telegram || AlarmService.is_alarm_silence()) {
                logging.warn(
                    NAMESPACE,
                    'Telegrammalarmierung deaktiviert! --> Keine Benachrichtigung'
                );
                return;
            }

            logging.debug(NAMESPACE, 'Sende Alarm');

            const pdfPath =
                config.folders.archive + '/' + getFormattedAlarmTime(new Date(alarm.date)) + '.pdf';

            const users = await userService.find_all_approved();
            if (!users || users.length < 1) {
                throw new Error('Error: No User found');
            }

            const groups = await usergroupService.find_all();
            if (!groups || groups.length < 1) {
                throw new Error('Error: No Groups found');
            }
            if (alarm.bemerkung == '' || alarm.bemerkung == config.alarmfields.EMPTY)
                alarm.bemerkung = 'DONOTSEND';
            if (alarm.hinweis == '' || alarm.hinweis == config.alarmfields.EMPTY)
                alarm.hinweis = 'DONOTSEND';
            if (alarm.einsatzplan == '' || alarm.einsatzplan == config.alarmfields.EMPTY)
                alarm.einsatzplan = 'DONOTSEND';
            if (alarm.tetra == '' || alarm.tetra == config.alarmfields.EMPTY)
                alarm.tetra = 'DONOTSEND';
            if (alarm.patient == '' || alarm.patient == config.alarmfields.EMPTY)
                alarm.patient = 'DONOTSEND';
            if (alarm.mitteiler == '' || alarm.mitteiler == config.alarmfields.EMPTY)
                alarm.mitteiler = 'DONOTSEND';

            logging.debug(NAMESPACE, 'Alarm:', alarm);

            for (let i = 0; i < users.length; i++) {
                this.send_alarm_user(users[i], alarm, groups, pdfPath);
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    private async send_alarm_user(
        user: UserRow,
        alarm: AlarmRow,
        groups: GroupRow[],
        pdfPath: string
    ) {
        try {
            // Gruppenpattern
            let text = groups.find((e) => e.id == user.group)?.pattern;
            if (!text) return;

            if (!this.bot) return;

            logging.debug(NAMESPACE, 'Sending Alarm to ' + user.telegramid + '...');
            const keyboard = new InlineKeyboard()
                .text('👍 JA!', 'KommenJa:' + alarm.id)
                .text('👎 NEIN!', 'KommenNein:' + alarm.id);

            text = text.replace(/{{EINSATZSTICHWORT}}/g, alarm.einsatzstichwort);
            text = text.replace(/{{SCHLAGWORT}}/g, alarm.schlagwort);
            text = text.replace(/{{OBJEKT}}/g, alarm.objekt);
            text = text.replace(/{{STRASSE}}/g, alarm.strasse);
            text = text.replace(/{{ORTSTEIL}}/g, alarm.ortsteil);
            text = text.replace(/{{ORT}}/g, alarm.ort);
            text = text.replace(/{{BEMERKUNG}}/g, alarm.bemerkung);

            const cars1 = /{{EINSATZMITTEL_EIGEN}}/.test(text);
            const cars2 = /{{EINSATZMITTEL_ANDERE}}/.test(text);

            if (
                (cars1 && cars2 && alarm.cars1.length == 0 && alarm.cars2.length == 0) ||
                (cars1 && !cars2 && alarm.cars1.length == 0) ||
                (!cars1 && cars2 && alarm.cars2.length == 0)
            ) {
                text = text.replace(/{{EINSATZMITTEL_EIGEN}}/g, 'DONOTSEND');
                text = text.replace(/{{EINSATZMITTEL_ANDERE}}/g, 'DONOTSEND');
            } else {
                text = text.replace(/{{EINSATZMITTEL_EIGEN}}/g, alarm.cars1.replace(/\|/g, '\n'));
                text = text.replace(/{{EINSATZMITTEL_ANDERE}}/g, alarm.cars2.replace(/\|/g, '\n'));
            }
            text = text.replace(/{{KREUZUNG}}/g, alarm.kreuzung);
            text = text.replace(/{{HINWEIS}}/g, alarm.hinweis);
            text = text.replace(/{{PRIO}}/g, alarm.prio);
            text = text.replace(/{{TETRA}}/g, alarm.tetra);
            text = text.replace(/{{MITTEILER}}/g, alarm.mitteiler);
            text = text.replace(/{{RUFNUMMER}}/g, alarm.rufnummer);
            text = text.replace(/{{PATIENT}}/g, alarm.patient);
            text = text.replace(/{{EINSATZPLAN}}/g, alarm.einsatzplan);

            //const sendFax = text.indexOf('{{FAX}}') != -1 ? true : false;
            text = text.replace(/{{FAX}}/g, '');

            const sendMap = text.indexOf('{{KARTE}}') != -1 ? true : false;
            text = text.replace(/{{KARTE}}/g, '');

            const sendMapEmg = text.indexOf('{{KARTE_EMG}}') != -1 ? true : false;
            text = text.replace(/{{KARTE_EMG}}/g, '');

            text = text.replace(/{{UPDATES}}/g, '');

            const lines = text.split('{{newline}}');

            // Alarmmeldung
            let alarmMessage = '*⚠️ ⚠️ ⚠️    Alarm   ⚠️ ⚠️ ⚠️*';

            // Informationsmeldung
            const tmp = alarm.einsatzstichwort.toLowerCase();
            if (
                tmp == 'inf verkehrssicherung' ||
                tmp == '1nf verkehrssicherung' ||
                tmp == 'sonstiges verkehrssicherung' ||
                tmp == 'inf sicherheitswache' ||
                tmp == '1nf sicherheitswache'
            )
                alarmMessage = '* 🚧   Kein Einsatz   🚧*\n*Verkehrssicherung*';

            // Beginn Telegramnachricht
            this.bot.sendMessage(user.telegramid, '❗  🔻  🔻  🔻  🔻  🔻  🔻  🔻  🔻  ❗');

            await timeout(8000);

            // Kombialarm
            if (config.alarmfields.KOMBIALARM_REGEX) {
                const kombi_regex = new RegExp(config.alarmfields.KOMBIALARM_REGEX);
                if (alarm.cars1 == '' && kombi_regex.test(alarm.cars2)) {
                    const kombi_name = alarm.cars2.match(kombi_regex);
                    this.bot.sendMessage(
                        user.telegramid,
                        '❗  KOMBIALARM mit ' + kombi_name + '  ❗'
                    );
                    await timeout(200);
                }
            }

            this.bot.sendMessage(user.telegramid, alarmMessage, {
                parse_mode: 'Markdown'
            });

            // Pattern
            for (let i = 0; i < lines.length; i++) {
                const str = lines[i].trim();

                if (/DONOTSEND/.test(str) || str == '') continue;

                await timeout(4000);

                await this.bot.sendMessage(user.telegramid, str, {
                    parse_mode: 'Markdown'
                });
            }

            // Karte
            if (sendMap) {
                await timeout(4000);

                if (alarm.lat != undefined && alarm.lng != undefined && alarm.strasse != '') {
                    try {
                        await this.bot.bot.api.sendLocation(
                            user.telegramid,
                            Number(alarm.lat),
                            Number(alarm.lng)
                        );
                    } catch (error) {
                        logging.exception(NAMESPACE, error);
                    }
                } else {
                    await this.bot.bot.api
                        .sendPhoto(user.telegramid, new InputFile('filesPublic/images/noMap.png'))
                        .catch((e) => logging.exception(NAMESPACE, e));
                }
            }
            if (
                sendMapEmg &&
                alarm.lat != undefined &&
                alarm.lng != undefined &&
                alarm.strasse != ''
            ) {
                await timeout(500);

                try {
                    await this.bot.sendMessage(
                        user.telegramid,
                        `*Hydrantenkarten:*							
[- Link Karte](http://www.openfiremap.org/?zoom=17&lat=${alarm.lat}&lon=${alarm.lng}&layers=B0000T)`,
                        {
                            parse_mode: 'Markdown'
                        }
                    );
                } catch (error) {
                    logging.exception(NAMESPACE, error);
                }
            }

            //Alarmmeldung
            await timeout(4000);
            const msg_id = await this.bot.sendMessage(user.telegramid, alarmMessage, {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
            logging.debug(NAMESPACE, 'Sending Alarm to ' + user.telegramid + ' DONE');

            // Komme Buttons nach 3h löschen
            setTimeout(() => {
                this.bot?.bot.api.deleteMessage(user.telegramid, msg_id);
            }, 3 * 60 * 60 * 1000);
        } catch (error) {
            logging.error(NAMESPACE, 'Error at user ID ' + user);
            logging.exception(NAMESPACE, error);
        }
    }

    private async alarm_sendPdf(path: string) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!config.alarm.telegram || AlarmService.is_alarm_silence()) {
                logging.warn(
                    NAMESPACE,
                    'Telegrammalarmierung deaktiviert! --> Keine Benachrichtigung'
                );
                return;
            }

            logging.debug(NAMESPACE, 'Sende Alarm PDF');

            const users = await userService.find_all_approved();
            if (!users || users.length < 1) {
                throw new Error('Error: No User found');
            }

            const groups = await usergroupService.find_all();
            if (!groups || groups.length < 1) {
                throw new Error('Error: No Groups found');
            }

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                // Gruppenpattern
                let text = groups.find((e) => e.id == user.group)?.pattern;
                if (!text) return;

                if (!this.bot) return;

                const sendFax = text.indexOf('{{FAX}}') != -1 ? true : false;
                text = text.replace(/{{FAX}}/g, '');

                // Fax PDF
                if (sendFax) {
                    const faxPDF = fs.readFileSync(path);
                    await this.bot.bot.api
                        .sendDocument(
                            user.telegramid,
                            new InputFile(faxPDF, path.split(/[/\\]/g).pop())
                        )
                        .catch((e) => logging.exception(NAMESPACE, e));
                }
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    private async bot_alarm_yes(ctx: Context, alarmid: string) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_alarm_yes', { telegramid });

            if (!DeviceServiceInstance) {
                ctx.reply('Error');
                return;
            }

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.reply('Error: No User found');
                return;
            }

            DeviceServiceInstance.broadcast_userstatus(user[0].id, Number(alarmid), true);
            ctx.reply('Rückmeldung: 👍 JA!');
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }

    private async bot_alarm_no(ctx: Context, alarmid: string) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_alarm_no', { telegramid });

            if (!DeviceServiceInstance) {
                ctx.reply('Error');
                return;
            }

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.reply('Error: No User found');
                return;
            }

            DeviceServiceInstance.broadcast_userstatus(user[0].id, Number(alarmid), false);
            ctx.reply('Rückmeldung: 👎 NEIN');
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }

    private async alarm_sendUpdate(data: string) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!config.alarm.telegram || AlarmService.is_alarm_silence()) {
                logging.warn(
                    NAMESPACE,
                    'Telegrammalarmierung deaktiviert! --> Keine Benachrichtigung'
                );
                return;
            }

            logging.debug(NAMESPACE, 'Sende Alarmupdate');

            const users = await userService.find_all_approved();
            if (!users || users.length < 1) {
                throw new Error('Error: No User found');
            }

            const groups = await usergroupService.find_all();
            if (!groups || groups.length < 1) {
                throw new Error('Error: No Groups found');
            }

            for (let i = 0; i < users.length; i++) {
                this.send_alarmUpdate_user(users[i], data, groups);
            }
        } catch (error) {
            if (error instanceof Error) {
                logging.exception(NAMESPACE, error);
            } else {
                logging.error(NAMESPACE, 'Unknown error', error);
            }
        }
    }

    private async send_alarmUpdate_user(user: UserRow, data: string, groups: GroupRow[]) {
        try {
            // Gruppenpattern
            const text = groups.find((e) => e.id == user.group)?.pattern;
            if (!text) return;

            if (!this.bot) return;

            logging.debug(NAMESPACE, 'Sending Alarmupdate to ' + user.telegramid + '...');

            const sendUpdate = text.indexOf('{{UPDATES}}') != -1 ? true : false;

            if (!sendUpdate) return;

            // Alarmmeldung
            const alarmMessage = '*ℹ️ Update:*\n' + data;

            this.bot.sendMessage(user.telegramid, alarmMessage, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logging.error(NAMESPACE, 'Error at user ID ' + user);
            logging.exception(NAMESPACE, error);
        }
    }
}
