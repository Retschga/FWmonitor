import { Router, Context, Telegraf, Markup } from 'telegraf';
import { ExtraReplyMessage } from 'telegraf/typings/telegram-types';
import config from './utils/config';
import logging from './utils/logging';
import userService from './services/user';
import { UserStatus, UserApproved } from './models/user';
import * as Security from './utils/security';
import { timeout } from './utils/common';

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
        this.bot.hears('📱 FWmonitor APP', this.bot_app_menu.bind(this));

        // Callbacks
        this.bot.on('callback_query', (ctx) => {
            const cbQuerry: any = ctx.callbackQuery;
            if (!cbQuerry.data) throw new Error('callback_query data not availible!');
            switch (cbQuerry.data) {
                case 'einstell_appLogin':
                    this.bot_app_getLogin(ctx);
                    break;

                default:
                    break;
            }
        });

        //this.bot.on('einstell_appLogin', this.bot_app_getLogin.bind(this));

        // Bot starten
        this.bot.launch();

        // Enable graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

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
                ctx.reply(`Telegram Bot der ${config.telegram.fw_name} (Intern)`);

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

            // Alles OK -> Nächste Route
            await next();
        } catch (error) {
            logging.error(NAMESPACE, 'bot_securityMiddleware error', error);
        }
    }

    private async bot_app_menu(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_app_menu', { telegramid });

            let keyboard = [];
            keyboard.push(Markup.button.callback('🔑 APP Zugang', 'einstell_appLogin'));
            if (config.app.https_enabled) {
                keyboard.push(
                    Markup.button.url('📱 APP - Link', 'https://' + process.env.APP_DNS + '/app')
                );
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

            userService.update_login(user[0].id, hash);

            ctx.editMessageText('*APP Zugangsdaten: Telegram ID, Passwort*', {
                parse_mode: 'Markdown'
            });

            this.sendMessage(telegramid, '_' + telegramid + '_', {
                parse_mode: 'Markdown'
            });

            await timeout(500);

            this.sendMessage(telegramid, '_' + password + '_', {
                parse_mode: 'Markdown'
            });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_app_getLogin error', error);
        }
    }

    /*
    private async bot_app_menu(ctx: Context) {
        try {
            if (!ctx.from?.id) throw new Error('Telegram ID nicht definiert!');
            const telegramid: string = String(ctx.from?.id);
            logging.debug(NAMESPACE, 'bot_securityMiddleware', { telegramid });
        } catch (error) {
            logging.error(NAMESPACE, 'bot_securityMiddleware error', error);
        }
    }
    */
}

export default new TelegramBot();
