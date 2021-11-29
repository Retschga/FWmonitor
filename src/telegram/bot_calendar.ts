'use-strict';

import { CalendarElement, calendarService } from '../services/calendar';
import { Context, Markup } from 'telegraf';
import { addLeadingZero, getFormattedDateTime } from '../utils/common';

import TelegramBot from './bot';
import config from '../utils/config';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import userService from '../services/user';

const NAMESPACE = 'TELEGRAM_BOT';

export default class BotCalendar {
    private bot: TelegramBot | undefined;

    public init(bot: TelegramBot): void {
        this.bot = bot;

        this.bot.inlineKeyboardEvents.on('KalenderGes', this.bot_calendar_full.bind(this));

        globalEvents.on('calendar-remind', this.calendar_terminerinnerung.bind(this));
    }

    public async bot_calendar(ctx: Context): Promise<void> {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_calendar', { telegramid });

            const list = await calendarService.find_all_upcoming();
            if (!list || list.length < 1) {
                ctx.reply('<b>Deine Termine:</b>\n' + 'Keine anstehenden Termine vorhanden.', {
                    parse_mode: 'HTML',
                    ...Markup.inlineKeyboard([
                        Markup.button.callback('Gesamter Kalender', 'KalenderGes')
                    ])
                });
                return;
            }

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: User not found');
                return;
            }

            const usergroups =
                user[0].kalenderGroups == '' ? ['1'] : user[0].kalenderGroups.split('|');

            let str = '';
            for (let i = 0; i < list.length; i++) {
                for (let j = 0; j < list[i].group.length; j++) {
                    if (usergroups.indexOf(String(list[i].group[j].id)) != -1) {
                        const d = new Date(list[i].start || '1970-01-01');
                        str +=
                            '<i>' +
                            addLeadingZero(d.getDate()) +
                            '.' +
                            addLeadingZero(d.getMonth() + 1) +
                            '. ' +
                            addLeadingZero(d.getHours()) +
                            ':' +
                            addLeadingZero(d.getMinutes()) +
                            ' - ' +
                            list[i].summary +
                            '</i>\n';
                    }
                }
            }

            str = str.replace(/<br>/g, '\n');

            ctx.reply('<b>Deine Termine:</b>\n' + str, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard([
                    Markup.button.callback('Gesamter Kalender', 'KalenderGes')
                ])
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    private async bot_calendar_full(ctx: Context) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_calendar', { telegramid });

            const list = await calendarService.find_all_upcoming();
            if (!list || list.length < 1) {
                ctx.replyWithMarkdown('Keine Termine vorhanden.');
                return;
            }

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            const usergroups =
                user[0].kalenderGroups == '' ? ['1'] : user[0].kalenderGroups.split('|');

            let str = '';
            for (let i = 0; i < list.length; i++) {
                for (let j = 0; j < list[i].group.length; j++) {
                    if (usergroups.indexOf(String(list[i].group[j].id)) != -1) {
                        const d = new Date(list[i].start || '1970-01-01');
                        str +=
                            '<b>' +
                            addLeadingZero(d.getDate()) +
                            '.' +
                            addLeadingZero(d.getMonth() + 1) +
                            '. ' +
                            addLeadingZero(d.getHours()) +
                            ':' +
                            addLeadingZero(d.getMinutes()) +
                            ' - ' +
                            list[i].summary +
                            '</b>\n';
                        break;
                    } else {
                        const d = new Date(list[i].start || '1970-01-01');
                        str +=
                            '<i>' +
                            addLeadingZero(d.getDate()) +
                            '.' +
                            addLeadingZero(d.getMonth() + 1) +
                            '. ' +
                            addLeadingZero(d.getHours()) +
                            ':' +
                            addLeadingZero(d.getMinutes()) +
                            ' - ' +
                            list[i].summary +
                            '</i>\n';
                        break;
                    }
                }
            }

            str = str.replace(/<br>/g, '\n');

            ctx.editMessageText('<b>Alle Termine:</b>\n' + str, {
                parse_mode: 'HTML'
            });
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
        ctx.answerCbQuery();
    }

    private async calendar_terminerinnerung(termin: CalendarElement) {
        try {
            if (!this.bot) throw new Error('Not initialized');
            logging.debug(NAMESPACE, 'Sende terminerinnerung');

            const users = await userService.find_all_approved();
            if (!users || users.length < 1) {
                throw new Error('Error: No User found');
            }

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                const calGroups = user.kalenderGroups.split('|');
                let send = false;

                for (let j = 0; j < termin.group.length; j++) {
                    if (calGroups.indexOf(String(termin.group[j].id)) != -1) {
                        send = true;
                        break;
                    }
                }

                if (send) {
                    this.bot.sendMessage(
                        user.telegramid,
                        `<b>Terminerinnerung:</b>\n<i>${getFormattedDateTime(termin.start)} - ${
                            termin.summary
                        }</i>`,
                        {
                            parse_mode: 'HTML'
                        }
                    );
                }
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }
}
