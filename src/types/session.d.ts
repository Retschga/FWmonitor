import 'express-session'; // don't forget to import the original module

declare module 'express-session' {
    interface SessionData {
        userid: number;
        telegramid: string;
        name: string;
        car: coolean;
        admin: boolean;
        calendar_min: boolean;
        calendar_full: boolean;
        telefone: boolean;
    }
}
