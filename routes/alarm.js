'use strict';
// ----------------  STANDARD LIBRARIES ---------------- 
var express = require('express');
var router = express.Router();

// ----------------  Datenbank ---------------- 
const db = require('../database')();


// ---------------- ROUTEN ----------------	
router.get('/alarm', async function (req, res, alarmMan) {
	let rows = await db.getLastAlarm();
	let rowsVerv = await db.getStatusAll();

	var st_nichtverf = [];
	var st_nichtverfID = [];

	rowsVerv.forEach(function (element) {
		if (element.allowed == 1) {
			if (element.status == 2) {
				st_nichtverf.push(element.name + " " + element.vorname);
				st_nichtverfID.push("st_" + (element.name + " " + element.vorname).replace(/ /g, "_"));
			}
		}
	});

	res.render('alarm', {
		page: 'alarm', alarmdata: {
			'time': rows[0].date,
			'EINSATZSTICHWORT': rows[0].einsatzstichwort,
			'SCHLAGWORT': rows[0].schlagwort,
			'OBJEKT': rows[0].objekt,
			'BEMERKUNG': rows[0].bemerkung,
			'STRASSE': rows[0].strasse,
			'ORTSTEIL': rows[0].ortsteil,
			'ORT': rows[0].ort,
			'LAT': rows[0].lat,
			'LNG': rows[0].lng,
			'cars1': rows[0].cars1.split(","), 'cars2': rows[0].cars2.split(","),
			'VISIBLETIME': process.env.ALARM_VISIBLE,
			"st_nichtverf": st_nichtverf,
			"st_nichtverfID": st_nichtverfID,
			"noMap": (rows[0].strasse == "" && rows[0].isAddress == false ? true : false),
			"ISADDRESS": rows[0].isAddress
		}
	});
});

module.exports = router;
