'use strict';

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import logging from '../utils/logging';
import config from '../utils/config';

const NAMESPACE = 'DatabaseConnection';

class DatabaseConnection {
    private db: Database.Database | undefined = undefined;
    private file: string;

    constructor(file: string) {
        this.file = file;
    }

    public init() {
        try {
            logging.debug(NAMESPACE, 'INIT...');

            this.open();
            if (this.db == undefined) {
                throw new Error('database is undefined');
            }

            logging.debug(NAMESPACE, 'MIGRATING...');
            this.migrate(false, '../migrations');
            logging.debug(NAMESPACE, 'MIGRATING... DONE');

            logging.debug(NAMESPACE, 'INIT... OK');
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }

        process.on('exit', () => {
            logging.info(NAMESPACE, `exit => close database`);
            this.close();
        });
    }

    private open() {
        logging.debug(NAMESPACE, 'OPEN...');

        if (process.env.NODE_ENV == 'development')
            // eslint-disable-next-line no-console
            this.db = new Database(this.file, { verbose: console.log });
        else this.db = new Database(this.file, {});
        this.db.pragma('journal_mode = WAL');

        logging.debug(NAMESPACE, 'OPEN... DONE');
    }

    private close() {
        try {
            if (this.db == undefined) return;

            logging.debug(NAMESPACE, 'CLOSE...');
            this.db.close();
            this.db = undefined;
            logging.debug(NAMESPACE, 'CLOSE... DONE');
        } catch (error) {
            logging.exception(NAMESPACE, error);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public query<T = any>(sql: string, values?: Record<string, unknown>) {
        try {
            if (this.db == undefined) return;

            logging.debug(NAMESPACE, 'QUERY...', { sql, values });
            const stmt = this.db.prepare(sql);
            if (values != undefined) {
                //console.log(values);
                stmt.bind(values);
            }

            const result: T[] = <T[]>stmt.all();

            logging.debug(NAMESPACE, 'QUERY... OK', result);

            return result;
        } catch (error) {
            logging.exception(NAMESPACE, error);
            return undefined;
        }
    }

    public runSQL(sql: string, values?: Record<string, unknown>) {
        try {
            if (this.db == undefined) return;

            logging.debug(NAMESPACE, 'RUN SQL...', { sql, values });
            const stmt = this.db.prepare(sql);
            if (values != undefined) {
                //console.log(values);
                stmt.bind(values);
            }
            const result = stmt.run();
            logging.debug(NAMESPACE, 'RUN SQL... OK', result);
            return result;
        } catch (error) {
            logging.exception(NAMESPACE, error);
            return undefined;
        }
    }

    // https://github.com/Kauto/better-sqlite3-helper/blob/master/src/database.js
    private migrate(
        force: boolean,
        migrationsPath: string = 'migrations',
        table: string = 'migrations'
    ) {
        const location = path.join(__dirname, migrationsPath);
        if (this.db == undefined) {
            logging.error(NAMESPACE, 'MIGRATION... ERROR - db is undefined');
            return;
        }

        // Get the list of migration files, for example:
        //   { id: 1, name: 'initial', filename: '001-initial.sql' }
        //   { id: 2, name: 'feature', fielname: '002-feature.sql' }
        const migrationFiles = fs
            .readdirSync(location)
            .map((x) => x.match(/^(\d+).(.*?)\.sql$/))
            .filter((x) => x !== null)

            .map((x) => ({
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                id: Number(x[1]),
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                name: x[2],
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                filename: x[0],
                data: '',
                up: '',
                down: ''
            }))
            .sort((a, b) => Math.sign(a.id - b.id));

        if (!migrationFiles.length) {
            // No migration files found
            return;
        }

        logging.debug(NAMESPACE, 'MIGRATIONS FOUND: ' + migrationFiles.length);

        // Ge the list of migrations, for example:
        //   { id: 1, name: 'initial', filename: '001-initial.sql', up: ..., down: ... }
        //   { id: 2, name: 'feature', fielname: '002-feature.sql', up: ..., down: ... }
        migrationFiles.map((migration) => {
            const filename = path.join(location, migration.filename);
            migration.data = fs.readFileSync(filename, 'utf-8');
        });
        const migrations = migrationFiles;

        migrations.map((migration) => {
            const [up, down] = migration.data.split(/^\s*--\s+?down\b/im);
            if (!down) {
                const message = `The ${migration.filename} file does not contain '-- Down' separator.`;
                throw new Error(message);
            } else {
                migration.up = up.replace(/^-- .*?$/gm, '').trim(); // Remove comments
                migration.down = down.trim(); // and trim whitespaces
            }
        });

        // Create a database table for migrations meta data if it doesn't exist
        this.db.exec(`CREATE TABLE IF NOT EXISTS "${table}" (
  id   INTEGER PRIMARY KEY,
  name TEXT    NOT NULL,
  up   TEXT    NOT NULL,
  down TEXT    NOT NULL
)`);

        // Get the list of already applied migrations
        let dbMigrations = this.query(`SELECT id, name, up, down FROM "${table}" ORDER BY id ASC`);

        if (dbMigrations == undefined) return;

        // Undo migrations that exist only in the database but not in files,
        // also undo the last migration if the `force` option was set to `last`.
        const lastMigration = migrations[migrations.length - 1];
        for (const migration of dbMigrations.slice().sort((a, b) => Math.sign(b.id - a.id))) {
            const isForceLastMigration = force == true && migration.id === lastMigration.id;
            logging.debug(NAMESPACE, 'MIGRATION: ' + migration.id + '...');

            if (!migrations.some((x) => x.id === migration.id) || isForceLastMigration) {
                logging.debug(NAMESPACE, 'RUN MIGRATION...');
                this.db.exec('BEGIN');
                try {
                    this.db.exec(isForceLastMigration ? lastMigration.down : migration.down);
                    this.runSQL(`DELETE FROM "${table}" WHERE id = @id`, { id: migration.id });
                    this.db.exec('COMMIT');
                    dbMigrations = dbMigrations.filter((x) => x.id !== migration.id);
                } catch (err) {
                    this.db.exec('ROLLBACK');
                    throw err;
                }
            } else {
                break;
            }
        }

        // Apply pending migrations
        const lastMigrationId = dbMigrations.length ? dbMigrations[dbMigrations.length - 1].id : 0;
        for (const migration of migrations) {
            if (migration.id > lastMigrationId) {
                this.db.exec('BEGIN');
                try {
                    this.db.exec(migration.up);
                    this.runSQL(
                        `INSERT INTO "${table}" (id, name, up, down) VALUES (@id, @name, @up, @down)`,
                        {
                            id: migration.id,
                            name: migration.name,
                            up: migration.up,
                            down: migration.down
                        }
                    );
                    this.db.exec('COMMIT');
                } catch (err) {
                    this.db.exec('ROLLBACK');
                    throw err;
                }
            }
        }

        return this;
    }
}

export default new DatabaseConnection(config.sqlite.file);
