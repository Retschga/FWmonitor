import passwordGenerator from 'generate-password';
import bcrypt from 'bcryptjs';
import config from '../utils/config';

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
