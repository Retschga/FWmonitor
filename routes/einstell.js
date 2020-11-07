'use strict';

module.exports = function (_bot, _httpsServer) {

	// ----------------  STANDARD LIBRARIES ---------------- 
	var express = require('express');
	var router = express.Router();

	// ----------------  Datenbank ---------------- 
	const db = require('../database')();


	async function asyncForEach(array, callback) {
		for (let index = 0; index < array.length; index++) {
			await callback(array[index], index, array);
		}
	}

	// ---------------- ROUTEN ----------------	
	router.get('/einstell', async function (req, res) {

		var countUses = function (rows) {
			var count = 0;
			rows.forEach(function (element) {
				count += 0 + element.num;
			});
			return count;
		}

		try {

			let stat31 = await db.getStatistikKlicks(1, 31);
			let stat365 = await db.getStatistikKlicks(1, 365);
			let verfZeige31 = await db.getStatistikKlicks(2, 31);
			let verfZeige365 = await db.getStatistikKlicks(2, 365);
			let verfSetze31 = await db.getStatistikKlicks(3, 31);
			let verfSetze365 = await db.getStatistikKlicks(3, 365);

			let rows = await db.getUserAll();

			let grouprows = await db.getGroups();

			let users = [];
			let groups = [];
			let adminCount = 0;
			let erinnerungenAktiviert = 0;

			await asyncForEach(rows, async function (element) {

				let bis = element.status;
				if (element.statusUntil != "") {
					let result = new Date(element.statusUntil);
					let options = { year: 'numeric', month: '2-digit', day: '2-digit' };
					let time = result.toLocaleTimeString();
					let date = result.toLocaleDateString('de-DE', options);
					bis = date + " " + time;
				}

				if (element.admin == 1)
					adminCount++;

				let sess = await _httpsServer[0].activeSessions(element.telegramid);

				users.push([
					element.id,
					element.name + " " + element.vorname,
					element.group,
					element.allowed,
					element.stMA,
					element.stAGT,
					element.stGRF,
					element.stZUGF,
					element.admin,
					element.sendRemembers,
					bis,
					element.drucker,
					(sess != false ? 2 : (element.appNotificationsSubscription != undefined ? 1 : 0))

				]);
				if (element.sendRemembers == 1) erinnerungenAktiviert++;
			});
			grouprows.forEach(function (element) {
				groups.push([element.id, element.name, element.pattern]);
			});


			res.render('einstell', {
				page: 'einstell',
				data: {
					"users": users,
					"groups": groups,
					"statistikErinnerungen": Math.round(100.0 / users.length * erinnerungenAktiviert) + "% aktiviert",
					"statistikKalender31": (stat31.length + " (" + countUses(stat31) + ")"),
					"statistikKalender365": (stat365.length + " (" + countUses(stat365) + ")"),
					"statistikVerfZeige31": (verfZeige31.length + " (" + countUses(verfZeige31) + ")"),
					"statistikVerfZeige365": (verfZeige365.length + " (" + countUses(verfZeige365) + ")"),
					"statistikVerfSetze31": (verfSetze31.length + " (" + countUses(verfSetze31) + ")"),
					"statistikVerfSetze365": (verfSetze365.length + " (" + countUses(verfSetze365) + ")"),
					'admins': adminCount,
					'einstellLink': (process.env.APP_DNS != "" ? /*'https://' + process.env.APP_DNS + */'/app' : '/app')
				}
			});
		}
		catch (err) {
			console.error('[ENSTELLUNGEN] Datenbank Fehler: ', err);
		}
	});

	router.get('/msgtoall', function (req, res) {
		if (req.query.msg != undefined) {
			_bot[0].sendMsgToAll(req.query.msg.replace(/<br>/g, "\n"));
			res.redirect('/einstell' + "?scroll=" + req.query.scroll);
		}
	});

	router.get('/aktiv', function (req, res) {
		if (req.query.id != undefined) {
			_bot[0].allowUser(req.query.id);
			res.redirect('/einstell' + "?scroll=" + req.query.scroll);
		}
	});
	router.get('/del', function (req, res) {
		if (req.query.id != undefined) {
			_bot[0].removeUser(req.query.id);
			res.redirect('/einstell' + "?scroll=" + req.query.scroll);
		}
	});

	return router;
}