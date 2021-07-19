'use-strict';

import fs from 'fs';
import { Context, Markup } from 'telegraf';
import TelegramBot from './bot';
import GroupService from '../services/group';
import userService from '../services/user';
import { instance as DeviceServiceInstance } from '../services/device';
import { AlarmRow } from '../models/alarm';
import { getFormattedAlarmTime, timeout, fileExists } from '../utils/common';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import config from '../utils/config';

const NAMESPACE = 'TELEGRAM_BOT';

export default class BotApp {
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

            const keyboard = Markup.inlineKeyboard([
                Markup.button.callback('👍 JA!', 'KommenJa:' + alarm.id),
                Markup.button.callback('👎 NEIN!', 'KommenNein:' + alarm.id)
            ]);

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

            for (let i = 0; i < users.length; i++) {
                try {
                    const user = users[i];

                    // Gruppenpattern
                    let text = groups.find((e) => e.id == user.group)?.pattern;
                    if (!text) return;

                    text = text.replace(/{{EINSATZSTICHWORT}}/g, alarm.einsatzstichwort);
                    text = text.replace(/{{SCHLAGWORT}}/g, alarm.schlagwort);
                    text = text.replace(/{{OBJEKT}}/g, alarm.objekt);
                    text = text.replace(/{{STRASSE}}/g, alarm.strasse);
                    text = text.replace(/{{ORTSTEIL}}/g, alarm.ortsteil);
                    text = text.replace(/{{ORT}}/g, alarm.ort);
                    text = text.replace(/{{BEMERKUNG}}/g, alarm.bemerkung);
                    text = text.replace(
                        /{{EINSATZMITTEL_EIGEN}}/g,
                        alarm.cars1.replace(/\|/g, '\n')
                    );
                    text = text.replace(
                        /{{EINSATZMITTEL_ANDERE}}/g,
                        alarm.cars2.replace(/\|/g, '\n')
                    );

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
                            this.bot.bot.telegram
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
                        let str = lines[i].trim();

                        if (str == '') str = '----';

                        await timeout(4000);

                        this.bot.sendMessage(user.telegramid, str, {
                            parse_mode: 'Markdown'
                        });
                    }

                    // Karte
                    if (sendMap) {
                        await timeout(4000);

                        if (
                            alarm.lat != undefined &&
                            alarm.lng != undefined &&
                            alarm.strasse != ''
                        ) {
                            this.bot.bot.telegram
                                .sendLocation(user.telegramid, Number(alarm.lat), Number(alarm.lng))
                                .catch((err) => {
                                    logging.exception(NAMESPACE, err);
                                });
                        } else {
                            this.bot.bot.telegram
                                .sendPhoto(user.telegramid, {
                                    source: 'public/images/noMap.png'
                                })
                                .catch((err) => {
                                    logging.exception(NAMESPACE, err);
                                });
                        }
                    }
                    if (
                        sendMapEmg &&
                        alarm.lat != undefined &&
                        alarm.lng != undefined &&
                        alarm.strasse != ''
                    ) {
                        await timeout(500);

                        this.bot.sendMessage(
                            user.telegramid,
                            `*Hydrantenkarten:*							
[- Link Karte](http://www.openfiremap.org/?zoom=17&lat=${alarm.lat}&lon=${alarm.lng}&layers=B0000T)`,
                            {
                                parse_mode: 'Markdown'
                            }
                        );
                    }

                    //Alarmmeldung
                    await timeout(4000);
                    this.bot.sendMessage(user.telegramid, alarmMessage, {
                        parse_mode: 'Markdown',
                        ...keyboard
                    });
                } catch (error) {
                    logging.error(NAMESPACE, 'Error at user ID ' + users[i]);
                    logging.exception(NAMESPACE, error);
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
