'use strict';

class HttpException extends Error {
    public status: number;
    public message: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public data: any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(status: number, message: string, data?: any | undefined) {
        super(message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, HttpException.prototype);

        this.status = status;
        this.message = message;
        this.data = data;
    }
}

export default HttpException;
