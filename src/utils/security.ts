'use strict';

import bcrypt from 'bcryptjs';
import config from '../utils/config';
import jsonwebtoken from 'jsonwebtoken';
import passwordGenerator from 'generate-password';

// https://nozzlegear.com/blog/implementing-a-jwt-auth-system-with-typescript-and-node

export interface TokenSession {
    id: number;
    isV3: boolean;
    car: boolean;
    // ... Eigenschaften
    /**
     * Timestamp indicating when the session was created, in Unix milliseconds.
     */
    iat: number;
    /**
     * Timestamp indicating when the session should expire, in Unix milliseconds.
     */
    exp: number;
}
/**
 * Identical to the Session type, but without the `issued` and `expires` properties.
 */
export type PartialTokenSession = Omit<TokenSession, 'iat' | 'exp'>;

export interface EncodeResult {
    token: string;
    exp: number;
    iat: number;
}

export type DecodeResult =
    | {
          type: 'valid';
          session: TokenSession;
      }
    | {
          type: 'integrity-error';
      }
    | {
          type: 'invalid-token';
      }
    | {
          type: 'expired';
      };

/**
 * Generiert ein neues Passwort
 */
export function createNewPassword(): {
    password: string;
    hash: string;
} {
    const password = passwordGenerator.generate({
        length: config.app.password_length,
        numbers: true,
        excludeSimilarCharacters: true
    });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    return { password, hash };
}

/**
 * Generiert den Hash zu einem Passwort
 */
export function hashPassword(password: string): string {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    return hash;
}

/**
 * Vergleicht ein Passwort mit einem Hash
 * @returns {boolean}
 */
export function checkPassword(password: string, hash: string): boolean {
    return bcrypt.compareSync(password, hash);
}

/**
 * Erstellt einen JWT für eine Session
 */
export function createToken(
    partialSession: PartialTokenSession,
    customExpireSeconds?: number
): {
    token: string;
    iat: number;
    exp: number;
} {
    // Always use HS512 to sign the token
    const algorithm: jsonwebtoken.Algorithm = 'HS512';
    // Determine when the token should expire
    const issued = Date.now();
    const jwt_expire_MS = config.app.jwt_expire * 1000;
    let expires = issued + jwt_expire_MS;
    if (customExpireSeconds) {
        expires = issued + customExpireSeconds * 1000;
    }
    const session: TokenSession = {
        ...partialSession,
        iat: issued,
        exp: expires
    };

    const token = jsonwebtoken.sign(session, config.app.jwt_key, {
        algorithm: algorithm
    });

    return {
        token: token,
        iat: issued,
        exp: expires
    };
}

/**
 * Prüft einen JWT
 */
export function checkToken(token: string): DecodeResult {
    // Always use HS512 to decode the token
    //const algorithm: jsonwebtoken.Algorithm = 'HS512';

    let result: TokenSession;

    try {
        // Parse the JWT string and store the result in `payload`.
        // Note that we are passing the key in this method as well. This method will throw an error
        // if the token is invalid (if it has expired according to the expiry time we set on sign in),
        // or if the signature does not match
        result = jsonwebtoken.verify(token, config.app.jwt_key) as TokenSession;
    } catch (_e) {
        if (!(_e instanceof Error)) throw _e;
        const e: Error = _e;

        // https://www.npmjs.com/package/jsonwebtoken
        if (e.message === 'jwt not active') {
            return {
                type: 'invalid-token'
            };
        }

        if (e.message === 'jwt expired') {
            return {
                type: 'expired'
            };
        }

        if (
            e.message === 'jwt signature is required' ||
            e.message === 'invalid signature' ||
            e.message === 'jwt malformed'
        ) {
            return {
                type: 'integrity-error'
            };
        }

        // Handle json parse errors, thrown when the payload is nonsense
        if (
            e.message.indexOf('jwt audience invalid') != -1 ||
            e.message.indexOf('jwt id invalid') != -1 ||
            e.message.indexOf('jwt id invalid') != -1 ||
            e.message.indexOf('jwt subject invalid') != -1
        ) {
            return {
                type: 'invalid-token'
            };
        }

        throw e;
    }

    return {
        type: 'valid',
        session: result
    };
}
