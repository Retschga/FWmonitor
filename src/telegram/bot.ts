'use-strict';

import { Bot, Context, GrammyError, HttpError, Keyboard, RawApi } from 'grammy';
import { UserApproved, UserStatus } from '../models/user';

import BotAlarm from './bot_alarm';
import BotApp from './bot_app';
import BotCalendar from './bot_calendar';
import BotHistory from './bot_history';
import BotMore from './bot_more';
import BotVerfuegbarkeit from './bot_verfuegbarkeit';
import { EventEmitter } from 'events';
import { Other } from 'grammy/out/core/api';
import axios from 'axios';
import config from '../utils/config';
import diashowService from '../services/diashow';
import fs from 'fs';
import globalEvents from '../utils/globalEvents';
import logging from '../utils/logging';
import { timeout } from '../utils/common';
import userService from '../services/user';

const NAMESPACE = 'TELEGRAM_BOT';

type position = {
    lat: number;
    lng: number;
    accuracy: number;
};
class TelegramBot {
    public bot: Bot;
    private botName: string = '';

    private sendtMessages: number = 0;

    private mainKeyboard = new Keyboard()
        .text('📅 Kalender')
        .text('🚒 Verfügbarkeit')
        .row()
        .text('▪️ Mehr')
        .text('🔥 Einsätze')
        .row()
        .text('📱 FWmonitor APP');

    public inlineKeyboardEvents: EventEmitter = new EventEmitter();

    private botApp: BotApp;
    private botCalendar: BotCalendar;
    private botHistory: BotHistory;
    private botMore: BotMore;
    private botVerfuegbarkeit: BotVerfuegbarkeit;
    private botAlarm: BotAlarm;

    public user_hydrantPicRequested: { [key: number]: number } = {};
    public user_location: { [key: number]: position } = {};

    constructor() {
        // Bot erstellen
        this.bot = new Bot(config.telegram.bot_token);

        this.botApp = new BotApp();
        this.botCalendar = new BotCalendar();
        this.botHistory = new BotHistory();
        this.botMore = new BotMore();
        this.botVerfuegbarkeit = new BotVerfuegbarkeit();
        this.botAlarm = new BotAlarm();
    }

    public async init(): Promise<void> {
        try {
            logging.info(NAMESPACE, 'Initializing Telegram Bot...');

            this.botApp.init(this);
            this.botCalendar.init(this);
            this.botHistory.init(this);
            this.botMore.init(this);
            this.botVerfuegbarkeit.init(this);
            this.botAlarm.init(this);

            // Fehlerausgabe
            this.bot.catch((err) => {
                const ctx = err.ctx;
                logging.error(
                    NAMESPACE,
                    `Telegram Fehler: Error while handling update ${ctx.update.update_id}:`
                );
                const e = err.error;
                if (e instanceof GrammyError) {
                    logging.error(NAMESPACE, 'Error in request:', e.description);
                } else if (e instanceof HttpError) {
                    logging.error(NAMESPACE, 'Could not contact Telegram:', e);
                } else {
                    logging.error(NAMESPACE, 'Unknown error:', e);
                }
            });

            // Routen
            this.bot.command('start', this.bot_start.bind(this));
            // -- Sicherheits Middleware: alle routen abwärts sind geschützt
            this.bot.use(this.bot_securityMiddleware.bind(this));

            // Sichere Routen
            this.bot.hears('📅 Kalender', this.botCalendar.bot_calendar.bind(this));
            this.bot.hears('🚒 Verfügbarkeit', this.botVerfuegbarkeit.bot_verf.bind(this));
            this.bot.hears('▪️ Mehr', this.botMore.bot_more.bind(this));
            this.bot.hears('🔥 Einsätze', this.botHistory.bot_history.bind(this));
            this.bot.hears('📱 FWmonitor APP', this.botApp.bot_app_menu.bind(this));

            // Inline Keyboard Callbacks
            this.bot.on('callback_query', (ctx) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const cbQuerry: any = ctx.callbackQuery;
                if (!cbQuerry.data) throw new Error('callback_query data not availible!');
                const cbArray = String(cbQuerry.data).split(':');
                this.inlineKeyboardEvents.emit(cbArray[0], ctx, cbArray[1]);
            });

            this.bot.on('message:photo', async (ctx) => {
                try {
                    if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

                    const telegramid: string = String(ctx.from?.id);
                    logging.debug(NAMESPACE, 'savePicture', { telegramid });

                    ctx.replyWithChatAction('typing');

                    const imageData = await ctx.getFile();

                    if (!imageData.file_path) return;

                    const d = new Date();
                    const time = d.toLocaleTimeString().replace(/[:]/g, '-');
                    const date = d.toLocaleDateString('de-DE', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    });

                    // Normales Bild
                    let filepath = config.folders.temp;
                    let filename = time + ' - ' + date + ' - ' + imageData.file_path.substr(7);

                    let hydrantenbild = false;
                    // Hydrantenbild
                    if (this.user_hydrantPicRequested[ctx.from.id] == 1) {
                        filepath = config.folders.hydranten;
                        filename =
                            this.user_location[ctx.from.id].lat +
                            ', ' +
                            this.user_location[ctx.from.id].lng +
                            '   ' +
                            time +
                            ' - ' +
                            date +
                            ' - ' +
                            imageData.file_path.substr(7);

                        ctx.reply(
                            'Bitte ein oder mehrere Bilder des Hydranten mit Umgebung senden (  über 📎 Büroklammer Symbol unten ).',
                            { reply_markup: new Keyboard().text('⬅️ Fertig') }
                        );

                        this.user_hydrantPicRequested[ctx.from.id] == 2;
                        hydrantenbild = true;
                    }

                    const writer = fs.createWriteStream(filepath + '/' + filename);

                    axios({
                        method: 'get',
                        url: `https://api.telegram.org/file/bot${config.telegram.bot_token}/${imageData.file_path}`,
                        responseType: 'stream'
                    })
                        .then(async (response) => {
                            await response.data.pipe(writer);
                            await timeout(500);
                            writer.close();
                            writer.end();
                            writer.destroy();
                            await timeout(500);
                            if (!hydrantenbild)
                                diashowService.process_new(config.folders.temp, filename);

                            ctx.reply(`Bild gespeichert.`);
                        })
                        .catch((err) => {
                            logging.exception(NAMESPACE, err);
                            ctx.reply('Bild speichern: Fehler.');
                        });
                } catch (error) {
                    logging.exception(NAMESPACE, error);
                }
            });
            this.bot.on('message:text', this.bot_default.bind(this));

            // Bot starten
            this.bot.start();

            await this.bot.init();
            const botinfo = this.bot.botInfo;
            this.botName = botinfo.username;
            logging.info(NAMESPACE, 'Telegram Botname: ' + this.botName);

            // Enable graceful stop
            process.once('SIGINT', () => this.bot.stop());
            process.once('SIGTERM', () => this.bot.stop());

            globalEvents.on('paperstatus-change', this.bot_printer_paper_info.bind(this));
            globalEvents.on('softwareinfo', this.bot_software_info.bind(this));
            globalEvents.on('user-created', this.bot_user_created_info.bind(this));

            logging.debug(NAMESPACE, 'Initializing Telegram Bot... DONE');

            globalEvents.on('user-approved', async (id: number) => {
                const user = await userService.find_by_userid(id);
                if (user) {
                    this.sendMessage(user[0].telegramid, 'Zugang wurde freigegeben!');
                }
            });
            globalEvents.on('user-deleted', async (id: number) => {
                const user = await userService.find_by_userid(id);
                if (user) {
                    this.sendMessage(user[0].telegramid, 'Zugang wurde gelöscht!');
                }
            });
        } catch (error) {
            logging.error(NAMESPACE, 'Telegram Fehler', error);
        }
    }

    /**
     * Senden einer Message mite rate limiting
     */
    public async sendMessage(
        telegramid: string,
        msg: string,
        extra?: Other<RawApi, 'sendMessage', 'text'>
    ): Promise<number> {
        this.sendtMessages++;
        const delay = Math.floor(this.sendtMessages / 30) * 1150;
        //const delay = 1;
        setTimeout(() => {
            this.sendtMessages--;
        }, 1000 + delay);

        await timeout(delay);

        try {
            return (await this.bot.api.sendMessage(telegramid, msg, extra)).message_id;
        } catch (error) {
            logging.error(NAMESPACE, 'telegramid: ' + telegramid, error);
            logging.error(NAMESPACE, 'sendMessage', error);

            if (!(error instanceof Error)) return -1;

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

        return -1;
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
                    ctx.reply(
                        `Anmeldung erfolgreich: ${user[0].name} ${user[0].vorname}
*Funktionen:*
_ - Tastatur unten: Falls diese nicht angezeigt wird, einfach ein ? an den Bot schreiben. _
_ - Bilder für den Monitor können direkt an den Bot gesendet werden. _`,
                        {
                            parse_mode: 'Markdown',
                            reply_markup: {
                                resize_keyboard: true,
                                keyboard: this.mainKeyboard.build()
                            }
                        }
                    );

                    // User Status auf verfügbar setzen
                    userService.update_status(user[0].id, UserStatus.VERFUEGBAR);
                } else {
                    // User noch nicht freigegeben
                    ctx.reply('Warte auf Freigabe (bitte bescheidgeben)', {
                        reply_markup: {
                            resize_keyboard: true,
                            keyboard: new Keyboard().text('/start').build()
                        }
                    });
                }
            } else {
                // User existiert noch nicht

                // Antwort senden
                ctx.reply(`Telegram Bot der ${config.common.fwName} (Intern)`);

                // Prüfe ob in Telegram Vor- und Nachname eingetragen ist
                if (ctx.from.last_name == undefined || ctx.from.first_name == undefined) {
                    // Antwort senden
                    ctx.reply(
                        'Bitte zuerst Vor- und Nachnamen in Telegram eintragen (Unter Einstellungen, ..., Name bearbeiten), dann erneut Start drücken.',
                        {
                            reply_markup: {
                                resize_keyboard: true,
                                keyboard: new Keyboard().text('/start').build()
                            }
                        }
                    );
                    return;
                }

                // User zur Datenbank hinzufügen
                userService.create(telegramid, ctx.from.last_name, ctx.from.first_name);

                // Antwort senden
                ctx.reply('Warte auf Freigabe (bitte bescheidgeben)', {
                    reply_markup: {
                        resize_keyboard: true,
                        keyboard: new Keyboard().text('/start').build()
                    }
                });
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
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
            logging.exception(NAMESPACE, error);
        }
    }

    // Standardantwort
    private async bot_default(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');

            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_unknown', { telegramid });

            ctx.reply('Telegram Bot der ' + config.common.fwName_short, {
                reply_markup: {
                    resize_keyboard: true,
                    keyboard: new Keyboard().text('/start').build()
                }
            });
            this.user_hydrantPicRequested[ctx.from.id] == 0;
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    // Druckerinfo
    private async bot_printer_paper_info(status: boolean) {
        try {
            const users = await userService.find_all_approved();
            if (!users || users.length < 1) {
                throw new Error('Error: No User found');
            }

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                if (!user.drucker) continue;

                this.sendMessage(
                    user.telegramid,
                    `*Alarmdrucker*\n_Papierstatus: ${status ? 'OK' : 'LEER'}_`,
                    {
                        parse_mode: 'Markdown'
                    }
                );
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    // Softwareinfo
    private async bot_software_info(text: string) {
        try {
            logging.debug(NAMESPACE, 'Sende Softwareinfo');

            const users = await userService.find_all_approved();
            if (!users || users.length < 1) {
                throw new Error('Error: No User found');
            }

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                if (!user.softwareInfo) continue;

                this.sendMessage(user.telegramid, `<b>Softwareinfo:</b>\n<i>${text}</i>`, {
                    parse_mode: 'HTML'
                });
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    // User Created Info
    private async bot_user_created_info(name: string, vorname: string) {
        try {
            const users = await userService.find_all_approved();
            if (!users || users.length < 1) {
                throw new Error('Error: No User found');
            }

            for (let i = 0; i < users.length; i++) {
                const user = users[i];

                if (!user.softwareInfo || !user.admin) continue;

                this.sendMessage(
                    user.telegramid,
                    `<b>Softwareinfo:</b>\n<i>Neuer Benutzer angemeldet: ${name} ${vorname}</i>`,
                    {
                        parse_mode: 'HTML'
                    }
                );
            }
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }
}

export default TelegramBot;
