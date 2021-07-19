'use-strict';

import { Context, Markup } from 'telegraf';
import TelegramBot from './bot';
import userService from '../services/user';
import logging from '../utils/logging';
import config from '../utils/config';

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
    }

    public async bot_more(ctx: Context): Promise<void> {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more', { telegramid });

            const keyboard = [
                Markup.button.callback('📅 Erinnerungen', 'einstell_Kalender'),
                Markup.button.callback('🧯 Hydrant eintragen', 'einstell_Hydrant'),
                Markup.button.callback('🖼️ Bild für Diashow', 'einstell_picture')
            ];

            if (config.common.fw_position) {
                Markup.button.url(
                    '🗺️ Karte',
                    `http://www.openfiremap.org/?zoom=13&lat=${config.common.fw_position.lat}&lon=${config.common.fw_position.lng}&layers=B0000T`
                );
            }

            // Antwort senden
            ctx.replyWithMarkdown('*️▪️ Mehr:*', {
                ...Markup.inlineKeyboard(keyboard, { columns: 2 })
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
                ...Markup.inlineKeyboard([
                    Markup.button.callback('An', 'einstell_Kalender_set:1'),
                    Markup.button.callback('Aus', 'einstell_Kalender_set:0')
                ])
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_more_calendarNotifications_set(ctx: Context, value: string) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_calendarNotifications_set', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            if (value == '1') {
                userService.update_notifications_calendar(user[0].id, true);
                ctx.answerCbQuery('📅 Kalender Erinnerungen -> Ein', {
                    show_alert: false
                });
                ctx.editMessageText('📅 Kalender Erinnerungen -> Ein');
            } else {
                userService.update_notifications_calendar(user[0].id, false);
                ctx.answerCbQuery('📅 Kalender Erinnerungen -> Aus', {
                    show_alert: false
                });
                ctx.editMessageText('📅 Kalender Erinnerungen -> Aus');
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_more_hydrant(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant', { telegramid });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_more_hydrant_location(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant_location', { telegramid });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_more_hydrant_location_ok(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant_location_ok', { telegramid });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_more_hydrant_type(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant_type', { telegramid });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_more_picture(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_picture', { telegramid });

            ctx.editMessageText('Bild über Büroklammer-Symbol unten senden.', {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }
}
