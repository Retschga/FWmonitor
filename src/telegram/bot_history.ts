'use-strict';

import { Context, Markup } from 'telegraf';
import TelegramBot from './bot';
import userService from '../services/user';
import alarmService from '../services/alarm';
import statisticServise from '../services/statistic';
import { timeout } from '../utils/common';
import logging from '../utils/logging';
import config from '../utils/config';

const NAMESPACE = 'TELEGRAM_BOT';

export default class BotHistory {
    private bot: TelegramBot | undefined;

    public init(bot: TelegramBot): void {
        this.bot = bot;

        this.bot.inlineKeyboardEvents.on('showAlarm', this.bot_history_showAlarm.bind(this));
        this.bot.inlineKeyboardEvents.on(
            'showStatistik',
            this.bot_history_showStatistic.bind(this)
        );
        this.bot.inlineKeyboardEvents.on('showEinsatzZeit', this.bot_hostory_time.bind(this));
    }

    public async bot_history(ctx: Context): Promise<void> {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_history', { telegramid });

            const keyboard = [
                Markup.button.callback('📜 Letzte Alarme', 'showAlarm:0'),
                Markup.button.callback('📈 Statistik', 'showStatistik')
            ];
            if (config.fwvv.enabled) {
                keyboard.push(Markup.button.callback('⏱️ Einsatzzeit', 'showEinsatzZeit'));
            }

            ctx.replyWithMarkdown('*🔥 Einsätze*', {
                ...Markup.inlineKeyboard(keyboard)
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    private async bot_history_showAlarm(ctx: Context, data: string) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_history_showAlarm', { telegramid });
            ctx.replyWithChatAction('typing');

            const list = await alarmService.find({}, 1, Number(data), 'ORDER BY id DESC');
            if (!list || list.length < 1) {
                ctx.replyWithMarkdown('Error: No Alarm found');
                return;
            }

            const d = new Date(list[0].date);
            const time = d.toLocaleTimeString();
            const date = d.toLocaleDateString('de-DE', {
                weekday: 'long',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });

            ctx.editMessageText(
                `*📜 ${date} ${time}*
_${list[0].einsatzstichwort}
${list[0].schlagwort}
${list[0].ort}_`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([
                        Markup.button.callback('<', 'showAlarm:' + (Number(data) - 1)),
                        Markup.button.callback('>', 'showAlarm:' + (Number(data) + 1))
                    ])
                }
            );
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_history_showStatistic(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_history_showStatistic', { telegramid });
            ctx.replyWithChatAction('typing');

            const year = new Date().getFullYear();

            const list = await statisticServise.get(year);
            if (!list || list.length < 1) {
                ctx.replyWithMarkdown('Error: No Statistik found');
                return;
            }

            let str = '';
            let sum = 0;

            for (let i = 0; i < list.length; i++) {
                const element = list[i];

                if (element.count < 10) str += '0';
                str += element.count;
                sum += element.count;
                if (element.einsatzstichwort != '') str += ' - ' + element.einsatzstichwort + '\n';
                else str += ' - kein Stichwort\n';
            }

            str += '_\n';

            str = `*📈 Einsätze Jahr ${year} ( ${sum} )*_\n` + str;

            ctx.editMessageText(str, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async bot_hostory_time(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_hostory_time', { telegramid });
            await ctx.editMessageText('*⌛ lädt ⌛*', {
                parse_mode: 'Markdown'
            });
            ctx.replyWithChatAction('typing');
            await timeout(500);

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            const year = new Date().getFullYear();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const time: any = await statisticServise.einsatzzeit(user[0].id, year);

            if (!time) {
                ctx.replyWithMarkdown('Error: No Time found');
                return;
            }

            const str = `*⏱️ Einsatzzeit Jahr ${year} :* 
						_${Math.floor(time.time / 60)} h ${time.time % 60} m ( ${time.count} Einsätze )_`;

            ctx.editMessageText(str, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }
}
