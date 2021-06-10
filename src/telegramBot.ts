import { Router, Context, Telegraf, Markup } from 'telegraf';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import config from './utils/config';
import logging from './utils/logging';
import userService from './services/user';
import { UserStatus, UserApproved } from './models/user';
import * as Security from './utils/security';
import { getFormattedAlarmTime, timeout, fileExists } from './utils/common';
import AlarmService from './services/alarm';
import StatisticServise from './services/statistic';
import { AlarmRow } from './models/alarm';
import GroupService from './services/group';
import fs from 'fs';
import globalEvents from './utils/globalEvents';
import { CalendarElement } from './services/calendar';

const NAMESPACE = 'TELEGRAM_BOT';

class TelegramBot {
    private bot: Telegraf;
    private botName: string = '';
    private sendtMessages: number = 0;
    private mainKeyboard = [
        ['📅 Kalender', '🚒 Verfügbarkeit'],
        ['️▪️ Mehr', '🔥 Einsätze'],
        ['📱 FWmonitor APP']
    ];

    constructor() {
        // Bot erstellen
        this.bot = new Telegraf(config.telegram.bot_token);

        // Bot starten
        this.init();
    }

    private async init() {
        logging.debug(NAMESPACE, 'Initializing Telegram Bot...');
        const botinfo = await this.bot.telegram.getMe();
        this.botName = botinfo.username;
        logging.debug(NAMESPACE, 'Telegram Botname: ' + this.botName);

        // Fehlerausgabe
        this.bot.catch((err) => {
            logging.error(NAMESPACE, 'Telegram Fehler', err);
        });

        // Routen
        this.bot.start(this.bot_start.bind(this));
        // -- Sicherheits Middleware: alle routen abwärts sind geschützt
        this.bot.use(this.bot_securityMiddleware.bind(this));

        // Sichere Routen
        this.bot.hears('📅 Kalender', this.bot_calendar.bind(this));
        this.bot.hears('🚒 Verfügbarkeit', this.bot_verf.bind(this));
        this.bot.hears('▪️ Mehr', this.bot_more.bind(this));
        this.bot.hears('🔥 Einsätze', this.bot_history.bind(this));
        this.bot.hears('📱 FWmonitor APP', this.bot_app_menu.bind(this));

        // Callbacks
        this.bot.on('callback_query', (ctx) => {
            const cbQuerry: any = ctx.callbackQuery;
            if (!cbQuerry.data) throw new Error('callback_query data not availible!');
            const cbArray = String(cbQuerry.data).split(':');
            switch (cbArray[0]) {
                case 'einstell_appLogin':
                    this.bot_app_getLogin(ctx);
                    break;

                case 'showAlarm':
                    this.bot_history_showAlarm(ctx, cbArray[1]);
                    break;
                case 'showStatistik':
                    this.bot_history_showStatistic(ctx);
                    break;
                case 'showEinsatzZeit':
                    this.bot_hostory_time(ctx);
                    break;

                case 'einstell_Kalender':
                    this.bot_more_calendarNotifications(ctx);
                    break;
                case 'einstell_Kalender_set':
                    this.bot_more_calendarNotifications_set(ctx, cbArray[1]);
                    break;

                case 'einstell_Hydrant':
                    this.bot_more_hydrant(ctx);
                    break;

                case 'VerfuegbarJA':
                    this.bot_verf_yes(ctx);
                    break;
                case 'VerfuegbarNEIN':
                    this.bot_verf_no(ctx, cbArray[1]);
                    break;
                case 'VerfuegbarNEINOptionen':
                    this.bot_verf_no_options(ctx);
                    break;
                case 'VerfuegbarZeige':
                    this.bot_verf_show(ctx);
                    break;

                default:
                    break;
            }
        });

        this.bot.on('text', this.bot_default);

        // Bot starten
        this.bot.launch();

        // Enable graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

        globalEvents.on('alarm', this.sendAlarm.bind(this));
        globalEvents.on('calendar-remind', (termin: CalendarElement) => {});
        globalEvents.on('userstatus-change', this.send_verf_status.bind(this));
        globalEvents.on('paperstatus-change', (status: boolean) => {});
        globalEvents.on('softwareinfo', (text: string) => {});
        globalEvents.on('user-created', (name: string, vorname: string) => {});

        logging.debug(NAMESPACE, 'Initializing Telegram Bot... DONE');
    }

    /**
     * Senden einer Message mite rate limiting
     * @param telegramid
     * @param msg
     * @param extra
     */
    private sendMessage(telegramid: string, msg: string, extra?: ExtraReplyMessage) {
        this.sendtMessages++;
        const delay = Math.floor(this.sendtMessages / 30) * 1500;
        setTimeout(() => {
            this.sendtMessages--;
        }, 1000 + delay);
        setTimeout(async () => {
            try {
                this.bot.telegram.sendMessage(telegramid, msg, extra);
            } catch (error) {
                logging.error(NAMESPACE, 'telegramid: ' + telegramid, error);
                logging.error(NAMESPACE, 'sendMessage', error);

                if (error.message.indexOf('blocked') != -1) {
                    const user = await userService.find_by_telegramid(telegramid);
                    if (user) {
                        userService.update_status(user[0].id, UserStatus.TELEGR_BOT_BLOCKED);
                    }
                } else if (error.message.indexOf('disabled') != -2) {
                    const user = await userService.find_by_telegramid(telegramid);
                    if (user) {
                        userService.update_status(user[0].id, UserStatus.TELEGR_USER_DISABLED);
                    }
                }
            }
        }, delay);
    }

    private async bot_start(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_start', { telegramid });

            // Prüfen ob user existiert
            const user = await userService.find_by_telegramid(telegramid);

            if (user && user.length > 0) {
                // User existiert bereits

                // Prüfen ob User bereits freigegeben
                if (user[0].approved == UserApproved.APPROVED) {
                    // User bereits freigegeben
                    ctx.replyWithMarkdown(
                        `Anmeldung erfolgreich: ${user[0].name} ${user[0].vorname}
    *Funktionen:*
    _ - Tastatur unten: Falls diese nicht angezeigt wird, einfach ein ? an den Bot schreiben. _
    _ - Bilder für den Monitor können direkt an den Bot gesendet werden. _`,
                        {
                            ...Markup.keyboard(this.mainKeyboard).resize()
                        }
                    );

                    // User Status auf verfügbar setzen
                    userService.update_status(user[0].id, UserStatus.VERFUEGBAR);
                } else {
                    // User noch nicht freigegeben
                    ctx.replyWithHTML('Warte auf Freigabe (bitte bescheidgeben)', {
                        ...Markup.keyboard([['/start']]).resize()
                    });
                }
            } else {
                // User existiert noch nicht

                // Antwort senden
                ctx.reply(`Telegram Bot der ${config.common.fwName} (Intern)`);

                // Prüfe ob in Telegram Vor- und Nachname eingetragen ist
                if (ctx.from.last_name == undefined || ctx.from.first_name == undefined) {
                    // Antwort senden
                    ctx.replyWithHTML(
                        'Bitte zuerst Vor- und Nachnamen in Telegram eintragen (Unter Einstellungen, ..., Name bearbeiten), dann erneut Start drücken.',
                        {
                            ...Markup.keyboard([['/start']]).resize()
                        }
                    );
                    return;
                }

                // User zur Datenbank hinzufügen
                userService.create(telegramid, ctx.from.last_name, ctx.from.first_name);

                // Antwort senden
                ctx.replyWithHTML('Warte auf Freigabe (bitte bescheidgeben)', {
                    ...Markup.keyboard([['/start']]).resize()
                });
            }
        } catch (error) {
            logging.error(NAMESPACE, 'bot_start error', error);
        }
    }

    private async bot_securityMiddleware(ctx: Context, next: () => Promise<void>) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_securityMiddleware', { telegramid });

            // Prüfe ob User freigegeben
            const user = await userService.find_by_telegramid(telegramid);

            if (!user || user.length < 1 || user[0].approved != UserApproved.APPROVED) {
                logging.info(
                    NAMESPACE,
                    `Unerlaubter Zugriffsveruch durch ${telegramid} ${ctx.from.last_name} ${ctx.from.first_name}`
                );
                return;
            }

            // Status zurücksetzen
            if (
                user[0].status == UserStatus.TELEGR_BOT_BLOCKED ||
                user[0].status == UserStatus.TELEGR_USER_DISABLED
            ) {
                userService.update_status(user[0].id, UserStatus.VERFUEGBAR);
            }

            // Alles OK -> Nächste Route
            await next();
        } catch (error) {
            logging.error(NAMESPACE, 'bot_securityMiddleware error', error);
        }
    }

    // Standardantwort
    private async bot_default(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_unknown', { telegramid });

            ctx.reply('Telegram Bot der' + process.env.FW_NAME_BOT, {
                ...Markup.keyboard(this.mainKeyboard).resize()
            });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_unknown error', error);
        }
    }

    // App
    private async bot_app_menu(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_app_menu', { telegramid });

            console.log(config.app.url + 'app');

            let keyboard = [];
            keyboard.push(Markup.button.callback('🔑 APP Zugang', 'einstell_appLogin'));
            if (config.app.enabled) {
                keyboard.push(Markup.button.url('📱 APP - Link', config.app.url + 'app'));
            }

            ctx.replyWithMarkdown('*📱 FWmonitor APP*', {
                ...Markup.inlineKeyboard(keyboard)
            });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_app_menu error', error);
        }
    }

    private async bot_app_getLogin(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_app_getLogin', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) throw new Error('user not found');

            const { password, hash } = Security.createNewPassword();
            const loginToken = Security.createToken({ id: user[0].id, car: false }, 60);

            userService.update_login(user[0].id, hash);

            ctx.editMessageText('*APP Zugangsdaten: Telegram ID, Passwort*', {
                parse_mode: 'Markdown'
            });

            this.sendMessage(telegramid, '_' + telegramid + '_', {
                parse_mode: 'Markdown'
            });

            await timeout(500);

            let keyboard = [];
            if (config.app.enabled) {
                keyboard.push(
                    Markup.button.url(
                        '📱 Auto - Login',
                        config.app.url + 'app/login?token=' + loginToken.token
                    )
                );
            }

            this.sendMessage(telegramid, '_' + password + '_', {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard(keyboard)
            });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_app_getLogin error', error);
        }
    }

    // History
    private async bot_history(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_history', { telegramid });

            let keyboard = [
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
            logging.error(NAMESPACE, 'bot_history error', error);
        }
    }

    private async bot_history_showAlarm(ctx: Context, data: string) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_history_showAlarm', { telegramid });
            ctx.replyWithChatAction('typing');

            let list = await AlarmService.find({}, 1, Number(data), 'ORDER BY id DESC');
            if (!list || list.length < 1) {
                ctx.replyWithMarkdown('Error: No Alarm found');
                return;
            }

            var d = new Date(list[0].date);
            var time = d.toLocaleTimeString();
            var date = d.toLocaleDateString('de-DE', {
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
            logging.error(NAMESPACE, 'bot_history_showAlarm error', error);
        }
    }

    private async bot_history_showStatistic(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_history_showStatistic', { telegramid });
            ctx.replyWithChatAction('typing');

            const year = new Date().getFullYear();

            let list = await StatisticServise.get(year);
            if (!list || list.length < 1) {
                ctx.replyWithMarkdown('Error: No Statistik found');
                return;
            }

            var str = '';
            var sum = 0;

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
            logging.error(NAMESPACE, 'bot_history_showStatistic error', error);
        }
    }

    private async bot_hostory_time(ctx: Context) {
        try {
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
            const time: any = await StatisticServise.einsatzzeit(user[0].id, year);

            if (!time) {
                ctx.replyWithMarkdown('Error: No Time found');
                return;
            }

            var str = `*⏱️ Einsatzzeit Jahr ${year} :* 
						_${Math.floor(time.time / 60)} h ${time.time % 60} m ( ${time.count} Einsätze )_`;

            ctx.editMessageText(str, {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_hostory_time error', error);
        }
    }

    // Mehr
    private async bot_more(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more', { telegramid });

            let keyboard = [
                Markup.button.callback('📅 Erinnerungen', 'einstell_Kalender'),
                Markup.button.callback('🧯 Hydrant eintragen', 'einstell_Hydrant')
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
            logging.error(NAMESPACE, 'bot_more error', error);
        }
    }

    private async bot_more_calendarNotifications(ctx: Context) {
        try {
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
            logging.error(NAMESPACE, 'bot_more_calendarNotifications error', error);
        }
    }

    private async bot_more_calendarNotifications_set(ctx: Context, value: string) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_calendarNotifications_set', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            if (value == '1') {
                userService.update_notifications_calendar(user[i].id, true);
                ctx.answerCbQuery('📅 Kalender Erinnerungen -> Ein', {
                    show_alert: false
                });
                ctx.editMessageText('📅 Kalender Erinnerungen -> Ein');
            } else {
                userService.update_notifications_calendar(user[i].id, false);
                ctx.answerCbQuery('📅 Kalender Erinnerungen -> Aus', {
                    show_alert: false
                });
                ctx.editMessageText('📅 Kalender Erinnerungen -> Aus');
            }
        } catch (error) {
            logging.error(NAMESPACE, 'bot_more_calendarNotifications_set error', error);
        }
    }

    private async bot_more_hydrant(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_more_hydrant error', error);
        }
    }

    private async bot_more_hydrant_location(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant_location', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_more_hydrant_location error', error);
        }
    }

    private async bot_more_hydrant_location_ok(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant_location_ok', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_more_hydrant_location_ok error', error);
        }
    }

    private async bot_more_hydrant_type(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_more_hydrant_type', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_more_hydrant_type error', error);
        }
    }

    // Verfügbarkeit
    private async bot_verf(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_verf', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            var stat = '🟩';
            if (user[0].status == UserStatus.NICHT_VERFUEGBAR) {
                var bis = '';

                if (user[0].statusUntil != '') {
                    var result = new Date(user[0].statusUntil);
                    var time = result.toLocaleTimeString();
                    var date = result.toLocaleDateString('de-DE', {
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
            logging.error(NAMESPACE, 'bot_verf error', error);
        }
    }

    private async bot_verf_yes(ctx: Context) {
        try {
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
            logging.error(NAMESPACE, 'bot_verf_yes error', error);
        }
    }

    private async bot_verf_no(ctx: Context, value: string) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_verf_no', { telegramid });

            const user = await userService.find_by_telegramid(telegramid);
            if (!user || user.length < 1) {
                ctx.replyWithMarkdown('Error: No User found');
                return;
            }

            let days = parseInt(value, 10);
            let until = new Date();
            until.setDate(until.getDate() + days);

            let time = until.toLocaleTimeString();
            let date = until.toLocaleDateString('de-DE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            let bis = date + ' ' + time;
            if (days == -1) {
                bis = 'unbegrenzt';
                userService.update_status(user[0].id, UserStatus.NICHT_VERFUEGBAR);
            } else {
                userService.update_status(user[0].id, UserStatus.NICHT_VERFUEGBAR, until);
            }
        } catch (error) {
            logging.error(NAMESPACE, 'bot_verf_no error', error);
        }
    }

    private async send_verf_status(userid: number) {
        const user = await userService.find_by_userid(userid);
        if (!user || user.length < 1) {
            throw new Error('Error: No User found');
        }

        if (user[0].status == UserStatus.VERFUEGBAR) {
            this.sendMessage(user[0].telegramid, '🚒 Status -> 🟩  Verfügbar');
        }

        let bis = 'unbegrenzt';
        if (user[0].statusUntil != '') {
            const result = new Date(user[0].statusUntil);
            const time = result.toLocaleTimeString();
            const date = result.toLocaleDateString('de-DE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            let bis = date + ' ' + time;
        }

        if (user[0].status == UserStatus.NICHT_VERFUEGBAR) {
            this.sendMessage(
                user[0].telegramid,
                '🚒 Status -> 🟥  Nicht Verfügbar bis  _' + bis + '_',
                {
                    parse_mode: 'Markdown'
                }
            );
        }
    }

    private async bot_verf_no_options(ctx: Context) {
        try {
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
            logging.error(NAMESPACE, 'bot_verf_no_options error', error);
        }
    }

    private async bot_verf_show(ctx: Context) {
        try {
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
            logging.error(NAMESPACE, 'bot_verf_show error', error);
        }
    }

    // Kalender
    private async bot_calendar(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_calendar', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_calendar error', error);
        }
    }

    private async bot_calendar_full(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_calendar_full', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_calendar_full error', error);
        }
    }

    private async bot_calendar_all(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_calendar_all', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_calendar_all error', error);
        }
    }

    // Alarm
    private async sendAlarm(alarm: AlarmRow) {
        const keyboard = Markup.inlineKeyboard([
            Markup.button.callback('👍 JA!', 'KommenJa'),
            Markup.button.callback('👎 NEIN!', 'KommenNein')
        ]);

        if (!config.alarm.telegram) {
            logging.warn(NAMESPACE, 'Telegrammalarmierung deaktiviert! --> Keine Benachrichtigung');
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

        for (let i = 0; i < users.length; i++) {
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
            text = text.replace(/{{EINSATZMITTEL_EIGEN}}/g, alarm.cars1.replace(/|/g, '\n'));
            text = text.replace(/{{EINSATZMITTEL_ANDERE}}/g, alarm.cars2.replace(/|/g, '\n'));

            const sendFax = text.indexOf('{{FAX}}') != -1 ? true : false;
            text = text.replace(/{{FAX}}/g, '');

            const sendMap = text.indexOf('{{KARTE}}') != -1 ? true : false;
            text = text.replace(/{{KARTE}}/g, '');

            const sendMapEmg = text.indexOf('{{KARTE_EMG}}') != -1 ? true : false;
            text = text.replace(/{{KARTE_EMG}}/g, '');

            const lines = text.split('{{newline}}');

            // Alarmmeldung
            var alarmMessage = '*⚠️ ⚠️ ⚠️    Alarm   ⚠️ ⚠️ ⚠️*';

            // Informationsmeldung
            var tmp = alarm.einsatzstichwort.toLowerCase();
            if (
                tmp == 'inf verkehrssicherung' ||
                tmp == '1nf verkehrssicherung' ||
                tmp == 'sonstiges verkehrssicherung' ||
                tmp == 'inf sicherheitswache' ||
                tmp == '1nf sicherheitswache'
            )
                alarmMessage = '* 🚧   Kein Einsatz   🚧*\n*Verkehrssicherung*';

            // Beginn Telegramnachricht
            this.sendMessage(user.telegramid, '❗  🔻  🔻  🔻  🔻  🔻  🔻  🔻  🔻  ❗');

            await timeout(8000);

            this.sendMessage(user.telegramid, alarmMessage, {
                parse_mode: 'Markdown'
            });

            // Fax PDF
            if (sendFax) {
                await timeout(500);

                if (await fileExists(pdfPath)) {
                    var faxPDF = fs.readFileSync(pdfPath);
                    this.bot.telegram
                        .sendDocument(user.telegramid, {
                            source: faxPDF,
                            filename: pdfPath.split(/[/\\]/g).pop()
                        })
                        .catch((err) => {
                            console.error(
                                '[Telegram] ERROR sendDocument (ChatID ' +
                                    user.telegramid +
                                    '): ' +
                                    err
                            );
                        });
                }
            }

            // Pattern
            for (let i = 0; i < lines.length; i++) {
                lines[i] = text[i].trim();

                await timeout(4000);

                this.sendMessage(user.telegramid, text[i] + ' ', {
                    parse_mode: 'Markdown'
                });
            }

            // Karte
            if (sendMap) {
                await timeout(4000);

                if (alarm.lat != undefined && alarm.lng != undefined && alarm.strasse != '') {
                    this.bot.telegram
                        .sendLocation(user.telegramid, Number(alarm.lat), Number(alarm.lng))
                        .catch((err) => {
                            console.error(
                                '[Telegram] ERROR sendPhoto (ChatID ' +
                                    user.telegramid +
                                    '): ' +
                                    err
                            );
                        });
                } else {
                    this.bot.telegram
                        .sendPhoto(user.telegramid, {
                            source: 'public/images/noMap.png'
                        })
                        .catch((err) => {
                            console.error(
                                '[Telegram] ERROR sendPhoto (ChatID ' +
                                    user.telegramid +
                                    '): ' +
                                    err
                            );
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

                this.sendMessage(
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
            this.sendMessage(user.telegramid, alarmMessage, keyboard);
        }
    }

    private async bot_alarm_yes(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_alarm_yes', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_alarm_yes error', error);
        }
    }

    private async bot_alarm_no(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_alarm_no', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_alarm_no error', error);
        }
    }

    // Bilder
    private async savePicture(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'savePicture', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'savePicture error', error);
        }
    }

    // Druckerinfo
    private async bot_printer_paper(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_printer_paper', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_printer_paper error', error);
        }
    }

    // Softwareinfo
    private async bot_software_info(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_software_info', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_software_info error', error);
        }
    }

    /*
    private async bot_example(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_example', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_example error', error);
        }
    }
    */
}

export default new TelegramBot();
