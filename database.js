'use strict';

// Modul Datenbank
module.exports = function () {

  const debug = require('debug')('database');

  // ----------------  SQLITE ---------------- 
  const Database = require('sqlite-async');

  // ---------------- Datenbankfunktionen ----------------	
  const dbQuery = async function (str, ...values) {
    return new Promise(async (resolve, reject) => {
      var db = await Database.open('save.sqlite3').catch(err => reject(err));
      var statement = await db.prepare(str).catch(err => reject(err));
      statement.bind(values).catch(err => reject(err));
      var rows = await statement.all().catch(err => reject(err));
      await statement.finalize().catch(err => reject(err));
      await db.close().catch(err => reject(err));

      resolve(rows);
    });
  }


  const getUser = async function (uid) {
    return await dbQuery('SELECT * FROM users WHERE "telegramid"=?', parseInt(uid));
  }
  const getUserRowNum = async function (uid) {
    return await dbQuery('SELECT * FROM users WHERE "id"=?', parseInt(uid));
  }
  const getUserAll = async function () {
    return await dbQuery('SELECT * FROM users ORDER BY "name" ASC, "vorname" ASC');
  }
  const getAllowedUser = async function () {
    return await dbQuery('SELECT users.*, groups."pattern" FROM users LEFT JOIN groups ON users."group" = groups."id" WHERE "allowed"="1"');
  }
  const getStatus = async function (uid) {
    //return await dbQuery('SELECT * FROM users ' + (uid != undefined ? (' WHERE "telegramid"=' + uid) : ""));
    return await dbQuery('SELECT status, stAGT, stMA, stGRF, stZUGF, statusUntil, sendRemembers, appNotifications, kalenderGroups FROM users ' + (uid != undefined ? (' WHERE "telegramid"=?') : ""), parseInt(uid));
  }
  const getStatusAll = async function () {
    return await dbQuery('SELECT * FROM users');
  }
  const isAllowed = async function (uid) {
    var rows = await getUser(uid);
    if (rows[0] != undefined)
      return rows[0].allowed == 1;
  }
  const setVerfuegbar = async function (uid, status, until) {
    return await dbQuery('UPDATE "main"."users" SET "status"=?, "statusUntil"=? WHERE "telegramid"=?', status, until.toString(), parseInt(uid));
  }
  const addUser = async function (uid, name, vorname) {
    // war mit .run()
    return await dbQuery('INSERT INTO "main"."users"("id", "name","vorname","telegramid","status","group","admin") VALUES (NULL,?,?,?,1,1,0)', name, vorname, parseInt(uid));
  }
  const activateUser = async function (uid) {
    return await dbQuery('UPDATE "main"."users" SET "allowed"=1 WHERE "_rowid_"=?', parseInt(uid));
  }
  const deleteUser = async function (uid) {
    return await dbQuery('DELETE FROM "main"."users" WHERE _rowid_ IN(?)', parseInt(uid));
  } 
  const changeUserGroup = async function (uid, group) {
    //return await dbQuery('UPDATE "main"."users" SET "group"=? WHERE "id"=?', group, parseInt(uid));
		return await dbQuery('UPDATE "main"."users" SET "group"=? WHERE "id"=?', (group * 1 + 1), parseInt(uid));
	};
  const getAlarmList = async function (offset, row_count) {
    if(!offset) offset = 0;
    if(!row_count) row_count = 100;
		return await dbQuery('SELECT "_rowid_",* FROM "main"."alarms" ORDER BY "id" DESC LIMIT ?, ?;', offset, row_count);
	}
  const changeUserRemember = async function (uid, val) {
    return await dbQuery('UPDATE "main"."users" SET "sendRemembers"=? WHERE "telegramid"=?', val, parseInt(uid));
  }
  const getStatistik = async function () {
    //return await dbQuery("SELECT einsatzstichwort, count(einsatzstichwort) AS number FROM alarms WHERE strftime('%Y', date) = strftime('%Y', DATE('now')) GROUP BY einsatzstichwort");
    return await dbQuery("SELECT einsatzstichwort, count(einsatzstichwort) AS number FROM alarms WHERE strftime('%Y', date) = strftime('%Y', DATE('now')) GROUP BY einsatzstichwort ORDER BY number DESC");
  }
  const addStatistik = async function (aktion, user) {
    var now = new Date();
    return await dbQuery('INSERT INTO "main"."statistik"("date","aktion","user") VALUES (?,?,?)', now.toISOString(), aktion, user);
  }
  const changePassword = async function (uid, value) {
    return await dbQuery('UPDATE "main"."users" SET "appPasswort" = ? WHERE "telegramid"= ? ', value, parseInt(uid));
  }
  const dbInsertAlarm = async function (
		EINSATZSTICHWORT,
		SCHLAGWORT,
		OBJEKT,
		BEMERKUNG,
		STRASSE,
		ORTSTEIL,
		ORT,
		lat,
		lng,
		cars1,
		cars2,
		isAddress
	) {
		var now = new Date();

		return await dbQuery(
			'INSERT INTO alarms ("date","einsatzstichwort","schlagwort","objekt","bemerkung","strasse","ortsteil","ort", "lat", "lng", "cars1", "cars2", "isAddress")' +
			' VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
			now.toISOString(),
			EINSATZSTICHWORT,
			SCHLAGWORT,
			OBJEKT,
			BEMERKUNG,
			STRASSE,
			ORTSTEIL,
			ORT,
			lat,
			lng,
			cars1.toString(),
			cars2.toString(),
			(isAddress == true ? 1 : 0));
  }  
  const getKalendergruppen = async function () {
		return await dbQuery('SELECT * FROM kalenderGroups');
  }  
  const getUserNotificationsSubscription = async function () {
    return await dbQuery('SELECT "appNotifications", "appNotificationsSubscription" AS endpoint, telegramid, "drucker", "group", "stAGT", "stMA", "stGRF", "stZUGF", "admin"  FROM users');         
  }
  const changeUserNotificationsSubscription = async function (uid, val) {
    return await dbQuery('UPDATE "main"."users" SET "appNotificationsSubscription"=? WHERE "telegramid"=?', val, parseInt(uid));         
  }
  const getLastAlarm = async function () {
    return await dbQuery('SELECT * FROM alarms ORDER BY id DESC LIMIT 1;');	
  }
  const getGroups = async function () {
		return await dbQuery('SELECT * FROM groups');
  };
  const getStatistikKlicks = async function (aktion, days) {
		return await dbQuery(
			'SELECT  *, count(user) AS num FROM  statistik WHERE aktion=? AND ' +
			'strftime("%Y-%m-%d",date) >= date("now","-' + days + ' days") AND strftime("%Y-%m-%d",date)<=date("now") GROUP BY user',
			aktion
		);
  };
  const getIsAlarm = async function () {
		return await dbQuery('SELECT * FROM alarms WHERE strftime("%Y-%m-%d %H:%M",date) >= datetime("now", "-90 minutes") ORDER BY id DESC');       
  }
  const getLogin = async function (uid) {
		return await dbQuery("SELECT appPasswort, admin, kalender FROM users WHERE telegramid=?", parseInt(uid));       
  }
  const getLoginAuto = async function (appBenutzer) {
		return await dbQuery("SELECT appPasswort, appBenutzer, name, id FROM autos WHERE appBenutzer=?", appBenutzer);       
  }
  const changeStAny = async function (uid, type, value) {
		return await dbQuery('UPDATE "main"."users" SET "' + type + '"= ? WHERE "id"= ? ', value, parseInt(uid));
  };
  const getAlarm = async function (id) {
		return await dbQuery('SELECT "_rowid_",* FROM "main"."alarms" WHERE "id"=?', id);
		console.log(offset, row_count);
	}
  const getUserPattern = async function (uid) {
		return await dbQuery('SELECT groups."pattern" FROM users LEFT JOIN groups ON users."group"=groups."id"  WHERE users."telegramid"=?', parseInt(uid));
  }
  const changeUserNotifications = async function (uid, val) {
		return await dbQuery('UPDATE "main"."users" SET "appNotifications"=? WHERE "telegramid"=?', val, parseInt(uid));
  }
	const setKalendergruppen = async function (id, name, pattern) {
		return await dbQuery('UPDATE "main"."kalenderGroups" SET "name"=?, pattern=? WHERE id=?', name, pattern, parseInt(id));
	}
	const getAlarmgruppen = async function () {
		return await dbQuery('SELECT * FROM groups');
	}
	const setAlarmgruppen = async function (id, name, pattern) {
		return await dbQuery('UPDATE "main"."groups" SET "name"=?, pattern=? WHERE id=?', name, pattern, parseInt(id));
  }
  const getKalender = async function () {
		return await dbQuery('SELECT * FROM kalender');
  }
  const addKalender = async function (summary, start, remind, group) {
    return await dbQuery('INSERT INTO "main"."kalender"("id", "summary","start","remind","group") VALUES (NULL,?,?,?,?)', summary, start, remind, group);
  }
  const updateKalender = async function (id, summary, start, remind, group) {
    debug('UPDATE "main"."kalender" SET "summary"=?, start=?, remind=?, group=? WHERE id=?', summary, start, remind, group, id);
		return await dbQuery('UPDATE "main"."kalender" SET "summary"=?, "start"=?, "remind"=?, "group"=? WHERE id=?', summary, start, remind, group, id);
  }
  const deleteKalender = async function (id) {
    return await dbQuery('DELETE FROM "main"."kalender" WHERE id IN(?)', id);
  } 
  const setVerfuegbarkeitPlans = async function (uid, plans) {
    return await dbQuery('UPDATE "main"."users" SET "statusPlans"=? WHERE "telegramid"=?', plans.toString(), parseInt(uid));
  }
  const getVerfuegbarkeitPlans = async function (uid) {
    return await dbQuery('SELECT statusPlans FROM users ' + (uid != undefined ? (' WHERE "telegramid"=?') : ""), parseInt(uid));
  }



  // ----------------  Datenbank updaten ---------------- 

  const update = async function () {
    Database.open('save.sqlite3')
      .then(db => {

        // Nachträgliche Tabellen und Spalten :)

        // Tabelle Statistik
        db.all('CREATE TABLE IF NOT EXISTS statistik (date TEXT, aktion INTEGER, user TEXT)').then(rows => {
          debug("Created Datatable Statistik");
        }).catch(err => {
          console.error("Database error: " + err);
        });

        // Spalte Status bis
        db.all('PRAGMA table_info("users")').then((rows) => {
          var exists = false;
          rows.forEach(function (element) {
            if (element.name == "statusUntil")
              exists = true;
          });
          if (!exists) {
            db.run('ALTER TABLE users ADD statusUntil TEXT;').then(rows => {
              debug("Created Column statusUntil in users");
            }).catch(err => {
              console.error("[APP] Database error: " + err);
            })
          }
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });

        // Spalte isAddress
        db.all('PRAGMA table_info("alarms")').then((rows) => {
          var exists = false;
          rows.forEach(function (element) {
            if (element.name == "isAddress")
              exists = true;
          });
          if (!exists) {
            db.run('ALTER TABLE alarms ADD isAddress INTEGER;').then(rows => {
              debug("Created Column isAddress in alarms");
            }).catch(err => {
              console.error("[APP] Database error: " + err);
            })
          }
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });

        // Spalte drucker
        db.all('PRAGMA table_info("users")').then((rows) => {
          var exists = false;
          rows.forEach(function (element) {
            if (element.name == "drucker")
              exists = true;
          });
          if (!exists) {
            db.run('ALTER TABLE users ADD drucker INTEGER DEFAULT 0;').then(rows => {
              debug("Created Column drucker in users");
            }).catch(err => {
              console.error("[APP] Database error: " + err);
            })
          }
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });

        // Spalte kalender
        db.all('PRAGMA table_info("users")').then((rows) => {
          let exists = false;
          rows.forEach(function (element) {
            if (element.name == "kalender")
              exists = true;
          });
          if (!exists) {
            db.run('ALTER TABLE users ADD kalender INTEGER DEFAULT 0;').then(rows => {
              debug("Created Column kalender in users");
            }).catch(err => {
              console.error("[APP] Database error: " + err);
            })
          }
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });


        // Spalte appPasswort
        db.all('PRAGMA table_info("users")').then((rows) => {
          var exists = false;
          rows.forEach(function (element) {
            if (element.name == "appPasswort")
              exists = true;
          });
          if (!exists) {
            db.run('ALTER TABLE users ADD appPasswort TEXT;').then(rows => {
              debug("Created Column appPasswort in users");
            }).catch(err => {
              console.error("[APP] Database error: " + err);
            })
          }
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });

        // Spalte appNotifications
        db.all('PRAGMA table_info("users")').then((rows) => {
          var exists = false;
          rows.forEach(function (element) {
            if (element.name == "appNotifications")
              exists = true;
          });
          if (!exists) {
            db.run('ALTER TABLE users ADD appNotifications INTEGER DEFAULT 0;').then(rows => {
              debug("Created Column appNotifications in users");
            }).catch(err => {
              console.error("[APP] Database error: " + err);
            })
          }
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });

        // Spalte appNotificationsSubscription
        db.all('PRAGMA table_info("users")').then((rows) => {
          var exists = false;
          rows.forEach(function (element) {
            if (element.name == "appNotificationsSubscription")
              exists = true;
          });
          if (!exists) {
            db.run('ALTER TABLE users ADD appNotificationsSubscription TEXT;').then(rows => {
              debug("Created Column appNotificationsSubscription in users");
            }).catch(err => {
              console.error("[APP] Database error: " + err);
            })
          }
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });

        // Spalte appNotifications
        db.all('PRAGMA table_info("users")').then((rows) => {
          var exists = false;
          rows.forEach(function (element) {
            if (element.name == "kalenderGroups")
              exists = true;
          });
          if (!exists) {
            db.run('ALTER TABLE users ADD kalenderGroups INTEGER DEFAULT 1;').then(rows => {
              debug("Created Column kalenderGroups in users");
            }).catch(err => {
              console.error("[APP] Database error: " + err);
            })
          }
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });

        // Tabelle kalenderGroups
        db.all('CREATE TABLE IF NOT EXISTS "kalenderGroups" ("id" INTEGER UNIQUE, "name" TEXT, "pattern" TEXT, PRIMARY KEY(id AUTOINCREMENT))').then(rows => {
          debug("Created Datatable kalenderGroups");
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });

        // Tabelle kalenderGroups Daten
        db.all('INSERT INTO kalenderGroups("id","name","pattern") VALUES (1,"Alle","{{alle}}")').then(rows => {
          debug("Created Datatable kalenderGroups");

          for (let i = 1; i < 8; i++) {
            // Tabelle kalenderGroups Daten
            db.all('INSERT INTO kalenderGroups("id","name","pattern") VALUES (' + (i + 1) + ',"Gruppe ' + i + '","{{gr' + i + '}}")').then(rows => {
              debug('#');
            }).catch(err => {
              ;
            })
          }
        }).catch(err => {
          ;
        });

        // Tabelle kalende
        db.all('CREATE TABLE IF NOT EXISTS "kalender" ("id"	INTEGER NOT NULL UNIQUE,"summary"	TEXT,"start"	TEXT,"remind"	TEXT,"group"	TEXT,PRIMARY KEY("id" AUTOINCREMENT))')
        .then(rows => {
          debug("Created Datatable kalender");
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });+
        
        // Tabelle autos
        db.all('CREATE TABLE IF NOT EXISTS "autos" ("id"	INTEGER NOT NULL UNIQUE,"name"	TEXT,"appBenutzer"	TEXT,"appPasswort"	TEXT,PRIMARY KEY("id" AUTOINCREMENT))')
        .then(rows => {
          debug("Created Datatable autos");
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });

        // Spalte statusPlans
        db.all('PRAGMA table_info("users")').then((rows) => {
          var exists = false;
          rows.forEach(function (element) {
            if (element.name == "statusPlans")
              exists = true;
          });
          if (!exists) {
            db.run('ALTER TABLE users ADD statusPlans TEXT;').then(rows => {
              debug("Created Column statusPlans in users");
            }).catch(err => {
              console.error("[APP] Database error: " + err);
            })
          }
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });




      })
      .catch(err => {
        console.error("[APP] Database error: " + err);
      });
  }




  return {
    getUser,
    getUserRowNum,
    getUserAll,
    getAllowedUser,
    getStatus,
    getStatusAll,
    isAllowed,
    setVerfuegbar,
    addUser,
    activateUser,
    deleteUser,
    changeUserGroup,
    getAlarmList,
    changeUserRemember,
    getStatistik,
    addStatistik,
    changePassword,
    dbInsertAlarm,
    getKalendergruppen,
    getUserNotificationsSubscription,
    changeUserNotificationsSubscription,
    getLastAlarm,
    getGroups,
    getStatistikKlicks,
    getIsAlarm,
    getLogin,
    getLoginAuto,
    changeStAny,
    getAlarm,
    getUserPattern,
    changeUserNotifications,
    setKalendergruppen,
    getAlarmgruppen,
    setAlarmgruppen,
    getKalender,
    addKalender,
    updateKalender,
    deleteKalender,
    setVerfuegbarkeitPlans,
    getVerfuegbarkeitPlans,
    update
  };
}