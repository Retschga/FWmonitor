--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

ALTER TABLE users RENAME COLUMN allowed TO approved;


PRAGMA foreign_keys;
PRAGMA foreign_keys = '0';
PRAGMA collation_list;
SAVEPOINT "db4s_renamecolumn_16220612292814694";
PRAGMA database_list;
SELECT type,name,sql,tbl_name FROM "main".sqlite_master;
SELECT type,name,sql,tbl_name FROM sqlite_temp_master;
CREATE TABLE "sqlb_temp_table_4" (
	"id"	INTEGER NOT NULL,
	"approved"	INTEGER DEFAULT 0,
	"name"	TEXT,
	"vorname"	TEXT,
	"telegramid"	TEXT,
	"status"	INTEGER DEFAULT 1,
	"statusUntil"	TEXT,
	"sendRemembers"	INTEGER DEFAULT 1,
	"group"	INTEGER DEFAULT 1,
	"admin"	INTEGER DEFAULT 0,
	"drucker"	INTEGER DEFAULT 0,
	"stAGT"	INTEGER DEFAULT 0,
	"stGRF"	INTEGER DEFAULT 0,
	"stMA"	INTEGER DEFAULT 0,
	"stZUGF"	INTEGER DEFAULT 0,
	"appPasswort"	TEXT,
	"appNotifications"	INTEGER DEFAULT 0,
	"appNotificationsSubscription"	TEXT,
	"kalenderGroups"	TEXT DEFAULT 1,
	"kalender"	INTEGER DEFAULT 0,
	"statusPlans"	TEXT,
	"statusHidden"	INTEGER DEFAULT 0,
	"softwareInfo"	INTEGER DEFAULT 0,
	"telefonliste"	INTEGER DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT)
);
SAVEPOINT "RESTOREPOINT";
INSERT INTO "main"."sqlb_temp_table_4" SELECT * FROM "main"."users";
PRAGMA defer_foreign_keys;
PRAGMA defer_foreign_keys = '1';
DROP TABLE "main"."users";
ALTER TABLE "main"."sqlb_temp_table_4" RENAME TO "users";
PRAGMA defer_foreign_keys = '0';
RELEASE "db4s_renamecolumn_16220612292814694";
PRAGMA database_list;
SELECT type,name,sql,tbl_name FROM "main".sqlite_master;
SELECT type,name,sql,tbl_name FROM sqlite_temp_master;
PRAGMA "main".foreign_key_check;
PRAGMA foreign_keys = '1';

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

ALTER TABLE users RENAME COLUMN approved TO allowed;