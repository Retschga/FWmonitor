'use strict';

import webpush from 'web-push';
import config from '../utils/config';
import userService from './user';
import globalEvents from '../utils/globalEvents';
import { AlarmRow } from '../models/alarm';
import logging from '../utils/logging';
import groupService from './group';

const NAMESPACE = 'WebpushService';

type NotificationAction = {
    action: string;
    title: string;
};

type NotificationMessage = {
    alerts: number;
    title: string;
    text: string;
    tag: string;
    silent: boolean;
    timestamp: string;
    notAfter: string;
    actions: NotificationAction[];
};

class WebpushService {
    constructor() {
        if (this.enabled()) {
            logging.info(NAMESPACE, 'Enabled');
            webpush.setVapidDetails(
                'mailto:' + config.app.vapid_mail,
                config.app.vapid_public || '',
                config.app.vapid_private || ''
            );

            // Software Notification
            globalEvents.on('softwareinfo', async (text: string) => {
                logging.debug(NAMESPACE, 'Sende Softwareinfo');

                const users = await userService.find({
                    softwareInfo: true,
                    '>appNotifications': 0
                });

                for (let i = 0; i < users.length; i++) {
                    const user = users[i];

                    let notAfter = new Date();
                    notAfter.setTime(notAfter.getTime() + 60 * 60 * 1000);

                    const message: NotificationMessage = {
                        alerts: 1,
                        title: 'Software Info',
                        text: text,
                        tag: 'SoftwareInfo',
                        silent: false,
                        timestamp: new Date().toISOString(),
                        notAfter: notAfter.toISOString(),
                        actions: []
                    };

                    await this.notify(
                        user.id,
                        JSON.parse(user.appNotificationsSubscription),
                        message
                    );
                }
            });

            // Alarm Notification
            globalEvents.on('alarm', async (alarm: AlarmRow) => {
                logging.debug(NAMESPACE, 'Sende Alarm');

                const users = await userService.find_all_approved();
                const groups = await groupService.find_all();

                for (let i = 0; i < users.length; i++) {
                    const user = users[i];
                    const group = groups.find((element) => element.id == user.group);

                    let notAfter = new Date();
                    notAfter.setTime(notAfter.getTime() + 2 * 60 * 1000);

                    let title =
                        'ALARM: ' +
                        (group?.pattern.indexOf('{{EINSATZSTICHWORT}}') != -1
                            ? alarm.einsatzstichwort
                            : '') +
                        (group?.pattern.indexOf('{{SCHLAGWORT}}') != -1
                            ? ' ' + alarm.schlagwort
                            : '');

                    let text =
                        (group?.pattern.indexOf('{{STRASSE}}') != -1 ? alarm.strasse : '') +
                        (group?.pattern.indexOf('{{ORT}}') != -1 ? ' ' + alarm.ort : '');

                    const message: NotificationMessage = {
                        alerts: user.appNotifications,
                        title: title,
                        text: text,
                        tag: 'Alarm' + alarm.date,
                        silent: false,
                        timestamp: new Date().toISOString(),
                        notAfter: notAfter.toISOString(),
                        actions: [
                            { action: 'kommeJa', title: '👍 KOMME' },
                            { action: 'kommeNein', title: '👎 KOMME NICHT' }
                        ]
                    };

                    await this.notify(
                        user.id,
                        JSON.parse(user.appNotificationsSubscription),
                        message
                    );
                }
            });

            // Drucker Papier Notification
            globalEvents.on('paperstatus-change', async (status: boolean) => {
                logging.debug(NAMESPACE, 'Sende Papierstatus');

                const users = await userService.find({
                    drucker: true
                });

                for (let i = 0; i < users.length; i++) {
                    const user = users[i];

                    let notAfter = new Date();
                    notAfter.setTime(notAfter.getTime() + 2 * 60 * 1000);

                    const message: NotificationMessage = {
                        alerts: 1,
                        title: 'Drucker Info',
                        text: 'Papierstatus: ' + (status ? 'voll' : 'leer'),
                        tag: 'DruckerInfo',
                        silent: false,
                        timestamp: new Date().toISOString(),
                        notAfter: notAfter.toISOString(),
                        actions: []
                    };

                    await this.notify(
                        user.id,
                        JSON.parse(user.appNotificationsSubscription),
                        message
                    );
                }
            });
        } else {
            logging.warn(NAMESPACE, 'Not enabled');
        }
    }

    private enabled(): boolean {
        return config.app.vapid_private && config.app.vapid_public && config.app.vapid_mail
            ? true
            : false;
    }

    public notify(
        userid: number,
        subscription: webpush.PushSubscription,
        dataToSend: NotificationMessage
    ) {
        if (!this.enabled) throw new Error(NAMESPACE + ' Not Enabled');

        logging.debug(NAMESPACE, 'Notify', { userid, dataToSend, subscription });

        return webpush.sendNotification(subscription, JSON.stringify(dataToSend)).catch((err) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
                userService.update_notifications_app(userid, 0, '');
                return false;
            } else {
                throw err;
            }
        });
    }
}

export default new WebpushService();
