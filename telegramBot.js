'use strict';
// Modul Telegram
module.exports = function (_httpServer, destroySession) {

	// ----------------  STANDARD LIBRARIES ---------------- 
	const fs = require("fs");
	const axios = require('axios');
	const debug = require('debug')('telegram');

	// ----------------  TELEGRAM ---------------- 
	const Telegraf = require('telegraf');
	const Router = require('telegraf/router');

	// ----------------  KALENDER/FWVV/Datenbank ---------------- 
	const calendar = require('./calendar')();
	const fwvv = require('./fwvvAnbindung')();
	const db = require('./database')();

	// ---------------- AUTHIFICATION ---------------- 
	const bcrypt = require('bcryptjs');
	const generator = require('generate-password');

	// ---------------- Timeout Funktion ----------------
	function timeout(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}



	// Erstelle Telegram Bot Verbindung
	var bot = new Telegraf(process.env.BOT_TOKEN);

	// ---------------- Fehlerausgabe ----------------
	bot.catch((err) => {
		console.error('[TelegramBot] Telegram Fehler', err)
	});

	// ---------------- Bot Name ----------------
	bot.telegram.getMe().then((botInfo) => {
		bot.options.username = botInfo.username;
		console.log("[TelegramBot] Initialized ", botInfo.username);
	});

	// ---------------- Callback Router der Daten am : teilt ----------------
	const onCallback = new Router(({ callbackQuery }) => {
		if (!callbackQuery.data) {
			return
		}
		const parts = callbackQuery.data.split(':')
		return {
			route: parts[0],
			state: {
				amount: parts[1]
			}
		}
	});
	bot.on('callback_query', onCallback);

	// ---------------- Send Funktion mit Rate Limiting ----------------
	var sendtMessages = 0;
	const sendMessage = function (chatId, text, extra) {
		debug('sendMessage', chatId, text, extra);
		sendtMessages++;
		var delay = Math.floor(sendtMessages / 30) * 1500;

		setTimeout(function () {
			sendtMessages--;
		}, 1000 + delay);

		setTimeout(function () {
			bot.telegram.sendMessage(chatId, text, extra)
				.then(() => {
					// TODO: Setze Bot nicht mehr blockiert
				})
				.catch((err) => {
					console.error("[Telegram] ERROR sendMessage (ChatID " + chatId + "): " + err);
					if (err.message.indexOf("blocked") != -1) {
						db.setUserStatus(chatId, db.USER_STATUS.BOT_BLOCKED, "").then(() => {
							;
						});
					} else if (err.message.indexOf("disabled") != -2) {
						db.setUserStatus(chatId, db.USER_STATUS.BOT_DISABLED, "").then(() => {
							;
						});
					}
				});
		}, delay);

	}

	var mainKeyboard = [
		['📅 Kalender', '🚒 Verfügbarkeit'],
		['️▪️ Mehr', '🔥 Einsätze']
	];

	if (process.env.APP_DNS != "") {
		mainKeyboard.push(['📱 FWmonitor APP']);
	}

	// ---------------- Erste Bot Verbindung ----------------
	bot.start(async (ctx) => {
		try {
			let rows_userById = await db.getUserByTelId(ctx.from.id);
			let user = rows_userById[0];

			// Prüfe ob Benutzer bereits existiert
			if (user != undefined) {

				// Prüfe ob Benutzer bereits freigegeben
				var existing = false;
				if (user.allowed == 1)
					existing = true;

				// Antwort senden
				if (!existing) {
					ctx.reply('Warte auf Freigabe (bitte bescheidgeben)', Telegraf.Extra.HTML().markup((m) =>
						m.keyboard([
							['/start']
						]).resize()
					));
				} else {
					ctx.reply(
						`Anmeldung erfolgreich: ${user.name} ${user.vorname}
*Funktionen:*
_ - Tastatur unten: Falls diese nicht angezeigt wird, einfach ein ? an den Bot schreiben. _
_ - Bilder für den Monitor können direkt an den Bot gesendet werden. _`,
						Telegraf.Extra.markdown().markup((m) =>
							m.keyboard(mainKeyboard).resize()
						));

						await setVervTrue(ctx.from.id);
				}

			} else {

				// Antwort senden
				ctx.reply('Telegram Bot der' + process.env.FW_NAME_BOT);

				// Prüfe ob in Telegram Vor- und Nachname eingetragen ist
				if (ctx.from.last_name == undefined || ctx.from.first_name == undefined) {

					// Antwort senden
					ctx.reply(
						'Bitte zuerst Vor- und Nachnamen in Telegram eintragen (Unter Einstellungen, ..., Name bearbeiten), dann erneut Start drücken.',
						Telegraf.Extra.HTML().markup((m) =>
							m.keyboard([
								['/start']
							]).resize()
						)
					);

				} else {

					// Benutzer zur Datenbank hinzufügen
					db.addUser(ctx.from.id, ctx.from.last_name, ctx.from.first_name);

					// Antwort senden
					ctx.reply(
						'Warte auf Freigabe (bitte bescheidgeben)',
						Telegraf.Extra.HTML().markup((m) =>
							m.keyboard([
								['/start']
							]).resize()
						)
					);

				}

			}
		} catch (error) {
			console.error('[TelegramBot] /start: Fehler', error);
		}

	});


	// ---------------- Sicherheits Middleware  ----------------
	// Sichere alles unterhalb gegen unberechtigten Zugriff
	bot.use(async (ctx, next) => {
		try {

			// Prüfe ob Benutzer freigegeben
			let allowed = await db.isUserAllowed(ctx.from.id);
			if (allowed != true) {
				console.log('[Telegram] Unerlaubter Zugriffsveruch durch %s %s', ctx.from.last_name, ctx.from.first_name)
				return;
			}

//			const start = new Date();
			await next();
//			const ms = new Date() - start;
//			console.log('[Telegram] Response time: %sms', ms);

		} catch (error) {
			console.error('[TelegramBot] Zugriffsschutz Fehler', error);
		}
	});




	// ---------------- APP -----------------
	bot.hears('📱 FWmonitor APP', async (ctx) => {
		try {

			let keyboard = [];

			keyboard.push(Telegraf.Extra.Markup.callbackButton('🔑 APP Zugang', 'einstell_appLogin'));
			if (process.env.APP_DNS != "") {
				keyboard.push(Telegraf.Extra.Markup.urlButton('📱 APP - Link', "https://" + process.env.APP_DNS + "/app"));
			}

			ctx.reply(
				'*📱 FWmonitor APP*',
				Telegraf.Extra.markdown().markup((m) => m.inlineKeyboard(keyboard))
			);
			
		} catch (error) {
			console.error('[TelegramBot] #APP Fehler (.env APP_DNS wahrscheinlich nicht korrekt)');
			console.error('[TelegramBot] #APP Fehler', error);
		}
	});
	onCallback.on('einstell_appLogin', (ctx) => {

		destroySession(ctx.from.id);

		let password = generator.generate({
			length: 10,
			numbers: true,
			excludeSimilarCharacters: true
		});

		bcrypt.hash(password, 10, async (err, hash) => {
			if (err) {

				console.error('[TelegramBot] #einstell_appLogin Fehler', err);
				ctx.answerCbQuery("Fehler: Zugangsdaten konnten nicht erstellt werden.", true);

			} else {

				db.setUserPassword(ctx.from.id, hash);

				ctx.editMessageText(
					'*APP Zugangsdaten: Telegram ID, Passwort*',
					Telegraf.Extra.markdown()
				);

				sendMessage(ctx.from.id, "_" + ctx.from.id + "_", Telegraf.Extra.markdown());

				await timeout(500);

				sendMessage(ctx.from.id, "_" + password + "_", Telegraf.Extra.markdown());

			}
		});

	});

	// ---------------- Historie ----------------
	var user_botIsLoading = {};

	bot.hears('🔥 Einsätze', (ctx) => {
		if (process.env.FWVV != "true") {
			ctx.reply(
				'*🔥 Einsätze*',
				Telegraf.Extra.markdown().markup((m) => m.inlineKeyboard([
					m.callbackButton('📜 Letzte Alarme', 'showAlarm:0'),
					m.callbackButton('📈 Statistik', 'showStatistik')
				]))
			);
		} else {
			ctx.reply(
				'*🔥 Einsätze*',
				Telegraf.Extra.markdown().markup((m) => m.inlineKeyboard([
					m.callbackButton('📜 Letzte Alarme', 'showAlarm:0'),
					m.callbackButton('📈 Statistik', 'showStatistik'),
					m.callbackButton('⏱️ Einsatzzeit', 'showEinsatzZeit')
				]))
			);
		}
	});
	onCallback.on('showAlarm', async (ctx) => {

		// Prüfe ob bereits Daten geladen werden
		if (user_botIsLoading[ctx.from.id] == true) return;
		user_botIsLoading[ctx.from.id] = true;

		try {
			await ctx.editMessageText(
				'*⌛ lädt ⌛*',
				Telegraf.Extra.markdown()
			)
			ctx.replyWithChatAction('typing');

			await timeout(500);

			let rows_alarmList = await db.getAlarmList();

			var alarmNum = parseInt(ctx.state.amount, 10);
			if (ctx.state.amount < 0)
				alarmNum = rows_alarmList.length - 1;
			if (ctx.state.amount >= rows_alarmList.length)
				alarmNum = 0;

			var d = new Date(rows_alarmList[alarmNum].date);
			var options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
			var time = d.toLocaleTimeString();
			var date = d.toLocaleDateString('de-DE', options);

			ctx.editMessageText(
				`*📜 ${date} ${time}*
				_${rows_alarmList[alarmNum].einsatzstichwort}
				${rows_alarmList[alarmNum].schlagwort}
				${rows_alarmList[alarmNum].ort}_`,
				Telegraf.Extra.markdown().markup((m) =>
					m.inlineKeyboard([
						m.callbackButton('<', 'showAlarm:' + (alarmNum - 1)),
						m.callbackButton('>', 'showAlarm:' + (alarmNum + 1))
					])
				)
			)

			user_botIsLoading[ctx.from.id] = false;

		} catch (error) {
			console.error('[TelegramBot] #showAlarm Fehler', error);
			user_botIsLoading[ctx.from.id] = false;
		}

	});
	onCallback.on('showStatistik', async (ctx) => {
		try {

			let rows_statistik = await db.getStatistik();

			var d = new Date();
			var options = { year: 'numeric' };
			var date = d.toLocaleDateString('de-DE', options);

			var str = ""
			var sum = 0;

			rows_statistik.forEach((element) => {
				if (element.number < 10)
					str += "0";

				str += element.number;

				sum += parseInt(element.number);

				if (element.einsatzstichwort != "")
					str += " - " + element.einsatzstichwort + "\n";
				else
					str += " - kein Stichwort\n";
			});

			str += "_\n";

			str = `*📈 Einsätze Jahr ${date} ( ${sum} )*_\n` + str;

			ctx.editMessageText(
				str,
				Telegraf.Extra.markdown()
			);

		} catch (error) {
			console.error('[TelegramBot] #showStatistik Fehler', error);
		}
	});
	onCallback.on('showEinsatzZeit', async (ctx) => {

		// Prüfe ob bereits Daten geladen werden
		if (user_botIsLoading[ctx.from.id] == true) return;
		user_botIsLoading[ctx.from.id] = true;

		try {
			
			await ctx.editMessageText(
				"*⌛ lädt ⌛*",
				Telegraf.Extra.markdown()
			);
			ctx.replyWithChatAction('typing');

			let responseFwvv = await fwvv.getEinsatzZeit(ctx.from.last_name, ctx.from.first_name)

			var d = new Date();
			var options = { year: 'numeric' };
			var date = d.toLocaleDateString('de-DE', options);

			var str = `*⏱️ Einsatzzeit Jahr ${date} :* 
						_${Math.floor(responseFwvv[0] / 60)} h ${responseFwvv[0] % 60} m ( ${responseFwvv[1]} Einsätze )_`;

			ctx.editMessageText(
				str,
				Telegraf.Extra.markdown()
			);

			user_botIsLoading[ctx.from.id] = false;


		} catch (error) {
			console.error('[TelegramBot] #showStatistik Fehler', error);
			ctx.editMessageText(
				"Fehler: Daten konnten nicht geladen werden.",
				Telegraf.Extra.markdown()
			);
			user_botIsLoading[ctx.from.id] = false;
		}
	});


	// ---------------- Mehr ---------------- 
	bot.hears('️▪️ Mehr', async (ctx) => {
		try {

			let rows_userById = await db.getUserByTelId(ctx.from.id);

			// Tastatur erstellen
			var keyboard;
			if (rows_userById[0].admin == 1) {
				keyboard = [
//					Telegraf.Extra.Markup.callbackButton('👤 Benutzer', 'einstell_Benutzer:0'),
					Telegraf.Extra.Markup.callbackButton('📅 Erinnerungen', 'einstell_Kalender'),
					Telegraf.Extra.Markup.callbackButton('🧯 Hydrant eintragen', 'einstell_Hydrant'),
//					Telegraf.Extra.Markup.urlButton('🗺️ Karte', 'https://wambachers-osm.website/emergency/#zoom=12&lat=47.7478&lon=11.8824&layer=Mapbox%20Streets&overlays=FFTTFTFFFFFT'),
					Telegraf.Extra.Markup.urlButton('🗺️ Karte', 'http://www.openfiremap.org/?zoom=13&lat=47.74236&lon=11.90217&layers=B0000T')
				];
			} else {
				keyboard = [
					Telegraf.Extra.Markup.callbackButton('📅 Erinnerungen', 'einstell_Kalender'),
					Telegraf.Extra.Markup.callbackButton('🧯 Hydrant eintragen', 'einstell_Hydrant'),
//					Telegraf.Extra.Markup.urlButton('🗺️ Karte', 'https://wambachers-osm.website/emergency/#zoom=12&lat=47.7478&lon=11.8824&layer=Mapbox%20Streets&overlays=FFTTFTFFFFFT'),
					Telegraf.Extra.Markup.urlButton('🗺️ Karte', 'http://www.openfiremap.org/?zoom=13&lat=47.74236&lon=11.90217&layers=B0000T')
				];
			}

			// Antwort senden
			ctx.reply(
				'*️▪️ Mehr:*',
				Telegraf.Extra.markdown().markup((m) => m.inlineKeyboard(keyboard, { columns: 2 }))
			)

		} catch (error) {
			console.error('[TelegramBot] #Mehr Fehler', error);
		}
	});
	onCallback.on('einstell_Kalender', (ctx) => {
		ctx.editMessageText(
			'📅 Kalender Erinnerungen',
			Telegraf.Extra.markup((m) => m.inlineKeyboard([
				m.callbackButton('An', 'einstell_Kalender_set:1'),
				m.callbackButton('Aus', 'einstell_Kalender_set:0')
			]))
		);
	});
	onCallback.on('einstell_Kalender_set', async (ctx) => {
		var userid = ctx.from.id;
		var val = ctx.state.amount;

		try {

			await db.changeUserReminders(userid, val);

			if (val == 1) {
				ctx.answerCbQuery("📅 Kalender Erinnerungen -> Ein", false);
				ctx.editMessageText("📅 Kalender Erinnerungen -> Ein");
			}
			else {
				ctx.answerCbQuery("📅 Kalender Erinnerungen -> Aus", false);
				ctx.editMessageText("📅 Kalender Erinnerungen -> Aus");
			}

		} catch (error) {
			console.error('[TelegramBot] #einstell_Kalender_set Fehler', error);
		}
	});
	
	onCallback.on('einstell_Benutzer', async (ctx) => {
		try {

			let rows_allUsers = await db.getUserAll();

			var usernum = parseInt(ctx.state.amount, 10);
			if (ctx.state.amount < 0)
				usernum = rows_allUsers.length - 1;
			if (ctx.state.amount >= rows_allUsers.length)
				usernum = 0;
			var grupp = rows_allUsers[usernum].group;
			if (grupp == 1)
				grupp = "Standard";
			if (rows_allUsers[usernum].allowed == 1) {
				ctx.editMessageText(
					'Benutzer: ' + rows_allUsers[usernum].name + " " + rows_allUsers[usernum].vorname + " \nGruppe: " + grupp,
					Telegraf.Extra.markup((m) =>
						m.inlineKeyboard([
							m.callbackButton('<', 'einstell_Benutzer:' + (usernum - 1)),
							m.callbackButton('>', 'einstell_Benutzer:' + (usernum + 1)),
							m.callbackButton('🚫 Löschen', 'einstell_Benutzer_deletefrage:' + rows_allUsers[usernum].id + "-" + rows_allUsers[usernum].id),
							m.callbackButton('Gruppe: Standard', 'einstell_Benutzer_gruppe:' + rows_allUsers[usernum].id + "-" + rows_allUsers[usernum].id + "-1"),
							m.callbackButton('Gruppe: 1', 'einstell_Benutzer_gruppe:' + rows_allUsers[usernum].id + "-" + rows_allUsers[usernum].id + "-2"),
							m.callbackButton('Gruppe: 2', 'einstell_Benutzer_gruppe:' + rows_allUsers[usernum].id + "-" + rows_allUsers[usernum].id + "-3"),
							m.callbackButton('Gruppe: 3', 'einstell_Benutzer_gruppe:' + rows_allUsers[usernum].id + "-" + rows_allUsers[usernum].id + "-4"),
							m.callbackButton('Gruppe: 4', 'einstell_Benutzer_gruppe:' + rows_allUsers[usernum].id + "-" + rows_allUsers[usernum].id + "-5")

						], { columns: 3 })
					)
				)
			} else {
				ctx.editMessageText(
					'Benutzer: ' + rows_allUsers[usernum].name + " " + rows_allUsers[usernum].vorname,
					Telegraf.Extra.markup((m) =>
						m.inlineKeyboard([
							m.callbackButton('<', 'einstell_Benutzer:' + (usernum - 1)),
							m.callbackButton('>', 'einstell_Benutzer:' + (usernum + 1)),
							m.callbackButton('✔️ Freigeben', 'einstell_Benutzer_allow:' + rows_allUsers[usernum].id + "-" + rows_allUsers[usernum].id),
							m.callbackButton('🚫 Löschen', 'einstell_Benutzer_delete:' + rows_allUsers[usernum].id + "-" + rows_allUsers[usernum].id)
						], { columns: 2 })
					)
				)
			}

		} catch (error) {
			console.error('[TelegramBot] #einstell_Benutzer Fehler', error);
		}
	});
	onCallback.on('einstell_Benutzer_allow', (ctx) => {
		var userid = parseInt(ctx.state.amount.split("-")[0], 10);
		var usernum = ctx.state.amount.split("-")[1];

		ctx.editMessageText('Aktiviert!', Telegraf.Extra.markup((m) =>
			m.inlineKeyboard([
				m.callbackButton('OK', 'einstell_Benutzer:' + (usernum))
			], { columns: 3 }))
		);

		allowUser(userid)
			.catch((err) => { console.error('[TelegramBot] Datenbank Fehler', err) });
	});
	onCallback.on('einstell_Benutzer_deletefrage', (ctx) => {
		var usernum = ctx.state.amount.split("-")[1];

		ctx.editMessageText('Sicher?', Telegraf.Extra.markup((m) =>
			m.inlineKeyboard([
				m.callbackButton('Ja', 'einstell_Benutzer_delete:' + (ctx.state.amount)),
				m.callbackButton('Nein', 'einstell_Benutzer:' + (usernum))
			]))
		);
	});
	onCallback.on('einstell_Benutzer_delete', (ctx) => {
		var userid = parseInt(ctx.state.amount.split("-")[0], 10);
		var usernum = ctx.state.amount.split("-")[1];

		ctx.editMessageText('Gelöscht!', Telegraf.Extra.markup((m) =>
			m.inlineKeyboard([
				m.callbackButton('OK', 'einstell_Benutzer:' + (usernum))
			]))
		);

		removeUser(userid)
			.catch((err) => { console.error('[TelegramBot] Datenbank Fehler', err) });
	});
	onCallback.on('einstell_Benutzer_gruppe', (ctx) => {
		var userid = parseInt(ctx.state.amount.split("-")[0], 10);
		var usernum = ctx.state.amount.split("-")[1];
		var group = ctx.state.amount.split("-")[2];

		changeUserGroup(userid, group)
			.then(() => {
				ctx.editMessageText('Gruppe geändert!', Telegraf.Extra.markup((m) =>
					m.inlineKeyboard([
						m.callbackButton('OK', 'einstell_Benutzer:' + (usernum))
					])));
			})
			.catch((err) => { console.error('[TelegramBot] Datenbank Fehler', err) });
	});
	
	/**
	 * Gibt einen Benutzer frei
	 * @param {Integer} userid 
	 */
	async function allowUser(userid) {
		debug('allowUser', userid);
		try {

			await db.activateUser(userid);
			let rows_userByRowNum = await db.getUserByRowNum(userid);
			let user = rows_userByRowNum[0]; 

			bot.telegram.sendMessage(
				user.telegramid,
				'Benutzer freigeschaltet! \n Für die FWmonitor APP: siehe "Mehr"',
				Telegraf.Extra.HTML().markup((m) =>
					m.keyboard(mainKeyboard).resize()
				)
			);

		} catch (error) {
			console.error('[TelegramBot] allowUser() Fehler', error);
		}
	}
	/**
	 * Entfernt einen Benutzer
	 * @param {Integer} userid 
	 */
	async function removeUser(userid) {
		debug('removeUser', userid);
		try {
			let rows_userByRowNum = await db.getUserByRowNum(userid);
			let user = rows_userByRowNum[0];
			
			await db.deleteUser(userid);
			destroySession(user.telegramid);
			
		} catch (error) {
			console.error('[TelegramBot] removeUser() Fehler', error);
			return;
		}		

		try {
			await bot.telegram.sendMessage(
				user.telegramid,
				'Benutzer gelöscht!',
				Telegraf.Extra.HTML().markup((m) =>
					m.keyboard([
						['/start']
					]).resize()
				)
			);
		} catch (error) {
			console.error('[TelegramBot] removeUser() Fehler', error);
		}
	}


	// ---------------- Hydranten ----------------
	var user_location = {};
	var user_hydrantPicRequested = {};

	onCallback.on('einstell_Hydrant', (ctx) => {
		ctx.editMessageText('🧯 Hydrant eintragen');
		ctx.reply(
			'GPS einschalten, Handy über Hydranten halten, Knopf drücken',
			Telegraf.Extra.markup((markup) => {
				return markup.resize()
					.keyboard([
						markup.locationRequestButton('📍 Position senden'),
						'⬅️ zurück'
					], { columns: 2 })
					.oneTime()
			})
		);
	});

	bot.on('location', async (ctx) => {
		ctx.reply(
			'Position empfangen.',
			Telegraf.Extra.markup((m) => m.removeKeyboard())
		);

		await timeout(500);

		ctx.reply(
			'Position OK? ',
			Telegraf.Extra.markup((m) => m.inlineKeyboard([
				m.callbackButton('Ja', 'hydrPosOK:' + ctx.message.message_id),
				m.callbackButton('Nein', 'einstell_Hydrant')
			]))
		);

		user_location[ctx.from.id] = ctx.message.location;
	});
	onCallback.on('hydrPosOK', (ctx) => {
		var message_id = ctx.state.amount;

		ctx.editMessageText(
			'Art des Hydranten?: ',
			Telegraf.Extra.markup((m) => m.inlineKeyboard([
				m.callbackButton('📍 U-Flur', 'hydrTyp:Unterflur-' + message_id),
				m.callbackButton('📍 O-Flur', 'hydrTyp:Oberflur-' + message_id),
				m.callbackButton('📍 Saugstelle', 'hydrTyp:Saugstelle-' + message_id),
				m.callbackButton('📍 Becken', 'hydrTyp:Becken-' + message_id),
			]))
		);
	});
	onCallback.on('hydrTyp', (ctx) => {
		var typ = ctx.state.amount.split("-")[0];
		var message_id = ctx.state.amount.split("-")[1];

		ctx.editMessageText('Typ: ' + typ);

		ctx.reply('Bitte ein Bild mit der Umgebung des Hydranten senden zur besseren Lokalisierung (  über 📎 Büroklammer Symbol unten ).');
		user_hydrantPicRequested[ctx.from.id] = true;

		var d = new Date();
		var options = { year: 'numeric', month: '2-digit', day: '2-digit' };
		var time = d.toLocaleTimeString();
		var date = d.toLocaleDateString('de-DE', options);

		var feature = {
			"type": "Feature",
			"properties": {
				"art": typ,
				"erfassung": time + " - " + date,
				"melder": ctx.from.last_name + " " + ctx.from.first_name
			},
			"geometry": {
				"type": "Point",
				"coordinates": [user_location[ctx.from.id].longitude, user_location[ctx.from.id].latitude]
			}
		};

		var geoHeader = { "type": "FeatureCollection", "features": [feature] };
		try {
			fs.writeFile(
				'Hydranten/' + user_location[ctx.from.id].latitude.toString() + ", " + user_location[ctx.from.id].longitude.toString() + '.geojson',
				JSON.stringify(geoHeader),
				(err) => {
					if (err) throw err;
				}
			)
		} catch (error) {
			console.error('[TelegramBot] Hydrant: Datei Fehler: Datei schreiben', error);
		}

		try {
			fs.appendFile(
				'Hydranten/Hydrantenpositionen.txt', "\n" + time + " - " + date + "    " +
				ctx.from.last_name + " " + ctx.from.first_name + " - " + user_location[ctx.from.id].latitude + ", " +
				user_location[ctx.from.id].longitude + " - " + typ,
				function (err) {
					if (err) throw err;
					//locationList[ctx.from.id] = "";
				}
			)
		} catch (error) {
			console.error('[TelegramBot] Hydrant: Datei Fehler: Datei schreiben', error);
		}

		
		debug("[Hydrant]", ctx.from, user_location[ctx.from.id], typ);
	});


	// ---------------- Verfügbarkeit ----------------
	bot.hears('🚒 Verfügbarkeit', async (ctx) => {
		try {

			let rows_userStatus = await db.getUserStatusByTelId(ctx.from.id);

			var stat = "🟩";
			if (rows_userStatus[0].status == 2) {

				var bis = "";

				if (rows_userStatus[0].statusUntil != "") {
					var result = new Date(rows_userStatus[0].statusUntil);
					var options = { year: 'numeric', month: '2-digit', day: '2-digit' };
					var time = result.toLocaleTimeString();
					var date = result.toLocaleDateString('de-DE', options);
					bis = "bis _" + date + " " + time + "_";
				}

				stat = "🟥" + "  " + bis;
			}

			ctx.reply(
				'*🚒 Verfügbarkeit: *' + stat,
				Telegraf.Extra.markdown().markup((m) =>
					m.inlineKeyboard([
						m.callbackButton('🟩  Verfügbar', 'VerfuegbarJA'),
						m.callbackButton('🟥  Nicht Verfügbar', 'VerfuegbarNEINOptionen'),
						m.callbackButton('📜 Anzeigen', 'VerfuegbarZeige')
					], { columns: 2 })
				)
			);

		} catch (error) {
			console.error('[TelegramBot] #Verfügbarkeit Fehler', error);
		}
	});
	onCallback.on('VerfuegbarJA', async (ctx) => {

		await setVervTrue(ctx.from.id);

		ctx.answerCbQuery("🚒 Status -> 🟩  Verfügbar", false);
		ctx.editMessageText("🚒 Status -> 🟩  Verfügbar");
	});
	onCallback.on('VerfuegbarNEINOptionen', (ctx) => {
		ctx.editMessageText(
			'*🟥 Dauer (Tage):*',
			Telegraf.Extra.markdown().markup((m) =>
				m.inlineKeyboard([
					m.callbackButton('1', 'VerfuegbarNEIN:1'),
					m.callbackButton('2', 'VerfuegbarNEIN:2'),
					m.callbackButton('3', 'VerfuegbarNEIN:3'),
					m.callbackButton('4', 'VerfuegbarNEIN:4'),
					m.callbackButton('5', 'VerfuegbarNEIN:5'),
					m.callbackButton('6', 'VerfuegbarNEIN:6'),
					m.callbackButton('7', 'VerfuegbarNEIN:7'),
					m.callbackButton('14', 'VerfuegbarNEIN:14'),
					m.callbackButton('🔁 Unbegrenzt', 'VerfuegbarNEIN:-1'),
				], { columns: 4 })
			)
		);
	});
	onCallback.on('VerfuegbarNEIN', async (ctx) => {

		var days = parseInt(ctx.state.amount, 10);
		var result = new Date();
		result.setDate(result.getDate() + days);
		var options = { year: 'numeric', month: '2-digit', day: '2-digit' };
		var time = result.toLocaleTimeString();
		var date = result.toLocaleDateString('de-DE', options);
		var bis = date + " " + time;
		if (days == -1) {
			bis = "unbegrenzt";
			result = "";
		}

		await setVervFalse(ctx.from.id, result);

		ctx.answerCbQuery("🚒 Status -> 🟥  Nicht Verfügbar bis  " + bis, false);
		ctx.editMessageText("🚒 Status -> 🟥  Nicht Verfügbar bis  _" + bis + "_", Telegraf.Extra.markdown().markup());

	});
	onCallback.on('VerfuegbarZeige', async (ctx) => {
		try {

			let rows_allUsers = await db.getUserAll();
			var st_verv = "";
			var st_vervNum = 0;
			var st_nichtverf = "";
			var st_nichtverfNum = 0;

			rows_allUsers.forEach(function (user) {
				if (user.statusHidden == db.USER_STATUSHIDDEN.HIDDEN) return;
				if (user.status == db.USER_STATUS.VERV) {
					st_verv += (user.name + " " + user.vorname) + "\n";
					st_vervNum += 1;
				}
				else if (user.status == db.USER_STATUS.NVERV) {
					st_nichtverf += (user.name + " " + user.vorname) + "\n";
					st_nichtverfNum += 1;
				}
			});

			ctx.editMessageText(
				`*🟩  Verfügbar: (${st_vervNum} )*
_${st_verv}_
*🟥  Nicht Verfügbar: ( ${st_nichtverfNum} )*
_${st_nichtverf}_`,
				Telegraf.Extra.markdown()
			);

			db.addStatistik(db.STATISTIK.SHOW_VERV, ctx.from.id);

		} catch (error) {
			console.error('[TelegramBot] #VerfuegbarZeige Fehler', error);
		}
	});

	// Verfügbarkeitsintervall
	var interval = setInterval(async () => {
		function addZero(i) {
			if (i < 10) {
			  i = "0" + i;
			}
			return i;
		}

		debug('intervalVerfügbarkeit');
		try {

			let rows_allUserStatus = await db.getUserStatusAll();

			if (rows_allUserStatus == undefined) {
				console.error("Interval Error: Keine Zeile zurückgegeben");
			} else {
				let dateNow = new Date();
				let dateNow_h = addZero(dateNow.getHours());
				let dateNow_m = addZero(dateNow.getMinutes());
				let dateNow_d = dateNow.getDay();
				
				rows_allUserStatus.forEach(async (element) => {					
					if (element.statusUntil != "") {
						let dateUntil = new Date(element.statusUntil);
						if (dateUntil < dateNow) {
							await setVervTrue(element.telegramid);
							bot.telegram.sendMessage(element.telegramid, '🚒 Status -> 🟩  Verfügbar', Telegraf.Extra.markdown());
						}
					} else if(
						element.statusPlans != "" 
						&& element.statusPlans != null
						&& element.status != 2
					) {
						let el = JSON.parse(element.statusPlans);
						el.plans.forEach(async (plan) => {
							if(plan.weekdays[dateNow_d] == true
								&& plan.active == true
								&& plan.from == (dateNow_h + ':' + dateNow_m) 
							) {
								let dateUntil = new Date();
								dateUntil.setHours(plan.to.split(':')[0]);
								dateUntil.setMinutes(plan.to.split(':')[1]);
								await setVervFalse(element.telegramid, dateUntil);
								bot.telegram.sendMessage(element.telegramid, '🚒 Status ->  Nicht Verfügbar', Telegraf.Extra.markdown());
							}
						});
					}
				});
			}

		} catch (error) {
			console.error('[TelegramBot] Interval Verfügbarkeit Fehler', error);
		}
	}, 35000);

	/**
	 * Setze User auf Verfügbar
	 * @param {Integer} telID 
	 */
	async function setVervTrue(telID) {
		debug('setVervTrue', telID);
		try {

			await db.setUserStatus(telID, 1, "");

			let rows_userByID = await db.getUserByTelId(telID);
			let user = rows_userByID[0];

			if (user != undefined && user.statusHidden != 1) {
				_httpServer[0].wss.broadcast(
					'st_verf', user.name + " " + user.vorname + "%" + user.stAGT +
					"," + user.stGRF + "," + user.stMA + "," + user.stZUGF
				);
			}

			db.addStatistik(db.STATISTIK.SET_VERV, telID);

		} catch (error) {
			console.error('[TelegramBot] setVervTrue() Fehler', error);
		}
	}

	/**
	 * Setze User auf Nicht Verfügbar
	 * @param {Integer} telID 
	 * @param {Date} until 
	 */
	async function setVervFalse(telID, until) {
		debug('setVervFalse', telID);
		try {

			if(!until) until = "";

			await db.setUserStatus(telID, db.USER_STATUS.NVERV, until);

			let rows_userById = await db.getUserByTelId(telID);
			let user = rows_userById[0];
			if (user != undefined && user.statusHidden != 1) {
				_httpServer[0].wss.broadcast(
					'st_nichtverf', user.name + " " + user.vorname + "%" + user.stAGT +
					"," + user.stGRF + "," + user.stMA + "," + user.stZUGF
				);
			}

			db.addStatistik(db.STATISTIK.SET_VERV, telID);

		} catch (error) {
			console.error('[TelegramBot] setVervFalse() Fehler', error);
		}
	}


	// ---------------- Alarm ----------------
	var extra =
		Telegraf.Extra.markdown().markup((m) =>
			m.inlineKeyboard([
				m.callbackButton('👍 JA!', 'KommenJa'),
				m.callbackButton('👎 NEIN!', 'KommenNein'),
				m.callbackButton('🕖 SPÄTER!', 'KommenSpäter')
			])
		);

	async function sendAlarm(
		EINSATZSTICHWORT,
		SCHLAGWORT,
		OBJEKT,
		STRASSE,
		ORTSTEIL,
		ORT,
		BEMERKUNG,
		EINSATZMITTEL_EIGEN,
		EINSATZMITTEL_ANDERE,
		lat,
		lng,
		filePath
	) {
		try {

			if (process.env.BOT_SENDALARM != "true") {
				debug("[TelegramBot] Telegram Alamierung deaktiviert -> Kein Alarmtelegram");
				return;
			}
			debug("[TelegramBot] Sende Alarm...");

			let rows_allowedUsers = await db.getUserAllowed();

			rows_allowedUsers.forEach(async (element) => {

				// Gruppenpattern
				var text = element.pattern;
				text = text.replace(/{{EINSATZSTICHWORT}}/g, EINSATZSTICHWORT);
				text = text.replace(/{{SCHLAGWORT}}/g, SCHLAGWORT);
				text = text.replace(/{{OBJEKT}}/g, OBJEKT);
				text = text.replace(/{{STRASSE}}/g, STRASSE);
				text = text.replace(/{{ORTSTEIL}}/g, ORTSTEIL);
				text = text.replace(/{{ORT}}/g, ORT);
				text = text.replace(/{{BEMERKUNG}}/g, BEMERKUNG);
				text = text.replace(/{{EINSATZMITTEL_EIGEN}}/g, EINSATZMITTEL_EIGEN.replace(/,/g, "\n"));
				text = text.replace(/{{EINSATZMITTEL_ANDERE}}/g, EINSATZMITTEL_ANDERE.replace(/,/g, "\n"));

				var sendFax = text.indexOf('{{FAX}}') != -1 ? true : false;
				text = text.replace(/{{FAX}}/g, "");

				var sendMap = text.indexOf('{{KARTE}}') != -1 ? true : false;
				text = text.replace(/{{KARTE}}/g, "");

				var sendMapEmg = text.indexOf('{{KARTE_EMG}}') != -1 ? true : false;
				text = text.replace(/{{KARTE_EMG}}/g, "");

				text = text.split("{{newline}}");


				// Alarmmeldung
				var alarmMessage = '*⚠️ ⚠️ ⚠️    Alarm   ⚠️ ⚠️ ⚠️*';
				var delay = 0;

				// Informationsmeldung
				var tmp = EINSATZSTICHWORT.toLowerCase();
				if (tmp == 'inf verkehrssicherung' ||
					tmp == '1nf verkehrssicherung' ||
					tmp == 'sonstiges verkehrssicherung' ||
					tmp == 'inf sicherheitswache' ||
					tmp == '1nf sicherheitswache')
					alarmMessage = '* 🚧   Kein Einsatz   🚧*\n*Verkehrssicherung*';

				// Beginn Telegramnachricht
				sendMessage(element.telegramid, '❗  🔻  🔻  🔻  🔻  🔻  🔻  🔻  🔻  ❗', Telegraf.Extra.markdown());

				await timeout(8000);

				sendMessage(element.telegramid, alarmMessage, Telegraf.Extra.markdown());


				// Fax PDF
				if (sendFax) {

					await timeout(500);

					var filePath1 = filePath.replace(/.txt/g, ".pdf");
					fs.stat(filePath1, function (err, stat) {
						if (err == null) {
							var faxPDF = fs.readFileSync(filePath1);
							bot.telegram.sendDocument(element.telegramid, { source: faxPDF, filename: filePath1.split(/[/\\]/g).pop() })
								.catch((err) => {
									console.error("[Telegram] ERROR sendDocument (ChatID " + element.telegramid + "): " + err);
								});
						} else {
							var filePath2 = filePath.replace(/.txt/g, ".tif");
							fs.stat(filePath2, function (err, stat) {
								if (err == null) {
									bot.telegram.sendPhoto(element.telegramid, { source: filePath2 })
										.catch((err) => {
											console.error("[Telegram] ERROR sendPhoto (ChatID " + element.telegramid + "): " + err);
										});
								} else {
									console.error("[Telegram] Error: PDF/TIFF nicht gefunden.");
								}
							});

						}
					});
				}

				// Pattern
				var arrayLength = text.length;
				var i = 0;
				for (i = 0; i < arrayLength; i++) {
					text[i] = text[i].trim();

					await timeout(4000);

					sendMessage(element.telegramid, text[i] + " ", Telegraf.Extra.markdown());
				}

				// Karte
				if (sendMap) {
					await timeout(4000);

					if (lat != undefined && lng != undefined && STRASSE != "") {
						bot.telegram.sendLocation(element.telegramid, lat, lng)
							.catch((err) => {
								console.error("[Telegram] ERROR sendPhoto (ChatID " + element.telegramid + "): " + err);
							});
					} else {
						bot.telegram.sendPhoto(element.telegramid, { source: 'public/images/noMap.png' })
							.catch((err) => {
								console.error("[Telegram] ERROR sendPhoto (ChatID " + element.telegramid + "): " + err);
							});
					}

				}
				if (sendMapEmg && lat != undefined && lng != undefined && STRASSE != "") {

					await timeout(500);

					sendMessage(
						element.telegramid,
						//	[- Link Karte](https://wambachers-osm.website/emergency/#zoom=18&lat=${lat}&lon=${lng}&layer=Mapbox%20Streets&overlays=FFTTFTFFFFFT)
						`*Hydrantenkarten:*							
							[- Link Karte](http://www.openfiremap.org/?zoom=17&lat=${lat}&lon=${lng}&layers=B0000T)`,
						Telegraf.Extra.markdown()
					);

				}

				// Komme JaNein
//				await timeout(4000);
//				sendMessage(element.telegramid, 'Komme:', extra);

				//Alarmmeldung
				await timeout(4000);
				sendMessage(element.telegramid, alarmMessage, extra/*Telegraf.Extra.markdown()*/);

			});

		} catch (error) {
			console.error('[TelegramBot] sendAlarm() Fehler', error);
		}

	}
	onCallback.on('KommenNein', async (ctx) => {
		try {

			ctx.answerCbQuery("Status -> 👎  Kommen: Nein", true);
			ctx.editMessageText("Status -> Kommen: Nein", extra);

			let rows_userById = await db.getUserByTelId(ctx.from.id);
			let user = rows_userById[0];
			if (user != undefined) {
				_httpServer[0].wss.broadcast(
					'st_nicht', user.name + " " + user.vorname + "%" + user.stAGT +
					"," + user.stGRF + "," + user.stMA + "," + user.stZUGF
				);
			}
			

		} catch (error) {
			console.error('[TelegramBot] #KommenNein Fehler', error);
		}
	});
	onCallback.on('KommenJa', async (ctx) => {
		try {

			ctx.answerCbQuery("Status -> 👍  Kommen: Ja", true);
			ctx.editMessageText("Status -> Kommen: Ja", extra);

			let rows_userById = await db.getUserByTelId(ctx.from.id);
			let user = rows_userById[0];
			if (user != undefined) {
				_httpServer[0].wss.broadcast(
					'st_komme', user.name + " " + user.vorname + "%" + user.stAGT +
					"," + user.stGRF + "," + user.stMA + "," + user.stZUGF
				);
			}

		} catch (error) {
			console.error('[TelegramBot] #KommenJa Fehler', error);
		}
	});
	onCallback.on('KommenSpäter', async (ctx) => {
		try {

			ctx.answerCbQuery("Status -> 🕖  Kommen: Später", true);
			ctx.editMessageText("Status -> Kommen: Später", extra);

			let rows_userById = await db.getUserByTelId(ctx.from.id);
			let user = rows_userById[0];
			if (user != undefined) {
				_httpServer[0].wss.broadcast(
					'st_später', user.name + " " + user.vorname + "%" + user.stAGT +
					"," + user.stGRF + "," + user.stMA + "," + user.stZUGF
				);
			}

		} catch (error) {
			console.error('[TelegramBot] #KommenSpäter Fehler', error);
		}
	});


	// ---------------- Nachricht an alle ----------------
	async function sendMsgToAll(msg) {
		debug("[TelegramBot] Manuelle Nachricht an alle:  " + msg);

		try {

			let rows = await db.getUserAllowed();

			rows.forEach((element) => {
				sendMessage(element.telegramid, msg, Telegraf.Extra.markdown());
			});

		} catch (error) {
			console.error('[TelegramBot] sendMsgToAll() Fehler', error);
		}
	}


	// ---------------- Kalender ----------------
	async function sendKalender(ctx, gesamt = false) {

		let termine = await calendar.getCalendarString();

		let rows_userById = await db.getUserByTelId(ctx.from.id);
		let user = rows_userById[0];

		var str = "";
		for (var i = 0; i < termine.length; i++) {

			let send = false;
			if (termine[i].group.length > 0) {
				for (let j = 0; j < termine[i].group.length; j++) {
					if (String(user.kalenderGroups).indexOf(termine[i].group[j].id) != -1) {
						send = true;
					}
				}
			} else { // Keine Gruppe -> Alle
				send = true;
			}

			if (!send) {
				if (gesamt) {
					str += '<s>' + termine[i].string + "</s>\n";
				}
			} else {
				str += '<i><b>' + termine[i].string + "</b></i>\n";
			}
		}
		if (gesamt) {
			ctx.editMessageText("<b>Alle Termine:</b>\n" + str, Telegraf.Extra.HTML());
		} else {
			ctx.reply("<b>Deine Termine:</b>\n" + str, Telegraf.Extra.HTML().markup((m) =>
				m.inlineKeyboard([
					m.callbackButton('Gesamter Kalender', 'KalenderGes'),
				]
				)
			));
		}

		db.addStatistik(db.STATISTIK.SHOW_KALENDER, ctx.from.id);
	}
	bot.hears('📅 Kalender', async ctx => {
		try {

			sendKalender(ctx, false);

			db.addStatistik(db.STATISTIK.SHOW_KALENDER, ctx.from.id);

		} catch (error) {
			console.error('[TelegramBot] #Kalender Fehler', error);
		}
	});
	onCallback.on('KalenderGes', async (ctx) => {
		try {

			sendKalender(ctx, true);


		} catch (error) {
			console.error('[TelegramBot] #KalenderGes Fehler', error);
		}
	});


	// ---------------- Bilder ----------------
	bot.on('photo', async (ctx) => {
		try {

			ctx.replyWithChatAction('typing')
			debug("[TelegramBot] Telegram Bild!");

			// Normales Bild
			let filepath = "./telegramBilder/";
			if (process.env.BOT_IMG_AUTOFREIGABE == "true") {
				filepath = "./filesHTTP/images/slideshow/";
			}

			// Hydrantenbild
			if (user_hydrantPicRequested[ctx.from.id] == true) {
				filepath = "Hydranten/" + user_location[ctx.from.id].latitude + ", " + user_location[ctx.from.id].longitude + "   ";
			}

			let d = new Date();
			let options = { year: 'numeric', month: '2-digit', day: '2-digit' };
			let time = d.toLocaleTimeString().replace(/[:]/g, '-');
			let date = d.toLocaleDateString('de-DE', options);

			const imageData = await bot.telegram.getFile(ctx.message.photo[ctx.message.photo.length - 1].file_id);
			const writer = fs.createWriteStream(filepath + time + " - " + date + " - " + imageData.file_path.substr(7));

			axios({
				method: 'get',
				url: `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${imageData.file_path}`,
				responseType: 'stream'
			})
				.then(async (response) => {
					await response.data.pipe(writer);

					if (user_hydrantPicRequested[ctx.from.id] == true) {
						ctx.reply('Fertig.', Telegraf.Extra.markup((markup) => {
							return markup.resize()
								.keyboard([
									'	⬅️ zurück'
								], { columns: 2 })
								.oneTime()
						}));
					} else {
						ctx.reply(`Bild gespeichert.`);
					}

				})
				.catch((err) => {
					console.error(err);
					ctx.reply('Bild speichern: Fehler.');
				});

		} catch (error) {
			console.error('[TelegramBot] #photo Fehler', error);
		}
	});


	// ---------------- Bei restichen Texten ----------------
	bot.on('text', (ctx) => {
		user_hydrantPicRequested[ctx.from.id] = false;

		ctx.reply(
			'Telegram Bot der' + process.env.FW_NAME_BOT,
			Telegraf.Extra.HTML().markup((m) =>
				m.keyboard(mainKeyboard).resize()
			)
		);

	});


	// ---------------- Papierinfo ----------------
	async function sendPapierInfo(status) {
		debug('sendPapierInfo', status);
		try {

			let rows = await db.getUserAllowed();

			rows.forEach((element) => {
				if (element.drucker == 1) {
					sendMessage(
						element.telegramid,
						'*🖨️ Drucker Information 🖨️:* \n _Alarm-Drucker: ' + (status ? 'Papier wieder voll' : 'Papier LEER') + '!_',
						Telegraf.Extra.markdown()
					);
				}
			});

		} catch (error) {
			console.error('[TelegramBot] sendPapierInfo() Fehler', error);
		}
	}


	// ---------------- Starte Bot ----------------
	bot.startPolling();




	return {
		sendAlarm,
		allowUser,
		removeUser,
		sendMsgToAll,
		sendPapierInfo,
		sendMessage
	};
}

