import logging from './logging';

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
