'use strict';

module.exports = function () {

	// ----------------  STANDARD LIBRARIES ---------------- 
	const express = require('express');
	const router = express.Router();
	
	// ----------------  Datenbank ---------------- 
	const db = require('../database')();


	// ----------------  ROUTEN ---------------- 

	// Index
	router.get('/', function (req, res) {
    	res.redirect('/app/auto/index.html');    
	});
	router.get('/index.html', async function (req, res) {
		let isAlarm = await db.getIsAlarm()
			.catch((err) => {
				console.error('[AppIndex] Datenbank Fehler', err);
			});

		let alarm = 'false';
		if (isAlarm != undefined && isAlarm.length > 0)
			alarm = 'true';

		res.render('appAuto', {
			page: '',
			data: {
				alarm: alarm,
				alarmID: (alarm == 'true' ? isAlarm[0].id : -1),
				isAuto: req.session.isAuto,
				autoname: req.session.autoname,
				autoid: req.session.autoid,
			}
		});
	});

	router.get('/offline.html', function (req, res) {
		res.render('appOffline', {
			page: '',
			data: {
				INFOTEXT: "APP " + process.env.FW_NAME_BOT
			}
		});
	});

	return router;
}