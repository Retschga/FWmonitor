'use-strict';

import * as Security from '../utils/security';

import { Context, InlineKeyboard } from 'grammy';

import TelegramBot from './bot';
import config from '../utils/config';
import logging from '../utils/logging';
import { timeout } from '../utils/common';
import userService from '../services/user';

const NAMESPACE = 'TELEGRAM_BOT';

export default class BotApp {
    private bot: TelegramBot | undefined;

    public init(bot: TelegramBot): void {
        this.bot = bot;

        this.bot.inlineKeyboardEvents.on('einstell_appLogin', this.bot_app_getLogin.bind(this));
    }

    public bot_app_menu(ctx: Context): void {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_app_menu', { telegramid });

            const keyboard = new InlineKeyboard().text('🔑 APP Zugang', 'einstell_appLogin');
            if (config.app.enabled) {
                keyboard.text('📱 APP - Link', config.app.url + 'app');
            }

            ctx.reply('*📱 FWmonitor APP*', {
                parse_mode: 'Markdown',
                reply_markup: keyboard
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    private async bot_app_getLogin(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_app_getLogin', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) throw new Error('user not found');

            const { password, hash } = Security.createNewPassword();
            const loginToken = Security.createToken({ id: user[0].id, car: false, isV3: true }, 60);

            userService.update_login(user[0].id, hash);

            ctx.editMessageText('*APP Zugangsdaten: Telegram ID, Passwort*', {
                parse_mode: 'Markdown'
            });

            this.bot.sendMessage(telegramid, '_' + telegramid + '_', {
                parse_mode: 'Markdown'
            });

            await timeout(500);

            await this.bot.sendMessage(telegramid, '_' + password + '_', {
                parse_mode: 'Markdown'
            });

            await timeout(500);

            const keyboard = new InlineKeyboard();
            if (config.app.enabled) {
                keyboard.url(
                    '📱 Auto - Login',
                    config.app.url + 'app/login?token=' + loginToken.token
                );
            }

            const msgnum = await this.bot.sendMessage(
                telegramid,
                '_Automatik-Anmeldelink (60sek)_',
                {
                    parse_mode: 'Markdown',
                    reply_markup: keyboard
                }
            );

            setTimeout(() => {
                this.bot?.bot.api.deleteMessage(telegramid, msgnum);
            }, 60 * 1000);
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCallbackQuery();
    }
}
