'use-strict';

import { Context, Markup } from 'telegraf';
import TelegramBot from './bot';
import userService from '../services/user';
import { UserStatus } from '../models/user';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';

const NAMESPACE = 'TELEGRAM_BOT';

export default class BotVerfuegbarkeit {
    private bot: TelegramBot | undefined;

    public init(bot: TelegramBot): void {
        this.bot = bot;

        this.bot.inlineKeyboardEvents.on('VerfuegbarJA', this.bot_verf_yes.bind(this));
        this.bot.inlineKeyboardEvents.on('VerfuegbarNEIN', this.bot_verf_no.bind(this));
        this.bot.inlineKeyboardEvents.on(
            'VerfuegbarNEINOptionen',
            this.bot_verf_no_options.bind(this)
        );
        this.bot.inlineKeyboardEvents.on('VerfuegbarZeige', this.bot_verf_show.bind(this));

        globalEvents.on('userstatus-change', this.send_verf_status.bind(this));
    }

    public async bot_verf(ctx: Context): Promise<void> {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_verf', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            let stat = '🟩';
            if (user[0].status == UserStatus.NICHT_VERFUEGBAR) {
                let bis = '';

                if (user[0].statusUntil != '') {
                    const result = new Date(user[0].statusUntil);
                    const time = result.toLocaleTimeString();
                    const date = result.toLocaleDateString('de-DE', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    });
                    bis = 'bis _' + date + ' ' + time + '_';
                }

                stat = '🟥' + '  ' + bis;
            }

            ctx.replyWithMarkdown('*🚒 Verfügbarkeit: *' + stat, {
                ...Markup.inlineKeyboard(
                    [
                        Markup.button.callback('🟩  Verfügbar', 'VerfuegbarJA'),
                        Markup.button.callback('🟥  Nicht Verfügbar', 'VerfuegbarNEINOptionen'),
                        Markup.button.callback('📜 Anzeigen', 'VerfuegbarZeige')
                    ],
                    { columns: 2 }
                )
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    private async bot_verf_yes(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_verf_yes', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            userService.update_status(user[0].id, UserStatus.VERFUEGBAR);
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_verf_no(ctx: Context, value: string) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_verf_no', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            const days = parseInt(value, 10);
            const until = new Date();
            until.setDate(until.getDate() + days);

            if (days == -1) {
                userService.update_status(user[0].id, UserStatus.NICHT_VERFUEGBAR);
            } else {
                userService.update_status(user[0].id, UserStatus.NICHT_VERFUEGBAR, until);
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async send_verf_status(userid: number) {
        try {
            if (!this.bot) throw new Error('Not initialized');

            const user = await userService.find_by_userid(userid);
            if (!user || user.length < 1) {
                throw new Error('Error: No User found');
            }

            if (user[0].status == UserStatus.VERFUEGBAR) {
                this.bot.sendMessage(user[0].telegramid, '🚒 Status -> 🟩  Verfügbar');
            }

            let bis = 'unbegrenzt';
            if (user[0].statusUntil != null && user[0].statusUntil != '') {
                const result = new Date(user[0].statusUntil);
                const time = result.toLocaleTimeString();
                const date = result.toLocaleDateString('de-DE', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
                bis = date + ' ' + time;
            }

            if (user[0].status == UserStatus.NICHT_VERFUEGBAR) {
                this.bot.sendMessage(
                    user[0].telegramid,
                    '🚒 Status -> 🟥  Nicht Verfügbar bis  _' + bis + '_',
                    {
                        parse_mode: 'Markdown'
                    }
                );
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    private async bot_verf_no_options(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_verf_no_options', { telegramid });

            ctx.editMessageText('*🟥 Dauer (Tage):*', {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(
                    [
                        Markup.button.callback('1', 'VerfuegbarNEIN:1'),
                        Markup.button.callback('2', 'VerfuegbarNEIN:2'),
                        Markup.button.callback('3', 'VerfuegbarNEIN:3'),
                        Markup.button.callback('4', 'VerfuegbarNEIN:4'),
                        Markup.button.callback('5', 'VerfuegbarNEIN:5'),
                        Markup.button.callback('6', 'VerfuegbarNEIN:6'),
                        Markup.button.callback('7', 'VerfuegbarNEIN:7'),
                        Markup.button.callback('14', 'VerfuegbarNEIN:14'),
                        Markup.button.callback('🔁 Unbegrenzt', 'VerfuegbarNEIN:-1')
                    ],
                    { columns: 4 }
                )
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_verf_show(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_verf_show', { telegramid });

            const users = await userService.get_status_allUsers();
            let st_verv = '';
            let st_vervNum = 0;
            let st_nichtverf = '';
            let st_nichtverfNum = 0;

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                if (user.status == UserStatus.VERFUEGBAR) {
                    st_verv += user.name + ' ' + user.vorname + '\n';
                    st_vervNum += 1;
                } else if (user.status == UserStatus.NICHT_VERFUEGBAR) {
                    st_nichtverf += user.name + ' ' + user.vorname + '\n';
                    st_nichtverfNum += 1;
                }
            }

            ctx.editMessageText(
                `*🟩  Verfügbar: (${st_vervNum} )*
_${st_verv}_
*🟥  Nicht Verfügbar: ( ${st_nichtverfNum} )*
_${st_nichtverf}_`,
                {
                    parse_mode: 'Markdown'
                }
            );
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }
}
