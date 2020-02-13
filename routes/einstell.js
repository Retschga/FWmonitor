'use strict';
module.exports = function (bot) {
	
	var express = require('express');
	var router = express.Router();
	var Database = require('sqlite-async')

	const getUsers = function () {
		return new Promise(resolve => {
			Database.open('save.sqlite3')
				.then(db => {
					db.all('SELECT * FROM users ORDER BY "name" DESC, "vorname" DESC').then(rows => {
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
	const getGroups = function () {
		return new Promise(resolve => {
			Database.open('save.sqlite3')
				.then(db => {
					db.all('SELECT * FROM groups').then(rows => {
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
	const changeUserGroup = function (uid,group) {
		return new Promise(resolve => {
			Database.open('save.sqlite3')
				.then(db => {
					db.all('UPDATE "main"."users" SET "group"="'+(group*1+1)+'" WHERE "_rowid_"=' + uid + '').then(() => {
						resolve();
					}).catch(err => {
						console.error("Database error: " + err);
					})
				})
				.catch(err => {
					console.error("Database error: " + err);
				})
		});
	}
	const changeGroupPattern = function (id, pattern) {
		return new Promise(resolve => {
			Database.open('save.sqlite3')
				.then(db => {
					db.all('UPDATE "main"."groups" SET "pattern"="' + pattern.replace(/<br>/g, '\n') + '" WHERE "_rowid_"=' + id + '').then(() => {
						resolve();
					}).catch(err => {
						console.error("Database error: " + err);
					})
				})
				.catch(err => {
					console.error("Database error: " + err);
				})
		});
	}
	const changeStAny = function (uid,type,value) {
		return new Promise(resolve => {
			Database.open('save.sqlite3')
				.then(db => {
					db.all('UPDATE "main"."users" SET "'+(type)+'"="'+(value)+'" WHERE "_rowid_"=' + uid + '').then(() => {
						resolve();
					}).catch(err => {
						console.error("Database error: " + err);
					})
				})
				.catch(err => {
					console.error("Database error: " + err);
				})
		});
	}
	
	const getStatistik = function (aktion, days) {
		return new Promise(resolve => {
			Database.open('save.sqlite3')
				.then(db => {
					db.all('SELECT  *, count(user) AS num FROM  statistik WHERE aktion = '+aktion+' AND strftime("%Y-%m-%d",date) >= date("now","-'+days+' days") AND strftime("%Y-%m-%d",date)<=date("now") GROUP BY user').then(rows => {
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
	
	
	/* GET home page. */
	router.get('/einstell', async function (req, res, alarmMan) {
		
		var countUses = function(rows) {
			var count = 0;
			rows.forEach(function (element) {
				count += 0 + element.num;              
			});
			return count;
		}
		
		var stat31 = await getStatistik(1, 31);
		var stat365 = await getStatistik(1, 365);
		var verfZeige31 = await getStatistik(2, 31);
		var verfZeige365 = await getStatistik(2, 365);
		var verfSetze31 = await getStatistik(3, 31);
		var verfSetze365 = await getStatistik(3, 365);
		
		var rows = await getUsers();
		var grouprows = await getGroups();

		var users = [];
		var groups = [];
		var erinnerungenAktiviert = 0;

		rows.forEach(function (element) {
			users.push([element.id, element.name + " " + element.vorname, element.group, 
			element.allowed, element.stMA, element.stAGT, element.stGRF, element.stZUGF, element.admin]);      
			if(element.sendRemembers == 1) erinnerungenAktiviert++;
		});
		grouprows.forEach(function (element) {
			groups.push([element.id, element.name, element.pattern]);
		});
		
	
		res.render('einstell', {
			page: 'einstell',
			data: {
				"users": users,
				"groups": groups,
				"statistikErinnerungen": (100.0 / users.length * erinnerungenAktiviert) + "% aktiviert",
				"statistikKalender31": (stat31.length + " (" + countUses(stat31) + ")"),
				"statistikKalender365": (stat365.length + " (" + countUses(stat365) + ")"),
				"statistikVerfZeige31": (verfZeige31.length + " (" + countUses(verfZeige31) + ")"),
				"statistikVerfZeige365": (verfZeige365.length + " (" + countUses(verfZeige365) + ")"),
				"statistikVerfSetze31": (verfSetze31.length + " (" + countUses(verfSetze31) + ")"),
				"statistikVerfSetze365": (verfSetze365.length + " (" + countUses(verfSetze365) + ")")
			}
		});


	});


	router.get('/msgtoall', function (req, res) {
		if (req.query.msg != undefined) {			
			//activateUser(req.query.id).then(() => res.redirect('/einstell'));
			
			bot.sendMsgToAll(req.query.msg.replace(/<br>/g, "\n"));
			res.redirect('/einstell' + "?scroll=" + req.query.scroll);
		}
	});


	router.get('/aktiv', function (req, res) {
		if (req.query.id != undefined) {			
			//activateUser(req.query.id).then(() => res.redirect('/einstell'));
			
			bot.allowUser(req.query.id);
			res.redirect('/einstell' + "?scroll=" + req.query.scroll);
		}
	});
	router.get('/del', function (req, res) {
		if (req.query.id != undefined) {
			//deleteUser(req.query.id).then(() => res.redirect('/einstell'));
			
			bot.removeUser(req.query.id);
			res.redirect('/einstell' + "?scroll=" + req.query.scroll);
		}
	});
	router.get('/changeGroup', function (req, res) {
		if (req.query.id != undefined) {
			changeUserGroup(req.query.id, req.query.group).then(() => res.redirect('/einstell' + "?scroll=" + req.query.scroll));
		}
	});
	router.get('/changePattern', function (req, res) {
		if (req.query.id != undefined) {
			changeGroupPattern(req.query.id, req.query.pattern).then(() => res.redirect('/einstell' + "?scroll=" + req.query.scroll));
		}
	});

	router.get('/changeMA', function (req, res) {
		if (req.query.id != undefined) {
			changeStAny(req.query.id, "stMA", req.query.value).then(() => res.redirect('/einstell' + "?scroll=" + req.query.scroll));
		}
	});
	router.get('/changeAGT', function (req, res) {
		if (req.query.id != undefined) {
			changeStAny(req.query.id, "stAGT", req.query.value).then(() => res.redirect('/einstell' + "?scroll=" + req.query.scroll));
		}
	});
	router.get('/changeGRF', function (req, res) {
		if (req.query.id != undefined) {
			changeStAny(req.query.id, "stGRF", req.query.value).then(() => res.redirect('/einstell' + "?scroll=" + req.query.scroll));
		}
	});
	router.get('/changeZUGF', function (req, res) {
		if (req.query.id != undefined) {
			changeStAny(req.query.id, "stZUGF", req.query.value).then(() => res.redirect('/einstell' + "?scroll=" + req.query.scroll));
		}
	});
	router.get('/changeADMIN', function (req, res) {
		if (req.query.id != undefined) {
			changeStAny(req.query.id, "admin", req.query.value).then(() => res.redirect('/einstell' + "?scroll=" + req.query.scroll));
		}
	});


    return {
        router: router,
    }; 

}