# Updates

## Update von Version 2 auf 3

-   Achtung: Es kann nur von Version 2.4.0 einfach auf 3.0.0 geupdatet werden
-   Achtung: Es wird Nodejs 12 vorausgesetzt; Bei Nutzung von Windows 7 am besten auf Windows 10
    updaten oder Nodejs Version v12.21.0 verwenden
-   Zum Update auf Version 3 am besten Version 3 herunterladen und in einem neuen Verzeichnis
    installieren (Installation Server beachten), anschließend kann die Datenbank von Version 2.4.0
    in den neuen Ordner kopiert werden und somit die Daten/Benutzer übernommen werden.
-   Achtung Standard Datenbanknamen geändert (-> umbenennen):
    -   Datenbankname Version 2: save.sqlite3
    -   Datenbankname Version 3: database.sqlite3 (in .env einstellbar)

## Update

1.  NodeJS aktualisieren: https://nodejs.org/de/
2.  npm aktualisieren: `npm install -g npm@latest`
3.  Updatehinweise der jeweiligen Version beachten
4.  Neue Version unter Releases herunterladen: https://github.com/Retschga/FWmonitor/releases
5.  Datei entpacken
6.  Dateien der alten version überschreiben
    -   Achtung: evtl. vorher Sicherungskopie anlegen
    -   Achtung: bei eigens veränderten Dateien (Wappen, ...), diese unter Umständen nicht
        überschreiben
7.  .env (Ist-Stand) mit .env-leer (Soll-Stand) vergleichen, gegebenfalls Einträge
    hinzufügen/ändern/löschen
8.  Libraries updaten `npm install --production`
9.  Software neu starten
10. Wenn nötig die verbundenen Geräte in der App > Verbundene Geräte updaten
