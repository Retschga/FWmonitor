'use strict';

module.exports = function (_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm) {

	// ----------------  STANDARD LIBRARIES ---------------- 
	const express = require('express');
	const router = express.Router();
	const path = require('path');
	const jwt = require("jsonwebtoken");

	const jwtKey = process.env.FW_NAME_STANDBY + process.env.FW_NAME_BOT + process.env.GEOBING_KEY + process.env.DWD_WARCELLID + process.env.FOLDER_ARCHIVE + process.env.FOLDER_IN;
	const jwtExpirySeconds = 60 * 60 * 24 * 31;

	// ---------------- AUTHIFICATION ---------------- 
	const bcrypt = require('bcryptjs');

	// ----------------  Datenbank ---------------- 
	const db = require('../database')();


	// ---------------- ROUTEN ----------------	
	router.get('/robots.txt', function (req, res) {
		res.sendFile("robots.txt", { root: './filesHTTPS' });
	});

	router.get('/app/robots.txt', function (req, res) {
		res.sendFile("robots.txt", { root: './filesHTTPS' });
	});

	router.get('/api/notificationResponse', function (req, res) {

		if (req.query.telegramID == undefined || req.query.value == undefined) {
			res.send(JSON.stringify({
				data: "FEHLER"
			}));
		}

		switch (req.query.value) {
			case 'kommeNein':
				db.getUserByUid(req.query.telegramID)
					.then((rows) => {
						if (rows[0] != undefined) {
							_httpServer[0].wss.broadcast(
								'st_nicht', rows[0].name + " " + rows[0].vorname + "%" + rows[0].stAGT +
								"," + rows[0].stGRF + "," + rows[0].stMA + "," + rows[0].stZUGF
							);
						}
					})
					.catch((err) => { console.error('[appIndex] Datenbank Fehler', err) });
				break;
			case 'kommeJa':
				db.getUserByUid(req.query.telegramID)
					.then((rows) => {
						if (rows[0] != undefined) {
							_httpServer[0].wss.broadcast(
								'st_komme', rows[0].name + " " + rows[0].vorname + "%" + rows[0].stAGT +
								"," + rows[0].stGRF + "," + rows[0].stMA + "," + rows[0].stZUGF
							);
						}
					})
					.catch((err) => { console.error('[appIndex] Datenbank Fehler', err) });
				break;
			case 'kommeSpaeter':
				db.getUserByUid(req.query.telegramID)
					.then((rows) => {
						if (rows[0] != undefined) {
							_httpServer[0].wss.broadcast(
								'st_später', rows[0].name + " " + rows[0].vorname + "%" + rows[0].stAGT +
								"," + rows[0].stGRF + "," + rows[0].stMA + "," + rows[0].stZUGF
							);
						}
					})
					.catch((err) => { console.error('[appIndex] Datenbank Fehler', err) });
				break;
		}

		res.send(JSON.stringify({
			data: "OK"
		}));
	});
/*
	router.get('/sessions', (req, res) => {
		req.sessionStore.sessionModel.findAll()
			.then(sessions => sessions.map(sess => JSON.parse(sess.dataValues.data)))
			.then((sessions) => {
				res.send(sessions)
			})
	})
*/

	// ----------------  AUTHIFICATION ---------------- 
	router.post('/login.html', async (req, res, next) => {
		let isAuto = false;
		let login;

		let getLogin = async function(_telid) {
			if(_telid.length > 4 && _telid.substring(0, 4) == "AUTO") {
				isAuto = true;
				return await db.getAutoLogin(_telid)
			}
			return await db.getUserLogin(_telid)	
		}
		
		let loginOK = function(_telid) {
			
			// Session
			req.session.telegramID = _telid;
			if(!isAuto) { 
				req.session.isAdmin = (login[0].admin == '1' ? true : false);
				req.session.kalender = (login[0].kalender == '1' ? true : false);
			} else {
				req.session.isAuto = true;
				req.session.autoname = login[0].name;
				req.session.autoid = login[0].id;
			}

			console.log("sessionid " + req.sessionID, 'Auto: ' + isAuto);
			_httpsServer[0].addSession(req.sessionID, _telid);

			// Remember me token neu vergeben
			const token = jwt.sign({ _telid }, jwtKey, {
				algorithm: "HS256",
				expiresIn: jwtExpirySeconds,
			});

			res.header('Access-Control-Allow-Credentials', 'true');
			res.cookie("token", token, { 
				secure: true,
				path: '/',
				maxAge: jwtExpirySeconds * 1000 
			});

			// Antwort senden
			return res.status(200).send({
				msg: 'OK',
				auto: isAuto
			});
		}

		// Token Login
		const token = req.cookies.token;
		// ----------------------------------------------------- TODO: Check PW changed
		if(token) {
			let payload;
			try {
				// Parse the JWT string and store the result in `payload`.
				// Note that we are passing the key in this method as well. This method will throw an error
				// if the token is invalid (if it has expired according to the expiry time we set on sign in),
				// or if the signature does not match
				payload = jwt.verify(token, jwtKey)
			} catch (e) {
				if (e instanceof jwt.JsonWebTokenError) {
					// if the error thrown is because the JWT is unauthorized, return a 401 error
					res.cookie("token", '', { maxAge: 1 });
					return res.status(401).end()
				}
				// otherwise, return a bad request error	
				res.cookie("token", '', { maxAge: 1 });			
				return res.status(400).end()
			}
			console.log("Token login", payload._telid);
			login = await getLogin(payload._telid)
			.catch((err) => {
				console.error('[AppIndex] Datenbank Fehler', err);
				// otherwise, return a bad request error	
				res.cookie("token", '', { maxAge: 1 });	
				return res.status(400).send({
					msg: 'Telegram ID oder Passwort fehlerhaft!'
				});
			});
			return loginOK(payload._telid);	
		}

		// Passwort Login
		login = await getLogin(req.body.telegramID)
			.catch((err) => {
				console.error('[AppIndex] Datenbank Fehler', err);
				return res.status(400).send({
					msg: 'Telegram ID oder Passwort fehlerhaft!'
				});
			});

		if (login[0] == undefined) {
			return res.status(400).send({
				msg: 'Telegram ID oder Passwort fehlerhaft!'
			});
		}

		if (login[0].appPasswort == '' || login[0].appPasswort == undefined)
			return;

		bcrypt.compare(
			req.body.passwort,
			login[0].appPasswort,
			(bErr, bResult) => {
				//console.log(bResult, bErr);
				// wrong password
				if (bErr) {
				//	throw bErr;
					// otherwise, return a bad request error	
					res.cookie("token", '', {
						secure: true,
						path: '/',
						maxAge: jwtExpirySeconds * 1000 
					});			
					return res.status(401).send({
						msg: 'Telegram ID oder Passwort fehlerhaft!'
					});
				}

				// good password
				if (bResult) {
					return loginOK(req.body.telegramID);					
				}
				// otherwise, return a bad request error	
				res.cookie("token", '', {
					secure: true,
					path: '/',
					maxAge: jwtExpirySeconds * 1000 
			 	});				
				return res.status(401).send({
					msg: 'Telegram ID oder Passwort fehlerhaft!'
				});
			}
		);
	});

	router.get('/api/logout', (req, res) => {
		req.session.destroy((err) => {
			if (err) {
				return console.error(err);
			}
			res.redirect('/app/login.html?manuell=true');
		});

	});

	router.get('/login.html', function (req, res) {
		res.render('appLogin', {
			page: '',
			data: {
				INFOTEXT: "APP " + process.env.FW_NAME_BOT
			}
		});
	});

	var isLoggedIn = (req, res, next) => {
		try {
			//console.log(req.session.telegramID);
			if (req.session.telegramID) {
				next();
			} else {
				res.status(401).render('appRedirect', {
					page: '',
					data: {
					}
				});				
				//res.redirect('/app/login.html');
			}
		} catch (err) {
			console.error('Session Fehler');
		}
	}


	// ----------------  ROUTEN ---------------- 

	// Index
	router.get('/', isLoggedIn, function (req, res) {
		res.redirect('/app/index.html');
	});
	router.get('/index.html', isLoggedIn, async function (req, res) {
		let isAlarm = await db.isAlarmNow()
			.catch((err) => {
				console.error('[AppIndex] Datenbank Fehler', err);
			});

		let alarm = 'false';
		if (isAlarm != undefined && isAlarm.length > 0)
			alarm = 'true';

		res.render('appIndex', {
			page: '',
			data: {
				alarm: alarm,
				admin: req.session.isAdmin ? '1' : '0',
				kalender: req.session.kalender ? '1' : '0',
				telegramID: req.session.telegramID,
				alarmID: (alarm == 'true' ? isAlarm[0].id : -1),
				nurLAN: (req.connection.encrypted ? '0' : '1'),//(process.env.APP_DNS == "" ? '1' : '0'),
				fwvv: (process.env.FWVV == 'true' ? 'true' : 'false')
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

	router.get('/filesHTTPS/manifest.json', function (req, res) {
		res.render('appManifest', {
			page: '',
			data: {
				FW_NAME_BOT: process.env.FW_NAME_BOT
			}
		});
	});

	// APP REST API
	var routesAPI = require('../routes/appAPI')(_httpServer, _httpsServer, _bot, setIgnoreNextAlarm, getIgnoreNextAlarm);
	router.use('/', isLoggedIn, routesAPI);

	// APP Auto
	var routesAuto = require('../routes/appAuto')();
	router.use('/auto', isLoggedIn, routesAuto);

	

	return router;
}