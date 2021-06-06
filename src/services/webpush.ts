import webpush from 'web-push';
import config from '../utils/config';
import userService from './user';

class Webpush {
    constructor() {
        if (config.app.vapid_private && config.app.vapid_public && config.app.vapid_mail) {
            webpush.setVapidDetails(
                'mailto:' + config.app.vapid_mail,
                config.app.vapid_public,
                config.app.vapid_private
            );

            // Software Notification

            // Alarm Notification

            // Drucker Papier Notification
        }
    }

    public notify(userid: number, subscription: webpush.PushSubscription, dataToSend: string) {
        if (!config.app.vapid_private || !config.app.vapid_public || !config.app.vapid_mail) return;

        return webpush.sendNotification(subscription, dataToSend).catch((err) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
                console.log('Subscription has expired or is no longer valid: ', err);
                userService.update_notifications_app(userid, 0, '');
                return false;
            } else {
                throw err;
            }
        });
    }
}

export default new Webpush();
