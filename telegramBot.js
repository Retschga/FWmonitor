// Modul Telegram
module.exports = function (wss) {

    const Telegraf = require('telegraf');
    const Router = require('telegraf/router');
    const fs = require("fs");
    const Database = require('sqlite-async');
    const calendar = require('./calendar')();
	const axios = require('axios')
	const fwvv = require('./fwvvAnbindung')();
	

    var bot = new Telegraf(process.env.BOT_TOKEN);
	
	var sendtMessages = 0;
	

    // ---------------- Bot Name ----------------
    bot.telegram.getMe().then((botInfo) => {
        bot.options.username = botInfo.username;
        console.log("[TelegramBot] Initialized", botInfo.username);
    });

	// ---------------- Callback Router der Daten am : teilt ----------------
    const onCallback = new Router(({ callbackQuery }) => {
        if (!callbackQuery.data) {
            return
        }
        const parts = callbackQuery.data.split(':')
        return {
            route: parts[0],
            state: {
                amount: parts[1]
            }
        }
    })
    bot.on('callback_query', onCallback)

	// ---------------- Send Funktion mit Rate Limiting ----------------
	const sendMessage = function (chatId, text, extra) {
		sendtMessages++;
		var delay = Math.floor(sendtMessages / 30) * 1500;		
		
		setTimeout(function () {
			sendtMessages--;					
		}, 1000 + delay);	
		setTimeout(function () {		
//			console.log(sendtMessages);
			bot.telegram.sendMessage(chatId, text, extra)
				.catch((err) => {
					console.error("[Telegram] ERROR sendMessage (ChatID "+chatId+"): " + err);
				});					
		}, delay);			
			
	}


	// ---------------- Fehlerausgabe ----------------
    bot.catch((err) => {
        console.log('[TelegramBot] Telegram Ooops', err)
    })

    // ---------------- Datenbankfunktionen ----------------
    const getUser = function (uid) {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all('SELECT * FROM users WHERE "telegramid"=' + '"' + uid + '"').then(rows => {
                        resolve(rows);
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
    const getUserTelId = function (uid) {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all('SELECT * FROM users WHERE "id"=' + '"' + uid + '"').then(rows => {
                        resolve(rows[0].telegramid);
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
    const getUserAll = function () {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all('SELECT * FROM users ORDER BY "name" ASC, "vorname" ASC').then(rows => {
                        resolve(rows);
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
    const getAllowedUser = function () {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all('SELECT users.*, groups."pattern" FROM users LEFT JOIN groups ON users."group" = groups."id" WHERE "allowed"="1"').then(rows => {
                        resolve(rows);
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
    const getStatus = function (uid) {
		return new Promise(resolve => {
			Database.open('save.sqlite3')
				.then(db => {
					db.all('SELECT * FROM users' + (uid != "" ? (' WHERE "telegramid"="' + uid + '"') : "")).then(rows => {
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
	const isAllowed = function (uid) {
        return new Promise(resolve => {
            getUser(uid)
                .then((rows) => {
                    if (rows[0] != undefined) {
                        if (rows[0].allowed == 1)
                            resolve(true);
                        else
                            resolve(false);
                    }
                })
        });
    }
    const setVerfuegbar = function (uid, status, until) {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.run('UPDATE "main"."users" SET "status"=' + status + ', "statusUntil"="' + until + '" WHERE "telegramid"=' + '"' + uid + '"').then(rows => {
                        resolve();
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
    const addUser = function (uid, name, vorname) {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.run(`INSERT INTO "main"."users"("id", "name","vorname","telegramid","status","group","admin") VALUES (NULL,"${name}","${vorname}","${uid}",1,1,0)`).then(rows => {
                        resolve();
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
    const activateUser = function (uid) {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all('UPDATE "main"."users" SET "allowed"=1 WHERE "_rowid_"=' + uid + '').then(() => {
                        resolve();
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
    const deleteUser = function (uid) {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all('DELETE FROM "main"."users" WHERE _rowid_ IN(' + uid + ')').then(() => {
                        resolve();
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
    const changeUserGroup = function (uid, group) {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all('UPDATE "main"."users" SET "group"="' + (group) + '" WHERE "_rowid_"=' + uid + '').then(() => {
                        resolve();
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
    const getAlarmList = function () {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all('SELECT "_rowid_",* FROM "main"."alarms" ORDER BY "id" DESC LIMIT 0, 100;').then(rows => {
                        resolve(rows);
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
    const changeUserRemember = function (uid, val) {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all('UPDATE "main"."users" SET "sendRemembers"="' + (val) + '" WHERE "telegramid"=' + uid + '').then(() => {
                        resolve();
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }
	const getStatistik = function () {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
                    db.all("SELECT einsatzstichwort, count(einsatzstichwort) AS number FROM alarms WHERE strftime('%Y', date) = strftime('%Y', DATE('now')) GROUP BY einsatzstichwort").then(rows => {
                        resolve(rows);
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }

	const addStatistik = function (aktion, user) {
        return new Promise(resolve => {
            Database.open('save.sqlite3')
                .then(db => {
					var now = new Date();
                    db.all('INSERT INTO "main"."statistik"("date","aktion","user") VALUES ("'+now.toISOString()+'","'+aktion+'","'+user+'")').then(rows => {
                        resolve(rows);
                    }).catch(err => {
                        console.error("[TelegramBot] Database error: " + err);
                    })
					
                })
                .catch(err => {
                    console.error("[TelegramBot] Database error: " + err);
                })
        });
    }


	var mainKeyboard = [
                        ['📅 Kalender', '🚒 Verfügbarkeit'], // Row1 with 2 buttons
                        ['️▪️ Mehr', '🔥 Einsätze'] // Row2 with 2 buttons
                       ];


    // ---------------- Erste Bot Verbindung ----------------
    bot.start((ctx) => {
        getUser(ctx.from.id)
            .then((rows) => {
                if (rows[0] != undefined) {
                    var existing = false;
                    if (rows[0].allowed == 1)
                        existing = true;

                    if (!existing) {
                        ctx.reply('Warte auf Freigabe', Telegraf.Extra.HTML().markup((m) =>
                            m.keyboard([
                                ['/start']
                            ]).resize()
                        ));
                    } else {
                        ctx.reply('Anmeldung erfolgreich: ' + rows[0].name + " " + rows[0].vorname, Telegraf.Extra.HTML().markup((m) =>
                            m.keyboard(mainKeyboard).resize()
                        ));
                    }					
                } else {
                    ctx.reply('Telegram Bot ' + process.env.FW_NAME_BOT);
                    addUser(ctx.from.id, ctx.from.last_name, ctx.from.first_name);
                }
            });
    });   
	
	
	// ---------------- Sicherheits Middleware  ----------------
	// sichere alles unterhalb gegen unberechtigten Zugriff
	bot.use(async (ctx, next) => {
		isAllowed(ctx.from.id)
            .then(async (allowed) => {
				if(allowed != true) {
					console.log('[Telegram] Unerlaubter Zugriff durch %s %s', ctx.from.last_name, ctx.from.first_name)
					return;
				}
				
				const start = new Date()
				await next()
				const ms = new Date() - start
				//console.log('[Telegram] Response time: %sms', ms)

            });	
	})
	
	
	// ---------------- Historie ----------------
    bot.hears('🔥 Einsätze', ctx => {

		if(process.env.FWVV != "true") {
			ctx.reply('*🔥 Einsätze*', Telegraf.Extra.markdown().markup((m) => m.inlineKeyboard([
				m.callbackButton('📜 Letzte Alarme', 'showAlarm:0'),
				m.callbackButton('📈 Statistik', 'showStatistik')
			])));
		} else {
			ctx.reply('*🔥 Einsätze*', Telegraf.Extra.markdown().markup((m) => m.inlineKeyboard([
				m.callbackButton('📜 Letzte Alarme', 'showAlarm:0'),
				m.callbackButton('📈 Statistik', 'showStatistik'),
				m.callbackButton('⏱️ Einsatzzeit', 'showEinsatzZeit')
			])));
		}
		
    });
    onCallback.on('showAlarm', (ctx) => {
		ctx.editMessageText("*⌛ lädt ⌛*", 
				Telegraf.Extra.markdown().markup((m) => {} )).catch((err) => {
					console.log('[TelegramBot] Telegram Ooops', err)
				}).then( () => {
		
		ctx.replyWithChatAction('typing');
			
			getAlarmList().then((rows) => {
				var alarmnum = parseInt(ctx.state.amount, 10);
				if (ctx.state.amount < 0)
					alarmnum = rows.length - 1;
				if (ctx.state.amount >= rows.length)
					alarmnum = 0;
				
				var d = new Date(rows[alarmnum].date);			
				var options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' };
				var time = d.toLocaleTimeString();
				var date = d.toLocaleDateString('de-DE', options);

				ctx.editMessageText("*📜 " + date + " " + time + "*\n_  " + rows[alarmnum].einsatzstichwort + "\n " + rows[alarmnum].schlagwort
					+ "\n  " + rows[alarmnum].ort + "_", Telegraf.Extra.markdown().markup((m) =>
					m.inlineKeyboard([
						m.callbackButton('<', 'showAlarm:' + (alarmnum - 1)),
						m.callbackButton('>', 'showAlarm:' + (alarmnum + 1))
					]))).catch((err) => {
						console.log('[TelegramBot] Telegram Ooops', err)
					});
			});
		
		
		});
    })
	onCallback.on('showStatistik', (ctx) => {
        getStatistik().then((rows) => {
			
			var d = new Date();	
			var options = { year: 'numeric' };
            var date = d.toLocaleDateString('de-DE', options);
			
			var str = ""
			var sum = 0;

            rows.forEach(function (element) {
				if(element.number < 10)
					str += "0";
				
				str += element.number;
				
				sum += parseInt(element.number);

				if (element.einsatzstichwort != "")
					str += " - " + element.einsatzstichwort + "\n";
				else 
					str += " - kein Stichwort\n";
            });
			
			str += "_\n";
			
			str = "*📈 Einsätze Jahr " +date+ " ( " +sum+ " )*\n_" + str;
			
			 ctx.editMessageText(str, 
				Telegraf.Extra.markdown().markup((m) => {} )).catch((err) => {
                    console.log('[TelegramBot] Telegram Ooops', err)
                });
           
        });
    })
    onCallback.on('showEinsatzZeit', (ctx) => {
		ctx.editMessageText("*⌛ lädt ⌛*", 
				Telegraf.Extra.markdown().markup((m) => {} )).catch((err) => {
					console.log('[TelegramBot] Telegram Ooops', err)
				});
		
		ctx.replyWithChatAction('typing');
		
		fwvv.getEinsatzZeit(ctx.from.last_name, ctx.from.first_name).then((arr) => {
			
			var d = new Date();	
			var options = { year: 'numeric' };
            var date = d.toLocaleDateString('de-DE', options);

			var str = "*⏱️ Einsatzzeit Jahr " +date+ ":* _" + Math.floor(arr[0]/60) + "h " + (arr[0]%60) + "m ( " + arr[1] + " Einsätze )_\n";
		
			ctx.editMessageText(str, 
				Telegraf.Extra.markdown().markup((m) => {} )).catch((err) => {
					console.log('[TelegramBot] Telegram Ooops', err)
				});
			
		});
		
    })
    		
	
	// ---------------- Mehr ----------------
    bot.hears('️▪️ Mehr', ctx => {
        getUser(ctx.from.id)
            .then((rows) => {
                if (rows[0].admin == 1)
                    ctx.reply('*️▪️ Mehr:*', Telegraf.Extra.markdown().markup((m) => m.inlineKeyboard([
                        m.callbackButton('👤 Benutzer', 'einstell_Benutzer:0'),
                        m.callbackButton('📅 Erinnerungen', 'einstell_Kalender'),
						m.urlButton('🗺️ Karte 1', 'https://wambachers-osm.website/emergency/#zoom=12&lat=47.7478&lon=11.8824&layer=Mapbox%20Streets&overlays=FFTTFTFFFFFT'),
						m.urlButton('🗺️ Karte 2', 'http://www.openfiremap.org/?zoom=13&lat=47.74236&lon=11.90217&layers=B0000T'),
						m.callbackButton('🧯 Hydrant eintragen', 'einstell_Hydrant'),
						m.callbackButton('🖥️ Bildschirm Neustart', 'einstell_rebootScreen')
                    ], {columns: 2})));
                else
                    ctx.reply('*️▪️ Mehr:*', Telegraf.Extra.markdown().markup((m) => m.inlineKeyboard([
                        m.callbackButton('📅 Erinnerungen', 'einstell_Kalender'),
						m.callbackButton('🧯 Hydrant eintragen', 'einstell_Hydrant'),
						m.urlButton('🗺️ Karte 1', 'https://wambachers-osm.website/emergency/#zoom=12&lat=47.7478&lon=11.8824&layer=Mapbox%20Streets&overlays=FFTTFTFFFFFT'),
						m.urlButton('🗺️ Karte 2', 'http://www.openfiremap.org/?zoom=13&lat=47.74236&lon=11.90217&layers=B0000T'),
                    ], {columns: 2})));
            })
    });
    onCallback.on('einstell_Kalender', (ctx) => {
        ctx.editMessageText('📅 Kalender Erinnerungen', Telegraf.Extra.markup((m) => m.inlineKeyboard([
            m.callbackButton('An', 'einstell_Kalender_set:1'),
            m.callbackButton('Aus', 'einstell_Kalender_set:0')
        ])));
    })
    onCallback.on('einstell_Kalender_set', (ctx) => {
        var userid = ctx.from.id;
        var val = ctx.state.amount;

        changeUserRemember(userid, val).then(() => {
            if (val == 1) {
                ctx.answerCbQuery("📅 Kalender Erinnerungen -> Ein", false);
                ctx.editMessageText("📅 Kalender Erinnerungen -> Ein");
            }
            else {
                ctx.answerCbQuery("📅 Kalender Erinnerungen -> Aus", false);
                ctx.editMessageText("📅 Kalender Erinnerungen -> Aus");
            }
        });
    })
    onCallback.on('einstell_Benutzer', (ctx) => {
        getUserAll().then((rows) => {
            var usernum = parseInt(ctx.state.amount,10);
            if (ctx.state.amount < 0)
                usernum = rows.length - 1;
            if (ctx.state.amount >= rows.length)
                usernum = 0;
            var grupp = rows[usernum].group;
            if (grupp == 1)
                grupp = "Standard";
            if (rows[usernum].allowed == 1)
                ctx.editMessageText('Benutzer: ' + rows[usernum].name + " " + rows[usernum].vorname + " \nGruppe: " + grupp, Telegraf.Extra.markup((m) =>
                    m.inlineKeyboard([
                        m.callbackButton('<', 'einstell_Benutzer:' + (usernum - 1)),
                        m.callbackButton('>', 'einstell_Benutzer:' + (usernum + 1)),
						m.callbackButton('🚫 Löschen', 'einstell_Benutzer_deletefrage:' + rows[usernum].id + "-" + rows[usernum].id),
                        m.callbackButton('Gruppe: Standard', 'einstell_Benutzer_gruppe:' + rows[usernum].id + "-" + rows[usernum].id + "-1"),
                        m.callbackButton('Gruppe: 1', 'einstell_Benutzer_gruppe:' + rows[usernum].id + "-" + rows[usernum].id + "-2"),
                        m.callbackButton('Gruppe: 2', 'einstell_Benutzer_gruppe:' + rows[usernum].id + "-" + rows[usernum].id + "-3"),
                        m.callbackButton('Gruppe: 3', 'einstell_Benutzer_gruppe:' + rows[usernum].id + "-" + rows[usernum].id + "-4"),
                        m.callbackButton('Gruppe: 4', 'einstell_Benutzer_gruppe:' + rows[usernum].id + "-" + rows[usernum].id + "-5")
                        
                    ], { columns: 3 }))).catch((err) => {
                        console.log('[TelegramBot] Telegram Ooops', err)
                    });
            else
                ctx.editMessageText('Benutzer: ' + rows[usernum].name + " " + rows[usernum].vorname, Telegraf.Extra.markup((m) =>
                    m.inlineKeyboard([
                        m.callbackButton('<', 'einstell_Benutzer:' + (usernum - 1)),
                        m.callbackButton('>', 'einstell_Benutzer:' + (usernum + 1)),
                        m.callbackButton('✔️ Freigeben', 'einstell_Benutzer_allow:' + rows[usernum].id + "-" + rows[usernum].id),
                        m.callbackButton('🚫 Löschen', 'einstell_Benutzer_delete:' + rows[usernum].id + "-" + rows[usernum].id)
                    ], { columns: 2 }))).catch((err) => {
                        console.log('[TelegramBot] Telegram Ooops', err)
                    });
        });
    })
    onCallback.on('einstell_Benutzer_allow', (ctx) => {
        var userid = parseInt(ctx.state.amount.split("-")[0], 10);
        var usernum = ctx.state.amount.split("-")[1];
		
		ctx.editMessageText('Aktiviert!', Telegraf.Extra.markup((m) =>
			m.inlineKeyboard([
				m.callbackButton('OK', 'einstell_Benutzer:' + (usernum))
			], { columns: 3 })));

        allowUser(userid);
    })
    onCallback.on('einstell_Benutzer_deletefrage', (ctx) => {
        var usernum = ctx.state.amount.split("-")[1];

        ctx.editMessageText('Sicher?', Telegraf.Extra.markup((m) =>
            m.inlineKeyboard([
                m.callbackButton('Ja', 'einstell_Benutzer_delete:' + (ctx.state.amount)),
                m.callbackButton('Nein', 'einstell_Benutzer:' + (usernum))
            ])));
    })
    onCallback.on('einstell_Benutzer_delete', (ctx) => {
        var userid = parseInt(ctx.state.amount.split("-")[0], 10);
        var usernum = ctx.state.amount.split("-")[1];
		
		ctx.editMessageText('Gelöscht!', Telegraf.Extra.markup((m) =>
			m.inlineKeyboard([
				m.callbackButton('OK', 'einstell_Benutzer:' + (usernum))
			])));

        removeUser(userid);  
    })
    onCallback.on('einstell_Benutzer_gruppe', (ctx) => {
        var userid = parseInt(ctx.state.amount.split("-")[0], 10);
        var usernum = ctx.state.amount.split("-")[1];
        var group = ctx.state.amount.split("-")[2];

        changeUserGroup(userid, group).then(() => {
            ctx.editMessageText('Gruppe geändert!', Telegraf.Extra.markup((m) =>
                m.inlineKeyboard([
                    m.callbackButton('OK', 'einstell_Benutzer:' + (usernum))
                ])));
        });
    })
	onCallback.on('einstell_rebootScreen', (ctx) => {
        ctx.answerCbQuery("Bildschirm wird neugestartet!", true);		
        wss.broadcast('rebootScreen', "");
    })
		
	function allowUser(userid) {
		activateUser(userid).then(() => {
            getUserTelId(userid).then((telegramid) => {
                bot.telegram.sendMessage(telegramid, 'Benutzer freigeschaltet!', Telegraf.Extra.HTML().markup((m) =>
                    m.keyboard(mainKeyboard).resize()
                ));
            });           
        });
	}
	function removeUser(userid) {
		getUserTelId(userid).then((telegramid) => {
            bot.telegram.sendMessage(telegramid, 'Benutzer gelöscht!', Telegraf.Extra.HTML().markup((m) =>
                m.keyboard([
                    ['/start']
                ]).resize()
            ));
            deleteUser(userid);
        }); 
	}
	
	
	// ---------------- Hydranten ----------------
	onCallback.on('einstell_Hydrant', (ctx) => {
		ctx.editMessageText('🧯 Hydrant eintragen');
		ctx.reply('GPS einschalten, Handy über Hydranten halten, Knopf drücken', Telegraf.Extra.markup((markup) => {
			return markup.resize()
			  .keyboard([
				markup.locationRequestButton('📍 Position senden'),
				'⬅️ zurück'
			  ], { columns: 2 })
			  .oneTime()
		}))
    })
	
	var locationList = {};
	var hydrantPicRequested = {}
	
	bot.on('location', (ctx) => {
		var user = ctx.from.id;
		var message = ctx.message;
		var location = message.location;		
		
		ctx.reply('Position empfangen.', Telegraf.Extra.markup((m) => m.removeKeyboard()))
				
		setTimeout(function () {                                  
			ctx.reply('Position OK? ', Telegraf.Extra.markup((m) => m.inlineKeyboard([
				m.callbackButton('Ja', 'hydrPosOK:'+message.message_id),
				m.callbackButton('Nein', 'einstell_Hydrant')
			])));
		}, 100);
		
		locationList[ctx.from.id] = message.location;		
	})
	onCallback.on('hydrPosOK', (ctx) => {
		var message_id = ctx.state.amount;
		
		ctx.editMessageText('Art des Hydranten?: ', Telegraf.Extra.markup((m) => m.inlineKeyboard([
			m.callbackButton('📍 U-Flur', 'hydrTyp:Unterflur-'+message_id),
			m.callbackButton('📍 O-Flur', 'hydrTyp:Oberflur-'+message_id),
			m.callbackButton('📍 Saugstelle', 'hydrTyp:Saugstelle-'+message_id),
			m.callbackButton('📍 Becken', 'hydrTyp:Becken-'+message_id),
		])));
    })	
	onCallback.on('hydrTyp', (ctx) => {
		var typ = ctx.state.amount.split("-")[0];
        var message_id = ctx.state.amount.split("-")[1];

        ctx.editMessageText('Typ: '+ typ);
		
		ctx.reply('Bitte ein Bild mit der Umgebung des Hydranten senden zur besseren Lokalisierung (  über 📎 Büroklammer Symbol unten ).');
		hydrantPicRequested[ctx.from.id] = true;

		var d = new Date();
		var options = {  year: 'numeric', month: '2-digit', day: '2-digit' };
		var time = d.toLocaleTimeString();
		var date = d.toLocaleDateString('de-DE', options);
		
		
		var feature = {
			  "type": "Feature",
			  "properties": {
				 "art": typ,
				 "erfassung": time + " - " + date,
				 "melder": ctx.from.last_name + " " + ctx.from.first_name
			  },
			  "geometry": {
				"type": "Point",
				"coordinates": [ locationList[ctx.from.id].longitude, locationList[ctx.from.id].latitude ]
			  }
			}
		
		var geoHeader = { "type": "FeatureCollection",  "features": [ feature ]	};
		
		fs.writeFile('Hydranten/'+ locationList[ctx.from.id].latitude.toString() + ", " + locationList[ctx.from.id].longitude.toString() +'.geojson', JSON.stringify(geoHeader), (err) => {
			// throws an error, you could also catch it here
			if (err) throw err;
		});
			
		fs.appendFile('Hydranten/Hydrantenpositionen.txt', "\n"+ time + " - " + date + "    " +
			ctx.from.last_name + " " + ctx.from.first_name + " - " + locationList[ctx.from.id].latitude + ", " +
			locationList[ctx.from.id].longitude + " - " + typ
		, function (err) {
			if (err) throw err;
			//locationList[ctx.from.id] = "";
		});
			
		console.log("[Hydrant]", ctx.from, locationList[ctx.from.id], typ);
    })
	

	// ---------------- Verfügbarkeit ----------------
    bot.hears('🚒 Verfügbarkeit', (ctx) => {
			getStatus(ctx.from.id)
            .then((rows) => {
				
				var stat = "🟩";
				if(rows[0].status == 2) {
					
					var bis = "";
											
					if(rows[0].statusUntil != "") {
						var result = new Date(rows[0].statusUntil);
						var options = {  year: 'numeric', month: '2-digit', day: '2-digit' };
						var time = result.toLocaleTimeString();
						var date = result.toLocaleDateString('de-DE', options);
						bis = "bis _" + date + " " + time + "_";	
					}
					
					stat = "🟥" + "  " + bis;
				}

				ctx.reply('*🚒 Verfügbarkeit: *' + stat, Telegraf.Extra.markdown().markup((m) =>
					m.inlineKeyboard([
						m.callbackButton('🟩  Verfügbar', 'VerfuegbarJA'),
						m.callbackButton('🟥  Nicht Verfügbar', 'VerfuegbarNEINOptionen'),
						m.callbackButton('📜 Anzeigen', 'VerfuegbarZeige')
					], {columns: 2})
				));
            });
		}
	);  
    onCallback.on('VerfuegbarJA', (ctx) => {		
		setVerfuegbar(ctx.from.id, 1, "").then(() => {
            ctx.answerCbQuery("🚒 Status -> 🟩  Verfügbar", false);
            ctx.editMessageText("🚒 Status -> 🟩  Verfügbar");
            }
        );
		
		setVervTrue(ctx.from.id);		
    })
    onCallback.on('VerfuegbarNEINOptionen', (ctx) => {
        ctx.editMessageText('*🟥 Dauer (Tage):*', Telegraf.Extra.markdown().markup((m) =>
			m.inlineKeyboard([
				m.callbackButton('1', 'VerfuegbarNEIN:1'),
				m.callbackButton('2', 'VerfuegbarNEIN:2'),
				m.callbackButton('3', 'VerfuegbarNEIN:3'),
				m.callbackButton('4', 'VerfuegbarNEIN:4'),
				m.callbackButton('5', 'VerfuegbarNEIN:5'),
				m.callbackButton('6', 'VerfuegbarNEIN:6'),
				m.callbackButton('7', 'VerfuegbarNEIN:7'),
				m.callbackButton('14', 'VerfuegbarNEIN:14'),
				m.callbackButton('🔁 Unbegrenzt', 'VerfuegbarNEIN:-1'),
			], {columns: 4})
		));
    })
	onCallback.on('VerfuegbarNEIN', (ctx) => {
		
		var days = parseInt(ctx.state.amount, 10);
		var result = new Date();
		result.setDate(result.getDate() + days);
		var options = {  year: 'numeric', month: '2-digit', day: '2-digit' };
		var time = result.toLocaleTimeString();
		var date = result.toLocaleDateString('de-DE', options);
		var bis = date + " " + time;
		if(days == -1) {
			bis = "unbegrenzt";
			result = "";
		}
		
        setVerfuegbar(ctx.from.id, 2, result).then(() => {
            ctx.answerCbQuery("🚒 Status -> 🟥  Nicht Verfügbar bis  " + bis, false);
            ctx.editMessageText("🚒 Status -> 🟥  Nicht Verfügbar bis  _" + bis + "_", Telegraf.Extra.markdown().markup());
        }
        );
		getUser(ctx.from.id)
            .then((rows) => {
                if (rows[0] != undefined) {
                    wss.broadcast('st_nichtverf', rows[0].name + " " + rows[0].vorname + "%" + rows[0].stAGT + "," + rows[0].stGRF + "," + rows[0].stMA + "," + rows[0].stZUGF);
                }
            });
		
		addStatistik(3, ctx.from.id);
    })	
    onCallback.on('VerfuegbarZeige', (ctx) => {
        getUserAll()
            .then((rows) => {

                var st_verv = "";
                var st_vervNum = 0;
                var st_nichtverf = "";
                var st_nichtverfNum = 0;

                rows.forEach(function (element) {
                    if (element.allowed == 1) {
                        if (element.status == 1) {
                            st_verv += (element.name + " " + element.vorname) + "\n";
                            st_vervNum += 1;
                        }
                        else {
                            st_nichtverf += (element.name + " " + element.vorname) + "\n";
                            st_nichtverfNum += 1;
                        }
                    }
                });

                ctx.editMessageText("*🟩  Verfügbar: (" + st_vervNum + ")*\n_"
                    + st_verv + "_\n"
                    + '*🟥  Nicht Verfügbar: (' + st_nichtverfNum + ')*\n_'
                    + st_nichtverf + "_"
                    , Telegraf.Extra.markdown()
                );
                
            });
			
		addStatistik(2, ctx.from.id);
    })
	var interval = setInterval(() => {    
		getStatus("")
            .then((rows) => {

				var dateNow = new Date();

                rows.forEach(function (element) {
					
					if(element.statusUntil != "") {
					
						var dateUntil = new Date(element.statusUntil);
						
						if(dateUntil < dateNow) {
							
							setVerfuegbar(element.telegramid, 1, "").then(() => { });
							setVervTrue(element.telegramid);

							bot.telegram.sendMessage(element.telegramid, '🚒 Status -> 🟩  Verfügbar', Telegraf.Extra.markdown());
							
						}
					
					}
					
                });

            });
    }, 90000);
	function setVervTrue(telID) {		 
		getUser(telID)
            .then((rows) => {
                if (rows[0] != undefined) {
                    wss.broadcast('st_verf', rows[0].name + " " + rows[0].vorname + "%" + rows[0].stAGT + "," + rows[0].stGRF + "," + rows[0].stMA + "," + rows[0].stZUGF);
                }
            });
			
		addStatistik(3, telID);
	}	

	// ---------------- Alarm ----------------
    var extra = 
        Telegraf.Extra.HTML().markup((m) =>
            m.inlineKeyboard([
                m.callbackButton('👍 JA!', 'KommenJa'),
                m.callbackButton('👎 NEIN!', 'KommenNein'),
                m.callbackButton('🕖 SPÄTER!', 'KommenSpäter')
            ]));
			
    function sendAlarm(EINSATZSTICHWORT, SCHLAGWORT, OBJEKT, STRASSE, ORTSTEIL, ORT, BEMERKUNG, EINSATZMITTEL_EIGEN, EINSATZMITTEL_ANDERE, lat, lng, filePath) {
        if(process.env.BOT_SENDALARM != "true") {
			console.log("[TelegramBot] Telegram Alamierung deaktiviert -> Kein Alarmtelegram");
			return;
		}
		
		console.log("[TelegramBot] Sende Alarm...");	
		
        getAllowedUser()
            .then((rows) => {
                rows.forEach(function (element) {

					// Gruppenpattern
                    var text = element.pattern;					                    
                    text = text.replace(/{{EINSATZSTICHWORT}}/g, EINSATZSTICHWORT);
                    text = text.replace(/{{SCHLAGWORT}}/g, SCHLAGWORT);
                    text = text.replace(/{{OBJEKT}}/g, OBJEKT);
                    text = text.replace(/{{STRASSE}}/g, STRASSE);
                    text = text.replace(/{{ORTSTEIL}}/g, ORTSTEIL);
                    text = text.replace(/{{ORT}}/g, ORT);
                    text = text.replace(/{{BEMERKUNG}}/g, BEMERKUNG);
                    text = text.replace(/{{EINSATZMITTEL_EIGEN}}/g, EINSATZMITTEL_EIGEN.replace(/,/g, "\n"));
                    text = text.replace(/{{EINSATZMITTEL_ANDERE}}/g, EINSATZMITTEL_ANDERE.replace(/,/g, "\n"));					
					
					var sendFax = text.indexOf('{{FAX}}') != -1 ? true : false;		
					text = text.replace(/{{FAX}}/g, "");	

					var sendMap = text.indexOf('{{KARTE}}') != -1 ? true : false;		
					text = text.replace(/{{KARTE}}/g, "");	
					
					var sendMapEmg = text.indexOf('{{KARTE_EMG}}') != -1 ? true : false;		
					text = text.replace(/{{KARTE_EMG}}/g, "");	
					
					text = text.split("{{newline}}");
									

					// Alarmmeldung
					var alarmMessage = '*⚠️ ⚠️ ⚠️    Alarm   ⚠️ ⚠️ ⚠️*';
					var delay = 0;

					// Informationsmeldung
					var tmp = EINSATZSTICHWORT.toLowerCase();
					if(tmp == 'inf verkehrssicherung' || 
						tmp == '1nf verkehrssicherung' || 
						tmp == 'sonstiges verkehrssicherung' ||
						tmp == 'inf sicherheitswache' ||
						tmp == '1nf sicherheitswache')
						alarmMessage = '* 🚧   Kein Einsatz   🚧*\n*Verkehrssicherung*';		

					// Beginn Telegramnachricht
					sendMessage(element.telegramid, '❗  🔻  🔻  🔻  🔻  🔻  🔻  🔻  🔻  ❗', Telegraf.Extra.markdown());

					delay += 8000;
					setTimeout(function () {
						sendMessage(element.telegramid, alarmMessage, Telegraf.Extra.markdown());					
					}, delay);		
					
					// Fax PDF
					if(sendFax) {						
						delay += 100;
						setTimeout(function () {							
							var filePath1 = filePath.replace(/.txt/g, ".pdf");
							
							fs.stat(filePath1, function(err, stat) {
								
								if(err == null) {
									var faxPDF = fs.readFileSync(filePath1);
									bot.telegram.sendDocument(element.telegramid, { source: faxPDF, filename: filePath1.split(/[/\\]/g).pop() })
										.catch((err) => {
											console.error("[Telegram] ERROR sendDocument (ChatID "+element.telegramid+"): " + err);
										});		 
								
								} else {
									
									var filePath2 = filePath.replace(/.txt/g, ".tif");							
									fs.stat(filePath2, function(err, stat) {
										if(err == null) {
											bot.telegram.sendPhoto(element.telegramid, {source: filePath2})
												.catch((err) => {
													console.error("[Telegram] ERROR sendPhoto (ChatID "+element.telegramid+"): " + err);
												});	
										} else {
											console.error("[Telegram] Error: PDF/TIFF nicht gefunden.");
										}
									});		
									
								}
							});			
							
							
						}, delay);	
					}
						
					// Pattern
					var arrayLength = text.length;	
					var i = 0;
					for (i = 0; i < arrayLength; i++) {		
						text[i] = text[i].trim();

						delay += 4000;
						setTimeout(function (message) {
							sendMessage(element.telegramid, message +" ", Telegraf.Extra.markdown());
						}, delay, text[i]);
					}
					
					// Karte
					if(sendMap) {	
						delay += 4000;
						setTimeout(function () {
							if (lat != undefined && lng != undefined && STRASSE != "")
								bot.telegram.sendLocation(element.telegramid, lat, lng)
									.catch((err) => {
										console.error("[Telegram] ERROR sendPhoto (ChatID "+element.telegramid+"): " + err);
									});	
							else
								bot.telegram.sendPhoto(element.telegramid, {source: 'public/images/noMap.png'})
									.catch((err) => {
										console.error("[Telegram] ERROR sendPhoto (ChatID "+element.telegramid+"): " + err);
									});	
						}, delay);
					}
					if(sendMapEmg) {	
						delay += 100;
						if (lat != undefined && lng != undefined && STRASSE != "")
							setTimeout(function () {
								sendMessage(element.telegramid, "*Hydrantenkarten:*\n[- Link Karte 1](https://wambachers-osm.website/emergency/#zoom=18&lat="+lat+"&lon="+lng+"&layer=Mapbox%20Streets&overlays=FFTTFTFFFFFT)\n[- Link Karte 2](http://www.openfiremap.org/?zoom=17&lat="+lat+"&lon="+lng+"&layers=B0000T)", Telegraf.Extra.markdown());
							}, delay);
					}
					
					// Komme JaNein
					delay += 4000;
					setTimeout(function () {
						sendMessage(element.telegramid, 'Komme:', extra );
					}, delay);
					
					//Alarmmeldung
					delay += 8000;
					setTimeout(function () {
						sendMessage(element.telegramid, alarmMessage, Telegraf.Extra.markdown());
					}, delay);
					
                });
            })
			.catch(err => console.error("[Telegram] ERROR: " + err))
    }
    onCallback.on('KommenNein', (ctx) => {
        ctx.answerCbQuery("Status -> 👎  Kommen: Nein", true);
        ctx.editMessageText("Status -> Kommen: Nein", extra);

        getUser(ctx.from.id)
            .then((rows) => {
                if (rows[0] != undefined) {
                    wss.broadcast('st_nicht', rows[0].name + " " + rows[0].vorname + "%" + rows[0].stAGT + "," + rows[0].stGRF + "," + rows[0].stMA + "," + rows[0].stZUGF);
                }
            });
    })
    onCallback.on('KommenJa', (ctx) => {
        ctx.answerCbQuery("Status -> 👍  Kommen: Ja", true);
        ctx.editMessageText("Status -> Kommen: Ja", extra);

        getUser(ctx.from.id)
            .then((rows) => {
                if (rows[0] != undefined) {
                    wss.broadcast('st_komme', rows[0].name + " " + rows[0].vorname + "%" + rows[0].stAGT + "," + rows[0].stGRF + "," + rows[0].stMA + "," + rows[0].stZUGF);
                }
            });
    })
    onCallback.on('KommenSpäter', (ctx) => {
        ctx.answerCbQuery("Status -> 🕖  Kommen: Später", true);
        ctx.editMessageText("Status -> Kommen: Später", extra);

        getUser(ctx.from.id)
            .then((rows) => {
                if (rows[0] != undefined) {
                    wss.broadcast('st_später', rows[0].name + " " + rows[0].vorname + "%" + rows[0].stAGT + "," + rows[0].stGRF + "," + rows[0].stMA + "," + rows[0].stZUGF);
                }
            });
    })


	// ---------------- Nachricht an alle ----------------
	function sendMsgToAll(msg) {
        console.log("[TelegramBot] Manuelle Nachricht an alle:  " + msg);
				
        getAllowedUser()
            .then((rows) => {
                rows.forEach(function (element) {
					sendMessage(element.telegramid, msg, Telegraf.Extra.markdown());
                });
            });
    }


	// ---------------- Kalender ----------------
	var lastTime = new Date();	
    bot.hears('📅 Kalender', ctx => {
		
		calendar.getCalendarString().then((termine) => {
			
			var str = "";
			
			for(var i = 0; i < termine.length; i++) {
				/*
				if(termine[i].toLowerCase().indexOf("mta") != -1)
					termine[i] = termine[i].replace('-', '- 📖')
				if(termine[i].toLowerCase().indexOf("übung") != -1)
					termine[i] = termine[i].replace('-', '- 🚒')
				*/
				str += termine[i] + "\n";
			}
			
			ctx.reply("*Termine:*\n_"+str+"_", Telegraf.Extra.markdown())
			
			}); 
		
		addStatistik(1, ctx.from.id);
    }); 
    var interval = setInterval(function calRemind() {    
        calendar.getCalendarRemind().then((termine) => {
            for (let i in termine) {
                if (termine[i].remind != undefined) {
                    var date1 = new Date();
                    var date2 = termine[i].remind;

                    if (lastTime < date2 && date2 < date1) {
                            console.log("[TelegramBot] --> Terminerinnerung")
                            var m = new Date(termine[i].start).getMonth();
                            m += 1;
                            if (m < 10)
                                m = "0" + m;
                            var d = new Date(termine[i].start).getDate();
                            if (d < 10)
                                d = "0" + d;

                            var hh = new Date(termine[i].start).getHours();
                            if (hh < 10)
                                hh = "0" + hh;
                            var mm = new Date(termine[i].start).getMinutes();
                            if (mm < 10)
                                mm = "0" + mm;
                            getAllowedUser()
                                .then((rows) => {
                                    rows.forEach(function (element) {
                                        if (element.sendRemembers == 1)
                                            sendMessage(element.telegramid, `*Terminerinnerung:* \n ${d}.${m} ${hh}:${mm} - ${termine[i].summary} ${termine[i].location}`, Telegraf.Extra.markdown());
                                    });
                                });
                        //}
                    }
                }
            }
            lastTime = new Date();
        });

    }, 60000);


	// ---------------- Bilder ----------------
	bot.on('photo', async (ctx) => {

		ctx.replyWithChatAction('typing')
		console.log("[TelegramBot] Telegram Bild!");
		
		// Normales Bild
		var filepath = process.env.BOT_IMG ;
		
		// Hydrantenbild
		if(hydrantPicRequested[ctx.from.id] == true) {				
			filepath = "Hydranten/" + locationList[ctx.from.id].latitude + ", " + locationList[ctx.from.id].longitude + "   ";
		} 
		
		
		var d = new Date();
		var options = {  year: 'numeric', month: '2-digit', day: '2-digit' };
		var time = d.toLocaleTimeString().replace(/[:]/g, '-');
		var date = d.toLocaleDateString('de-DE', options);
		

		const imageData = await bot.telegram.getFile(ctx.message.photo[ctx.message.photo.length - 1].file_id)
		const writer = fs.createWriteStream(filepath + time + " - " + date + " - " + imageData.file_path.substr(7))
		
		axios({
			method: 'get',
			url: `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${imageData.file_path}`,
			responseType: 'stream'
		 }).then(async (response) => {
			await response.data.pipe(writer)
			
			if(hydrantPicRequested[ctx.from.id] == true) {		
				//hydrantPicRequested[ctx.from.id] = false;
				
				ctx.reply('Fertig.', Telegraf.Extra.markup((markup) => {
					return markup.resize()
					  .keyboard([
						'⬅️ zurück'
					  ], { columns: 2 })
					  .oneTime()
				}))					
			} else {
				ctx.reply(`Bild gespeichert.`)
			}
			
		})
		.catch((err) => {
			console.log(1, err)
			ctx.reply('Bild speichern: Fehler.')
		})				
	
	})

	
	// ---------------- Bei restichen Texten ----------------
	bot.on('text', (ctx) => {
		
		hydrantPicRequested[ctx.from.id] = false;
		
		ctx.reply('Telegram Bot ' + process.env.FW_NAME_BOT, Telegraf.Extra.HTML().markup((m) =>
					m.keyboard(mainKeyboard).resize()
				));
				
	});


	// ---------------- Starte Bot ----------------
    bot.startPolling();


    return {
        sendAlarm: sendAlarm,
		allowUser: allowUser,
		removeUser: removeUser,
		sendMsgToAll: sendMsgToAll
    }; 
}

