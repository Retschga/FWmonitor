--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------
ALTER TABLE "main"."alarms" ADD "rueckmeldungJa" TEXT DEFAULT "";
ALTER TABLE "main"."alarms" ADD "rueckmeldungNein" TEXT DEFAULT "";
ALTER TABLE "main"."autos" ADD "funk_name" TEXT DEFAULT "";
ALTER TABLE "main"."autos" ADD "funk_status" TEXT DEFAULT -1;

CREATE TABLE "autos_funkstatus" (
    "id"                            INTEGER NOT NULL UNIQUE,
    "timestamp"                     TEXT,
    "auto"                          INTEGER,
    "status"                        TEXT,
    PRIMARY KEY("id" AUTOINCREMENT)
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

ALTER TABLE "main"."alarms" DROP COLUMN "rueckmeldungJa";
ALTER TABLE "main"."alarms" DROP COLUMN "rueckmeldungNein";
ALTER TABLE "main"."autos" DROP COLUMN "funk_name";
ALTER TABLE "main"."autos" DROP COLUMN "funk_status";

DROP TABLE "autos_funkstatus";
