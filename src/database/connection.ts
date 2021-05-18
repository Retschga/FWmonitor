'use strict';

import sqlite3 from 'sqlite3';
import * as sqlite from 'sqlite';
import logging from '../utils/logging';
import config from '../utils/config';

const NAMESPACE = 'databaseConnection';

class DatabaseConnection {
    private db: sqlite.Database | undefined = undefined;
    private file: string;

    constructor(file: string) {
        this.file = file;
        this.init();
    }

    private async init() {
        try {
            logging.debug(NAMESPACE, 'INIT...');
            await this.open();
            if (this.db == undefined) {
                logging.error(NAMESPACE, 'INIT... ERROR - db is undefined');
                return;
            }
            logging.debug(NAMESPACE, 'MIGRATING...');
            await this.db.migrate({
                force: false,
                migrationsPath: './src/migrations/'
            });
            logging.debug(NAMESPACE, 'MIGRATING... DONE');
            await this.close();
            logging.debug(NAMESPACE, 'INIT... OK');
        } catch (error) {
            logging.error(NAMESPACE, 'Error', error);
        }
    }

    private async open() {
        logging.debug(NAMESPACE, 'OPEN...');
        this.db = await sqlite.open({
            filename: this.file,
            driver: sqlite3.Database
        });

        this.db.on('trace', (data: any) => {
            logging.error(NAMESPACE, 'Errordata', data);
        });
        this.db.on('profile', (data: any) => {
            logging.error(NAMESPACE, 'Profiledata', data);
        });
        sqlite3.verbose();

        logging.debug(NAMESPACE, 'OPEN... DONE');
    }

    private async close() {
        try {
            logging.debug(NAMESPACE, 'CLOSE...');
            if (this.db == undefined) return;
            await this.db.close();
            this.db = undefined;
            logging.debug(NAMESPACE, 'CLOSE... DONE');
        } catch (error) {
            logging.debug(NAMESPACE, 'CLOSE... ERROR', error);
        }
    }

    public async query<T = any[]>(sql: string, values?: object): Promise<T | undefined> {
        try {
            logging.debug(NAMESPACE, 'QUERY...', { sql, values });
            await this.open();
            if (this.db == undefined) return;
            const stmt = await this.db.prepare(sql);
            if (values != undefined) await stmt.bind(values);
            let result = await stmt.all<T>();
            stmt.finalize();
            logging.debug(NAMESPACE, 'QUERY... OK', result);
            return result;
        } catch (error) {
            logging.error(NAMESPACE, 'QUERY... ERROR', error);
            console.trace(error);
            return undefined;
        }
    }

    public async runSQL(sql: string, values?: object): Promise<object | undefined> {
        try {
            logging.debug(NAMESPACE, 'RUN SQL...', { sql, values });
            await this.open();
            if (this.db == undefined) return;
            const stmt = await this.db.prepare(sql);
            if (values != undefined) {
                await stmt.bind(values);
            }
            let result = await stmt.run();
            stmt.finalize();
            logging.debug(NAMESPACE, 'RUN SQL... OK', result);
            return result;
        } catch (error) {
            logging.error(NAMESPACE, 'RUN SQL... ERROR', error);
            console.trace(error);
            return undefined;
        }
    }
}

export default new DatabaseConnection(config.sqlite.file);
