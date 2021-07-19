'use strict';

import colors from 'colors/safe';
import config from './config';

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
        // eslint-disable-next-line no-console
        console.log(
            colors.white(
                `[${getTimestamp()}] [INFO]  [${namespace.padEnd(
                    PAD_NAMESPACE
                )}]  ${message} ${JSON.stringify(object)}`
            )
        );
    } else {
        // eslint-disable-next-line no-console
        console.log(
            colors.white(
                `[${getTimestamp()}] [INFO]  [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`
            )
        );
    }
};

const warn = (namespace: string, message: string, object?: unknown): void => {
    if (!(config.logging.loglevel & LOGLEVEL.WARNING)) return;

    if (object) {
        // eslint-disable-next-line no-console
        console.log(
            colors.yellow(
                `[${getTimestamp()}] [WARN]  [${namespace.padEnd(
                    PAD_NAMESPACE
                )}]  ${message} ${JSON.stringify(object)}`
            )
        );
    } else {
        // eslint-disable-next-line no-console
        console.log(
            colors.yellow(
                `[${getTimestamp()}] [WARN]  [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`
            )
        );
    }
};

const error = (namespace: string, message: string, object?: unknown): void => {
    if (!(config.logging.loglevel & LOGLEVEL.ERROR)) return;

    if (object) {
        // eslint-disable-next-line no-console
        console.log(
            colors.red(
                `[${getTimestamp()}] [ERROR] [${namespace.padEnd(
                    PAD_NAMESPACE
                )}]  ${message} ${JSON.stringify(object)}`
            )
        );
    } else {
        // eslint-disable-next-line no-console
        console.log(
            colors.red(
                `[${getTimestamp()}] [ERROR] [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`
            )
        );
    }
};

const exception = (namespace: string, err: Error): void => {
    // eslint-disable-next-line no-console
    console.log(
        colors.red(
            `[${getTimestamp()}] [ERROR] [${namespace.padEnd(PAD_NAMESPACE)}]  ${JSON.stringify(
                err
            )}`
        ),
        err.stack
    );
};

const debug = (namespace: string, message: string, object?: unknown): void => {
    if (!(config.logging.loglevel & LOGLEVEL.DEBUG)) return;

    if (object) {
        // eslint-disable-next-line no-console
        console.log(
            colors.green(
                `[${getTimestamp()}] [DEBUG] [${namespace.padEnd(
                    PAD_NAMESPACE
                )}]  ${message} ${JSON.stringify(object)}`
            )
        );
    } else {
        // eslint-disable-next-line no-console
        console.log(
            colors.green(
                `[${getTimestamp()}] [DEBUG] [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`
            )
        );
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
