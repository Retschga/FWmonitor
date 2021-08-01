'use-strict';

import fs from 'fs';
import { Context, Markup } from 'telegraf';
import TelegramBot from './bot';
import GroupService from '../services/group';
import userService from '../services/user';
import { UserRow } from '../models/user';
import { instance as DeviceServiceInstance } from '../services/device';
import { AlarmRow } from '../models/alarm';
import { getFormattedAlarmTime, timeout, fileExists } from '../utils/common';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import config from '../utils/config';
import { GroupRow } from '../models/group';

const NAMESPACE = 'TELEGRAM_BOT';

export default class BotAlarm {
    private bot: TelegramBot | undefined;

    public init(bot: TelegramBot): void {
        this.bot = bot;

        this.bot.inlineKeyboardEvents.on('KommenJa', this.bot_alarm_yes.bind(this));
        this.bot.inlineKeyboardEvents.on('KommenNein', this.bot_alarm_no.bind(this));

        globalEvents.on('alarm', this.alarm_send.bind(this));
    }

    private async alarm_send(alarm: AlarmRow) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!config.alarm.telegram) {
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

            const groups = await GroupService.find_all();
            if (!groups || groups.length < 1) {
                throw new Error('Error: No Groups found');
            }
            if (alarm.bemerkung == '' || alarm.bemerkung == '-/-') alarm.bemerkung = 'DONOTSEND';
            if (alarm.hinweis == '' || alarm.hinweis == '-/-') alarm.hinweis = 'DONOTSEND';
            if (alarm.einsatzplan == '' || alarm.einsatzplan == '-/-')
                alarm.einsatzplan = 'DONOTSEND';
            if (alarm.tetra == '' || alarm.tetra == '-/-') alarm.tetra = 'DONOTSEND';
            if (alarm.patient == '' || alarm.patient == '-/-') alarm.patient = 'DONOTSEND';
            if (alarm.mitteiler == '' || alarm.mitteiler == '-/-') alarm.mitteiler = 'DONOTSEND';

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
            const keyboard = Markup.inlineKeyboard([
                Markup.button.callback('👍 JA!', 'KommenJa:' + alarm.id),
                Markup.button.callback('👎 NEIN!', 'KommenNein:' + alarm.id)
            ]);

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

            const sendFax = text.indexOf('{{FAX}}') != -1 ? true : false;
            text = text.replace(/{{FAX}}/g, '');

            const sendMap = text.indexOf('{{KARTE}}') != -1 ? true : false;
            text = text.replace(/{{KARTE}}/g, '');

            const sendMapEmg = text.indexOf('{{KARTE_EMG}}') != -1 ? true : false;
            text = text.replace(/{{KARTE_EMG}}/g, '');

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

            // Fax PDF
            if (sendFax) {
                await timeout(500);

                if (await fileExists(pdfPath)) {
                    const faxPDF = fs.readFileSync(pdfPath);
                    await this.bot.bot.telegram
                        .sendDocument(user.telegramid, {
                            source: faxPDF,
                            filename: pdfPath.split(/[/\\]/g).pop()
                        })
                        .catch((err) => {
                            logging.exception(NAMESPACE, err);
                        });
                }
            }

            // Pattern
            for (let i = 0; i < lines.length; i++) {
                const str = lines[i].trim();

                if (/DONOTSEND/.test(str)) continue;

                await timeout(4000);

                const msg_id = await this.bot.sendMessage(user.telegramid, str, {
                    parse_mode: 'Markdown'
                });
            }

            // Karte
            if (sendMap) {
                await timeout(4000);

                if (alarm.lat != undefined && alarm.lng != undefined && alarm.strasse != '') {
                    try {
                        const msg_id = (
                            await this.bot.bot.telegram.sendLocation(
                                user.telegramid,
                                Number(alarm.lat),
                                Number(alarm.lng)
                            )
                        ).message_id;
                    } catch (error) {
                        logging.exception(NAMESPACE, error);
                    }
                } else {
                    try {
                        const msg_id = (
                            await this.bot.bot.telegram.sendPhoto(user.telegramid, {
                                source: 'public/images/noMap.png'
                            })
                        ).message_id;
                    } catch (error) {
                        logging.exception(NAMESPACE, error);
                    }
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
                    const msg_id = await this.bot.sendMessage(
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
                ...keyboard
            });
            logging.debug(NAMESPACE, 'Sending Alarm to ' + user.telegramid + ' DONE');

            // Komme Buttons nach 3h löschen
            setTimeout(() => {
                this.bot?.bot.telegram.deleteMessage(user.telegramid, msg_id);
            }, 3 * 60 * 60 * 1000);
        } catch (error) {
            logging.error(NAMESPACE, 'Error at user ID ' + user);
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
                ctx.replyWithMarkdown('Error');
                return;
            }

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            DeviceServiceInstance.broadcast_userstatus(user[0].id, Number(alarmid), true);
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_alarm_no(ctx: Context, alarmid: string) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_alarm_no', { telegramid });

            if (!DeviceServiceInstance) {
                ctx.replyWithMarkdown('Error');
                return;
            }

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            DeviceServiceInstance.broadcast_userstatus(user[0].id, Number(alarmid), false);
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }
}
