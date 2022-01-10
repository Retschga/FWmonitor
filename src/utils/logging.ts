'use strict';

import colors from 'colors/safe';
import config from './config';
import fs from 'fs';

const PAD_NAMESPACE = config.logging.pad_namespace;

enum LOGLEVEL {
    INFO = 1,
    WARNING = 2,
    ERROR = 4,
    DEBUG = 8
}

const getTimestamp = (): string => {
    return new Date().toISOString();
};

const info = (namespace: string, message: string, object?: unknown): void => {
    if (!(config.logging.loglevel & LOGLEVEL.INFO)) return;

    if (object) {
        const data = `[${getTimestamp()}] [INFO]  [${namespace.padEnd(
            PAD_NAMESPACE
        )}]  ${message} ${JSON.stringify(object)}`;

        // eslint-disable-next-line no-console
        console.log(colors.white(data));

        if (config.logging.toFile) {
            fs.appendFile(config.logging.logFile, data + '\n', function (err) {
                if (err) throw err;
            });
        }
    } else {
        const data = `[${getTimestamp()}] [INFO]  [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`;

        // eslint-disable-next-line no-console
        console.log(colors.white(data));

        if (config.logging.toFile) {
            fs.appendFile(config.logging.logFile, data + '\n', function (err) {
                if (err) throw err;
            });
        }
    }
};

const warn = (namespace: string, message: string, object?: unknown): void => {
    if (!(config.logging.loglevel & LOGLEVEL.WARNING)) return;

    if (object) {
        const data = `[${getTimestamp()}] [WARN]  [${namespace.padEnd(
            PAD_NAMESPACE
        )}]  ${message} ${JSON.stringify(object)}`;
        // eslint-disable-next-line no-console
        console.log(colors.yellow(data));

        if (config.logging.toFile) {
            fs.appendFile(config.logging.logFile, data + '\n', function (err) {
                if (err) throw err;
            });
        }
    } else {
        const data = `[${getTimestamp()}] [WARN]  [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`;

        // eslint-disable-next-line no-console
        console.log(colors.yellow(data));

        if (config.logging.toFile) {
            fs.appendFile(config.logging.logFile, data + '\n', function (err) {
                if (err) throw err;
            });
        }
    }
};

const error = (namespace: string, message: string, object?: unknown): void => {
    if (!(config.logging.loglevel & LOGLEVEL.ERROR)) return;

    if (object) {
        const data = `[${getTimestamp()}] [ERROR] [${namespace.padEnd(
            PAD_NAMESPACE
        )}]  ${message} ${JSON.stringify(object)}`;

        // eslint-disable-next-line no-console
        console.log(colors.red(data));

        if (config.logging.toFile) {
            fs.appendFile(config.logging.logFile, data + '\n', function (err) {
                if (err) throw err;
            });
        }
    } else {
        const data = `[${getTimestamp()}] [ERROR] [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`;
        // eslint-disable-next-line no-console
        console.log(colors.red(data));

        if (config.logging.toFile) {
            fs.appendFile(config.logging.logFile, data + '\n', function (err) {
                if (err) throw err;
            });
        }
    }
};

const exception = (namespace: string, err: unknown): void => {
    if (error instanceof Error) {
        printException(namespace, <Error>err);
    } else {
        error(namespace, 'Unknown error', err);
    }
};

const printException = (namespace: string, err: Error): void => {
    const data = `[${getTimestamp()}] [ERROR] [${namespace.padEnd(
        PAD_NAMESPACE
    )}]  ${JSON.stringify(err)}`;

    // eslint-disable-next-line no-console
    console.log(colors.red(data), err.stack);

    if (config.logging.toFile) {
        fs.appendFile(config.logging.logFile, data + '\n' + err.stack + '\n', function (err) {
            if (err) throw err;
        });
    }
};

const debug = (namespace: string, message: string, object?: unknown): void => {
    if (!(config.logging.loglevel & LOGLEVEL.DEBUG)) return;

    if (object) {
        const data = `[${getTimestamp()}] [DEBUG] [${namespace.padEnd(
            PAD_NAMESPACE
        )}]  ${message} ${JSON.stringify(object)}`;

        // eslint-disable-next-line no-console
        console.log(colors.green(data));

        if (config.logging.toFile) {
            fs.appendFile(config.logging.logFile, data + '\n', function (err) {
                if (err) throw err;
            });
        }
    } else {
        const data = `[${getTimestamp()}] [DEBUG] [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`;

        // eslint-disable-next-line no-console
        console.log(colors.green(data));

        if (config.logging.toFile) {
            fs.appendFile(config.logging.logFile, data + '\n', function (err) {
                if (err) throw err;
            });
        }
    }
};

export default {
    info,
    warn,
    error,
    debug,
    exception,
    LOGLEVEL
};
