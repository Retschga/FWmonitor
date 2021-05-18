var colors = require('colors/safe');

const PAD_NAMESPACE = 20;

const getTimestamp = (): string => {
    return new Date().toISOString();
};

const info = (namespace: string, message: string, object?: any) => {
    if (object) {
        console.log(
            colors.white(
                `[${getTimestamp()}] [INFO]  [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`,
                JSON.stringify(object)
            )
        );
    } else {
        console.log(
            colors.white(
                `[${getTimestamp()}] [INFO]  [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`
            )
        );
    }
};

const warn = (namespace: string, message: string, object?: any) => {
    if (object) {
        console.log(
            colors.orange(
                `[${getTimestamp()}] [WARN]  [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`,
                JSON.stringify(object)
            )
        );
    } else {
        console.log(
            colors.orange(
                `[${getTimestamp()}] [WARN]  [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`
            )
        );
    }
};

const error = (namespace: string, message: string, object?: any) => {
    if (object) {
        console.log(
            colors.red(
                `[${getTimestamp()}] [ERROR] [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`,
                JSON.stringify(object)
            )
        );
    } else {
        console.log(
            colors.red(
                `[${getTimestamp()}] [ERROR] [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`
            )
        );
    }
};

const ecxeption = (namespace: string, err: Error) => {
    console.log(
        colors.red(
            `[${getTimestamp()}] [ERROR] [${namespace.padEnd(PAD_NAMESPACE)}] `,
            JSON.stringify(err),
            err.stack
        )
    );
};

const debug = (namespace: string, message: string, object?: any) => {
    if (object) {
        console.log(
            colors.green(
                `[${getTimestamp()}] [DEBUG] [${namespace.padEnd(PAD_NAMESPACE)}]  ${message}`,
                JSON.stringify(object)
            )
        );
    } else {
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
    ecxeption
};
