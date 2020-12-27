'use strict';

// Modul HTTPS Server: APP
var self = module.exports = function (_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm) {

	const debug = require('debug')('httpsServer'); 
	const debugWSS = require('debug')('wss');
    const logger = require('morgan');
    const https = require('https');
    const tls = require('tls');
    const express = require('express');
    const session = require('express-session');
    const memoryStore = require('memorystore')(session)       
    const cookieParser = require('cookie-parser')
    const bodyParser = require('body-parser');
    const favicon = require('serve-favicon');   
    const WebSocket = require('ws');
    const path = require('path');   
    const fs = require('fs');


    // ----------------  SESSION STORE ---------------- 
    var sessionStore = new memoryStore({
		checkPeriod: 86400000 // clear expired every 24h
	});
	var telegramidTOsessionid = new Map();

	var addSession = function (sess, telegramid) {
		telegramid = String(telegramid);
		telegramidTOsessionid.set(telegramid, sess);
		console.log("mapped " + telegramidTOsessionid.get(telegramid) + " to " + telegramid);
	}

	var destroySession = function (telegramid) {
		telegramid = String(telegramid);
		var sessionid = telegramidTOsessionid.get(parseInt(telegramid));
		sessionStore.destroy(sessionid, () => { console.log("Session from " + parseInt(telegramid) + " destroyed " + sessionid) });
		telegramidTOsessionid.set(parseInt(telegramid), undefined);
	}

	var activeSessions = function (telegramid) {
		telegramid = String(telegramid);
		return new Promise(async (resolve, reject) => {
			var sessionid = telegramidTOsessionid.get(parseInt(telegramid));
			sessionStore.get(sessionid, (error, session) => {

				if (error) reject(error);

				if (session != undefined) {
					resolve(true);
				} else {
					resolve(false);
				}

			});
		});
	}
	
	// ----------------  VARIABLEN ---------------- 
	var wss;
	var appHTTPS;
    
    // ---------------- HTTPS Server ----------------
    if (process.env.APP_DNS != "") {
        
        // ----------------  TLS ---------------- 
        var secureContext;
		function reloadCert() {
			secureContext = tls.createSecureContext({
				key: fs.readFileSync(process.env.HTTPS_KEY, 'utf8'),
				cert: fs.readFileSync(process.env.HTTPS_CERT, 'utf8')
			});
		}
		reloadCert();
		setInterval(reloadCert, 1000 * 60 * 60 * 24);

        var httpsOptions = {
            SNICallback: function (domain, cb) {
                if (secureContext) {
                    cb(null, secureContext);
                } else {
                    throw new Error('No keys/certificates for domain requested ' + domain);
                }
            },
            // must list a default key and cert because required by tls.createServer()
            key: fs.readFileSync(process.env.HTTPS_KEY, 'utf8'), 
            cert: fs.readFileSync(process.env.HTTPS_CERT, 'utf8'), 
        }
        debug("HTTPS Key und Cert geladen");

		// ----------------  Express ---------------- 
		appHTTPS = express();
		appHTTPS.set('views', path.join(__dirname, 'views'));
		appHTTPS.set('view engine', 'ejs');
		appHTTPS.use(favicon(__dirname + '/filesPublic/favicon.ico'));
		//appHTTP.use(logger('dev')); //uncomment for DEBUG
		appHTTPS.use(bodyParser.json());
		appHTTPS.use(bodyParser.urlencoded({ extended: false }));
		appHTTPS.use(cookieParser())		
		appHTTPS.use(express.json({ limit: '300kb' })); // body-parser defaults to a body size limit of 100kb
		appHTTPS.use(session({
			secret: process.env.BOT_TOKEN,
			name: 'FWmonitor',
			store: sessionStore,
			saveUninitialized: false,
			resave: false,
			cookie: {
				secure: true,
				httpOnly: true,
				path: '/',
//				sameSite: true,  IOS Fehler, keine Ahnung warum
//				maxAge: (1000 * 60 * 30),
				rolling: true
			}
		}));

        // ----------------  SERVER STARTEN ---------------- 
		var serverHTTPS = https.createServer(httpsOptions, appHTTPS);
		serverHTTPS.listen(process.env.HTTPS_PORT, function () {
			console.log('[APP] APP server listening on port ' + serverHTTPS.address().port);
        });
        
		// ---------------- Express Routen ----------------
	    var routesApp = require('./routes/appIndex')(_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm);

		appHTTPS.use(express.static(path.join(__dirname, 'filesPublic')));
		appHTTPS.use('/app', routesApp);

		appHTTPS.use(function (err, req, res, next) {
			console.error(err.message);
			res.status(err.status || 500);
			res.render('error', {
				message: err.message,
				error: {}
			});
		});

		// ---------------- WebSocket IO ----------------
		wss = new WebSocket.Server({ server: serverHTTPS });

		wss.getUniqueID = function () {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			}
			return s4() + s4() + '-' + s4();
		};

		wss.on('connection', function connection(ws) {
			ws.interval = setInterval(function(){ 
				ws.send('keepAlive|' + String(new Date().toISOString()).replace(/[:]/g, '-')); 	
				debugWSS('keepAlive|' + String(new Date().toISOString()).replace(/[:]/g, '-')); 	
				if (ws.readyState === WebSocket.CLOSED) {
					clearInterval(ws.interval);
					ws.terminate();
				}
			}, 15000);

			ws.on('message', function incoming(message) {
				if (message == "keepAlive") {
					ws.send('keepAlive|' + String(new Date().toISOString()).replace(/[:]/g, '-')); 	
					return;
				}
				if(message.indexOf('WebClient') != -1) {
					ws.wsType = message;		
					ws.id = wss.getUniqueID();			
				}
				debugWSS('Websocket HTTPS received: %s', message);
			});

			ws.on('close', function close() {
				clearInterval(ws.interval);
				debugWSS('Websocket HTTPS disconnect');
			});

			//ws.send('Hallo|Client', function(error) { console.log("[App] wsSend Websocket Err: "+ error) });
		});

		wss.broadcast = function broadcast(topic, data) {
			wss.clients.forEach(function each(client) {				
				if (client.readyState === WebSocket.OPEN) {
//					if(client.wsType) console.log('Broadcast zu', client.wsType);
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
			debugWSS('Websocket HTTPS Fehler ' + error)
		})
	
	}    

    return {
        addSession,
        destroySession,
		activeSessions,
		wss
    };
}