'use strict';

// Modul HTTP Server: Alarm Bildschirm
module.exports = function (_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm) {

    const debugWSS = require('debug')('wss');
    const logger = require('morgan');
    const http = require('http');
    const express = require('express');
    const session = require('express-session');
    const memoryStore = require('memorystore')(session)       
    const cookieParser = require('cookie-parser')
    const bodyParser = require('body-parser');
    const favicon = require('serve-favicon');   
    const WebSocket = require('ws');
    const path = require('path');   

    // ----------------  VARIABLEN ---------------- 
    var appHTTP;
    var serverHTTP;
    var wss;

    // ----------------  Express ---------------- 
	appHTTP = express();
	appHTTP.set('views', path.join(__dirname, 'views'));
	appHTTP.set('view engine', 'ejs');
	appHTTP.use(favicon(__dirname + '/filesPublic/favicon.ico'));
	//appHTTP.use(logger('dev')); //uncomment for DEBUG
	appHTTP.use(bodyParser.json());
	appHTTP.use(bodyParser.urlencoded({ extended: false }));
    appHTTP.use(cookieParser())	
	appHTTP.use(session({
		secret: process.env.BOT_TOKEN,
		store: new memoryStore({
			checkPeriod: 86400000 // clear expired every 24h
		}),
		saveUninitialized: false,
		resave: false,
		cookie: {
			secure: false,
			httpOnly: true,
			path: '/',
			sameSite: true,
			maxAge: (1000 * 60 * 15)
		}
	}));

	// ---------------- HTTP Routen ----------------
	appHTTP.use(express.static(path.join(__dirname, 'filesPublic')));
	appHTTP.use(express.static(path.join(__dirname, 'filesHTTP')));
	var routesIndex = require('./routes/index');
	var routesAlarm = require('./routes/alarm');
	var routesPrint = require('./routes/print');
	appHTTP.use('/', routesPrint);
	appHTTP.use('/', routesIndex);
	appHTTP.use('/', routesAlarm);

	// ---------------- HTTP Server starten ----------------
	serverHTTP = http.createServer(appHTTP);
	serverHTTP.listen(process.env.HTTP_PORT, function () {
		console.log('[APP] Bildschirm server listening on port ' + serverHTTP.address().port);
	});
	

	// ---------------- WebSocket IO ----------------
	wss = new WebSocket.Server({ server: serverHTTP });

	wss.getUniqueID = function () {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		}
		return s4() + s4() + '-' + s4();
	};

	wss.on('connection', function connection(ws) {
		ws.interval = setInterval(function(){ 
			ws.send('keepAlive|' + String(new Date().toISOString()).replace(/[-,:;TZ]/g, ':')); 			
			debugWSS('keepAlive|' + String(new Date().toISOString()).replace(/[-,:;TZ]/g, ':'));		
			if (ws.readyState === WebSocket.CLOSED) {
				clearInterval(ws.interval);
				ws.terminate();
			}
		}, 15000);

		ws.on('message', function incoming(message) {
			if (message == "keepAlive") {
				ws.send('keepAlive|OK%'+String(new Date().toISOString()).replace(/[-,:;TZ]/g, ':'));
				return;
			}
			if(message.indexOf('WebClient') != -1) {
				ws.wsType = message;
				ws.id = wss.getUniqueID();
			}
			if(message.indexOf('PySteuerClient') != -1) {
				ws.wsType = message;
				ws.id = wss.getUniqueID();
			}
			debugWSS('Websocket received: %s', message);
		});

		ws.on('close', function close() {
			clearInterval(ws.interval);
			debugWSS('Websocket disconnect');
		});

		//ws.send('Hallo|Client', function(error) { console.log("[App] wsSend Websocket Err: "+ error) });
	});

	wss.broadcast = function broadcast(topic, data) {
		wss.clients.forEach(function each(client) {
			if (client.readyState === WebSocket.OPEN) {
//				if(client.wsType) console.log('Broadcast zu', client.wsType);
				client.send(topic + "|" + data);
			}
		});
	};

	wss.sendToID = function sendToID(id, data) {
		wss.clients.forEach(function each(client) {				
			if (client.readyState === WebSocket.OPEN) {
				if(client.id == id)
					client.send( data);
			}
		});
	};

	wss.getOpenSockets = function getOpenSockets() {
		let socks = [];
		wss.clients.forEach(function each(client) {
			if (client.readyState === WebSocket.OPEN) {
				socks.push(client);
			}
		});		
		return socks;
	};

	wss.on('error', function (error) {
		debugWSS('Websocket Fehler ' + error)
    })
    

    // ---------------- HTTP Routen ----------------
	appHTTP.use(express.static(path.join(__dirname, 'filesPublic')));
	appHTTP.use(express.static(path.join(__dirname, 'filesHTTP')));
	var einstell = require('./routes/einstell')(_bot, _httpsServer);
	var routesIndex = require('./routes/index');
	var routesAlarm = require('./routes/alarm');
	var routesPrint = require('./routes/print');
	appHTTP.use('/', routesPrint);
	appHTTP.use('/', routesIndex);
	appHTTP.use('/', routesAlarm);
	appHTTP.use('/', einstell);

    appHTTP.use(express.static(path.join(__dirname, 'filesPublic')));

	var routesApp = require('./routes/appIndex')(_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm);
	appHTTP.use('/app', routesApp);


    

  return {
      wss
  };
}