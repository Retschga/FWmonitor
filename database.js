'use strict';

// Modul Datenbank
module.exports = function () {

  const debug = require('debug')('database');
  const dbFile = 'save.sqlite3';

  // ----------------  SQLITE ---------------- 
  const Database = require('sqlite-async');

  // Enums
  const USER_STATUS = {"NVERV": 2, "VERV": 1, "BOT_DISABLED": -2, "BOT_BLOCKED": -1};
  const USER_STATUSHIDDEN = {"HIDDEN": 1, "VISIBLE": 0};
  const STATISTIK = {"SHOW_VERV": 2, "SET_VERV": 3, "SHOW_KALENDER": 1};


  // ---------------- Datenbankfunktionen ----------------	
  const dbQuery = async function (str, ...values) {
    return new Promise(async (resolve, reject) => {
      var db = await Database.open(dbFile).catch(err => reject(err));
      var statement = await db.prepare(str).catch(err => reject(err));
      statement.bind(values).catch(err => reject(err));
      var rows = await statement.all().catch(err => reject(err));
      await statement.finalize().catch(err => reject(err));
      await db.close().catch(err => reject(err));

      resolve(rows);
    });
  }

  // ---- User ----
  const getUserByTelId = async function (telid) {
    return await dbQuery('SELECT * FROM users WHERE "telegramid"=?', parseInt(telid));
  }
  const getUserByRowNum = async function (row) {
    return await dbQuery('SELECT * FROM users WHERE "id"=?', parseInt(row));
  }
  const getUserAll = async function () {
    return await dbQuery('SELECT * FROM users ORDER BY "name" ASC, "vorname" ASC');
  }
  const getUserAllowed = async function () {
    return await dbQuery('SELECT users.*, groups."pattern" FROM users LEFT JOIN groups ON users."group" = groups."id" WHERE "allowed"="1"');
  }

  // ---- User Status ----
  const getUserStatusByTelId = async function (telid) {
    //return await dbQuery('SELECT * FROM users ' + (uid != undefined ? (' WHERE "telegramid"=' + uid) : ""));
    return await dbQuery('SELECT status, stAGT, stMA, stGRF, stZUGF, statusUntil, sendRemembers, appNotifications, kalenderGroups, statusHidden FROM users ' + (telid != undefined ? (' WHERE "telegramid"=?') : ""), parseInt(telid));
  }
  const getUserStatusAll = async function () {
    return await dbQuery('SELECT * FROM users WHERE allowed == 1 AND statusHidden <> 1 ORDER BY "name" ASC, "vorname" ASC');
  }
  const setUserStatus = async function (telid, status, until) {
    return await dbQuery('UPDATE "main"."users" SET "status"=?, "statusUntil"=? WHERE "telegramid"=?', status, until.toString(), parseInt(telid));
  }
  const setUserStatusPlan = async function (telid, plans) {
    return await dbQuery('UPDATE "main"."users" SET "statusPlans"=? WHERE "telegramid"=?', plans.toString(), parseInt(telid));
  }
  const getUserStatusPlan = async function (telid) {
    return await dbQuery('SELECT statusPlans FROM users ' + (telid != undefined ? (' WHERE "telegramid"=?') : ""), parseInt(telid));
  }
  const setUserStatusHidden = async function (telid, value) {
    return await dbQuery('UPDATE "main"."users" SET "statusHidden"=? WHERE "telegramid"=?', parseInt(value), parseInt(telid));
  }
  const getUserStatusHidden = async function (telid) {
    return await dbQuery('SELECT statusHidden FROM users ' + (telid != undefined ? (' WHERE "telegramid"=?') : ""), parseInt(telid));
  }

  // ---- User Settings ----
  const setUserPassword = async function (telid, value) {
    return await dbQuery('UPDATE "main"."users" SET "appPasswort" = ? WHERE "telegramid"= ? ', value, parseInt(telid));
  }
  const getUserLogin = async function (telid) {
		return await dbQuery("SELECT appPasswort, admin, kalender FROM users WHERE telegramid=?", parseInt(telid));       
  }
  const getAutoLogin = async function (appBenutzer) {
		return await dbQuery("SELECT appPasswort, appBenutzer, name, id FROM autos WHERE appBenutzer=?", appBenutzer);       
  }
  const setUserColumn = async function (uid, type, value) {
		return await dbQuery('UPDATE "main"."users" SET "' + type + '"= ? WHERE "id"= ? ', value, parseInt(uid));
  };

  // ---- User Notifications ----
  const getUserNotificationsSubscription = async function () {
    return await dbQuery('SELECT "appNotifications", "appNotificationsSubscription" AS endpoint, telegramid, "drucker", "softwareInfo", "group", "stAGT", "stMA", "stGRF", "stZUGF", "admin"  FROM users');         
  }
  const setUserNotificationsSubscription = async function (telid, val) {
    return await dbQuery('UPDATE "main"."users" SET "appNotificationsSubscription"=? WHERE "telegramid"=?', val, parseInt(telid));         
  }
  const setUserNotifications = async function (telid, val) {
		return await dbQuery('UPDATE "main"."users" SET "appNotifications"=? WHERE "telegramid"=?', val, parseInt(telid));
  }

  // ---- User Add/Remove/Allowed ----
  const isUserAllowed = async function (telid) {
    var rows = await getUserByTelId(telid);
    if (rows[0] != undefined)
      return rows[0].allowed == 1;
  }
  const addUser = async function (telid, name, vorname) {
    // war mit .run()
    return await dbQuery('INSERT INTO "main"."users"("id", "name","vorname","telegramid","status","group","admin") VALUES (NULL,?,?,?,1,1,0)', name, vorname, parseInt(telid));
  }
  const activateUser = async function (uid) {
    return await dbQuery('UPDATE "main"."users" SET "allowed"=1 WHERE "_rowid_"=?', parseInt(uid));
  }
  const deleteUser = async function (uid) {
    return await dbQuery('DELETE FROM "main"."users" WHERE _rowid_ IN(?)', parseInt(uid));
  } 

  // ---- User Group ----
  const changeUserGroup = async function (uid, group) {
    //return await dbQuery('UPDATE "main"."users" SET "group"=? WHERE "id"=?', group, parseInt(uid));
		return await dbQuery('UPDATE "main"."users" SET "group"=? WHERE "id"=?', (group * 1 + 1), parseInt(uid));
	};
  const changeUserReminders = async function (telid, value) {
    return await dbQuery('UPDATE "main"."users" SET "sendRemembers"=? WHERE "telegramid"=?', value, parseInt(telid));
  }
  const getGroupsAll = async function () {
		return await dbQuery('SELECT * FROM groups');
  };

  // ---- Statistik ----
  const getStatistik = async function (year) {
    if(!year)
    return await dbQuery("SELECT einsatzstichwort, count(einsatzstichwort) AS number FROM alarms WHERE strftime('%Y', date) = strftime('%Y', DATE('now')) GROUP BY einsatzstichwort ORDER BY number DESC");
    else
    return await dbQuery("SELECT einsatzstichwort, count(einsatzstichwort) AS number FROM alarms WHERE strftime('%Y', date)=? GROUP BY einsatzstichwort ORDER BY number DESC", year);
  }
  const addStatistik = async function (aktion, user) {
    var now = new Date();
    return await dbQuery('INSERT INTO "main"."statistik"("date","aktion","user") VALUES (?,?,?)', now.toISOString(), aktion, user);
  }
  const getStatistikKlicks = async function (aktion, days) {
		return await dbQuery(
			'SELECT  *, count(user) AS num FROM  statistik WHERE aktion=? AND ' +
			'strftime("%Y-%m-%d",date) >= date("now","-' + days + ' days") AND strftime("%Y-%m-%d",date)<=date("now") GROUP BY user',
			aktion
		);
  };

  // ---- Kalender ----
  const getKalendergruppen = async function () {
		return await dbQuery('SELECT * FROM kalenderGroups');
  }  
	const setKalendergruppen = async function (id, name, pattern) {
		return await dbQuery('UPDATE "main"."kalenderGroups" SET "name"=?, pattern=? WHERE id=?', name, pattern, parseInt(id));
  }
  const getKalender = async function () {
		return await dbQuery('SELECT * FROM kalender');
  }
  const insertKalender = async function (summary, start, remind, group) {
    return await dbQuery('INSERT INTO "main"."kalender"("id", "summary","start","remind","group") VALUES (NULL,?,?,?,?)', summary, start, remind, group);
  }
  const updateKalender = async function (id, summary, start, remind, group) {
    debug('UPDATE "main"."kalender" SET "summary"=?, start=?, remind=?, group=? WHERE id=?', summary, start, remind, group, id);
		return await dbQuery('UPDATE "main"."kalender" SET "summary"=?, "start"=?, "remind"=?, "group"=? WHERE id=?', summary, start, remind, group, id);
  }
  const deleteKalender = async function (id) {
    return await dbQuery('DELETE FROM "main"."kalender" WHERE id IN(?)', id);
  } 

  // ---- Alarm ----
  const insertAlarm = async function (
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
  const getAlarmLast = async function () {
    return await dbQuery('SELECT * FROM alarms ORDER BY id DESC LIMIT 1;');	
  }
  const isAlarmNow = async function () {
		return await dbQuery('SELECT * FROM alarms WHERE strftime("%Y-%m-%d %H:%M",date) >= datetime("now", "-90 minutes") ORDER BY id DESC');       
  }  
  const getAlarmAll = async function (id) {
		return await dbQuery('SELECT "_rowid_",* FROM "main"."alarms" WHERE "id"=?', id);
		console.log(offset, row_count);
	}
  const getUserAlarmPattern = async function (uid) {
		return await dbQuery('SELECT groups."pattern" FROM users LEFT JOIN groups ON users."group"=groups."id"  WHERE users."telegramid"=?', parseInt(uid));
  }
	const getAlarmgruppenAll = async function () {
		return await dbQuery('SELECT * FROM groups');
	}
	const setAlarmgruppen = async function (id, name, pattern) {
		return await dbQuery('UPDATE "main"."groups" SET "name"=?, pattern=? WHERE id=?', name, pattern, parseInt(id));
  }
  const getAlarmList = async function (offset, row_count) {
    if(!offset) offset = 0;
    if(!row_count) row_count = 100;
		return await dbQuery('SELECT "_rowid_",* FROM "main"."alarms" ORDER BY "id" DESC LIMIT ?, ?;', offset, row_count);
	}


  // ----------------  Datenbank updaten ---------------- 

  function addColumn(db, table, name, type, defaul) {
    db.all(`PRAGMA table_info("${table}")`).then((rows) => {
      var exists = false;
      rows.forEach(function (element) {
        if (element.name == name)
          exists = true;
      });
      if (!exists) {
        db.run(`ALTER TABLE ${table} ADD ${name} ${type} ${defaul}`).then(rows => {
          debug(`Created Column ${name} in users`);
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        })
      }
    }).catch(err => {
      console.error("[APP] Database error: " + err);
    });
  }

  const updateDatabase = async function () {
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
        addColumn(db, 'users', 'statusUntil', 'INTEGER', '');

        // Spalte isAddress
        addColumn(db, 'alarms', 'isAddress', 'TEXT', '');

        // Spalte drucker
        addColumn(db, 'users', 'drucker', 'INTEGER', 'DEFAULT 0');
       
        // Spalte kalender
        addColumn(db, 'users', 'kalender', 'INTEGER', 'DEFAULT 0');

        // Spalte appPasswort
        addColumn(db, 'users', 'appPasswort', 'TEXT', '');

        // Spalte appNotifications
        addColumn(db, 'users', 'appNotifications', 'INTEGER', 'DEFAULT 0');

        // Spalte appNotificationsSubscription
        addColumn(db, 'users', 'appNotificationsSubscription', 'TEXT', '');

        // Spalte appNotifications
        addColumn(db, 'users', 'kalenderGroups', 'INTEGER', 'DEFAULT 1');

        // Tabelle kalenderGroups
        db.all('CREATE TABLE IF NOT EXISTS "kalenderGroups" ("id" INTEGER UNIQUE, "name" TEXT, "pattern" TEXT, PRIMARY KEY(id AUTOINCREMENT))').then(rows => {
          debug("Created Datatable kalenderGroups");
        }).catch(err => {
          console.error("[APP] Database error: " + err);
        });

        // Tabelle kalenderGroups Daten
        db.all('INSERT INTO kalenderGroups("id","name","pattern") VALUES (1,"Alle","{{alle}}")').then(rows => {
          debug("Created Datatable kalenderGroups");          
        }).catch(err => {
          ;
        });

        for (let i = 1; i < 16; i++) {
            // Tabelle kalenderGroups Daten
            db.all('INSERT INTO kalenderGroups("id","name","pattern") VALUES (' + (i + 1) + ',"Gruppe ' + i + '","{{gr' + i + '}}")').then(rows => {
              debug('#');
            }).catch(err => {
              ;
            })
          }

        // Tabelle kalender
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
        addColumn(db, 'users', 'statusPlans', 'TEXT', '');

        // Spalte statusHidden
        addColumn(db, 'users', 'statusHidden', 'INTEGER', 'DEFAULT 0');

        // Spalte softwareInfo
        addColumn(db, 'users', 'softwareInfo', 'INTEGER', 'DEFAULT 0');


      })
      .catch(err => {
        console.error("[APP] Database error: " + err);
      });
  }




  return {
    getUserByTelId,
    getUserByRowNum,
    getUserAll,
    getUserAllowed,
    getUserStatusByTelId,
    getUserStatusAll,
    isUserAllowed,
    setUserStatus,
    addUser,
    activateUser,
    deleteUser,
    changeUserGroup,
    getAlarmList,
    changeUserReminders,
    getStatistik,
    addStatistik,
    setUserPassword,
    insertAlarm,
    getKalendergruppen,
    getUserNotificationsSubscription,
    setUserNotificationsSubscription,
    getAlarmLast,
    getGroupsAll,
    getStatistikKlicks,
    isAlarmNow,
    getUserLogin,
    getAutoLogin,
    setUserColumn,
    getAlarmAll,
    getUserAlarmPattern,
    setUserNotifications,
    setKalendergruppen,
    getAlarmgruppenAll,
    setAlarmgruppen,
    getKalender,
    insertKalender,
    updateKalender,
    deleteKalender,
    setUserStatusPlan,
    getUserStatusPlan,
    getUserStatusHidden,
    setUserStatusHidden,
    updateDatabase,
    USER_STATUS,
    USER_STATUSHIDDEN,
    STATISTIK
  };
}