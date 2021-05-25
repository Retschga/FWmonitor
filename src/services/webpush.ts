import webpush from 'web-push';
import config from '../utils/config';

class Webpush {
    public notify() {
        //titel, text, tag, silent, timestamp, zeigeBis, isAlarm, actions, groups
    }

    public subscribe(id: number, endpoint: string) {
        // check app enabled
        // check webpush enabled
    }
}

export default new Webpush();
