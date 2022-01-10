'use-strict';

import { Context, InlineKeyboard, Keyboard } from 'grammy';

import AlarmService from '../services/alarm';
import TelegramBot from './bot';
import config from '../utils/config';
import fs from 'fs';
import logging from '../utils/logging';
import userService from '../services/user';

const NAMESPACE = 'TELEGRAM_BOT';

export default class BotMore {
    private bot: TelegramBot | undefined;

    public init(bot: TelegramBot): void {
        this.bot = bot;

        this.bot.inlineKeyboardEvents.on(
            'einstell_Kalender',
            this.bot_more_calendarNotifications.bind(this)
        );
        this.bot.inlineKeyboardEvents.on(
            'einstell_Kalender_set',
            this.bot_more_calendarNotifications_set.bind(this)
        );
        this.bot.inlineKeyboardEvents.on('einstell_picture', this.bot_more_picture.bind(this));
        this.bot.inlineKeyboardEvents.on('einstell_Hydrant', this.bot_more_hydrant.bind(this));
        this.bot.bot.on(':location', (ctx) => {
            try {
                if (!this.bot) throw new Error('Not initialized');
                if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

                const telegramid: string = String(ctx.from?.id);
                logging.debug(NAMESPACE, 'bot_more_hydrant', { telegramid });

                this.bot.user_location[ctx.from?.id || -1] = { lat: 0, lng: 0, accuracy: 9999 };
                this.bot.user_location[ctx.from?.id || -1].lat = ctx.message?.location.latitude;
                this.bot.user_location[ctx.from?.id || -1].lng = ctx.message?.location.longitude;
                this.bot.user_location[ctx.from?.id || -1].accuracy =
                    ctx.message?.location.horizontal_accuracy || 9999;

                ctx.reply('Position OK? ', {
                    reply_markup: new InlineKeyboard()
                        .text('Ja', 'hydrPosOK:' + ctx.message?.message_id)
                        .text('Nein', 'einstell_Hydrant')
                });
            } catch (error) {
                logging.exception(NAMESPACE, error);
            }
        });
        this.bot.inlineKeyboardEvents.on('hydrPosOK', this.bot_more_hydrant_location_ok.bind(this));
        this.bot.inlineKeyboardEvents.on('hydrTyp', this.bot_more_hydrant_type.bind(this));
        this.bot.inlineKeyboardEvents.on(
            'einstell_alarmsilence',
            this.bot_more_alarmsilence.bind(this)
        );

        this.bot.inlineKeyboardEvents.on(
            'einstell_alarmsilence_set',
            this.bot_more_alarmsilence_set.bind(this)
        );
    }

    public async bot_more(ctx: Context): Promise<void> {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more', { telegramid });

            const keyboard = new InlineKeyboard()
                .text('📅 Erinnerungen', 'einstell_Kalender')
                .text('🧯 Hydrant eintragen', 'einstell_Hydrant')
                .row()
                .text('🖼️ Bild für Diashow', 'einstell_picture');

            if (config.common.fw_position) {
                keyboard.url(
                    '🗺️ Karte',
                    `http://www.openfiremap.org/?zoom=13&lat=${config.common.fw_position.lat}&lon=${config.common.fw_position.lng}&layers=B0000T`
                );
            }

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.reply('Error: No User found');
                return;
            }

            if (user[0].admin == true) {
                keyboard.row().text('🔕 Alarmstille', 'einstell_alarmsilence');
            }

            // Antwort senden
            ctx.reply('*️▪️ Mehr:*', {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    private async bot_more_calendarNotifications(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_calendarNotifications', { telegramid });

            ctx.editMessageText('📅 Kalender Erinnerungen', {
                parse_mode: 'Markdown',
                reply_markup: new InlineKeyboard()
                    .text('An', 'einstell_Kalender_set:1')
                    .text('Aus', 'einstell_Kalender_set:0')
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }

    private async bot_more_calendarNotifications_set(ctx: Context, value: string) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_calendarNotifications_set', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.reply('Error: No User found');
                return;
            }

            if (value == '1') {
                userService.update_notifications_calendar(user[0].id, true);
                ctx.answerCallbackQuery('📅 Kalender Erinnerungen -> Ein');
                ctx.editMessageText('📅 Kalender Erinnerungen -> Ein');
            } else {
                userService.update_notifications_calendar(user[0].id, false);
                ctx.answerCallbackQuery('📅 Kalender Erinnerungen -> Aus');
                ctx.editMessageText('📅 Kalender Erinnerungen -> Aus');
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }

    private async bot_more_hydrant(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant', { telegramid });

            await this.bot.sendMessage(telegramid, 'Position über GPS senden.', {
                parse_mode: 'Markdown',
                reply_markup: new Keyboard()
                    .requestLocation('📍 Position senden')
                    .text('⬅️ Abbrechen')
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }

    private async bot_more_hydrant_location_ok(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant_location_ok', { telegramid });

            this.bot.sendMessage(telegramid, 'OK', {
                reply_markup: { remove_keyboard: true }
            });

            ctx.editMessageText('Art des Hydranten?: ', {
                reply_markup: new InlineKeyboard()
                    .text('📍 U-Flur', 'hydrTyp:Unterflur')
                    .text('📍 O-Flur', 'hydrTyp:Oberflur')
                    .text('📍 Saugstelle', 'hydrTyp:Saugstelle')
                    .text('📍 Becken', 'hydrTyp:Becken')
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }

    private async bot_more_hydrant_type(ctx: Context, typ: any) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant_type', { telegramid });
            console.log(ctx);

            ctx.editMessageText('Typ: ' + typ);

            ctx.reply(
                'Bitte ein Bild mit dem Daten-Schild des Hydranten senden (  über 📎 Büroklammer Symbol unten ).'
            );
            this.bot.user_hydrantPicRequested[ctx.from.id] = 1;

            const d = new Date();
            const time = d.toLocaleTimeString();
            const date = d.toLocaleDateString('de-DE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

            const feature = {
                type: 'Feature',
                properties: {
                    art: typ,
                    erfassung: time + ' - ' + date,
                    melder: ctx.from.last_name + ' ' + ctx.from.first_name
                },
                geometry: {
                    type: 'Point',
                    coordinates: [
                        this.bot.user_location[ctx.from.id].lat,
                        this.bot.user_location[ctx.from.id].lng
                    ]
                }
            };

            const geoHeader = { type: 'FeatureCollection', features: [feature] };
            try {
                fs.writeFile(
                    config.folders.hydranten +
                        '/' +
                        this.bot.user_location[ctx.from.id].lat.toString() +
                        ', ' +
                        this.bot.user_location[ctx.from.id].lng.toString() +
                        '.geojson',
                    JSON.stringify(geoHeader),
                    (err) => {
                        if (err) throw err;
                    }
                );
            } catch (error) {
                logging.exception(NAMESPACE, error);
            }

            try {
                fs.appendFile(
                    config.folders.hydranten + '/' + 'Hydrantenpositionen.txt',
                    '\n' +
                        time +
                        ' - ' +
                        date +
                        '    ' +
                        ctx.from.last_name +
                        ' ' +
                        ctx.from.first_name +
                        ' - ' +
                        this.bot.user_location[ctx.from.id].lat +
                        ', ' +
                        this.bot.user_location[ctx.from.id].lng +
                        ' - ' +
                        typ,
                    function (err) {
                        if (err) throw err;
                    }
                );
            } catch (error) {
                logging.exception(NAMESPACE, error);
            }
            logging.debug(
                NAMESPACE,
                '[Hydrant] ' +
                    ctx.from +
                    ' ' +
                    JSON.stringify(this.bot.user_location[ctx.from.id]) +
                    ' ' +
                    typ
            );
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }

    private async bot_more_picture(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_picture', { telegramid });

            ctx.editMessageText(
                'Bild über Büroklammer-Symbol unten senden. (Wenn möglich ohne Kompression wählen)',
                {
                    parse_mode: 'Markdown'
                }
            );
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }

    private async bot_more_alarmsilence(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_alarmsilence', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.reply('Error: No User found');
                return;
            }

            if (user[0].admin != true) return;

            ctx.editMessageText(
                `*${AlarmService.is_alarm_silence() ? '🔕' : '🔔'} Alarmstille: _${
                    AlarmService.is_alarm_silence()
                        ? 'Aktiv ' + (config.alarm.silence / 60).toFixed(0) + 'min'
                        : 'AUS'
                }_*`,
                {
                    parse_mode: 'MarkdownV2',
                    reply_markup: new InlineKeyboard()
                        .text('5m', 'einstell_alarmsilence_set:5')
                        .text('10m', 'einstell_alarmsilence_set:10')
                        .text('15m', 'einstell_alarmsilence_set:15')
                        .text('30m', 'einstell_alarmsilence_set:30')
                        .row()
                        .text('Deaktivieren', 'einstell_alarmsilence_set:-1')
                }
            );
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }

    private async bot_more_alarmsilence_set(ctx: Context, value: string) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'einstell_alarmsilence_set', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.reply('Error: No User found');
                return;
            }

            if (user[0].admin != true) return;

            const minutes = parseInt(value, 10);
            AlarmService.set_alarm_silence(minutes * 60);

            ctx.editMessageText(
                `*🔕 Alarmstille: _Aktiv ${(config.alarm.silence / 60).toFixed(0)}min _*`,
                {
                    parse_mode: 'MarkdownV2'
                }
            );

            setTimeout(() => {
                this.bot?.sendMessage(
                    telegramid,
                    `*${AlarmService.is_alarm_silence() ? '🔕' : '🔔'} Alarmstille: _${
                        AlarmService.is_alarm_silence() ? 'Aktiv' : 'AUS'
                    }_*`,
                    {
                        parse_mode: 'MarkdownV2'
                    }
                );
            }, minutes * 60000 + 30000);
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }
}
