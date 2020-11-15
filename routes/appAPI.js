'use strict';
module.exports = function (_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm) {
	// ----------------  STANDARD LIBRARIES ---------------- 
	var express = require('express');
	var router = express.Router();
	const path = require('path');
	const axios = require('axios');
	var fs = require('fs');
	var openrouteservice = require("openrouteservice-js");

	// ----------------  WEB PUSH NOTIFICATIONS ---------------- 
	const webNotifications = require('../webNotifications');

	// ----------------  Datenbank ---------------- 
	const db = require('../database')();

	// ----------------  KALENDER/FWVV ---------------- 
	var calendar = require('../calendar')()
	const fwvv = require('../fwvvAnbindung')();




	async function loadHydrantenData(lat, lng) {
		// URL Overpass-API für Hydranten    siehe Ovepass turbo
		let overpassHydrantenUrl = "https://overpass-api.de/api/interpreter?data=" +
		"[out:json][timeout:25];(" +
		"node[%22emergency%22=%22fire_hydrant%22](around:3000," + lat + "," + lng + ");" +
		"node[%22emergency%22=%22water_tank%22](around:3000," + lat + "," + lng + ");" +
		");out;%3E;out%20skel%20qt;";

		// Make a request for a user with a given ID
		let response = await axios.get(overpassHydrantenUrl)
			.catch(function (error) {
				console.log("Load Hydranten", error);
			})

		var responseJSON = response.data;

		// Hydranten ausgeben
		let dataIn = responseJSON["elements"];
		let features = [];

		for (let i = 0; i < dataIn.length; i++) {

			var dataElement = dataIn[i];
			var name = "";

			if (dataElement["tags"]["emergency"] == "water_tank")
				name = "water_tank"
			else
				name = dataElement["tags"]["fire_hydrant:type"];


			features.push({
				"type": "Feature",
				"geometry": {
					"type": "Point",
					"coordinates": [dataElement["lon"], dataElement["lat"]]
				},
				"properties": {
					"title": name,
					"iconcategory": "icons"
				}
			});

		}

		return features;
	}


	// ---- Dateien ----
	router.get('/filesHTTPS/:file', function (req, res) {
		res.sendFile(req.params.file, { root: './filesHTTPS' });
	});
	router.get('/filesHTTPS/images/:file', function (req, res) {
		res.sendFile(req.params.file, { root: './filesHTTPS/images' });
	});
	router.get('/filesHTTPS/javascripts/:file', function (req, res) {
		res.sendFile(req.params.file, { root: './filesHTTPS/javascripts' });
	});
	router.get('/filesHTTPS/splashscreens/:file', function (req, res) {
		res.sendFile(req.params.file, { root: './filesHTTPS/splashscreens' });
	});
	router.get('/filesHTTPS/images/icons/:file', function (req, res) {
		res.sendFile(req.params.file, { root: './filesHTTPS/images/icons' });
	});


	// ---- Kalender ----
	// get Kalender
	router.get('/api/kalender', async function (req, res) {
		let getAll = req.query.getAll;
		if (getAll != 'true')
			getAll = undefined;
		else 
			getAll = true;

		let termine = await calendar.getCalendarByPattern(getAll)
			.catch((err) => { console.error('[appIndex] Kalender Fehler', err) });

		res.json(termine);
	});

	// get Kalendergruppen
	router.get('/api/kalendergruppen', async function (req, res) {
		let rows = await db.getKalendergruppen().catch((err) => { console.error('[appIndex] DB Fehler', err) });
		if (rows == undefined) {
			res.send("Fehler");
			return;
		}

		res.json(rows);
	});

	// post Kalendergruppen ADMIN
	router.post('/api/setKalendergruppen', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		for (let i = 0; i < req.body.length; i++) {
			console.log((req.body[i].id, req.body[i].name, req.body[i].pattern));
			await db.setKalendergruppen(req.body[i].id, req.body[i].name, req.body[i].pattern)
				.catch((err) => {
					console.error('[appIndex] DB Fehler', err)
				});
		}
		res.json({ data: 'ok' });
	});

	// post Kalender Event KALENDER
	router.post('/api/setKalenderevent', async function (req, res) {
		if (!(/*req.session.isAdmin ||*/ req.session.kalender)) {	
			res.status(500).send({ error: 'Kein Admin / Kalender' });
			return;
		}

		if(req.body.id != -1) {
			await db.updateKalender(req.body.id, req.body.summary, req.body.start, req.body.remind, req.body.group)
			.catch((err) => {
				console.error('[appIndex] DB Fehler', err)
			});
		} else {
			await db.addKalender(req.body.summary, req.body.start, req.body.remind, req.body.group)
			.catch((err) => {
				console.error('[appIndex] DB Fehler', err)
			});
		}
		
		res.json({ data: 'ok' });
	});

	// delete Kalender KALENDER
	router.get('/api/delKalender', async function (req, res) {
		if (!(/*req.session.isAdmin ||*/ req.session.kalender)) {	
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		let id = req.query.id;

		if (id) {
			db.deleteKalender(id);
		}

		res.send('OK'); return;

	});


	// ---- Alarm ----
	// post Alarmgruppen ADMIN
	router.post('/api/setAlarmgruppen', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		for (let i = 0; i < req.body.length; i++) {
			console.log('\n', (req.body[i].id, req.body[i].name, req.body[i].pattern));
			await db.setAlarmgruppen(req.body[i].id, req.body[i].name, req.body[i].pattern)
				.catch((err) => {
					console.error('[appIndex] DB Fehler', err)
				});
		}
		res.json({ data: 'ok' });
	});

	// get Alarmliste
	router.get('/api/alarmList', async function (req, res) {
		let offset = req.query.offset;
		let count = req.query.count;
		if (offset == undefined || count == undefined) {
			res.status(500).send({ error: 'No Params' });
			return;
		}

		let rows = await db.getAlarmList(offset, count).catch((err) => { console.error('[appIndex] DB Fehler', err) });
		if (rows == undefined) {
			res.send("Fehler");
			return;
		}

		let ret = new Array();

		for (let row of rows) {
			ret.push([row.schlagwort, row.strasse, row.ort, row.date, row.einsatzstichwort, row.id]);
		}

		res.json(ret);
	});

	// get Alarmgruppen ADMIN
	router.get('/api/alarmgruppen', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		let rows = await db.getAlarmgruppen().catch((err) => { console.error('[appIndex] DB Fehler', err) });
		if (rows == undefined) {
			res.send("Fehler");
			return;
		}
		res.json(rows);
	});

	// get Alarm
	var hydrantenCache = {};
	var strassenCache = {};
	var gebaeudeCache = {};
	var routeCache = {};
	router.get('/api/alarm', async function (req, res) {
		let id = req.query.id;
		if (id == undefined)
			res.status(500).send({ error: 'No Params' })

		let user;
		if (req.query.id) {
			user = [{pattern:`*{{EINSATZSTICHWORT}}* {{KARTE}} {{KARTE_EMG}} {{FAX}}
			_> {{SCHLAGWORT}}_
			_> {{OBJEKT}}_
			_> {{STRASSE}}_
			_> {{ORTSTEIL}}_
			_> {{ORT}}_
			{{newline}}
			*Bemerkung:*
			_{{BEMERKUNG}}_{{newline}}
			*Einsatzmittel:*
			_{{EINSATZMITTEL_EIGEN}}_
			_{{EINSATZMITTEL_ANDERE}}_`}];
		} else {
			user = await db.getUserPattern(req.session.telegramID).catch((err) => { console.error('[appIndex] DB Fehler', err) });
		}
		let rows = await db.getAlarm(req.query.id).catch((err) => { console.error('[appIndex] DB Fehler', err) });
		if (rows == undefined) {
			res.send("Fehler");
			return;
		}
		rows = rows[0];


		// URL Overpass-API für Hydranten    siehe Ovepass turbo
		let overpassStrassenUrl = "http://overpass-api.de/api/interpreter?data=" +
			"[out:json][timeout:25];(" +
			"way[%22name%22=%22" + rows.strasse + "%22](around:5000," + rows.lat + "," + rows.lng + ");" +
			");out geom;%3E;out%20skel%20qt;";
		let overpassGebaudeUrl = "http://overpass-api.de/api/interpreter?data=" +
			"[out:json][timeout:25];(" +
			"way[building](around:200," + rows.lat + "," + rows.lng + ");" +
			");out geom;%3E;";


		
		if (hydrantenCache[id] == undefined)
			hydrantenCache[id] = await loadHydrantenData(rows.lat, rows.lng);

		async function loadStrassenData() {
			// Make a request for a user with a given ID
			let response = await axios.get(overpassStrassenUrl)
				.catch(function (error) {
					console.log("Load Strassen", error);
				});

			let responseJSON = response.data;

			let dataIn = responseJSON["elements"];
			let polylinePoints = [];

			if (dataIn.length < 1)
				return;

			for (let i = 0; i < dataIn.length; i++) {

				var dataElement = dataIn[i];

				if (dataElement.type == "way") {

					let polyarr = [];
					for (let j = 0; j < dataElement.geometry.length; j++) {

						polyarr.push([dataElement.geometry[j].lat, dataElement.geometry[j].lon]);

					}

					polylinePoints.push(polyarr);
				}


			}

			strassenCache[id] = polylinePoints;
		}
		if (strassenCache[id] == undefined && rows.isAddress != 1 && rows.strasse != "")
			await loadStrassenData();

		async function loadGebaudeData() {
			// Make a request for a user with a given ID
			let response = await axios.get(overpassGebaudeUrl)
				.catch(function (error) {
					console.log("Load Gebäude", error);
				});

			let responseJSON = response.data;

			var dataIn = responseJSON["elements"];

			gebaeudeCache[id] = dataIn;
		}
		if (gebaeudeCache[id] == undefined && rows.isAddress == 1)
			await loadGebaudeData();


		if(process.env.FW_KOORD != "" && process.env.ORS_KEY != "") {
			// add your api_key here
			var Directions = new openrouteservice.Directions({
				api_key: process.env.ORS_KEY,
			});

			if (routeCache[id] == undefined && rows.lat != "" && rows.lng != "") {
				let direct = await Directions.calculate({
					coordinates: [process.env.FW_KOORD.split(','), [rows.lng, rows.lat]],
					profile: 'driving-car',
					restrictions: {  },
					extra_info: ["waytype"],
					radiuses: [1000,5000],
					format: 'json'
				})
				.catch(function(err) {
					var str = "An error occured: " + err;
					console.log("Route Error: " + str);
				});
	//			console.log(direct);
				routeCache[id] = JSON.stringify(direct);
			} 
		} else {
			console.log("[appAPI] keine FW_KOORD oder kein ORS_KEY angegeben -> keine Route berechnet");
		}


		// Gruppenpattern
		var pattern = user[0].pattern;

		if (pattern == undefined) {
			pattern = "";
		}

		let ret = {
			einsatzstichwort: null,
			schlagwort: null,
			objekt: null,
			strasse: null,
			ortsteil: null,
			ort: null,
			bemerkung: null,
			cars1: null,
			cars2: null,
			fax: pattern.indexOf('{{FAX}}') != -1 ? true : false,
			map: pattern.indexOf('{{KARTE}}') != -1 ? true : false,
			mapEmg: pattern.indexOf('{{KARTE_EMG}}') != -1 ? true : false,
			hydrantenCache: hydrantenCache[id],
			strassenCache: strassenCache[id],
			gebaeudeCache: gebaeudeCache[id],
			routeCache: routeCache[id]
		};

		if (pattern.indexOf('{{EINSATZSTICHWORT}}') !== -1)
			ret.einsatzstichwort = rows.einsatzstichwort;

		if (pattern.indexOf('{{SCHLAGWORT}}') !== -1)
			ret.schlagwort = rows.schlagwort;

		if (pattern.indexOf('{{OBJEKT}}') !== -1)
			ret.objekt = rows.objekt;

		if (pattern.indexOf('{{STRASSE}}') !== -1)
			ret.strasse = rows.strasse;

		if (pattern.indexOf('{{ORTSTEIL}}') !== -1)
			ret.ortsteil = rows.ortsteil;

		if (pattern.indexOf('{{ORT}}') !== -1)
			ret.ort = rows.ort;

		if (pattern.indexOf('{{BEMERKUNG}}') !== -1)
			ret.bemerkung = rows.bemerkung;

		if (pattern.indexOf('{{EINSATZMITTEL_EIGEN}}') !== -1 && rows.cars1 != undefined)
			ret.cars1 = rows.cars1.split(',');

		if (pattern.indexOf('{{EINSATZMITTEL_ANDERE}}') !== -1 && rows.cars2 != undefined)
			ret.cars2 = rows.cars2.split(',');

		if (pattern.indexOf('{{KARTE}}') !== -1) {
			ret.lat = rows.lat;
			ret.lng = rows.lng;
		}

		ret.date = rows.date;


		res.json(ret);
	});

	// set ignoreNextAlarm ADMIN
	router.get('/api/setIgnoreNextAlarm', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		let value = req.query.value;

		if (value == 'true' || value == true)
			setIgnoreNextAlarm(true);
		else
			setIgnoreNextAlarm(false);

		res.send('OK'); return;

	});

	// get ignoreNextAlarm ADMIN
	router.get('/api/getIgnoreNextAlarm', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		res.json(getIgnoreNextAlarm()); return;

	});


	// get Status
	router.get('/api/hydranten.geojson', async function (req, res) {
		let lat = req.query.lat;
		let lng = req.query.lng;
		if (lat == undefined || lng == undefined) {
			res.status(500).send({ error: 'No Params' });
			return;
		}

		let features = await loadHydrantenData(lat, lng);

		res.json(features);
	});


	// ---- Status ----
	// get Status
	router.get('/api/status', async function (req, res) {
		let rows = await db.getStatus(req.session.telegramID).catch((err) => { console.error('[appIndex] DB Fehler', err) });
		if (rows == undefined) {
			res.send("Fehler");
			return;
		}

		res.json(rows[0]);
	});

	// set Verfügbar
	router.get('/api/setVerfuegbarkeit', async function (req, res) {
		let status = req.query.status;
		let days = req.query.days;
		if (status == undefined || days == undefined) {
			res.status(500).send({ error: 'No Params' });
			return;
		}

		var result =  new Date();
		result.setDate(result.getDate() + parseInt(days, 10));
		if (days == -1 || status == 1) {
			result = "";
		}


 
		await db.setVerfuegbar(req.session.telegramID, status, result).catch((err) => { console.error('[appIndex] DB Fehler', err) });

		db.getUser(req.session.telegramID)
			.then((rows) => {
				if (rows[0] != undefined) {
					if (status == 2)
						_httpServer[0].wss.broadcast('st_nichtverf', rows[0].name + " " + rows[0].vorname + "%" +
							rows[0].stAGT + "," + rows[0].stGRF + "," + rows[0].stMA + "," + rows[0].stZUGF);
					if (status == 1)
						_httpServer[0].wss.broadcast(
							'st_verf', rows[0].name + " " + rows[0].vorname + "%" + rows[0].stAGT +
							"," + rows[0].stGRF + "," + rows[0].stMA + "," + rows[0].stZUGF
						);
				}
			})

		res.send('OK');
	});

	// get Verfügbarkeit
	router.get('/api/verfuegbarkeit', async function (req, res) {
		let rows = await db.getUserAll().catch((err) => { console.error('[appIndex] DB Fehler', err) });
		if (rows == undefined) {
			res.send("Fehler");
			return;
		}

		var st_verf = new Array();
		var st_verfNum = 0;
		var st_nichtverf = new Array();
		var st_nichtverfNum = 0;

		rows.forEach(function (element) {
			if (element.allowed == 1) {
				if (element.status == 2) {
					st_nichtverf.push(element.name + " " + element.vorname);
					st_nichtverfNum += 1;
				}
				else {
					st_verf.push(element.name + " " + element.vorname);
					st_verfNum += 1;
				}
			}
		});

		res.json({ numVerf: st_verfNum, numNVerf: st_nichtverfNum, nameVerf: st_verf, nameNVerf: st_nichtverf });
	});

	// post setVervPlans
	router.post('/api/setVervPlans', async function (req, res) {
		let plans = req.body.plans;
		if (plans == undefined) {
			res.status(500).send({ error: 'No Params' });
			return;
		}

		await db.setVerfuegbarkeitPlans(req.session.telegramID, '{"plans":'+JSON.stringify(plans)+'}').catch((err) => { console.error('[appIndex] DB Fehler', err) });

		res.send('OK');
	});

	// get getVervPlans
	router.get('/api/getVervPlans', async function (req, res) {
		let rows = await db.getVerfuegbarkeitPlans(req.session.telegramID).catch((err) => { console.error('[appIndex] DB Fehler', err) });
		if (rows == undefined) {
			res.send("Fehler");
			return;
		}

		res.json(rows[0]);
	});



	// ---- Benutzer ----
	// get Benutzer ADMIN
	router.get('/api/benutzer', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		let rows = await db.getUserAll().catch((err) => { console.error('[appIndex] DB Fehler', err) });
		if (rows == undefined) {
			res.send("Fehler");
			return;
		}
		res.json(rows);
	});

	// set Einstellung ADMIN
	router.get('/api/setEinstellung', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		let id = req.query.id;
		let setting = req.query.setting;
		let value = req.query.value;
		if (setting == undefined || value == undefined) {
			res.status(500).send({ error: 'No Params' });
			return;
		}

		console.log(setting, value);

		switch (setting) {
			case 'admin':
				db.changeStAny(id, "admin", value)
					.then(() => { res.send('OK'); return; })
					.catch((err) => { console.error('[appApi] Datenbank Fehler: ', err) });
				break;
			case 'kalender':
				db.changeStAny(id, "kalender", value)
					.then(() => { res.send('OK'); return; })
					.catch((err) => { console.error('[appApi] Datenbank Fehler: ', err) });
				break;
			case 'stAGT':
				db.changeStAny(id, "stAGT", value)
					.then(() => { res.send('OK'); return; })
					.catch((err) => { console.error('[appApi] Datenbank Fehler: ', err) });
				break;
			case 'stMA':
				db.changeStAny(id, "stMA", value)
					.then(() => { res.send('OK'); return; })
					.catch((err) => { console.error('[appApi] Datenbank Fehler: ', err) });
				break;
			case 'stGRF':
				db.changeStAny(id, "stGRF", value)
					.then(() => { res.send('OK'); return; })
					.catch((err) => { console.error('[appApi] Datenbank Fehler: ', err) });
				break;
			case 'stZUGF':
				db.changeStAny(id, "stZUGF", value)
					.then(() => { res.send('OK'); return; })
					.catch((err) => { console.error('[appApi] Datenbank Fehler: ', err) });
				break;
			case 'drucker':
				db.changeStAny(id, "drucker", value)
					.then(() => { res.send('OK'); return; })
					.catch((err) => { console.error('[appApi] Datenbank Fehler: ', err) });
				break;
			case 'gruppe':
				db.changeUserGroup(id, value)
					.then(() => { res.send('OK'); return; })
					.catch((err) => { console.error('[appApi] Datenbank Fehler: ', err) });
				break;
			case 'kalGr':
				db.changeStAny(id, "kalenderGroups", value)
					.then(() => { res.send('OK'); return; })
					.catch((err) => { console.error('[appApi] Datenbank Fehler: ', err) });
				break;
			case 'loeschen':
				await _bot[0].removeUser(id);
				res.send('OK'); return;
				break;
			case 'freigeben':
				await _bot[0].allowUser(id);
				res.send('OK'); return;
				break;


		}
	});

	// set Notifications
	router.get('/api/setNotifications', async function (req, res) {
		let value = req.query.value;
		if (value == undefined) {
			res.status(500).send({ error: 'No Params' });
			return;
		}

		value = value;

		await db.changeUserNotifications(req.session.telegramID, value).catch((err) => { console.error('[appIndex] DB Fehler', err) });

		res.send('OK');
	});

	// set Erinnerungen
	router.get('/api/setErinnerungen', async function (req, res) {
		let value = req.query.value;
		if (value == undefined) {
			res.status(500).send({ error: 'No Params' });
			return;
		}
		if (value == 'true')
			value = 1;
		else
			value = 0;

		await db.changeUserRemember(req.session.telegramID, value).catch((err) => { console.error('[appIndex] DB Fehler', err) });

		res.send('OK');
	});


	// ---- Statistik ----
	// get Statistik
	router.get('/api/statistik', async function (req, res) {
		let rows = await db.getStatistik().catch((err) => { console.error('[appIndex] DB Fehler', err) });
		if (rows == undefined) {
			res.send("Fehler");
			return;
		}

		let ret = new Array();
		var d = new Date();
		var options = { year: 'numeric' };
		var date = d.toLocaleDateString('de-DE', options);

		var sum = 0;

		for (let row of rows) {
			sum += parseInt(row.number);
			ret.push([
				row.number,
				(row.einsatzstichwort == "" ? 'kein Stichwort' : row.einsatzstichwort)

			]);
		}

		res.json(ret);
	});

	// get Einsatzzeit
	router.get('/api/einsatzzeit', async function (req, res) {

		let rows = await db.getUser(req.session.telegramID).catch((err) => { console.error('[appIndex] DB Fehler', err) });

		let zeit = await fwvv.getEinsatzZeit(rows[0].name, rows[0].vorname)
			.then((arr) => {

				res.json({ hour: Math.floor(arr[0] / 60), minute: (arr[0] % 60), num: arr[1] });

			})
			.catch((error) => {
				console.log("Fehler: Daten konnten nicht geladen werden.");
			});


	});

	
	// ---- Präsentation ----
	// get getPraesentationen ADMIN
	router.get('/api/getPraesentationen', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		var path = "./filesHTTP/praesentationen/";
		var src = [];
		var items = await fs.promises.readdir(path)
			.catch(err => console.log(err));
		for (var i = 0; i < items.length; i++) {
			if (items[i] != '.gitignore')
				src.push(items[i]);
		}

		res.json(JSON.stringify(src)); return;

	});

	// set setPraesentationenAction ADMIN
	router.get('/api/setPraesentationenAction', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		let action = req.query.action;
		let value = req.query.value;
		if (action == undefined) {
			res.status(500).send({ error: 'No Params' });
			return;
		}

		console.log(action);

		switch (action) {
			case 'load':
				_httpServer[0].wss.broadcast('praes_load', value);
				console.log('praes_load', value);
				break;
			case 'end':
				_httpServer[0].wss.broadcast('praes_end',);
				break;
			case 'play':
				_httpServer[0].wss.broadcast('praes_play');
				break;
			case 'pause':
				_httpServer[0].wss.broadcast('praes_pause');
				break;
			case 'next':
				_httpServer[0].wss.broadcast('praes_next');
				break;
			case 'prev':
				_httpServer[0].wss.broadcast('praes_prev');
				break;
		}

		res.json(JSON.stringify({ seite: 1 })); return;

	});


	// ---- Verbundene Geräte ADMIN ----
	// get getConnectedClients ADMIN
	router.get('/api/getConnectedClients', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		let ret = [];
		
		_httpServer[0].wss.getOpenSockets().forEach(function each(client) {				
			if(client.wsType) {
				ret.push({"id": client.id, "type": client.wsType});
			}
		});
		_httpsServer[0].wss.getOpenSockets().forEach(function each(client) {
			if(client.wsType) {
				ret.push({"id": client.id, "type": client.wsType});
			}
		});

		res.json(ret); return;

	});
	
	// set setClientAction ADMIN
	router.get('/api/setClientAction', async function (req, res) {
		if (!req.session.isAdmin) {
			res.status(500).send({ error: 'Kein Admin' });
			return;
		}

		let id = req.query.id;
		let action = req.query.action;
		let value = req.query.value;
		if (!action || !id) {
			res.status(500).send({ error: 'No Params' });
			return;
		}

		let dat = "";
		switch (action) {
			case 'kalElem': // 3
				dat = "kal_elemnum|"+value;
				break;
			case 'kalReload': // 3
				dat = "kal_reload|";
				break;
			case 'reload': // 0
				dat = "reload|";
				break;
			case 'letzteralarm': // 1
				dat = "letzteralarm|";
				break;
			case 'zurueck': // 5
				dat = "zurueck|";
				break;
			case 'restart': // 5
				dat = "rebootScreen";
				break;
		}
		_httpServer[0].wss.sendToID(id, dat);
		_httpsServer[0].wss.sendToID(id, dat);

		res.json("ok"); return;

	});
	
	// ---- Service Worker ----
	router.get('/appClient.js', function (req, res) {
		res.render('appClient', {
			page: '',
			data: {
				VAPID_PUBLIC: process.env.VAPID_PUBLIC
			}
		});
	});
	router.get('/appWorker.js', async function (req, res) {
		let rows = await db.getStatus(req.session.telegramID).catch((err) => { console.error('[appIndex] DB Fehler', err) });
		if (rows == undefined) {
			res.send("Fehler");
			return;
		}

		res.setHeader('Content-Type', 'application/javascript');
		res.render('appWorker', {
			page: '',
			data: {
				telegramID: req.session.telegramID
			}
		});
	});

	router.post('/subscribe', function (req, res) {

		// Note: In this route we only check for an endpoint. If you require payload support, make sure you check for the auth and p256dh keys as well.
		const isValidSaveRequest = (req, res) => {
			// Check the request body has at least an endpoint.
			if (!req.body || !req.body.endpoint) {
				// Not a valid subscription.
				res.status(400);
				res.setHeader('Content-Type', 'application/json');
				res.send(JSON.stringify({
					error: {
						id: 'no-endpoint',
						message: 'Subscription must have an endpoint.'
					}
				}));
				return false;
			}
			return true;
		};
		isValidSaveRequest(req, res);

		if (webNotifications.subscribe(req.session.telegramID, JSON.stringify(req.body))) {
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify({ data: { success: true } }));
		} else {
			res.status(500);
			res.setHeader('Content-Type', 'application/json');
			res.send(JSON.stringify({
				error: {
					id: 'unable-to-send-messages',
					message: `We were unable to send messages to all subscriptions : ` +
						`'${err.message}'`
				}
			}));
		}
	});



	return router;
}