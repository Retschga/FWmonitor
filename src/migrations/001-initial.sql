--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE "users" (
    "id"                            INTEGER NOT NULL,
    "allowed"                        INTEGER DEFAULT 0,
    "telegramid"                    TEXT,
    "name"                            TEXT,
    "vorname"                        TEXT,    

    "status"                        INTEGER DEFAULT 1,
    "statusUntil"                    TEXT,
    "statusPlans"                    TEXT,
    "statusHidden"                    INTEGER DEFAULT 0,
    
    "kalenderGroups"                TEXT    DEFAULT 1,
    "sendRemembers"                    INTEGER DEFAULT 1,
    
    "appPasswort"                    TEXT,
    "appNotifications"                INTEGER DEFAULT 0,
    "appNotificationsSubscription"    TEXT,

    "group"                            INTEGER DEFAULT 1,
    
    "admin"                            INTEGER DEFAULT 0,    
    "stAGT"                            INTEGER DEFAULT 0,
    "stGRF"                            INTEGER DEFAULT 0,
    "stMA"                            INTEGER DEFAULT 0,
    "stZUGF"                        INTEGER DEFAULT 0,    
    "drucker"                        INTEGER DEFAULT 0,
    "softwareInfo"                    INTEGER DEFAULT 0,
    "telefonliste"                    INTEGER DEFAULT 0,
    "kalender"                        INTEGER DEFAULT 0,
    PRIMARY KEY("id" AUTOINCREMENT)
);

CREATE TABLE "groups" (
    "id"                            INTEGER NOT NULL,
    "name"                            TEXT,
    "pattern"                        TEXT,
    PRIMARY KEY("id" AUTOINCREMENT)
);

CREATE TABLE "autos" (
    "id"                            INTEGER NOT NULL UNIQUE,
    "name"                            TEXT,
    "appBenutzer"                    TEXT,
    "appPasswort"                    TEXT,
    PRIMARY KEY("id" AUTOINCREMENT)
);

CREATE TABLE "alarms" (
    "id"                            INTEGER UNIQUE,
    "date"                            TEXT NOT NULL,
    "einsatzstichwort"                REAL,
    "schlagwort"                    TEXT,
    "objekt"                        TEXT,
    "bemerkung"                        TEXT,
    "strasse"                        TEXT,
    "ortsteil"                        TEXT,
    "ort"                            TEXT,
    "lat"                            TEXT,
    "lng"                            TEXT,
    "cars1"                            TEXT,
    "cars2"                            TEXT,
    "isAddress"                        INTEGER,
    PRIMARY KEY("id" AUTOINCREMENT)
);

CREATE TABLE "kalender" (
    "id"                            INTEGER NOT NULL UNIQUE,
    "summary"                        TEXT,
    "start"                            TEXT,
    "remind"                        TEXT,
    "group"                            TEXT,
    PRIMARY KEY("id" AUTOINCREMENT)
);

CREATE TABLE "kalenderGroups" (
    "id"                            INTEGER UNIQUE,
    "name"                            TEXT,
    "pattern"                        TEXT,
    PRIMARY KEY("id" AUTOINCREMENT)
);

INSERT INTO groups (name, pattern) VALUES ('Standard', '   *{{EINSATZSTICHWORT}}* {{KARTE}} {{KARTE_EMG}} {{UPDATES}}
_> {{SCHLAGWORT}}_
_> {{OBJEKT}}_
_> {{STRASSE}}_
_> {{ORTSTEIL}}_
_> {{ORT}}_
{{newline}}
*Bemerkung:*
_{{BEMERKUNG}}_{{newline}}
*Einsatzmittel:*
_{{EINSATZMITTEL_EIGEN}}_');
INSERT INTO groups (name, pattern) VALUES ('Fax', '   *{{EINSATZSTICHWORT}}* {{KARTE}} {{KARTE_EMG}} {{FAX}} {{UPDATES}}
_> {{SCHLAGWORT}}_
_> {{OBJEKT}}_
_> {{STRASSE}}_
_> {{ORTSTEIL}}_
_> {{ORT}}_
{{newline}}
*Bemerkung:*
_{{BEMERKUNG}}_{{newline}}
*Einsatzmittel:*
_{{EINSATZMITTEL_EIGEN}}_');
INSERT INTO groups (name, pattern) VALUES ('Keine Infos', '');
INSERT INTO groups (name, pattern) VALUES ('Gruppe 4', '');
INSERT INTO groups (name, pattern) VALUES ('Gruppe 5', '');

INSERT INTO kalenderGroups (name, pattern) VALUES ('Alle', '{{alle}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Maschinisten', '{{ma}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Atemschutz', '{{at}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppenführer', '{{gf}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Zugführer', '{{zf}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 5', '{{5}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 6', '{{6}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 7', '{{7}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 8', '{{8}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 9', '{{9}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 10', '{{10}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 11', '{{11}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 12', '{{12}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 13', '{{13}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 14', '{{14}}');
INSERT INTO kalenderGroups (name, pattern) VALUES ('Gruppe 15', '{{15}}');

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE "users";
DROP TABLE "groups";
DROP TABLE "autos";
DROP TABLE "alarms";
DROP TABLE "kalender";
DROP TABLE "kalenderGroups";