'use strict';

enum HttpStatusCodes {
    ER_TRUNCATED_WRONG_VALUE_FOR_FIELD = 422,
    ER_DUP_ENTRY = 409,
    OK = 200,
    CREATED = 201,
    MOVED_PERMANENTLY = 301,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500
}

export default HttpStatusCodes;
