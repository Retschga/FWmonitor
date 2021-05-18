'use strict';

import DatabaseConnection from '../database/connection';
import logging from '../utils/logging';
import { multibleColumnSet, multibleKeySet } from '../utils/common';

const NAMESPACE = 'Model';

class Model {
    protected tablename: string;

    constructor(tablename: string) {
        this.tablename = tablename;
    }

    /**
     * Findet einen Eintrag anhand der Suchparameter
     * @param params //{spalte: wert, ...}
     * @returns {Promise<undefined | [T]>}
     */
    public async findElement<T>(
        params: object = {},
        limit = -1,
        offset = -1,
        extra?: string
    ): Promise<T[]> {
        logging.debug(NAMESPACE, 'find', { tablename: this.tablename, params, limit, offset });
        let sql = `SELECT * FROM ${this.tablename}`;

        const { columnSet, valueData } = multibleColumnSet(params);

        if (Object.keys(params).length > 0) {
            sql += ` WHERE ${columnSet}`;
        }

        if (extra != undefined) sql += ' ' + extra;
        if (limit > 0) sql += ` LIMIT ${limit}`;
        if (offset > 0) sql += ` OFFSET ${offset}`;

        let response: undefined | T[] = await DatabaseConnection.query<[T]>(sql, valueData);

        return response != undefined ? response : [];
    }

    /**
     * Verändert Spaltenwerte
     * @param id
     * @param params //{spalte: wert, ...}
     * @returns
     */
    public async update(id: Number, params: object = {}): Promise<number> {
        logging.debug(NAMESPACE, 'update', { tablename: this.tablename, id, params });

        if (!Object.keys(params).length) {
            return 0;
        }

        const { columnSet, valueData } = multibleColumnSet(params, ',');
        let sql = `UPDATE ${this.tablename} SET ${columnSet} WHERE id=@id`;

        (valueData as any)['@id'] = id;

        let response: any = await DatabaseConnection.runSQL(sql, valueData);

        if (response == undefined) return 0;
        return response.changes;
    }

    /**
     * Löscht einen Benutzer aus der Datenbank
     * @param id
     * @returns
     */
    public async delete(id: Number): Promise<number> {
        logging.debug(NAMESPACE, 'delete', { tablename: this.tablename, id });
        const sql = `DELETE FROM ${this.tablename} WHERE id=@id`;
        let response: any = await DatabaseConnection.runSQL(sql, { '@id': id });
        if (response == undefined) return 0;
        return response.changes;
    }

    /**
     * Fügt einen neuen Benutzer zur Datenbank hinzu
     * @param params //{spalte: wert, ...}
     * @returns
     */
    public async insert(params: object = {}): Promise<number> {
        logging.debug(NAMESPACE, 'insert', { tablename: this.tablename, params });
        if (!Object.keys(params).length) {
            return 0;
        }
        const { keySet, valueSet, valueData } = multibleKeySet(params);
        let sql = `INSERT INTO ${this.tablename} (${keySet}) VALUES (${valueSet}) `;

        let response: any = await DatabaseConnection.runSQL(sql, valueData);
        if (response == undefined) return 0;
        return response.changes;
    }
}

export default Model;
