'use strict';

// ----------------  EINSTELLUNGEN ---------------- 
require('dotenv').config();
var RASPIVERSION = process.env.RASPIVERSION;

// ----------------  STANDARD LIBRARIES ---------------- 
const debug = require('debug')('app');
const chokidar = require('chokidar');
const fs = require('fs');
const { promisify } = require('util');
const stat = promisify(fs.stat);

// ----------------  DATENBANK ---------------- 
const db = require('./database')();

// APP Notifications
var webNotifications = require('./webNotifications');

// ----------------  DRUCKEN ----------------
var printer = require('./printer')();

// ----------------  KALENDER/FWVV ---------------- 
const calendar = require('./calendar')();

// ---------------- Timeout Funktion ----------------
function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
// ----------------  Fehlerausgabe ---------------- 
process.on('uncaughtException', function (err) {
	console.log('[App] Caught exception: ', err);
});


// --------------- VARIABLEN ---------------
var _bot = [null];      // [null] - Pointerersatz, da Objekt -> übergabe als Referenz
var _httpServer = [null];
var _httpsServer = [null];
var ignoreNextAlarm = false;
var ignoreNextAlarm_min = 0;

async function startScreen() {
	// ---------------- Startinfo ---------------- 
	console.log("\n\n    --------------------------------------------------------------");
	console.log("    |            Feuerwehr Einsatzmonitor Software               |");
	console.log("    |                                                            |");
	console.log("    |             (c) 2020 Resch - FF Fischbachau                |");
	console.log("    |                                                            |");
	console.log("    |                                                            |");
	console.log("    |               weitere Infos: siehe Readme                  |");
	console.log("    |                                                            |");
	console.log("    --------------------------------------------------------------\n");

	
	console.log("    --------------------------------------------------------------");
	console.log("                            Einstellungen                         \n");
	console.log("    # ORDNER:");

	// Prüfe Eingansordner
	try {
		var stats = await stat(process.env.FOLDER_IN);
		console.log("     Eingang: " + process.env.FOLDER_IN + " -> OK");
	} catch (err) {
		console.error("     Eingang: " + process.env.FOLDER_IN + " -> Fehler");
	}

	// Prüfe Archivordner
	try {
		var stats = await stat(process.env.FOLDER_IN);
		console.log("     Archiv: " + process.env.FOLDER_ARCHIVE + " -> OK");
	} catch (err) {
		console.error("     Archiv: " + process.env.FOLDER_ARCHIVE + " -> Fehler");
	}

	// Gebe Filtereinstellungen aus
	console.log("\n    # FILTER:");
	console.log("     Fax Filter: " + process.env.FAXFILTER + "");
	console.log("     Einsatzmittel Filter: " + process.env.FW_NAME + "");

	// Prüfe Ausdruckeinstellungen
	console.log("\n    # Ausdruck: " + (process.env.ALARMDRUCK == "true" ? " -> Ja" : " -> Nein"));
	if (process.env.ALARMDRUCK == "true") {
		let stat = false;
		if (process.env.AREADER != "") {
			try {
				var stats = await stat(process.env.AREADER);
				console.log("     Programm: " + process.env.AREADER + " -> OK");
				stat = true;
			} catch (err) {
				console.error("     Programm: " + process.env.AREADER + " -> Fehler");
			}
		}
		if (RASPIVERSION == "true") {
			console.log("     Druckername: " + process.env.DRUCKERNAME);
			stat = true;
		}
		if (process.env.DRUCKERURL != '') {
			console.log("     Drucker URL: " + process.env.DRUCKERURL);
			stat = true;
		}
		if(!stat) {
			console.error('Alarmdruck: FEHLER')
		}
	}

	// Gebe Diashoweinstellungen aus
	console.log("\n    # ANZEIGE:");
	console.log("     Diashow Wechselzeit: " + (process.env.DIASHOW_DELAY / 1000) + " Sekunden");
	console.log("     Diashow Zufällig: " + (process.env.DIASHOW_RANDOM == "true" ? "Ja" : "Nein"));
	console.log("     FW Name: " + process.env.FW_NAME_STANDBY);

	// Prüfe Diashow Ordner
	try {
		var stats = await stat(process.env.BOT_IMG);
		console.log("     Bilderordner: " + process.env.BOT_IMG + " -> OK");
	} catch (err) {
		console.error("     Bilderordner: " + process.env.BOT_IMG + " -> Fehler");
	}

	// Gebe Telegrammeinstellungen aus
	console.log("\n    # ALARMIERUNG:");
	console.log("     Telegram Sende Alarme: " + (process.env.BOT_SENDALARM == "true" ? "Ja" : "!!! Nein !!!"));
	console.log("     APP Sende Alarme:      " + (process.env.APP_SENDALARM == "true" ? "Ja" : "!!! Nein !!!"));

	console.log("\n    --------------------------------------------------------------");
	console.log("                         Verfügbare Drucker                         \n\n");

	var mdns = require('mdns-js');
	var ipp = require('ipp');
	//if you have another mdns daemon running, like avahi or bonjour, uncomment following line
	mdns.excludeInterface('0.0.0.0');

	var browser = mdns.createBrowser(mdns.tcp('ipp'));

	browser.on('ready', function () {
		browser.discover();
	});

	browser.on('update', function (data) {
		//console.log('data:', data);

		let txtRecord = {};
		for (let i in data.txt) {
			let e = data.txt[i].split('=');
			txtRecord[e[0]] = e[1];
		}

		console.log(/*data.fullname, */txtRecord.ty, txtRecord.note, 'URL -->  http://' + data.host + ':' + data.port + '/' + txtRecord.rp + "  <--");

	});

	await timeout(5000);

	console.log("\n\n    --------------------------------------------------------------\n\n\n\n");
}

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
var onAlarm = function(data) {
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

		// FWmonitor APP
		if (process.env.APP_DNS != "") {
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
		} else {
			console.log("[APP] APP Alamierung deaktiviert -> Keine Alarmnotification");
		}
	}
}

var papierinfo = function() {
	let firststart = true;
	let papierLast = false;
	let interval = setInterval(async () => {

		debug('Drucker Papier auslesen');

		var status = await printer.isNotFull()
			.catch((err) => {
				console.error('[APP] Papierinfo konnte nicht geladen werden', err)
			});

		if (status != null) {
			// Änderung -> sende Info
			if (status != papierLast && !firststart) {

				console.log("Drucker Papier nicht voll: ", status);

				// BOT
				_bot[0].sendPapierInfo(status);

				// APP
				if (process.env.APP_DNS != "") {
					// FWmonitor APP
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

						let rows = await db.getAllowedUser()
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
									if (process.env.APP_DNS != "") {
										// FWmonitor APP
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

async function main() {

	await startScreen();

	// ---------------- PROGRAMMSTART ----------------
	await db.update();

	// ---------------- Module starten ----------------
	_httpServer[0] = require('./httpServer')(_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm);
	_httpsServer[0] = require('./httpsServer')(_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm);

	// Telegram Bot
	_bot[0] = require('./telegramBot')(_httpServer, _httpsServer[0].destroySession);	

	// Alarmmanager
	var alarmMan = require('./alarmManager')();
	alarmMan.eventEmitter.on("alarm", onAlarm);

	// Drucker Papierinfo
	if (process.env.DRUCKERURL != '' || (process.env.PRINTER_PATH != '' && process.env.PRINTER_REGEX != '')) {
		papierinfo();
	}

	// Kalender Terminerinnerungen
	terminerrinerrung();


	// ---------------- error handlers ----------------
	/*
	// catch 404 and forward to error handler
	appHTTP.use(function (req, res, next) {
		var err = new Error('Not Found');
		err.status = 404;
		next(err);
	});
	
	// development error handler
	// will print stacktrace
	if (appHTTP.get('env') === 'development') {
		appHTTP.use(function (err, req, res, next) {
			res.status(err.status || 500);
			res.render('error', {
				message: err.message,
				error: err
			});
		});
	}
	
	// production error handler
	// no stacktraces leaked to user
	
	appHTTP.use(function (err, req, res, next) {
		console.error(err.message);
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: {}
		});
	});
	
	*/


	// ---------------- Verzeichnisüberwachung ----------------

	await timeout(5000);

	if (RASPIVERSION == "false") {

		// ---------------- PC Version ----------------
		console.log("[APP] PC Version gestartet");

		// Verzeichnisüberwachung
		chokidar.watch(process.env.FOLDER_IN, {
			ignored: /(^|[\/\\])\../,
			usePolling: true,
			interval: 3000,
			binaryInterval: 3000,
			awaitWriteFinish: {
				stabilityThreshold: 2000,
				pollInterval: 100
			},
		}).on('add', (path) => {

			// Konsolenausgabe
			let current_datetime = new Date()
			console.log("\n[App] " + current_datetime.toString());
			console.log(`[App] File ${path} has been added`);

			// Textdatei verarbeiten
			alarmMan.parseFile(path);

		});

	} else {

		// ---------------- Raspberry PI Version ----------------
		console.log("[APP] Raspberry Pi Version gestartet");

		var sys = require('sys')
		var exec = require('child_process').exec;

		// Verzeichnisüberwachung
		chokidar.watch(process.env.FOLDER_IN, {
			ignored: /(^|[\/\\])\../,
			usePolling: true,
			interval: 3000,
			binaryInterval: 3000,
			awaitWriteFinish: {
				stabilityThreshold: 2000,
				pollInterval: 100
			},
		}).on('add', (path) => {

			// Konsolenausgabe
			let current_datetime = new Date()
			console.log("\n[App] " + current_datetime.toString());
			console.log(`[App] File ${path} has been added`);

			// Delay, da Hylafax sonst offenbar Datei noch nicht fertig geschrieben hat
			var delay = 20000;

			// Prüfe ob TIF/TIFF Datei
			if (path.split('.')[1] == "tiff" || path.split('.')[1] == "tif") {

				// Dateipfad im Archiv
				var file = process.env.FOLDER_ARCHIVE + "/" + String(path).split("/").pop();
				// Lokalisiertes Datum
				var d = new Date().toLocaleTimeString();

				// Dateirechte setzen
				setTimeout(function () {
					console.log(`[App] ${d} sudo chmod 777 ${path}`);
					exec(`sudo chmod 777 ${path}`, function (err, stdout, stderr) {
						if (err) {
							console.log('error:', err)
						}
						console.log("stdout -> " + stdout);
						console.log("stderr -> " + stderr);
					});
				}, delay);


				delay += 2000;
				setTimeout(function () {

					// Datei ins Archiv verschieben
					console.log(`[App] ${d} sudo mv ${path} ` + process.env.FOLDER_ARCHIVE);
					exec(`sudo mv ${path} ` + process.env.FOLDER_ARCHIVE, function (err, stdout, stderr) {
						if (err) {
							console.log('error:', err)
						}
						console.log("stdout -> " + stdout);
						console.log("stderr -> " + stderr);
					});

					// Datei in PDF ausdrucken/konvertieren
					delay = 10000; // Warte etwas da es sonst aus nicht geht (keine Ahnung warum)
					setTimeout(function () {
						console.log(`${d} PDF Druck: sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P PDFPrint`);
						exec(`sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P PDFPrint`, function (err, stdout, stderr) {
							if (err) {
								console.log('error:', err)
							}
							console.log("stdout -> " + stdout);
							console.log("stderr -> " + stderr);
						});
					}, delay);


					// Tesseract ausführen
					delay = 20000; // Warte etwas da es sonst aus nicht geht (keine Ahnung warum)
					setTimeout(function () {

						console.log("[App] Tesseract!");

						console.log(`[App] ${d} sudo tesseract ${file} -l deu -psm 6 stdout`);
						exec(`sudo tesseract ${file} -l deu -psm 6 stdout`, function (err, stdout, stderr) {
							var text = stdout;
							if (err) {
								console.log('error:', err)
							} else {

								// Prüfe ob Text erkannt wurde
								if (text != "" && text != null && text != undefined && text != " ") {

									// Dateiname
									var arr = String(file).split(".");
									var filePath = arr[arr.length - 2];

									// Schreibe Text in Datei
									fs.writeFile(filePath + ".txt", text, function (err) {
										if (err) {
											return console.log(err);
										}
										console.log("[APP] Datei gespeichert");

										// Textdatei verarbeiten
										alarmMan.parseFile(filePath + ".txt");

									});

								}
							}

							console.log("stdout -> " + stdout);
							console.log("stderr -> " + stderr);

						});

					}, delay);

					// Datei ausdrucken
					delay += 10000;
					setTimeout(function () {
						console.log(`${d} Druck 1: sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`);
						exec(`sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`, function (err, stdout, stderr) {
							if (err) {
								console.log('error:', err)
							}
							console.log("stdout -> " + stdout);
							console.log("stderr -> " + stderr);
						});
					}, delay);

					// Datei nochmal ausdrucken
					delay += 10000;
					setTimeout(function () {
						console.log(`${d} Druck 2: sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`);
						exec(`sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`, function (err, stdout, stderr) {
							if (err) {
								console.log('error:', err)
							}
							console.log("stdout -> " + stdout);
							console.log("stderr -> " + stderr);
						});
					}, delay);


				}, delay);

			}

		});
	}

}
main();
