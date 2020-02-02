// Modul Alarmverarbeitung
module.exports = function (wss, bot) {

    const Database = require('sqlite-async');
    const fs = require('fs');
    var geobing = require('geobing');
    const moveFile = require('move-file');
	
	var RASPIVERSION = process.env.RASPIVERSION;
    geobing.setKey(process.env.GEOBING_KEY);
    
	
	// ---------------- WebSocket Broadcast ----------------
    function broadcast(server, topic, msg) {
        server.connections.forEach(function (conn) {
            conn.sendText(topic + "|" + msg);
        });
    }

	// ---------------- Fax Filter (RegEx) ----------------
    var EINSATZSTICHWORT = "-/-"; 				// Variable
    var s_EINSATZSTICHWORT = "Stichwort : ";	// Filter Beginn
    var e_EINSATZSTICHWORT = "\n";				// Filter Ende
    var SCHLAGWORT = "-/-";
    var s_SCHLAGWORT = "Schlagw. : ";
    var e_SCHLAGWORT = "\n";
    var OBJEKT = "-/-";
    var s_OBJEKT = "Objekt : ";
    var e_OBJEKT = "\n";
    var BEMERKUNG = "-/-";
    var s_BEMERKUNG = "BEMERKUNG";
    var e_BEMERKUNG = "EINSATZHINWEIS";
    var STRASSE = "-/-";
    var s_STRASSE = "Straße : ";
    var e_STRASSE = "\n";
    var ORTSTEIL = "-/-";
    var s_ORTSTEIL = "Ortsteil : ";
    var e_ORTSTEIL = "\n";
    var ORT = "-/-";
    var s_ORT = "Gemeinde : ";
    var e_ORT = "\n";
    var EINSATZMITTEL = "";
    var s_EINSATZMITTEL = "EINSATZMITTEL";
    var e_EINSATZMITTEL = "BEMERKUNG";
    var cars1 = [];								// Fahrzeuge eigen
    var cars2 = [];								// Fahrzeuge andere
    var s_CAR = "Name : ";
    var e_CAR = "\n";
    var CAR1 = process.env.FW_NAME;

	
	// ---------------- Textsuche ----------------
    function searchElement(start, end, data) {
        var s = data.search(start);
        if (s >= 0) {
            s += start.length;
            var e = data.slice(s).search(end);
            var elem = data.slice(s, s + e);
            return elem;
        }
        return null;
    }


	// ---------------- Dateiverarbeitung ----------------
    function parseFile(path) {        
        fs.readFile(path, 'utf8', function (err, data) {
            if (err) throw err;
            console.log('[AlarmManager] Datei OK: ' + path);

			// Datei in Archiv verschieben
			var targetPath = process.env.FOLDER_ARCHIVE + "/" + path.split(/[/\\]/g).pop();
            (async () => {
                await moveFile(path, targetPath);
                console.log('[AlarmManager] Fax ins Archiv verschoben.');
            })();

			// Faxfilter anwenden
			var regex = RegExp(process.env.FAXFILTER,'gi');
			if(!regex.test(data)) {
				console.log('[AlarmManager] Faxfilter nicht gefunden -> kein Alarm');
				return;
			}
			console.log('[AlarmManager] Faxfilter OK -> Alarm');

			// Variablen leeren
            EINSATZSTICHWORT = "-/-";
            SCHLAGWORT = "-/-";
            OBJEKT = "-/-";
            BEMERKUNG = "-/-";
            STRASSE = "-/-";
            ORTSTEIL = "-/-";
            ORT = "-/-";
            EINSATZMITTEL = "-/-";
            cars1 = [];
            cars2 = [];
			
			// Daten bereinigen
			data = data.replace(/[—_*`]/g, '-');

			// Daten Filtern
            EINSATZSTICHWORT = searchElement(s_EINSATZSTICHWORT, e_EINSATZSTICHWORT, data);
			if(EINSATZSTICHWORT == null) EINSATZSTICHWORT = "";
			
            var SCHLAGWORT = searchElement(s_SCHLAGWORT, e_SCHLAGWORT, data);
			if(SCHLAGWORT == null) SCHLAGWORT = "";
            SCHLAGWORT = SCHLAGWORT.replace('#', ' ');
            SCHLAGWORT = SCHLAGWORT.substr(SCHLAGWORT.search('#'));
            SCHLAGWORT = SCHLAGWORT.replace(/#/g, ' ');
			
            OBJEKT = searchElement(s_OBJEKT, e_OBJEKT, data);
			if(OBJEKT == null) OBJEKT = "";
			
            BEMERKUNG = searchElement(s_BEMERKUNG, e_BEMERKUNG, data);
			if(BEMERKUNG == null) BEMERKUNG = "";
            BEMERKUNG = BEMERKUNG.replace(/-/g, '');
			
            STRASSE = searchElement(s_STRASSE, e_STRASSE, data);
			if(STRASSE == null) STRASSE = "";
			
            ORTSTEIL = searchElement(s_ORTSTEIL, e_ORTSTEIL, data);
			if(ORTSTEIL == null) ORTSTEIL = "";
			
            ORT = searchElement(s_ORT, e_ORT, data);
			if(ORT == null) ORT = "";
			
            EINSATZMITTEL = searchElement(s_EINSATZMITTEL, e_EINSATZMITTEL, data);
			if(EINSATZMITTEL == null) EINSATZMITTEL = "";
            EINSATZMITTEL = EINSATZMITTEL.replace(/-/g, '');

            var cars = EINSATZMITTEL.split("\n");

            for (let i in cars) {
                var c = searchElement(s_CAR, e_CAR, cars[i] + "\n");
                
                if (c != null) {                    
                    if (c.indexOf(CAR1) != -1)
                        cars1.push(c);
                    else
                        cars2.push(c);
                }
            }

            // Geocoding (mit GeoBing)
            geobing.getCoordinates('Germany, Bayern, ' + STRASSE + ", " + ORT, function (err, coordinates) {
                console.log('[AlarmManager] [GeoBing] lat: ', coordinates.lat, 'lng: ', coordinates.lng);

				// Daten in Datenbank schreiben
                Database.open('save.sqlite3')
                    .then(db => {
                        db.prepare('INSERT INTO alarms ("date","einsatzstichwort","schlagwort","objekt","bemerkung","strasse","ortsteil","ort", "lat", "lng", "cars1", "cars2") VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
                            .then(_statement => {
                                statement = _statement
                                var now = new Date();
                                statement.bind(
                                    now.toISOString(),
                                    EINSATZSTICHWORT,
                                    SCHLAGWORT,
                                    OBJEKT,
                                    BEMERKUNG,
                                    STRASSE,
                                    ORTSTEIL,
                                    ORT,
                                    coordinates.lat,
                                    coordinates.lng,
                                    cars1.toString(),
                                    cars2.toString());

                                statement.run();

								// Alarm senden
                                setTimeout(function () {                                    
                                    wss.broadcast("alarm", process.env.ALARM_VISIBLE);
									
                                    bot.sendAlarm(
                                        EINSATZSTICHWORT,
                                        SCHLAGWORT,
                                        OBJEKT,                                        
                                        STRASSE,
                                        ORTSTEIL,
                                        ORT,
                                        BEMERKUNG,
                                        cars1.toString(),
                                        cars2.toString(),
                                        coordinates.lat,
                                        coordinates.lng,
										targetPath);
                                }, 3000);
								
								// zur sicherheit noch ein paar mal
                                setTimeout(function () {
                                    wss.broadcast("alarm", process.env.ALARM_VISIBLE);
                                }, 500);
                                setTimeout(function () {
                                    wss.broadcast("alarm", process.env.ALARM_VISIBLE);
                                }, 700);
                                setTimeout(function () {
                                    wss.broadcast("alarm", process.env.ALARM_VISIBLE);
                                }, 1000);
                                setTimeout(function () {
                                    wss.broadcast("alarm", process.env.ALARM_VISIBLE);                                
                                }, 1200);
                                setTimeout(function () {
                                    wss.broadcast("alarm", process.env.ALARM_VISIBLE);
                                }, 1500);
                                setTimeout(function () {
                                    wss.broadcast("alarm", process.env.ALARM_VISIBLE);
                                }, 2000);
                                setTimeout(function () {
                                    wss.broadcast("alarm", process.env.ALARM_VISIBLE);
                                }, 2500);
								
								
								// Ausdruck erzeugen
								function timeout(ms) {
									return new Promise(resolve => setTimeout(resolve, ms));
								}
								 
								const puppeteer = require('puppeteer');								
								if(process.env.ALARMDRUCK == 'true') {
									(async () => {										 
										const browser = await puppeteer.launch()
										const page = await browser.newPage()

										await page.goto('http://127.0.0.1/print?varEINSATZSTICHWORT=' + EINSATZSTICHWORT +
											"&varSCHLAGWORT=" + SCHLAGWORT +
											"&varOBJEKT=" + OBJEKT +
											"&varBEMERKUNG=" + BEMERKUNG +
											"&varSTRASSE=" + STRASSE +
											"&varORTSTEIL=" + ORTSTEIL +
											"&varORT=" + ORT +
											"&lat=" + coordinates.lat +
											"&lng=" + coordinates.lng
										);
										
										// Ausdruck PDF erstellen
										await timeout(30000);
										const pdf = await page.pdf({path: './temp/druck.pdf', format: 'A4', margin: 0, printBackground: true });										 
										await browser.close() 
										
										// Ausdruck der erstellten PDF
										if(RASPIVERSION == "false") {
											if(process.env.GSPFAD != "") {
												var exec = require('child_process').exec;
												var cmd = '\"'+process.env.GSPFAD+'\" -dBATCH -dNOPAUSE -dNumCopies=1 -sDEVICE=mswinpr2 -dNoCancel -dNOPROMPT -sPAPERSIZE=a4 -dPDFFitPage -dQUIET ' +
													'-sOutputFile=\"%printer%'+process.env.DRUCKERNAME+'\" \"temp/druck.pdf\"';
												console.log("[AlarmManager] " + cmd);
												exec(cmd, function(error, stdout, stderr) {
												   console.log("[AlarmManager] " + stdout) 
												   console.log("[AlarmManager] " + stderr) 
												});
											}
											if(process.env.AREADER != "") {
												var exec = require('child_process').exec;
												var cmd = '\"'+process.env.AREADER+'\" /p \"temp/druck.pdf\"';
												console.log("[AlarmManager] " + cmd);
												exec(cmd, function(error, stdout, stderr) {
												   console.log("[AlarmManager] " + stdout) 
												   console.log("[AlarmManager] " + stderr) 
												});
											}
										} else {
											
											setTimeout(function() {
												console.log('lp -d '+process.env.DRUCKERNAME+' \"temp/druck.pdf\"');
												var exec = require('child_process').exec;
												exec('lp -d '+process.env.DRUCKERNAME+' \"temp/druck.pdf\"', function(err, stdout, stderr) {
													  if (err) {
														console.log('error:', err) 
													  }
													  console.log("stdout -> " + stdout);
													  console.log("stderr -> " + stderr);
													});
											}, 100);
											
										}
									 
									})();								 
								}
                               
                            }).catch(err => {
                                console.error("[AlarmManager] Database error: " + err);
                            })
                    })
                    .catch(err => {
                        console.error("[AlarmManager] Database error: " + err);
                    })

            }, { key: process.env.GEOBING_KEY});


        });
    }


	// Letzten Alarm aus Datenbank lesen
    const getLastAlarm = function () {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all('SELECT * FROM alarms ORDER BY id DESC LIMIT 1;').then(rows => {
                        resolve(rows);
                    })
                })
                .catch(err => {
                    console.error("[AlarmManager] Database error: " + err);
                })
        });
    }

    return {
        parseFile: parseFile,
        getLastAlarm: getLastAlarm
    }; 

}