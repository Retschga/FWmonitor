import passwordGenerator from 'generate-password';
import bcrypt from 'bcryptjs';
import config from '../utils/config';
import jsonwebtoken from 'jsonwebtoken';

export const createNewPassword = () => {
    const password = passwordGenerator.generate({
        length: config.app.password_length,
        numbers: true,
        excludeSimilarCharacters: true
    });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    return { password, hash };
};

export const hashPassword = (password: string) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    return hash;
};

export const checkPassword = (password: string, hash: string) => {
    return bcrypt.compareSync(password, hash);
};

export const createToken = (telegramid: string) => {
    return jsonwebtoken.sign({ telegramid }, config.app.jwt_key, {
        algorithm: 'HS256',
        expiresIn: config.app.jwt_expire
    });
};
