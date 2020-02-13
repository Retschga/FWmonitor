'use strict';
require('dotenv').config();

var RASPIVERSION = process.env.RASPIVERSION;

const debug = require('debug');
const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const fs = require('fs');
const { promisify } = require('util');
const stat = promisify(fs.stat);




// ----------------  Fehlerausgabe ---------------- 
process.on('uncaughtException', function (err) {
    console.log('[App] Caught exception: ', err);
});


// ---------------- Startinfo ---------------- 
(async () => {
	console.log("\n\n    --------------------------------------------------------------");
	console.log("    |            Feuerwehr Einsatzmonitor Software               |");
	console.log("    |                                                            |");
	console.log("    |                (c) 2019  FF Fischbachau                    |");
	console.log("    |                                                            |");
	console.log("    |                                                            |");
	console.log("    |               weitere Infos: siehe Readme                  |");
	console.log("    |                                                            |");
	console.log("    --------------------------------------------------------------\n");
	
	console.log("    --------------------------------------------------------------");
	console.log("                            Einstellungen                         \n");
	console.log("    FAX:                                                      ");
	
	// Prüfe Eingansordner
	try {
		var stats  = await stat(process.env.FOLDER_IN);
		console.log("     Eingang: "+process.env.FOLDER_IN+" -> OK");
    } catch (err) {
		console.error("     Eingang: "+process.env.FOLDER_IN+" -> Fehler");
    }
	
	// Prüfe Archivordner
	try {
		var stats  = await stat(process.env.FOLDER_IN);
		console.log("     Archiv: "+process.env.FOLDER_ARCHIVE+" -> OK");
    } catch (err) {
		console.error("     Archiv: "+process.env.FOLDER_ARCHIVE+" -> Fehler");
    }	
	
	// Gebe Filtereinstellungen aus
	console.log("     Fax Filter: "+process.env.FAXFILTER+"");
	console.log("     Einsatzmittel Filter: "+process.env.FW_NAME+"");

	// Prüfe Ausdruckeinstellungen
	console.log("\n    Ausdruck: " + (process.env.ALARMDRUCK == "true" ? " -> Ja" : " -> Nein"));
	if(process.env.ALARMDRUCK == "true") {
		if(process.env.GSPFAD == "" && process.env.AREADER == "")
			console.error("     Programm: keines -> Fehler");
		if(process.env.GSPFAD != "")
			try {
				var stats  = await stat(process.env.GSPFAD);
				console.log("     Programm: "+process.env.GSPFAD+" -> OK");
			} catch (err) {
				console.error("     Programm: "+process.env.GSPFAD+" -> Fehler");
			}	
		if(process.env.AREADER != "")
			try {
				var stats  = await stat(process.env.AREADER);
				console.log("     Programm: "+process.env.AREADER+" -> OK");
			} catch (err) {
				console.error("     Programm: "+process.env.AREADER+" -> Fehler");
			}	
		console.log("     Druckername: "+process.env.DRUCKERNAME);
	}	
	
	// Gebe Diashoweinstellungen aus
	console.log("\n    Anzeige:                                                      ");
	console.log("     Diashow Wechselzeit: "+(process.env.DIASHOW_DELAY / 1000)+" Sekunden");
	console.log("     Diashow Zufällig: "+(process.env.DIASHOW_RANDOM == "true" ? "Ja" : "Nein"));
	console.log("     FW Name: "+process.env.FW_NAME_STANDBY);

	// Prüfe Diashow Ordner
	try {
		var stats  = await stat(process.env.BOT_IMG);
		console.log("     Bilderordner: "+process.env.BOT_IMG+" -> OK");
	} catch (err) {
		console.error("     Bilderordner: "+process.env.BOT_IMG+" -> Fehler");
	}	
	
	// Gebe Telegrammeinstellungen aus
	console.log("\n    Telegram:                                                      ");
	console.log("     Sende Alarme: "+(process.env.BOT_SENDALARM == "true" ? "Ja" : "!!! Nein !!!"));
	
	console.log("\n    --------------------------------------------------------------\n\n\n\n");
})();



// ---------------- Programmstart ----------------


const Database = require('sqlite-async');
Database.open('save.sqlite3')
	.then(db => {
		db.all("create table if not exists statistik (date TEXT, aktion INTEGER, user TEXT)").then(rows => {
			console.error("[APP] Creadted Datatable Statistik");
		}).catch(err => {
			console.error("[APP] Database error: " + err);
		})
		
	})
	.catch(err => {
		console.error("[APP] Database error: " + err);
	})
	


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));   // DEBUG
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));



// ---------------- HTML Routen ----------------
var routes = require('./routes/index');
var alarm = require('./routes/alarm');
var print = require('./routes/print');
app.use('/', print);
app.use('/', routes);
app.use('/', alarm);



// ---------------- WebSocket IO ----------------
const wss = new WebSocket.Server({ port: 8080 });
 
wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('[App] Websocket received: %s', message);
  });
  
  ws.on('close', function close() {
    console.log('[App] Websocket disconnect');
  });
 
  ws.send('Hallo|Client', function(error) { console.log("[App] Websocket Err: "+ error) });
});

// Broadcast to all.
wss.broadcast = function broadcast(topic, data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(topic + "|" + data);
    }
  });
};

wss.on('error', function(error) {
	console.log("[App] Websocket Err: " + error)
})


// ---------------- Bot und Alarmmanager starten ----------------
var bot = require('./telegramBot')(wss);
var alarmMan = require('./alarmManager')(wss, bot);

var einstell = require('./routes/einstell')(bot);
app.use('/', einstell.router);



// ---------------- error handlers ----------------

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    console.error(err.message);
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});



// ---------------- Server starten ----------------
app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function () {
    debug('Express server listening on port ' + server.address().port);
});



// ---------------- Verzeichnisüberwachung ----------------
setTimeout(function() {

	if(RASPIVERSION == "false") {
		
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
			
			let current_datetime = new Date()
			console.log("\n"+ current_datetime.toString());
			console.log(`[App] File ${path} has been added`); 
			alarmMan.parseFile(path);   

		 });
		 
	} else { 
	
		// ---------------- Raspberry PI Version ----------------
		console.log("[APP] Raspberry Pi Version gestartet"); 

		var sys = require('sys')
		var exec = require('child_process').exec;

		// Raspi Version
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
			
			let current_datetime = new Date()
			console.log("\n"+ current_datetime.toString());
			console.log(`[App] File ${path} has been added`); 
			
			var delay = 20000;
			
			if(path.split('.')[1] == "tiff" || path.split('.')[1] == "tif") {

				var file = process.env.FOLDER_ARCHIVE + "/" + String(path).split("/").pop();
				var d = new Date().toLocaleTimeString();
				
				// Dateirechte setzen
				setTimeout(function() {
					console.log(`[App] ${d} sudo chmod 777 ${path}`);
					exec(`sudo chmod 777 ${path}`, function(err, stdout, stderr) {
						  if (err) {
							console.log('error:', err) 
						  }
						  console.log("stdout -> " + stdout);
						  console.log("stderr -> " + stderr);
						});
				}, delay);
				
				// Datei ins Archiv verschieben
				delay += 2000;
				setTimeout(function() {
					
					console.log(`[App] ${d} sudo mv ${path} ` + process.env.FOLDER_ARCHIVE);
					exec(`sudo mv ${path} ` + process.env.FOLDER_ARCHIVE, function(err, stdout, stderr) {
						  if (err) {
							console.log('error:', err) 
						  }
						  console.log("stdout -> " + stdout);
						  console.log("stderr -> " + stderr);
						});
						
					// Datei ausdrucken
					delay = 10000;
					setTimeout(function() {
						console.log(`${d} PDF Druck: sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P PDFPrint`);
						exec(`sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P PDFPrint`, function(err, stdout, stderr) {
						  if (err) {
							console.log('error:', err)
						  }
						  console.log("stdout -> " + stdout);
						  console.log("stderr -> " + stderr);
						});
					}, delay);
						
						
					// Tesseract ausführen
					delay = 20000;
					setTimeout(function() {
						
						console.log("[App] Tesseract!");

						console.log(`[App] ${d} sudo tesseract ${file} -l deu -psm 6 stdout`);
						exec(`sudo tesseract ${file} -l deu -psm 6 stdout`, function(err, stdout, stderr) {
							var text = stdout;
							if (err) {
								console.log('error:', err)
							} else {
								if(text != "" && text != null && text != undefined && text != " ") {

									var arr = String(file).split(".");
									var filePath = arr[arr.length -2];
									
									const fs = require('fs');
									fs.writeFile(filePath + ".txt", text, function(err) {
										if(err) {
											return console.log(err);
									}

									alarmMan.parseFile(filePath + ".txt"); 
									console.log("The file was saved!");
								}); 
							
							}
						  }		  
						
						  console.log("stdout -> " + stdout);
						  console.log("stderr -> " + stderr);
						  
						});

					}, delay);

					// Datei ausdrucken
					delay += 10000;
					setTimeout(function() {
						console.log(`${d} Druck 1: sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`);
						exec(`sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`, function(err, stdout, stderr) {
						  if (err) {
							console.log('error:', err)
						  }
						  console.log("stdout -> " + stdout);
						  console.log("stderr -> " + stderr);
						});
					}, delay);
					
					// Datei nochmal ausdrucken
					delay += 10000;
					setTimeout(function() {		
						console.log(`${d} Druck 2: sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`);
						exec(`sudo /usr/bin/tiff2ps -a -p ${file} |lpr -P Alarmdrucker`, function(err, stdout, stderr) {
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
		 
 
 }, 5000);