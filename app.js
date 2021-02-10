'use strict';

// ----------------  EINSTELLUNGEN ---------------- 
require('dotenv').config();

process.env.NODE_ENV = 'production';
//process.env.NODE_ENV = 'development';

// ----------------  LIBRARIES ---------------- 
const debug = require('debug')('app');

const db = require('./database')();
var webNotifications = require('./webNotifications');
var printer = require('./printer')();
const calendar = require('./calendar')();
const startupCheck = require('./startupCheck')();
const updateManager = require('./updateManager')();

// ----------------  Fehlerausgabe ---------------- 
process.on('uncaughtException', function (err) {
	console.log('[App] Caught exception: ', err);
});

// --------------- VARIABLEN ---------------
var _bot = [null];      // [null] - Pointerersatz, da Objekt -> übergabe als Referenz
var _httpServer = [null];
var _httpsServer = [null];
var _alarmManager = [null];
var ignoreNextAlarm = false;
var ignoreNextAlarm_min = 0;

process.env.VERSION = "2.2.0";
process.env.VERSION_REMOTE = '';






function IgnoreNextAlarmCountDown() {
	if (ignoreNextAlarm_min > 0) {
		setTimeout(function () { ignoreNextAlarm_min--; IgnoreNextAlarmCountDown(); }, 1000 * 60 * 1);
	} else {
		ignoreNextAlarm = false;
	}
}
var setIgnoreNextAlarm = function (value) {
	if (value == true) {
		ignoreNextAlarm = true;
		ignoreNextAlarm_min = 15;

		IgnoreNextAlarmCountDown();

		console.log("[APP] ALARMIERUNG DEAKTIVIERT FÜR 15 MINUTEN")
	} else {
		ignoreNextAlarm = false;
		console.log("[APP] ALARMIERUNG AKTIVIERT")
	}
}
var getIgnoreNextAlarm = function () {
	if (ignoreNextAlarm) {
		return ignoreNextAlarm_min;
	}
	return false;
}

var alarmNummer = Math.floor(Math.random() * 1000); 
var onAlarm = async function(data) {
	alarmNummer++;

	// Bildschirm umschalten
	console.log("[APP] APP Alamierung -> Schalte Bildschirme um");
	for(let i = 0; i < 60; i++) {
		setTimeout(function(){ 
			_httpServer[0].wss.broadcast("alarm", alarmNummer);
			_httpsServer[0].wss.broadcast("alarm", alarmNummer);
		}, 2000 * i);
	}

	if (!ignoreNextAlarm) {

		// Lösche Sessions -> Seite in App wird neu geladen
		let rows = await db.getUserAllowed()
			.catch((err) => { console.error('[Terminerinnerung] Datenbank Fehler', err) });
		rows.forEach(function (user) {
			_httpsServer[0].destroySession(user.telegramid);	
		});	

		// Telegram
		_bot[0].sendAlarm(
			data.EINSATZSTICHWORT,
			data.SCHLAGWORT,
			data.OBJEKT,
			data.STRASSE,
			data.ORTSTEIL,
			data.ORT,
			data.BEMERKUNG,
			data.cars1.toString(),
			data.cars2.toString(),
			data.geoData.lat,
			data.geoData.lng,
			data.targetPath
		);

		// APP
		if (process.env.APP_SENDALARM != "true") {
			console.log("[APP] APP Alamierung deaktiviert -> Keine Alarmnotification");
		} else {
				
			var zeigeBis = new Date();
			zeigeBis.setTime(zeigeBis.getTime() + (2 * 60 * 1000));
			webNotifications.notify(
				'ALARM: ' + data.EINSATZSTICHWORT + ' - ' + data.SCHLAGWORT,
				data.STRASSE + ', ' + data.ORT,
				zeigeBis,
				false,
				new Date(),
				zeigeBis,
				true,
				[
					{ action: "kommeJa", title: "👍 KOMME" },
					{ action: "kommeNein", title: "👎 KOMME NICHT" },
					{ action: "kommeSpaeter", title: "🕖 SPÄTER!" }
				]
			);
		}
	}
}

var papierinfo = function() {
	let firststart = true;
	let papierLast = false;
	let count = 0;
	let interval = setInterval(async () => {

		debug('Drucker Papier auslesen');

		var status = await printer.isNotFull()
			.catch((err) => {
				console.error('[APP] Papierinfo konnte nicht geladen werden', err)
			});

		if (status != null) {
			// Änderung -> sende Info
			if (status != papierLast && !firststart) {

				count++;

				if(count > 1) {

					console.log("Drucker Papier nicht voll: ", status);

					// BOT
					_bot[0].sendPapierInfo(status);

					// APP
					var zeigeBis = new Date();
					zeigeBis.setTime(zeigeBis.getTime() + (60 * 60 * 1000));
					webNotifications.notify(
						"🖨️ Drucker Information 🖨️",
						"Alarm-Drucker: " + (status ? "Papier wieder voll" : "Papier LEER") + "!",
						zeigeBis,
						false,
						new Date(),
						zeigeBis,
						false,
						[],
						['drucker']
					);

				}


			} else {
				count = 0;
			}

			papierLast = status;
			firststart = false;
		}
	}, 150000);
}

var terminerrinerrung = function() {
	let lastTime = new Date();
	let interval = setInterval(async function calRemind() {
		let termine = await calendar.getCalendarByPattern()
			.catch((err) => { console.error('[Terminerinnerung] Datenbank Fehler', err) });

		for (let i in termine) {
			if (termine[i].remind != undefined && termine[i].remind != '') {
				try {				
				
					let date1 = new Date();
					let date2 = termine[i].remind;

					// Erinnerungszeit zwischen letzter Überprüfung und jetzt
					if (lastTime < date2 && date2 < date1) {
						console.log("[APP] --> Terminerinnerung")

						let dat = new Date(termine[i].start);
						let m = dat.getMonth();
						m += 1;
						if (m < 10)
							m = "0" + m;
						let d = dat.getDate();
						if (d < 10)
							d = "0" + d;

						let hh = dat.getHours();
						if (hh < 10)
							hh = "0" + hh;
						let mm = dat.getMinutes();
						if (mm < 10)
							mm = "0" + mm;

						let rows = await db.getUserAllowed()
							.catch((err) => { console.error('[Terminerinnerung] Datenbank Fehler', err) });

						rows.forEach(function (user) {
							if (user.sendRemembers == 1) {
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

								if (send) {
									// BOT
									const Telegraf = require('telegraf');
									_bot[0].sendMessage(
										user.telegramid,
										`<b>Terminerinnerung:</b> \n <i>${d}.${m} ${hh}:${mm} - ${termine[i].summary} ${termine[i].location}</i>`,
										Telegraf.Extra.markdown().HTML().markup((m) =>
											m.keyboard(_bot[0].mainKeyboard).resize()
										)
									);
									// APP
									var zeigeBis = new Date();
									zeigeBis.setTime(zeigeBis.getTime() + (60 * 60 * 1000));
									webNotifications.notify(
										"🗓️ Terminerinnerung: 🗓️",
										`${d}.${m} ${hh}:${mm} - ${termine[i].summary} ${termine[i].location}`,
										zeigeBis,
										false,
										new Date(),
										zeigeBis,
										false,
										[],
										[user.telegramid]
									);

								}
							}
						});					
					}
				} catch (error) {
					console.log(error);
				}
			}
		}
		lastTime = new Date();

	}, 60000);
}

var checkInFolder = function() {
	let lastStatus = true;
	let interval = setInterval(async () => {		
		
		let status = await startupCheck.chechInFolder();

		debug('Check IN Folder', status, lastStatus);

		if(status != lastStatus) {

			// Telegram
			_bot[0].sendSoftwareInfo("Eingangsordner Status: " + (status ? "Verbunden" : "Getrennt") + "!");			

			// APP
			var zeigeBis = new Date();
			zeigeBis.setTime(zeigeBis.getTime() + (60 * 60 * 1000));
			webNotifications.notify(
				"Software Information",
				"Eingangsordner Status: " + (status ? "Verbunden" : "Getrennt") + "!",
				zeigeBis,
				false,
				new Date(),
				zeigeBis,
				false,
				[],
				['softwareInfo']
			);

		}

		lastStatus = status;
		
	}, 60000 * 5 );
}

var checkForUpdate = async function() {
	let infoSendt = false;
	let check = async () => {
		let ret = await updateManager.checkForUpdate();
		if(ret.availible == true) {
			process.env.VERSION_REMOTE = ret.version;
			console.log();
			console.log('UPDATE VERFÜGBAR:');
			console.log('Version: ' + ret.version);
			console.log('Info:\n' + ret.text);
			console.log();

			if(infoSendt == false) {
				infoSendt = true;

				// Telegram
				_bot[0].sendSoftwareInfo("Update verfügbar! " + process.env.VERSION + ' -> ' + ret.version + '\n' + ret.text);		

				// APP
				var zeigeBis = new Date();
				zeigeBis.setTime(zeigeBis.getTime() + (60 * 60 * 1000));
				webNotifications.notify(
					"Software Information",
					"Update verfügbar! " + process.env.VERSION + ' -> ' + ret.version + '\n' + ret.text,
					zeigeBis,
					false,
					new Date(),
					zeigeBis,
					false,
					[],
					['softwareInfo']
				);
			}
		}
	}
	let interval = setInterval(async () => {		
		check();
	}, 60000 *60 *24 );
	check();
}


async function main() {	

	await startupCheck.check();

	console.log("----------------------");
	console.log("|    PROGRAMMSTART   |");
	console.log("----------------------");
	console.log('');

		// ---------------- PROGRAMMSTART ----------------
	await db.updateDatabase();	

	// ---------------- Module starten ----------------
	_httpServer[0] = require('./httpServer')(_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm);
	_httpsServer[0] = require('./httpsServer')(_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm);

	// Telegram Bot
	_bot[0] = require('./telegramBot')(_httpServer, _httpsServer[0].destroySession);	

	// Alarmmanager
	_alarmManager[0] = require('./alarmManager')();
	_alarmManager[0].eventEmitter.on("alarm", onAlarm);

	// Drucker Papierinfo
	if (process.env.DRUCKERURL != '' || (process.env.PRINTER_PATH != '' && process.env.PRINTER_REGEX != '')) {
		papierinfo();
	}

	// Kalender Terminerinnerungen
	terminerrinerrung();

	// Eingangsordner Überwachung
	checkInFolder();

	global.startTime = new Date();

	// Update Check
	await checkForUpdate();


	// ---------------- Verzeichnisüberwachung ----------------

	const alarmWatcher = require('./alarmWatcher')(_alarmManager);
	alarmWatcher.start();

}
main();
