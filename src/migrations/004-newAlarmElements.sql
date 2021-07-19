--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------
ALTER TABLE "main"."alarms" ADD "kreuzung" TEXT DEFAULT "";
ALTER TABLE "main"."alarms" ADD "hinweis" TEXT DEFAULT "";
ALTER TABLE "main"."alarms" ADD "prio" TEXT DEFAULT "";
ALTER TABLE "main"."alarms" ADD "tetra" TEXT DEFAULT "";
ALTER TABLE "main"."alarms" ADD "mitteiler" TEXT DEFAULT "";
ALTER TABLE "main"."alarms" ADD "rufnummer" TEXT DEFAULT "";
ALTER TABLE "main"."alarms" ADD "patient" TEXT DEFAULT "";
ALTER TABLE "main"."alarms" ADD "einsatzplan" TEXT DEFAULT "";

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

ALTER TABLE "main"."alarms" DROP COLUMN "kreuzung";
ALTER TABLE "main"."alarms" DROP COLUMN "hinweis";
ALTER TABLE "main"."alarms" DROP COLUMN "prio";
ALTER TABLE "main"."alarms" DROP COLUMN "tetra";
ALTER TABLE "main"."alarms" DROP COLUMN "mitteiler";
ALTER TABLE "main"."alarms" DROP COLUMN "rufnummer";
ALTER TABLE "main"."alarms" DROP COLUMN "patient";
ALTER TABLE "main"."alarms" DROP COLUMN "einsatzplan";