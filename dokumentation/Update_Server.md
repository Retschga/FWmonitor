## Update von Version 2 auf 3

-   Achtung: Es kann nur von Version 2.4.0 einfach auf 3.0.0 geupdatet werden
-   Achtung: Es wird Nodejs 12 vorausgesetzt; Bei Nutzung von Windows 7 am besten auf Windows 10
    updaten oder Nodejs Verion v12.21.0 verwenden
-   Zum Update auf Version 3 am besten Version 3 herunderladen und in einem neuen Verzeichnis
    installieren (Installation Server beachten), anschließend kann die Datenbank von Version 2.4.0
    in den neuen Ordner kopiert werden und somit die Daten/Benutzer übernommen werden.

## Update

-   NodeJS 14: https://nodejs.org/de/
-   npm: `npm install -g npm@latest`
-   Updatehinweise beachten
-   Einfach die neue Version unter Releases herunterladen und die alten ersetzen (evtl. vorher
    Sicherungskopie anlegen)
-   Achtung bei eigens veränderten Dateien (Wappen, ...), diese unter Umständen nicht überschreiben
-   .env (Ist-Stand) mit .env-leer (Soll-Stand) vergleichen, gegebenfalls Einträge
    hinzufügen/ändern/löschen
-   Libraries updaten `npm install --production`
-   Wenn nötig die verbundenen Geräte unter Einstellungen updaten
-   Software neu starten
