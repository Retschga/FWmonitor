'use strict';

// ----------------  STANDARD LIBRARIES ---------------- 
var express = require('express');
var router = express.Router();
var fs = require('fs');

// ----------------  Datenbank ---------------- 
const db = require('../database')();

// ----------------  KALENDER ---------------- 
var calendar = require('../calendar')()



// ---------------- ROUTEN ----------------	
// get Kalender
router.get('/api/kalender', async function (req, res) {
	let termine = await calendar.getCalendarByPattern()
		.catch((err) => { console.error('[appIndex] Kalender Fehler', err) });

	res.json(termine);
});

// get /
router.get('/', function (req, res) {
    var path = "./filesHTTP/images/slideshow/";
    var src = [];

    fs.readdir(path, function (err, items) {
		if(err) throw err;
		
        for (var i = 0; i < items.length; i++) {
			if(items[i] != '.gitignore')
				src.push("/images/slideshow/" + items[i]);
        }

        db.getUserStatusAll()
		.then((rows) => {

			var st_verv = [];
			var st_vervID = [];
			var st_nichtverf = [];
			var st_nichtverfID = [];

			rows.forEach(function (element) {
				if (element.allowed == 1 && element.statusHidden != 1) {
					if (element.status == 1) {
						st_verv.push(
							"st_verf|" + element.name + " " + 
							element.vorname + "%" + 
							element.stAGT + "," + 
							element.stGRF + "," + 
							element.stMA + "," + 
							element.stZUGF
						);
						st_vervID.push("st_" + (element.name + " " + element.vorname).replace(/ /g, "_"));
					}
					else if (element.status == 2) {
						st_nichtverf.push(
							"st_nichtverf|" + element.name + " " + 
							element.vorname + "%" + 
							element.stAGT + "," + 
							element.stGRF + "," + 
							element.stMA + "," + 
							element.stZUGF						
						);
						st_nichtverfID.push("st_" + (element.name + " " + element.vorname).replace(/ /g, "_"));
					}
				}
			});

			res.render('index', {
				page: 'index',
				data: {
					"time": process.env.DIASHOW_DELAY,
					"src": src,
					"st_verf": st_verv,
					"st_nichtverf": st_nichtverf,
					"st_vervID": st_vervID,
					"st_nichtverfID": st_nichtverfID,
					"fw_name": process.env.FW_NAME_STANDBY,
					"dwd_warncellid": process.env.DWD_WARCELLID,
					"dwd_showwarnings": process.env.DWD_SHOWWARNINGS,
					"st_verf_hidden": process.env.ST_VERV_HIDDEN,
					"diashowRandom": process.env.DIASHOW_RANDOM,
					"dwd_position": process.env.DWD_WARNINGSPOSITION,
					"diashowAnimation": process.env.DIASHOW_ANIMATION
				}
			});
		})
		.catch((err) => { console.error('[INDEX] Datenbank Fehler ', err) });
    });
	
    
});

router.get('/praes', function (req, res) {    
	res.render('praes', {
		page: 'praes',
		data: {		
			"fw_name": process.env.FW_NAME_STANDBY,   
		}
	});    
});

module.exports = router;
