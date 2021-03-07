'use strict';

// Modul Alarmverarbeitung
module.exports = function () {

	// ----------------  STANDARD LIBRARIES ---------------- 
	const fs = require('fs');
	const moveFile = require('move-file');
	const debug = require('debug')('alarmManager');

	const db = require('./database')();
	var geocodeManager = require('./geocodeManager')();
	const EventEmitter = require('events');
	var eventEmitter = new EventEmitter();
	var fields = require('./alarmFax');
	var print = require('./printer')();

	// ---------------- Timeout Funktion ----------------
	function timeout(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	

	function parseFile(path, nofilter) {

		// TXT Datei einlesen
		fs.readFile(path, 'utf8', async function (err, data) {

			// Fehler
			if (err) throw err;

			// Datei OK
			debug('Datei OK: ' + path);

			// Datei in Archiv verschieben
			var targetPath = process.env.FOLDER_ARCHIVE + "/" + path.split(/[/\\]/g).pop();
			await moveFile(path, targetPath);
			debug('Fax ins Archiv verschoben.');

			// Faxfilter anwenden
			var regex = RegExp(process.env.FAXFILTER, 'gi');
			if (!nofilter && !regex.test(data)) {
				debug('Faxfilter nicht gefunden -> kein Alarm');
				return;
			}
			debug('Faxfilter OK -> Alarm');

			// Daten bereinigen
			data = fields.replaceData(data);

			// Daten Filtern
			fields.parseData(data);

			// Geocoding
			var geoData = await geocodeManager.geocode(
				'Germany, Bayern, ' + fields.ORT + ", " + fields.ORTSTEIL + ", " + fields.STRASSE, (/\d/.test(fields.STRASSE) ? true : false), fields.OBJEKT, fields.ORT
			);

			// Daten in Datenbank schreiben
			await db.insertAlarm(
				fields.EINSATZSTICHWORT,
				fields.SCHLAGWORT,
				fields.OBJEKT,
				fields.BEMERKUNG,
				fields.STRASSE,
				fields.ORTSTEIL,
				fields.ORT,
				geoData.lat,
				geoData.lng,
				fields.cars1,
				fields.cars2,
				geoData.isAddress
			);

			// Alarm EVENT auslösen
			eventEmitter.emit(
				"alarm",
				{
					EINSATZSTICHWORT: fields.EINSATZSTICHWORT,
					SCHLAGWORT: fields.SCHLAGWORT,
					OBJEKT: fields.OBJEKT,
					STRASSE: fields.STRASSE,
					ORTSTEIL: fields.ORTSTEIL,
					ORT: fields.ORT,
					BEMERKUNG: fields.BEMERKUNG,
					cars1: fields.cars1,
					cars2: fields.cars2,
					geoData: geoData,
					targetPath: targetPath
				}
			);

			// Alarmusdruck erzeugen
			const puppeteer = require('puppeteer');
			//if (process.env.ALARMDRUCK == 'true') {

				debug('Starte Puppeteer');
				const browser = await puppeteer.launch({args: ['--allow-file-access-from-files', '--enable-local-file-accesses']})
				var page = await browser.newPage()

				// Navigiere puppeteer zu Ausdruck Seite
				await page.goto(
					'http://127.0.0.1:' + process.env.HTTP_PORT + '/print?varEINSATZSTICHWORT=' + fields.EINSATZSTICHWORT +
					"&varSCHLAGWORT=" + fields.SCHLAGWORT +
					"&varOBJEKT=" + fields.OBJEKT +
					"&varBEMERKUNG=" + fields.BEMERKUNG +
					"&varSTRASSE=" + fields.STRASSE +
					"&varORTSTEIL=" + fields.ORTSTEIL +
					"&varORT=" + fields.ORT +
					"&lat=" + geoData.lat +
					"&lng=" + geoData.lng +
					"&isAddress=" + (geoData.isAddress == true ? 1 : 0),
					"&noMap=" + (fields.STRASSE == "" && geoData.isAddress == false ? 1 : 0),
					{waitUntil: 'networkidle2'}
				);

				// Warten bis gerendert
				await timeout(5000);

				debug('Erstelle PDF und JPG');

				// Ausdruck PDF erstellen		
				/*		
				await page.screenshot({
					path: "./temp/druck.jpg",
					type: "jpeg",
					fullPage: true,
					margin: 0
				});

				function base64Encode(file) {
					var bitmap = fs.readFileSync(file);
					return Buffer.from(bitmap).toString('base64');
				}

				page = await browser.newPage();
				const image = 'data:image/png;base64,' + base64Encode('./temp/druck.jpg');
				await page.goto(image, {waitUntil: 'networkidle2'});
				*/
				await page.pdf({ path: './temp/druck.pdf', format: 'A4', margin: 0, printBackground: false });

				await browser.close();

				debug('Fertig');

			if (process.env.ALARMDRUCK == 'true') {
				debug('Fertig -> Drucken');

				for(let i = 0; i < parseInt(process.env.ALARMDRUCKSEITENZAHL); i++) {
					// Drucken
					debug('Seite ' + (i+1) + ' von ' +  process.env.ALARMDRUCKSEITENZAHL);					
					print.print('temp/druck.pdf');
				}				

			}

		});
	}


	return {
		eventEmitter,
		parseFile
	};
}