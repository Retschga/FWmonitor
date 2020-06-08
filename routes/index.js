'use strict';
var express = require('express');
var router = express.Router();
var fs = require('fs');
var Database = require('sqlite-async')
var calendar = require('../calendar')()

const getStatus = function () {
    return new Promise(resolve => {
        Database.open('save.sqlite3')
            .then(db => {
                db.all('SELECT * FROM users ORDER BY "name" ASC, "vorname" ASC').then(rows => {
                    resolve(rows);
                }).catch(err => {
                    console.error("Database error: " + err);
                })
            })
            .catch(err => {
                console.error("Database error: " + err);
            })
    });
}

router.get('/kalender', function (req, res) {
    calendar.getCalendarString().then((termine) => {
			
			var str = "";
			
			for(var i = 0; i < termine.length; i++) {
				str += termine[i] + "<br>";
			}
		
			res.send(str)
	
		});  
});


/* GET home page. */
router.get('/', function (req, res) {
    var path = "./public/images/slideshow/";
    var src = [];

    fs.readdir(path, function (err, items) {
        for (var i = 0; i < items.length; i++) {
            src.push("/images/slideshow/" + items[i]);
        }

        getStatus()
            .then((rows) => {

                var st_verv = [];
                var st_vervID = [];
                var st_nichtverf = [];
                var st_nichtverfID = [];

                rows.forEach(function (element) {
                    if (element.allowed == 1) {
                        if (element.status == 1) {
                            st_verv.push("st_verf|" + element.name + " " + element.vorname + "%" + element.stAGT + "," + element.stGRF + "," + element.stMA + "," + element.stZUGF);
                            st_vervID.push("st_" + (element.name + " " + element.vorname).replace(/ /g, "_"));
                        }
                        else if (element.status == 2) {
                            st_nichtverf.push("st_nichtverf|" + element.name + " " + element.vorname + "%" + element.stAGT + "," + element.stGRF + "," + element.stMA + "," + element.stZUGF);
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
            });
    });
    
});

module.exports = router;
