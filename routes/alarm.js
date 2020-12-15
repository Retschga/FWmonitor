'use strict';
// ----------------  STANDARD LIBRARIES ---------------- 
var express = require('express');
var router = express.Router();

// ----------------  Datenbank ---------------- 
const db = require('../database')();


// ---------------- ROUTEN ----------------	
router.get('/alarm', async function (req, res, alarmMan) {
	let rows_lastAlarm = await db.getAlarmLast();
	let rows_statusAll = await db.getUserStatusAll();

	var st_nichtverf = [];
	var st_nichtverfID = [];

	rows_statusAll.forEach(function (element) {
		if (element.allowed == 1) {
			if (element.status == 2) {
				st_nichtverf.push(element.name + " " + element.vorname);
				st_nichtverfID.push("st_" + (element.name + " " + element.vorname).replace(/ /g, "_"));
			}
		}
	});

	res.render('alarm', {
		page: 'alarm', alarmdata: {
			'time': rows_lastAlarm[0].date,
			'EINSATZSTICHWORT': rows_lastAlarm[0].einsatzstichwort,
			'SCHLAGWORT': rows_lastAlarm[0].schlagwort,
			'OBJEKT': rows_lastAlarm[0].objekt,
			'BEMERKUNG': rows_lastAlarm[0].bemerkung,
			'STRASSE': rows_lastAlarm[0].strasse,
			'ORTSTEIL': rows_lastAlarm[0].ortsteil,
			'ORT': rows_lastAlarm[0].ort,
			'LAT': rows_lastAlarm[0].lat,
			'LNG': rows_lastAlarm[0].lng,
			'cars1': rows_lastAlarm[0].cars1.split(","), 'cars2': rows_lastAlarm[0].cars2.split(","),
			'VISIBLETIME': process.env.ALARM_VISIBLE,
			"st_nichtverf": st_nichtverf,
			"st_nichtverfID": st_nichtverfID,
			"noMap": (rows_lastAlarm[0].strasse == "" && rows_lastAlarm[0].isAddress == false ? true : false),
			"ISADDRESS": rows_lastAlarm[0].isAddress
		}
	});
});

module.exports = router;
