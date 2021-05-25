import logging from './logging';
import { exec } from 'child_process';
import fs from 'fs';

const NAMESPACE = 'COMMON_FUNC';

/**
 * Erzeugt aus einem Key-Pair Objekt einen SQL Spalten (name = ?, ...) String
 * @param obj //{spalte: value}
 * @returns {{columnSet: string, values: [any]}}
 */
export const multibleColumnSet = (obj: object, verknuepfung: string = 'AND') => {
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
        return `@${key}`;
    });
    let valueData: any = {};
    for (let i = 0; i < mappedKeys.length; i++) {
        valueData[mappedKeys[i]] = values[i];
    }

    return {
        columnSet,
        valueData
    };
};

/**
 * Erzeugt aus einem Key-Pair Objekt einen SQL Spalten (name, name, ...) String + einen (?, ?, ...) String
 * @param obj //{spalte: value}
 * @returns {{keySet: string, valueSet: string, values: [any]}}
 */
export const multibleKeySet = (obj: object) => {
    const keys = Object.keys(obj);
    const values = Object.values(obj);

    const keySet = keys.map((key) => `"${key}"`).join(', ');
    const valueSet = keys.map((key) => `@${key}`).join(', ');

    const mappedKeys = keys.map((key) => `@${key}`);
    let valueData: any = {};
    for (let i = 0; i < mappedKeys.length; i++) {
        valueData[mappedKeys[i]] = values[i];
    }

    return {
        keySet,
        valueSet,
        valueData
    };
};

export const isJsonString = (str: string) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
};

export const timeout = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * https://ali-dev.medium.com/how-to-use-promise-with-exec-in-node-js-a39c4d7bbf77
 * Executes a shell command and return it as a Promise.
 * @param cmd {string}
 * @return {Promise<string>}
 */
export const execShellCommand = (cmd: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const start = new Date();
        logging.debug(NAMESPACE, 'EXECUTE: ' + cmd);
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.warn(error);
            }
            const ms = new Date().getTime() - start.getTime();
            logging.debug(NAMESPACE, 'EXECUTION TIME: %sms', ms);
            resolve(stdout ? stdout : stderr);
        });
    });
};

export const fileExists = async (path: string) =>
    !!(await fs.promises.stat(path).catch((e) => false));

export const checkFolderOrFile = async (folderPath?: string): Promise<boolean> => {
    if (!folderPath) return false;
    try {
        var stats = await fs.promises.stat(folderPath);
        return true;
    } catch (err) {
        return false;
    }
};
