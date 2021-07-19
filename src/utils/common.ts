'use strict';

import logging from './logging';
import { exec } from 'child_process';
import fs from 'fs';

const NAMESPACE = 'COMMON_FUNC';

/**
 * Erzeugt aus einem Key-Pair Objekt einen SQL Spalten (name = ?, ...) String
 * @param obj //{spalte: value}
 * @returns {{columnSet: string, valueData: any}}
 */
export function multibleColumnSet(
    obj: Record<string, unknown>,
    verknuepfung: string = 'AND'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): { columnSet: string; valueData: any } {
    const keys = Object.keys(obj);
    const values = Object.values(obj);

    const columnSet = keys
        .map((key) => {
            let cmp = '';
            if (key.indexOf('<') != -1) cmp += '<';
            if (key.indexOf('>') != -1) cmp += '>';
            if (key.indexOf('=') != -1) cmp += '=';
            if (cmp == '') cmp = '=';
            key = key.replace(/[<>=]/g, '');
            return `"${key}"${cmp}@${key}`;
        })
        .join(` ${verknuepfung} `);

    const mappedKeys = keys.map((key) => {
        key = key.replace(/[<>=]/g, '');
        return `${key}`;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valueData: any = {};
    for (let i = 0; i < mappedKeys.length; i++) {
        if (values[i] instanceof Date) {
            values[i] = (<Date>values[i]).toISOString();
        } else {
            switch (typeof values[i]) {
                case 'boolean':
                    values[i] = values[i] == true ? 1 : 0;
                    break;

                case 'number':
                    break;
                case 'bigint':
                    break;

                case 'string':
                    break;

                case 'undefined':
                    values[i] = null;
                    break;

                default:
                    values[i] = String(values[i]);
                    break;
            }

            if (values[i] == 'null') values[i] = null;
        }

        valueData[mappedKeys[i]] = values[i];
    }

    return {
        columnSet,
        valueData
    };
}

/**
 * Erzeugt aus einem Key-Pair Objekt einen SQL Spalten (name, name, ...) String + einen (?, ?, ...) String
 * @param obj //{spalte: value}
 * @returns {{keySet: string, valueSet: string, valueData: any}}
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function multibleKeySet(obj: object): {
    keySet: string;
    valueSet: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    valueData: any;
} {
    const keys = Object.keys(obj);
    const values = Object.values(obj);

    const keySet = keys.map((key) => `"${key}"`).join(', ');
    const valueSet = keys.map((key) => `@${key}`).join(', ');

    const mappedKeys = keys.map((key) => `${key}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const valueData: any = {};
    for (let i = 0; i < mappedKeys.length; i++) {
        if (values[i] instanceof Date) {
            values[i] = (<Date>values[i]).toISOString();
        } else {
            switch (typeof values[i]) {
                case 'boolean':
                    values[i] = values[i] == true ? 1 : 0;
                    break;

                case 'number':
                    break;
                case 'bigint':
                    break;

                case 'string':
                    break;

                case 'undefined':
                    values[i] = null;
                    break;

                default:
                    values[i] = String(values[i]);
                    break;
            }

            if (values[i] == 'null') values[i] = null;
        }

        valueData[mappedKeys[i]] = values[i];
    }

    return {
        keySet,
        valueSet,
        valueData
    };
}

/**
 * Prüft ob ein String ein valider JSON String ist
 * @param str
 * @returns {boolean}
 */
export function isJsonString(str: string): boolean {
    try {
        JSON.parse(str);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Awaitable timeout Fuktion
 * @param ms
 * @returns Promise
 */
export function timeout(ms: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * https://ali-dev.medium.com/how-to-use-promise-with-exec-in-node-js-a39c4d7bbf77
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>} Stdout
 */
export function execShellCommand(cmd: string): Promise<string> {
    return new Promise((resolve) => {
        const start = new Date();
        logging.debug(NAMESPACE, 'EXECUTE: ' + cmd);
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                logging.exception(NAMESPACE, error);
            }
            const ms = new Date().getTime() - start.getTime();
            logging.debug(NAMESPACE, 'EXECUTION TIME: %sms', ms);
            resolve(stdout ? stdout : stderr);
        });
    });
}

/**
 * Prüft ob eine Datei existiert
 */
export async function fileExists(path: string): Promise<boolean> {
    return !!(await fs.promises.stat(path).catch(() => false));
}

/**
 * Prüft ob eine Datei oder ein Ordner existiert
 * @param folderPath
 * @returns
 */
export async function checkFolderOrFile(folderPath?: string): Promise<boolean> {
    if (!folderPath) return false;
    try {
        await fs.promises.stat(folderPath);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Generiert eine Unique ID
 * @returns {string} Unique ID
 */
export function getUniqueID(): string {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return s4() + s4() + '-' + s4();
}

/**
 * Hängt eine führende 0 an eine Zahl (<10)
 * @param i
 * @returns {string}
 */
export function addLeadingZero(i: number): string {
    return Number(i) < 10 ? '0' + i : String(i);
}

/**
 * Gibt eine Datumsstring im Alarmzeit format zurück
 * @param date
 * @returns {string}
 */
export function getFormattedAlarmTime(date?: Date): string {
    let today = new Date();
    if (date) today = new Date(date);

    const y = today.getFullYear();

    const m = ('0' + (today.getMonth() + 1)).slice(-2);
    const d = ('0' + today.getDate()).slice(-2);
    const h = ('0' + today.getHours()).slice(-2);
    const mi = ('0' + today.getMinutes()).slice(-2);
    const s = ('0' + today.getSeconds()).slice(-2);

    return y + '-' + m + '-' + d + ' ' + h + '-' + mi + '-' + s;
}
